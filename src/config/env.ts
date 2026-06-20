import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    rolePendingSecret: required("JWT_ROLE_PENDING_SECRET"),
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
    refreshTtl: process.env.REFRESH_TOKEN_TTL ?? "7d",
    rolePendingTtl: process.env.ROLE_PENDING_TOKEN_TTL ?? "5m",
  },
};
