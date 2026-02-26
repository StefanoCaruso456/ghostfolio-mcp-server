export interface RecommendDashboardInput {
  query: string;
}

export interface RequiredFilters {
  date_from?: string;
  date_to?: string;
  accountId?: string;
  currency?: string;
}

export interface RecommendDashboardOutput {
  selected_dashboard_id: string;
  alternates: string[];
  confidence: number;
  reason_codes: string[];
  required_filters: RequiredFilters;
}

const DASHBOARD_IDS = {
  ALLOCATION: "allocation_by_asset_class",
  DIVIDENDS: "dividends_over_time_12m",
  FEES: "fees_over_time_6m",
  WATCHLIST: "watchlist_symbols",
  DEFAULT: "portfolio_value_timeseries_6m",
} as const;

export function recommendDashboard(
  input: RecommendDashboardInput
): RecommendDashboardOutput {
  const q = (input.query ?? "").toLowerCase();

  if (q.includes("allocation") || q.includes("diversified")) {
    return {
      selected_dashboard_id: DASHBOARD_IDS.ALLOCATION,
      alternates: [DASHBOARD_IDS.DEFAULT, DASHBOARD_IDS.DIVIDENDS],
      confidence: 0.85,
      reason_codes: ["keyword_allocation"],
      required_filters: {},
    };
  }

  if (q.includes("dividend")) {
    return {
      selected_dashboard_id: DASHBOARD_IDS.DIVIDENDS,
      alternates: [DASHBOARD_IDS.DEFAULT],
      confidence: 0.8,
      reason_codes: ["keyword_dividend"],
      required_filters: { date_from: "now-12M" },
    };
  }

  if (q.includes("fee")) {
    return {
      selected_dashboard_id: DASHBOARD_IDS.FEES,
      alternates: [DASHBOARD_IDS.DEFAULT],
      confidence: 0.8,
      reason_codes: ["keyword_fee"],
      required_filters: { date_from: "now-6M" },
    };
  }

  if (q.includes("watchlist")) {
    return {
      selected_dashboard_id: DASHBOARD_IDS.WATCHLIST,
      alternates: [DASHBOARD_IDS.DEFAULT],
      confidence: 0.75,
      reason_codes: ["keyword_watchlist"],
      required_filters: {},
    };
  }

  return {
    selected_dashboard_id: DASHBOARD_IDS.DEFAULT,
    alternates: [
      DASHBOARD_IDS.ALLOCATION,
      DASHBOARD_IDS.DIVIDENDS,
      DASHBOARD_IDS.FEES,
    ],
    confidence: 0.5,
    reason_codes: ["fallback_default"],
    required_filters: { date_from: "now-6M" },
  };
}
