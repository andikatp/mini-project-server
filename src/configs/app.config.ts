import packageJson from "../../package.json";

export const APP_CONFIG = {
  name: packageJson.name || "mini-project-server",
  version: process.env.APP_VERSION || packageJson.version || "1.0.0",
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
} as const;

export type AppConfig = typeof APP_CONFIG;
