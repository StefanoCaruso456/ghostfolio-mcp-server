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

const SQL_TEMPLATES: Record<
  string,
  { sql: string; intent: Omit<SqlIntent, "dashboard_id"> }
> = {
  portfolio_value_timeseries_6m: {
    sql: [
      "SELECT ab.date, SUM(ab.value) AS total_value",
      'FROM "AccountBalance" ab',
      'JOIN "Account" a ON a.id = ab."accountId"',
      'WHERE a."userId" = :userId',
      "  AND ab.date >= :date_from",
      "GROUP BY ab.date",
      "ORDER BY ab.date ASC;",
    ].join("\n"),
    intent: {
      intent_type: "timeseries",
      chart_type: "line",
      x_field: "date",
      y_field: "total_value",
      group_by: null,
      time_granularity: "day",
      currency: null,
      requires_external_data: false,
      missing_requirements: [],
    },
  },

  allocation_by_asset_class: {
    sql: [
      "SELECT o.\"assetClass\", SUM(o.quantity * o.\"unitPrice\") AS market_value",
      'FROM "Order" o',
      'WHERE o."userId" = :userId',
      "GROUP BY o.\"assetClass\"",
      "ORDER BY market_value DESC;",
    ].join("\n"),
    intent: {
      intent_type: "breakdown",
      chart_type: "pie",
      x_field: "assetClass",
      y_field: "market_value",
      group_by: "assetClass",
      time_granularity: null,
      currency: null,
      requires_external_data: false,
      missing_requirements: [],
    },
  },

  dividends_over_time_12m: {
    sql: [
      "SELECT DATE_TRUNC('month', o.date) AS month, SUM(o.quantity * o.\"unitPrice\") AS dividend_total",
      'FROM "Order" o',
      "WHERE o.\"userId\" = :userId AND o.type = 'DIVIDEND'",
      "  AND o.date >= :date_from",
      "GROUP BY month",
      "ORDER BY month ASC;",
    ].join("\n"),
    intent: {
      intent_type: "timeseries",
      chart_type: "bar",
      x_field: "month",
      y_field: "dividend_total",
      group_by: null,
      time_granularity: "month",
      currency: null,
      requires_external_data: false,
      missing_requirements: [],
    },
  },

  fees_over_time_6m: {
    sql: [
      "SELECT DATE_TRUNC('month', o.date) AS month, SUM(o.fee) AS total_fees",
      'FROM "Order" o',
      "WHERE o.\"userId\" = :userId AND o.fee > 0",
      "  AND o.date >= :date_from",
      "GROUP BY month",
      "ORDER BY month ASC;",
    ].join("\n"),
    intent: {
      intent_type: "timeseries",
      chart_type: "bar",
      x_field: "month",
      y_field: "total_fees",
      group_by: null,
      time_granularity: "month",
      currency: null,
      requires_external_data: false,
      missing_requirements: [],
    },
  },

  watchlist_symbols: {
    sql: [
      "SELECT DISTINCT sp.symbol, sp.name",
      'FROM "SymbolProfile" sp',
      'JOIN "Order" o ON o."symbolProfileId\" = sp.id',
      "WHERE o.\"userId\" = :userId",
      "ORDER BY sp.symbol ASC;",
    ].join("\n"),
    intent: {
      intent_type: "list",
      chart_type: "table",
      x_field: "symbol",
      y_field: "name",
      group_by: null,
      time_granularity: null,
      currency: null,
      requires_external_data: false,
      missing_requirements: [],
    },
  },
};

export function buildSql(input: BuildSqlInput): BuildSqlOutput {
  const template = SQL_TEMPLATES[input.dashboard_id];

  const params: BuildSqlOutput["params"] = {
    userId: input.userId,
    ...(input.date_from && { date_from: input.date_from }),
    ...(input.date_to && { date_to: input.date_to }),
    ...(input.accountId && { accountId: input.accountId }),
    ...(input.currency && { currency: input.currency }),
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
      ...template.intent,
      dashboard_id: input.dashboard_id,
      currency: input.currency ?? null,
    },
  };
}
