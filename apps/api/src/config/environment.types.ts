export type NodeEnvironment = "development" | "test" | "production";

export type EnvironmentVariables = {
  NODE_ENV: NodeEnvironment;
  APP_HOST: string;
  APP_PORT: number;
  CORS_ALLOWED_ORIGINS: string[];
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SCHEMA: string;
  DB_SSL: boolean;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
};

export type AppRuntimeConfig = {
  name: string;
  env: NodeEnvironment;
  host: string;
  port: number;
  allowedOrigins?: string[];
};

export type DatabaseRuntimeConfig = {
  type: "postgres";
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  synchronize: false;
  autoLoadEntities: true;
  installExtensions: false;
  logging: boolean;
  applicationName: string;
};

export type AuthRuntimeConfig = {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
};

export type AppConfig = {
  appName: string;
  nodeEnv: NodeEnvironment;
  host: string;
  port: number;
  database: DatabaseRuntimeConfig;
  auth: AuthRuntimeConfig;
};
