import { loginSchema as sharedLoginSchema, type LoginInput } from "@agrogest/validation";

export const loginFormSchema = sharedLoginSchema;

export type LoginFormValues = LoginInput;
