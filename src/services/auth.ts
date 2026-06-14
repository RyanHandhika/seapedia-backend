import bcrypt from "bcrypt";
import { prisma } from "../db/prisma.js";
import { generateToken } from "../utils/jwt.js";

interface RegisterPayload {
  username: string;
  email: string;
  passwordHash: string;
}

interface LoginPayload {
  email: string;
  passwordHash: string;
}

const register = async ({ username, email, passwordHash }: RegisterPayload) => {
  if (!username || !email || !passwordHash) {
    throw new Error("username, email, and password are required!");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(passwordHash, 10);

  const newUser = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash: hashedPassword,
    },

    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    },
  });

  return newUser;
};

const login = async ({ email, passwordHash }: LoginPayload) => {
  if (!email || !passwordHash) {
    throw new Error("email and password are required!");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(
    passwordHash,
    existingUser.passwordHash,
  );

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken({
    id: existingUser.id,
    email: existingUser.email,
  });

  return {
    user: {
      id: existingUser.id,
      username: existingUser.username,
      email: existingUser.email,
    },
    token,
  };
};

const logout = async () => {
  // Implement logout logic if needed (e.g., invalidate token, clear cookies)
};

const me = async () => {
  // Implement logic to get current user info based on the authenticated user (e.g., from token)
};

const refreshToken = async () => {
  // Implement logic to refresh JWT token if needed
};

export default {
  register,
  login,
  logout,
  me,
  refreshToken,
};
