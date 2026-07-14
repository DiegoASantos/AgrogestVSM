import { useState } from "react";

import { loginFormSchema, type LoginFormValues } from "../schemas/login-form.schema";
import type { LoginFormErrors } from "../types/auth.types";

export function useLoginForm(initialEmail = "") {
  const [values, setValues] = useState<LoginFormValues>(() => ({
    email: initialEmail.trim(),
    password: ""
  }));
  const [errors, setErrors] = useState<LoginFormErrors>({});

  function updateField<K extends keyof LoginFormValues>(
    field: K,
    value: LoginFormValues[K]
  ) {
    setValues((currentValues: LoginFormValues) => ({
      ...currentValues,
      [field]: value
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined
    }));
  }

  function submit<T>(onValid: (nextValues: LoginFormValues) => T) {
    const result = loginFormSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0]
      });

      return undefined;
    }

    setErrors({});
    return onValid(result.data);
  }

  return {
    values,
    errors,
    updateField,
    submit
  };
}
