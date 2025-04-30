export interface AppConfig {
  jwt: {
    secret: string;
    expire_in: string;
  };
  session: {
    secret: string;
  };
  app: {
    name: string;
  };
  port: number;
  database: {
    url: string;
  };
}
