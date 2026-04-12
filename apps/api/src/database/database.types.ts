export type DatabaseConnectionOptions = {
  type: "postgres";
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema: string;
  synchronize: false;
  autoLoadEntities: true;
  installExtensions: false;
  logging: boolean;
  ssl: boolean | { rejectUnauthorized: boolean };
  applicationName: string;
};
