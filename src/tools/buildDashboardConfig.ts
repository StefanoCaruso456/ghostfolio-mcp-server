import { SqlIntent } from "./buildSql";

export interface BuildDashboardConfigInput {
  dashboard_id: string;
  intent: SqlIntent;
  title?: string;
}

export interface Tile {
  tile_id: string;
  title: string;
  chart_type: string;
  sql_ref: string;
  x_field: string;
  y_field: string;
  group_by: string | null;
  formatting: {
    y_format: "currency" | "number" | "percent";
    decimals: number;
  };
  sort: { by: string; dir: "asc" | "desc" } | null;
  limit: number | null;
}

export interface BuildDashboardConfigOutput {
  title: string;
  description: string;
  tiles: Tile[];
  filters: { supports: string[] };
}

const Y_FORMAT_MAP: Record<string, "currency" | "number" | "percent"> = {
  total_value: "currency",
  market_value: "currency",
  dividend_total: "currency",
  total_fees: "currency",
  name: "number",
};

const DASHBOARD_LABELS: Record<string, { title: string; description: string }> =
  {
    portfolio_value_timeseries_6m: {
      title: "Portfolio Value (6 months)",
      description: "Total portfolio value over the last 6 months.",
    },
    allocation_by_asset_class: {
      title: "Allocation by Asset Class",
      description: "Breakdown of holdings by asset class.",
    },
    dividends_over_time_12m: {
      title: "Dividends (12 months)",
      description: "Monthly dividend income over the last 12 months.",
    },
    fees_over_time_6m: {
      title: "Fees (6 months)",
      description: "Monthly fees paid over the last 6 months.",
    },
    watchlist_symbols: {
      title: "Watchlist",
      description: "Symbols currently in your portfolio.",
    },
  };

export function buildDashboardConfig(
  input: BuildDashboardConfigInput
): BuildDashboardConfigOutput {
  const labels = DASHBOARD_LABELS[input.dashboard_id] ?? {
    title: input.dashboard_id,
    description: `Dashboard for ${input.dashboard_id}`,
  };

  const yFormat = Y_FORMAT_MAP[input.intent.y_field] ?? "number";

  const tile: Tile = {
    tile_id: `${input.dashboard_id}_tile_1`,
    title: input.title ?? labels.title,
    chart_type: input.intent.chart_type,
    sql_ref: "primary",
    x_field: input.intent.x_field,
    y_field: input.intent.y_field,
    group_by: input.intent.group_by,
    formatting: { y_format: yFormat, decimals: 2 },
    sort:
      input.intent.chart_type === "table"
        ? { by: input.intent.x_field, dir: "asc" }
        : null,
    limit: input.intent.chart_type === "table" ? 50 : null,
  };

  return {
    title: input.title ?? labels.title,
    description: labels.description,
    tiles: [tile],
    filters: {
      supports: ["date_from", "date_to", "accountId", "currency"],
    },
  };
}
