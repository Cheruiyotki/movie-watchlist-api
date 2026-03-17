import jwt from "jsonwebtoken";


export const generateToken = (userId, res) => {
     const payload = {id: userId};
     const token =jwt.sign(payload, process.env.JWT_SECRET, {
         expiresIn: process.env.JWT_EXPIRES_IN || "1h",});

        // Set token in HTTP-only cookie
        res.cookie("jwt", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Use secure cookies in production
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 9, // 9 hours
        });
        return token;
}