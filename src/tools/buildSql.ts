// Schema-verified SQL templates for Ghostfolio.
// Enforces: Account composite PK (id, userId), _UserWatchlist join (A=SymbolProfile, B=User),
// SymbolProfile assetClass via JOIN (not on Order), MarketData natural key join (dataSource, symbol),
// SymbolProfileOverrides COALESCE, isDraft/isExcluded/isActive filters, ROUND for money display.

export interface BuildSqlInput {
  dashboard_id: string;
  userId: string;
  date_from?: string;
  date_to?: string;
  accountId?: string;
  currency?: string;
}

export interface SqlIntent {
  intent_type: string;
  dashboard_id: string;
  chart_type: string;
  x_field: string;
  y_field: string;
  group_by: string | null;
  time_granularity: string | null;
  currency: string | null;
  requires_external_data: boolean;
  missing_requirements: string[];
}

export interface BuildSqlOutput {
  sql: string | null;
  params: {
    userId: string;
    date_from?: string;
    date_to?: string;
    accountId?: string;
    currency?: string;
  };
  intent: SqlIntent;
}

interface TemplateDefaults {
  intent_type: string;
  chart_type: string;
  x_field: string;
  y_field: string;
  group_by: string | null;
  time_granularity: string | null;
}

interface SqlTemplate {
  sql: string;
  defaults: TemplateDefaults;
}

export const SQL_TEMPLATES: Record<string, SqlTemplate> = {
  portfolio_value_timeseries_6m: {
    sql: `
SELECT
  ab."date"::date AS date,
  SUM(ab."value") AS total_value
FROM "AccountBalance" ab
JOIN "Account" a
  ON a."id" = ab."accountId"
 AND a."userId" = ab."userId"
WHERE ab."userId" = :userId
  AND a."isExcluded" = false
  AND ab."date" >= (CURRENT_DATE - INTERVAL '6 months')
GROUP BY ab."date"::date
ORDER BY ab."date"::date ASC`.trim(),
    defaults: {
      intent_type: "timeseries",
      chart_type: "line",
      x_field: "date",
      y_field: "total_value",
      group_by: null,
      time_granularity: "day",
    },
  },

  activity_breakdown_mtd: {
    sql: `
SELECT
  o."type",
  COUNT(*) AS activity_count,
  ROUND(SUM(o."quantity" * o."unitPrice")::numeric, 2) AS total_value,
  ROUND(SUM(o."fee")::numeric, 2) AS total_fees
FROM "Order" o
WHERE o."userId" = :userId
  AND o."isDraft" = false
  AND o."date" >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY o."type"
ORDER BY total_value DESC`.trim(),
    defaults: {
      intent_type: "breakdown",
      chart_type: "bar",
      x_field: "type",
      y_field: "total_value",
      group_by: "type",
      time_granularity: null,
    },
  },

  fees_over_time_6m: {
    sql: `
SELECT
  DATE_TRUNC('month', o."date")::date AS month,
  ROUND(SUM(o."fee")::numeric, 2) AS total_fees
FROM "Order" o
WHERE o."userId" = :userId
  AND o."isDraft" = false
  AND o."date" >= (CURRENT_DATE - INTERVAL '6 months')
GROUP BY DATE_TRUNC('month', o."date")
ORDER BY month ASC`.trim(),
    defaults: {
      intent_type: "timeseries",
      chart_type: "bar",
      x_field: "month",
      y_field: "total_fees",
      group_by: null,
      time_granularity: "month",
    },
  },

  dividends_over_time_12m: {
    sql: `
SELECT
  DATE_TRUNC('month', o."date")::date AS month,
  ROUND(SUM(o."quantity" * o."unitPrice")::numeric, 2) AS total_dividends
FROM "Order" o
WHERE o."userId" = :userId
  AND o."isDraft" = false
  AND o."type" = 'DIVIDEND'
  AND o."date" >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY DATE_TRUNC('month', o."date")
ORDER BY month ASC`.trim(),
    defaults: {
      intent_type: "timeseries",
      chart_type: "bar",
      x_field: "month",
      y_field: "total_dividends",
      group_by: null,
      time_granularity: "month",
    },
  },

  allocation_by_asset_class: {
    sql: `
SELECT
  COALESCE(spo."assetClass", sp."assetClass", 'UNKNOWN') AS asset_class,
  COUNT(DISTINCT sp."id") AS symbol_count,
  ROUND(SUM(o."quantity" * o."unitPrice")::numeric, 2) AS total_value
FROM "Order" o
JOIN "SymbolProfile" sp
  ON sp."id" = o."symbolProfileId"
LEFT JOIN "SymbolProfileOverrides" spo
  ON spo."symbolProfileId" = sp."id"
WHERE o."userId" = :userId
  AND o."isDraft" = false
  AND o."type" IN ('BUY', 'SELL')
GROUP BY COALESCE(spo."assetClass", sp."assetClass", 'UNKNOWN')
ORDER BY total_value DESC`.trim(),
    defaults: {
      intent_type: "breakdown",
      chart_type: "pie",
      x_field: "asset_class",
      y_field: "total_value",
      group_by: "asset_class",
      time_granularity: null,
    },
  },

  allocation_by_currency: {
    sql: `
SELECT
  sp."currency",
  COUNT(DISTINCT sp."id") AS symbol_count,
  ROUND(SUM(o."quantity" * o."unitPrice")::numeric, 2) AS total_value
FROM "Order" o
JOIN "SymbolProfile" sp
  ON sp."id" = o."symbolProfileId"
WHERE o."userId" = :userId
  AND o."isDraft" = false
  AND o."type" IN ('BUY', 'SELL')
GROUP BY sp."currency"
ORDER BY total_value DESC`.trim(),
    defaults: {
      intent_type: "breakdown",
      chart_type: "pie",
      x_field: "currency",
      y_field: "total_value",
      group_by: "currency",
      time_granularity: null,
    },
  },

  top_symbols_by_value_3m: {
    sql: `
SELECT
  sp."symbol",
  sp."name",
  sp."currency",
  COALESCE(spo."assetClass", sp."assetClass") AS asset_class,
  ROUND(SUM(
    CASE WHEN o."type" = 'BUY' THEN o."quantity"
         WHEN o."type" = 'SELL' THEN -o."quantity"
         ELSE 0 END
  )::numeric, 4) AS net_quantity,
  ROUND(SUM(
    CASE WHEN o."type" = 'BUY' THEN o."quantity" * o."unitPrice"
         WHEN o."type" = 'SELL' THEN -o."quantity" * o."unitPrice"
         ELSE 0 END
  )::numeric, 2) AS net_value
FROM "Order" o
JOIN "SymbolProfile" sp
  ON sp."id" = o."symbolProfileId"
LEFT JOIN "SymbolProfileOverrides" spo
  ON spo."symbolProfileId" = sp."id"
WHERE o."userId" = :userId
  AND o."isDraft" = false
  AND o."type" IN ('BUY', 'SELL')
  AND o."date" >= (CURRENT_DATE - INTERVAL '3 months')
GROUP BY sp."symbol", sp."name", sp."currency",
         COALESCE(spo."assetClass", sp."assetClass")
ORDER BY net_value DESC
LIMIT 10`.trim(),
    defaults: {
      intent_type: "ranking",
      chart_type: "bar",
      x_field: "symbol",
      y_field: "net_value",
      group_by: "symbol",
      time_granularity: null,
    },
  },

  watchlist_symbols: {
    sql: `
SELECT
  sp."id",
  sp."symbol",
  sp."name",
  sp."currency",
  sp."dataSource",
  COALESCE(spo."assetClass", sp."assetClass") AS asset_class,
  md."marketPrice" AS latest_price,
  md."date"::date AS price_date
FROM "_UserWatchlist" uw
JOIN "SymbolProfile" sp
  ON sp."id" = uw."A"
LEFT JOIN "SymbolProfileOverrides" spo
  ON spo."symbolProfileId" = sp."id"
LEFT JOIN LATERAL (
  SELECT m."marketPrice", m."date"
  FROM "MarketData" m
  WHERE m."dataSource" = sp."dataSource"
    AND m."symbol" = sp."symbol"
  ORDER BY m."date" DESC
  LIMIT 1
) md ON true
WHERE uw."B" = :userId
ORDER BY sp."symbol" ASC`.trim(),
    defaults: {
      intent_type: "list",
      chart_type: "table",
      x_field: "symbol",
      y_field: "latest_price",
      group_by: null,
      time_granularity: null,
    },
  },

  recent_activities: {
    sql: `
SELECT
  o."date"::date AS date,
  o."type",
  sp."symbol",
  sp."name",
  o."quantity",
  ROUND(o."unitPrice"::numeric, 2) AS unit_price,
  o."currency",
  ROUND(o."fee"::numeric, 2) AS fee,
  a."name" AS account_name
FROM "Order" o
JOIN "SymbolProfile" sp
  ON sp."id" = o."symbolProfileId"
LEFT JOIN "Account" a
  ON a."id" = o."accountId"
 AND a."userId" = o."accountUserId"
WHERE o."userId" = :userId
  AND o."isDraft" = false
ORDER BY o."date" DESC
LIMIT 20`.trim(),
    defaults: {
      intent_type: "list",
      chart_type: "table",
      x_field: "date",
      y_field: "unit_price",
      group_by: null,
      time_granularity: null,
    },
  },

  account_balances_current: {
    sql: `
SELECT
  a."id" AS account_id,
  a."name" AS account_name,
  a."currency",
  a."isExcluded",
  ROUND(ab."value"::numeric, 2) AS balance,
  ab."date"::date AS balance_date
FROM "Account" a
LEFT JOIN LATERAL (
  SELECT b."value", b."date"
  FROM "AccountBalance" b
  WHERE b."accountId" = a."id"
    AND b."userId" = a."userId"
  ORDER BY b."date" DESC
  LIMIT 1
) ab ON true
WHERE a."userId" = :userId
ORDER BY a."name" ASC`.trim(),
    defaults: {
      intent_type: "list",
      chart_type: "table",
      x_field: "account_name",
      y_field: "balance",
      group_by: null,
      time_granularity: null,
    },
  },
};

export function buildSql(input: BuildSqlInput): BuildSqlOutput {
  const template = SQL_TEMPLATES[input.dashboard_id];

  const params: BuildSqlOutput["params"] = {
    userId: input.userId,
    date_from: input.date_from,
    date_to: input.date_to,
    accountId: input.accountId,
    currency: input.currency,
  };

  if (!template) {
    return {
      sql: null,
      params,
      intent: {
        intent_type: "unknown",
        dashboard_id: input.dashboard_id,
        chart_type: "none",
        x_field: "",
        y_field: "",
        group_by: null,
        time_granularity: null,
        currency: input.currency ?? null,
        requires_external_data: false,
        missing_requirements: [`unknown dashboard_id: ${input.dashboard_id}`],
      },
    };
  }

  return {
    sql: template.sql,
    params,
    intent: {
      intent_type: template.defaults.intent_type,
      dashboard_id: input.dashboard_id,
      chart_type: template.defaults.chart_type,
      x_field: template.defaults.x_field,
      y_field: template.defaults.y_field,
      group_by: template.defaults.group_by,
      time_granularity: template.defaults.time_granularity,
      currency: input.currency ?? null,
      requires_external_data: false,
      missing_requirements: [],
    },
  };
}
