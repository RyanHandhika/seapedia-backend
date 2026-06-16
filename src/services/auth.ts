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
  role: string;
}

const register = async ({ username, email, passwordHash }: RegisterPayload) => {
  if (!username || !email || !passwordHash) {
    throw new Error("username, email and password are required!");
  }

  return await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(passwordHash, 10);
    const newUser = await tx.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
      },
    });

    const userRole = await tx.userRole.create({
      data: {
        userId: newUser.id,
        role: "BUYER",
      },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: userRole.role,
    };
  });
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

  const userRoleActive = await prisma.userRole.findMany({
    where: { userId: existingUser.id },
    select: {
      role: true,
    },
  });

  return {
    user: {
      id: existingUser.id,
      role: userRoleActive,
    },
    token,
  };
};

const logout = async () => {
  // Implement logout logic if needed (e.g., invalidate token, clear cookies)
};

const getMe = async () => {};

const refreshToken = async () => {
  // Implement logic to refresh JWT token if needed
};

export default {
  register,
  login,
  logout,
  getMe,
  refreshToken,
};
