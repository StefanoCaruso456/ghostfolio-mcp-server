# ghostfolio-mcp-server

A Model Context Protocol (MCP) service wrapper for Ghostfolio.
Exposes portfolio analytics tools — dashboard recommendation, SQL generation,
and dashboard configuration — as JSON-RPC endpoints.

## Local development

```bash
npm install
npm run dev
```

The server starts on `http://localhost:3000` by default.
Set `PORT` in a `.env` file to change it.

Optional: set `MCP_API_KEY` to require the `x-mcp-api-key` header on `/rpc` calls.

## Build

```bash
npm run build
npm start
```

## API

### GET /health

```bash
curl http://localhost:3000/health
```

Response:

```json
{ "status": "ok" }
```

### POST /rpc

All tool calls go through a single endpoint. Send a JSON body with `id`, `method`, and `params`.

#### recommendDashboard

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"id":"1","method":"recommendDashboard","params":{"query":"show my allocation"}}'
```

#### buildSql

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"id":"2","method":"buildSql","params":{"dashboard_id":"allocation_by_asset_class","userId":"user-1"}}'
```

#### buildDashboardConfig

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"id":"3","method":"buildDashboardConfig","params":{"dashboard_id":"allocation_by_asset_class","intent":{"intent_type":"breakdown","dashboard_id":"allocation_by_asset_class","chart_type":"pie","x_field":"assetClass","y_field":"market_value","group_by":"assetClass","time_granularity":null,"currency":null,"requires_external_data":false,"missing_requirements":[]}}}'
```
