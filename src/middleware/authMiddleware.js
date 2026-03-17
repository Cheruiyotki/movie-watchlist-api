import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";


// Read the token from the request header
// check if token is valid
const authMiddleware = async (req, res, next) => {
    console.log("Auth middleware called");
let token;

if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];}
else if (req.cookies?.jwt){
  token = req.cookies.jwt;

}

if (!token) {
    return res.status(401).json({ message: "No token provided, authorization denied" });
} 

try {
 
    // Verify token and get user id from payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
        return res.status(401).json({ message: "User not found, authorization denied" });
    }
    // Attach user to request object
    req.user = user;
    next();
} catch (error) {
    return res.status(401).json({ message: "Invalid token, authorization denied" });
}

}

export { authMiddleware };