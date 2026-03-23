import test from "node:test";
import assert from "node:assert/strict";
import { createAuthMiddleware } from "../src/middleware/authMiddleware.js";

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return res;
};

test("returns 401 when no token is provided", async () => {
  const req = { headers: {}, cookies: {} };
  const res = createMockResponse();
  let nextCalled = false;

  const middleware = createAuthMiddleware({
    jwtLib: { verify: () => ({ id: "u-1" }) },
    prismaClient: { user: { findUnique: async () => ({ id: "u-1" }) } },
    jwtSecret: "test-secret",
  });

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    message: "No token provided, authorization denied",
  });
});

test("uses bearer token, attaches user, and calls next", async () => {
  const req = {
    headers: { authorization: "Bearer token-123" },
    cookies: {},
  };
  const res = createMockResponse();
  let nextCalled = false;
  let verifyArgs = null;
  let findUniqueArgs = null;

  const middleware = createAuthMiddleware({
    jwtLib: {
      verify: (token, secret) => {
        verifyArgs = { token, secret };
        return { id: "u-1" };
      },
    },
    prismaClient: {
      user: {
        findUnique: async (args) => {
          findUniqueArgs = args;
          return { id: "u-1", email: "jane@example.com" };
        },
      },
    },
    jwtSecret: "jwt-secret",
  });

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.deepEqual(verifyArgs, { token: "token-123", secret: "jwt-secret" });
  assert.deepEqual(findUniqueArgs, { where: { id: "u-1" } });
  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { id: "u-1", email: "jane@example.com" });
});

test("uses cookie token when authorization header is missing", async () => {
  const req = {
    headers: {},
    cookies: { jwt: "cookie-token" },
  };
  const res = createMockResponse();
  let nextCalled = false;
  let verifyToken = null;

  const middleware = createAuthMiddleware({
    jwtLib: {
      verify: (token) => {
        verifyToken = token;
        return { id: "u-2" };
      },
    },
    prismaClient: {
      user: {
        findUnique: async () => ({ id: "u-2" }),
      },
    },
    jwtSecret: "jwt-secret",
  });

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(verifyToken, "cookie-token");
  assert.equal(nextCalled, true);
});

test("returns 401 when token is valid but user does not exist", async () => {
  const req = {
    headers: { authorization: "Bearer token-123" },
    cookies: {},
  };
  const res = createMockResponse();
  let nextCalled = false;

  const middleware = createAuthMiddleware({
    jwtLib: {
      verify: () => ({ id: "u-missing" }),
    },
    prismaClient: {
      user: {
        findUnique: async () => null,
      },
    },
    jwtSecret: "jwt-secret",
  });

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    message: "User not found, authorization denied",
  });
});

test("returns 401 when token verification fails", async () => {
  const req = {
    headers: { authorization: "Bearer broken-token" },
    cookies: {},
  };
  const res = createMockResponse();
  let nextCalled = false;

  const middleware = createAuthMiddleware({
    jwtLib: {
      verify: () => {
        throw new Error("invalid token");
      },
    },
    prismaClient: {
      user: {
        findUnique: async () => ({ id: "u-1" }),
      },
    },
    jwtSecret: "jwt-secret",
  });

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    message: "Invalid token, authorization denied",
  });
});
