export default () => ({
  jwt: {
    secret: process.env.JWT_SCRET,
  },
  app: {
    name: process.env.APP_NAME,
  },
  port: process.env.PORT,
  database: {
    url: process.env.MONGO_URI!,
  },
});
