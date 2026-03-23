import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import { generateToken } from "../utils/generateToken.js";

const createAuthController = ({
  prismaClient = prisma,
  bcryptLib = bcrypt,
  tokenGenerator = generateToken,
} = {}) => {
  const register = async (req, res) => {
    const { name, email, password } = req.body;

    // check if user already exists
    const userExists = await prismaClient.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const salt = await bcryptLib.genSalt(10);
    const hashedPassword = await bcryptLib.hash(password, salt);

    // Create user
    const user = await prismaClient.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    //generate JWT token
    const token = tokenGenerator(user.id, res);

    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  };

  const login = async (req, res) => {
    const { email, password } = req.body;

    // Check if user exists
    const user = await prismaClient.user.findUnique({
      where: { email: email },
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcryptLib.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    //generate JWT token
    const token = tokenGenerator(user.id, res);

    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        token,
      },
    });
  };

  const logout = async (_req, res) => {
    res.cookie("jwt", "", {
      httpOnly: true,
      expires: new Date(0),
    });
    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  };

  return { register, login, logout };
};

const { register, login, logout } = createAuthController();

export { createAuthController, register, login, logout };
