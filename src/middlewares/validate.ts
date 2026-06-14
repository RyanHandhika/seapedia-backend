import type { Request, Response, NextFunction } from "express";

export default (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map(
        (detail: { message: string }) => detail.message,
      );
      return res.status(400).json({
        status: "error",
        message: "Validation Error",
        data: { errors: messages },
      });
    }
    next();
  };
};
