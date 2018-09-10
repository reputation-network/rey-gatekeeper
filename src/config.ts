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
    TARGET_URL: requireEnvironmentVariable("TARGET_URL"),
    ETH_NODE_URL: requireEnvironmentVariable("ETH_NODE_URL"),
    APP_ADDRESS: requireEnvironmentVariable("APP_ADDRESS"),
    PORT: process.env.PORT || "8080",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    ENABLE_HTTP_LOG: Boolean(Number(process.env.ENABLE_HTTP_LOG)),
    REY_CONTRACT_ADDRESS: process.env.REY_CONTRACT_ADDRESS || "0x21ba427fF8a1dDF69f9365D46a4b86594Bb219DD",
    MANIFEST_URL: process.env.MANIFEST_URL || "",
  };
}
