# ghostfolio-mcp-server

RPC service that exposes Ghostfolio portfolio analytics as JSON endpoints.
Provides dashboard recommendation, schema-verified SQL generation, and dashboard configuration tools.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `MCP_API_KEY` | — | If set, all `/rpc` calls require `x-mcp-api-key` header |

Create a `.env` file at the repo root to configure.

## Project structure

```
src/
├── index.ts                        # Express server, /health, /rpc router
├── config/
│   └── env.ts                      # Environment config loader
└── tools/
    ├── recommendDashboard.ts       # Rule-based dashboard selector
    ├── buildSql.ts                 # Schema-verified SQL template engine
    └── buildDashboardConfig.ts     # Dashboard tile config generator
```

## API

### GET /health

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

### POST /rpc

Request: `{ "id?": string, "method": string, "params": object }`
Response: `{ "id": string, "result": any }` or `{ "id": string, "error": { "code": string, "message": string } }`

#### Methods

**recommendDashboard** — picks a dashboard ID from a natural-language query

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"id":"1","method":"recommendDashboard","params":{"query":"show my allocation"}}'
```

**buildSql** — returns a schema-verified SELECT query for a given dashboard ID

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"id":"2","method":"buildSql","params":{"dashboard_id":"allocation_by_asset_class","userId":"user-1"}}'
```

**buildDashboardConfig** — generates a tile-based dashboard config from an intent object

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"id":"3","method":"buildDashboardConfig","params":{"dashboard_id":"fees_over_time_6m","intent":{"intent_type":"timeseries","dashboard_id":"fees_over_time_6m","chart_type":"bar","x_field":"month","y_field":"total_fees","group_by":null,"time_granularity":"month","currency":null,"requires_external_data":false,"missing_requirements":[]}}}'
```

**getDashboardConfig** — returns a stub dashboard config for a user

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"id":"4","method":"getDashboardConfig","params":{"userId":"user-1"}}'
```

### Available dashboard IDs

| ID | Type | Chart |
|----|------|-------|
| `portfolio_value_timeseries_6m` | timeseries | line |
| `activity_breakdown_mtd` | breakdown | bar |
| `fees_over_time_6m` | timeseries | bar |
| `dividends_over_time_12m` | timeseries | bar |
| `allocation_by_asset_class` | breakdown | pie |
| `allocation_by_currency` | breakdown | pie |
| `top_symbols_by_value_3m` | ranking | bar |
| `watchlist_symbols` | list | table |
| `recent_activities` | list | table |
| `account_balances_current` | list | table |

## Build for production

```bash
npm run build
npm start
```

## License

MIT
