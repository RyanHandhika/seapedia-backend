import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

const generateToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token: string): object | string => {
  try {
    return jwt.verify(token, JWT_SECRET!);
  } catch (error) {
    throw new Error("Invalid token");
  }
};

export { generateToken, verifyToken };
