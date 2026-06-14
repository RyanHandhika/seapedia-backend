import type { Request, Response, NextFunction } from "express";
import authServices from "../services/auth.js";

const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = req.body;
    const newUser = await authServices.register(data);

    res.status(201).json({
      status: "Success",
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = req.body;
    const validUser = await authServices.login(data);

    res.status(200).json(validUser);
  } catch (error) {
    next(error);
  }
};

export default { register, login };
