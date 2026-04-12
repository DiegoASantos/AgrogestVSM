export type LoginValues = {
  email: string;
  password: string;
};

export type LoginErrors = Partial<Record<keyof LoginValues, string>>;

export type AuthRole = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

export type AuthUser = {
  publicId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  displayName: string;
  roles: AuthRole[];
};

export type AuthSessionStatus = "loading" | "guest" | "authenticated";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  user: AuthUser;
};

export type AuthContextValue = {
  status: AuthSessionStatus;
  session: AuthSession | null;
  login: (values: LoginValues) => Promise<AuthSession>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};
