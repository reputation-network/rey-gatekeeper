import dotenv from "dotenv";

function requireEnvironmentVariable(envVarName: string): string {
  const envVar = process.env[envVarName];
  if (!envVar) {
    throw new Error(`Missing env variable: ${envVarName}`);
  }
  return envVar;
}

export type Config = ReturnType<typeof config>;
export default function config() {
  dotenv.config();
  return {
    TARGET_APP_URL: requireEnvironmentVariable("TARGET_APP_URL"),
    BLOCKCHAIN_NODE_URL: requireEnvironmentVariable("BLOCKCHAIN_NODE_URL"),
    APP_ADDRESS: requireEnvironmentVariable("APP_ADDRESS"),
    APP_ACCOUNT_PASSWORD: process.env.APP_ACCOUNT_PASSWORD || "",
    SECURED_PATH: process.env.SECURED_PATH || "/data",
    PORT: process.env.PORT || "8080",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    ENABLE_XFWD: Boolean(Number(process.env.ENABLE_HTTP_LOG || "1")),
    ENABLE_HTTP_LOG: Boolean(Number(process.env.ENABLE_HTTP_LOG)),
    REY_CONTRACT_ADDRESS: process.env.REY_CONTRACT_ADDRESS || "0x76C19376b275A5d77858c6F6d5322311eEb92cf5",
  };
}
