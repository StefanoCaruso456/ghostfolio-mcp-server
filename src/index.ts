import express, { Request, Response } from "express";
import { config } from "./config/env";
import { recommendDashboard } from "./tools/recommendDashboard";
import { buildSql } from "./tools/buildSql";
import { buildDashboardConfig } from "./tools/buildDashboardConfig";

const app = express();
app.use(express.json());

if (config.mcpApiKey) {
  app.use((req, res, next) => {
    if (req.path === "/health") return next();
    const key = req.headers["x-mcp-api-key"];
    if (key !== config.mcpApiKey) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or missing x-mcp-api-key header" } });
      return;
    }
    next();
  });
}

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

type RpcHandler = (params: Record<string, unknown>) => unknown;

const methods: Record<string, RpcHandler> = {
  recommendDashboard: (params) =>
    recommendDashboard({ query: String(params.query ?? "") }),

  buildSql: (params) =>
    buildSql({
      dashboard_id: String(params.dashboard_id ?? ""),
      userId: String(params.userId ?? ""),
      date_from: params.date_from as string | undefined,
      date_to: params.date_to as string | undefined,
      accountId: params.accountId as string | undefined,
      currency: params.currency as string | undefined,
    }),

  buildDashboardConfig: (params) =>
    buildDashboardConfig({
      dashboard_id: String(params.dashboard_id ?? ""),
      intent: params.intent as any,
      title: params.title as string | undefined,
    }),
};

interface RpcRequest {
  id?: string;
  method?: string;
  params?: Record<string, unknown>;
}

app.post("/rpc", (req: Request, res: Response) => {
  const body = req.body as RpcRequest;

  if (!body.method || typeof body.method !== "string") {
    res.status(400).json({
      id: body.id ?? null,
      error: { code: "INVALID_REQUEST", message: "Missing or invalid 'method' field" },
    });
    return;
  }

  const handler = methods[body.method];
  if (!handler) {
    res.status(404).json({
      id: body.id ?? null,
      error: { code: "METHOD_NOT_FOUND", message: `Unknown method: ${body.method}` },
    });
    return;
  }

  try {
    const result = handler(body.params ?? {});
    res.json({ id: body.id ?? null, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({
      id: body.id ?? null,
      error: { code: "INTERNAL_ERROR", message },
    });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.listen(config.port, () => {
  console.log(`ghostfolio-mcp-server listening on :${config.port}`);
});
