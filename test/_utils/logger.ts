import winston from "winston";

export default winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  silent: process.env.LOG_LEVEL === undefined,
  format: winston.format.simple(),
  transports: new winston.transports.Console(),
});
