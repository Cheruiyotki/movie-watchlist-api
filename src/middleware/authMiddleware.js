import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

const createAuthMiddleware = ({
  jwtLib = jwt,
  prismaClient = prisma,
  jwtSecret = process.env.JWT_SECRET,
} = {}) =>
  async (req, res, next) => {
    // Read the token from the request header/cookie and check if token is valid
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token provided, authorization denied" });
    }

    try {
      // Verify token and get user id from payload
      const decoded = jwtLib.verify(token, jwtSecret);
      const user = await prismaClient.user.findUnique({ where: { id: decoded.id } });

      if (!user) {
        return res
          .status(401)
          .json({ message: "User not found, authorization denied" });
      }
      // Attach user to request object
      req.user = user;
      next();
    } catch (_error) {
      return res
        .status(401)
        .json({ message: "Invalid token, authorization denied" });
    }
  };

const authMiddleware = createAuthMiddleware();

export { createAuthMiddleware, authMiddleware };
