import dotenv from "dotenv";
dotenv.config();

export interface AppConfig {
  port: number;
  mcpApiKey: string | undefined;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  mcpApiKey: process.env.MCP_API_KEY || undefined,
};
