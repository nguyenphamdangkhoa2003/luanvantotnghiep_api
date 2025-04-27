export interface AppConfig {
  jwt: {
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
