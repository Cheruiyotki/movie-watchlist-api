import test from "node:test";
import assert from "node:assert/strict";
import { createAuthController } from "../src/controllers/authController.js";

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    cookies: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
  };

  return res;
};

test("register returns 400 when user already exists", async () => {
  const req = {
    body: { name: "Jane", email: "jane@example.com", password: "secret123" },
  };
  const res = createMockResponse();

  let createCalled = false;
  const auth = createAuthController({
    prismaClient: {
      user: {
        findUnique: async () => ({ id: "u-existing" }),
        create: async () => {
          createCalled = true;
          return null;
        },
      },
    },
    bcryptLib: {
      genSalt: async () => "salt",
      hash: async () => "hashed",
      compare: async () => true,
    },
    tokenGenerator: () => "token",
  });

  await auth.register(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: "User already exists" });
  assert.equal(createCalled, false);
});

test("register creates user and returns token payload", async () => {
  const req = {
    body: { name: "Jane", email: "jane@example.com", password: "secret123" },
  };
  const res = createMockResponse();

  const calls = {
    genSaltRounds: null,
    hashedInput: null,
    createdData: null,
    tokenUserId: null,
  };

  const auth = createAuthController({
    prismaClient: {
      user: {
        findUnique: async () => null,
        create: async ({ data }) => {
          calls.createdData = data;
          return {
            id: "u-1",
            name: data.name,
            email: data.email,
            password: data.password,
          };
        },
      },
    },
    bcryptLib: {
      genSalt: async (rounds) => {
        calls.genSaltRounds = rounds;
        return "salt-10";
      },
      hash: async (password, salt) => {
        calls.hashedInput = { password, salt };
        return "hashed-password";
      },
      compare: async () => true,
    },
    tokenGenerator: (userId) => {
      calls.tokenUserId = userId;
      return "token-123";
    },
  });

  await auth.register(req, res);

  assert.equal(calls.genSaltRounds, 10);
  assert.deepEqual(calls.hashedInput, {
    password: "secret123",
    salt: "salt-10",
  });
  assert.deepEqual(calls.createdData, {
    name: "Jane",
    email: "jane@example.com",
    password: "hashed-password",
  });
  assert.equal(calls.tokenUserId, "u-1");

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    status: "success",
    data: {
      user: {
        id: "u-1",
        name: "Jane",
        email: "jane@example.com",
      },
      token: "token-123",
    },
  });
});

test("login returns 401 when user does not exist", async () => {
  const req = { body: { email: "missing@example.com", password: "x" } };
  const res = createMockResponse();

  const auth = createAuthController({
    prismaClient: {
      user: {
        findUnique: async () => null,
      },
    },
    bcryptLib: {
      genSalt: async () => "salt",
      hash: async () => "hashed",
      compare: async () => true,
    },
    tokenGenerator: () => "token",
  });

  await auth.login(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Invalid credentials" });
});

test("login returns 401 when password is invalid", async () => {
  const req = { body: { email: "jane@example.com", password: "wrong" } };
  const res = createMockResponse();

  const auth = createAuthController({
    prismaClient: {
      user: {
        findUnique: async () => ({
          id: "u-1",
          email: "jane@example.com",
          password: "hashed-password",
        }),
      },
    },
    bcryptLib: {
      genSalt: async () => "salt",
      hash: async () => "hashed",
      compare: async () => false,
    },
    tokenGenerator: () => "token",
  });

  await auth.login(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Invalid credentials" });
});

test("login returns 201 and token when credentials are valid", async () => {
  const req = { body: { email: "jane@example.com", password: "secret123" } };
  const res = createMockResponse();

  let tokenUserId = null;
  const auth = createAuthController({
    prismaClient: {
      user: {
        findUnique: async () => ({
          id: "u-1",
          name: "Jane",
          email: "jane@example.com",
          password: "hashed-password",
        }),
      },
    },
    bcryptLib: {
      genSalt: async () => "salt",
      hash: async () => "hashed",
      compare: async () => true,
    },
    tokenGenerator: (userId) => {
      tokenUserId = userId;
      return "token-abc";
    },
  });

  await auth.login(req, res);

  assert.equal(tokenUserId, "u-1");
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    status: "success",
    data: {
      user: {
        id: "u-1",
        email: "jane@example.com",
      },
      token: "token-abc",
    },
  });
});

test("logout clears jwt cookie and returns success payload", async () => {
  const req = {};
  const res = createMockResponse();

  const auth = createAuthController();
  await auth.logout(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.cookies.length, 1);
  assert.equal(res.cookies[0].name, "jwt");
  assert.equal(res.cookies[0].value, "");
  assert.equal(res.cookies[0].options.httpOnly, true);
  assert.ok(res.cookies[0].options.expires instanceof Date);
  assert.deepEqual(res.body, {
    status: "success",
    message: "Logged out successfully",
  });
});
