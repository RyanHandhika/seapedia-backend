import joi from "joi";

const registerSchema = joi.object({
  name: joi.string().required(),
  email: joi.string().email().required(),
  password: joi.string().min(6).required(),
});

const loginSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(6).required(),
});

export { registerSchema, loginSchema };
