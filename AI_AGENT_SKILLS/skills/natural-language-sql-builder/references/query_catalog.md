# Ghostfolio Query Catalog

Canonical template IDs used by `ghostfolio-mcp-server` (`src/tools/buildSql.ts`).
All queries are SELECT-only, filter by `:userId`, and enforce schema join rules.

## Templates

| ID | Type | Chart | Description |
|----|------|-------|-------------|
| `portfolio_value_timeseries_6m` | timeseries | line | Total portfolio value over 6 months via AccountBalance. Joins Account on composite PK, filters `isExcluded = false`. |
| `activity_breakdown_mtd` | breakdown | bar | Month-to-date activity counts and values by Order type. Filters `isDraft = false`. |
| `fees_over_time_6m` | timeseries | bar | Monthly fee totals over 6 months. Rounds with `ROUND(::numeric, 2)`. Filters `isDraft = false`. |
| `dividends_over_time_12m` | timeseries | bar | Monthly dividend income over 12 months. Filters `type = 'DIVIDEND'`, `isDraft = false`. |
| `allocation_by_asset_class` | breakdown | pie | Holdings grouped by asset class via SymbolProfile + SymbolProfileOverrides COALESCE. Filters BUY/SELL only, `isDraft = false`. |
| `allocation_by_currency` | breakdown | pie | Holdings grouped by SymbolProfile currency. Filters BUY/SELL only, `isDraft = false`. |
| `top_symbols_by_value_3m` | ranking | bar | Top 10 symbols by net value (BUY - SELL) over 3 months. Joins SymbolProfileOverrides. |
| `watchlist_symbols` | list | table | User watchlist via `_UserWatchlist` join table. Includes latest MarketData price via LATERAL + natural key join (dataSource, symbol). |
| `recent_activities` | list | table | Last 20 orders with symbol info. LEFT JOINs Account on composite FK (`accountId`, `accountUserId`). Filters `isDraft = false`. |
| `account_balances_current` | list | table | Current balance per account via LATERAL subquery for latest AccountBalance. Joins on composite PK. |

## Schema Rules Applied

All templates enforce:
- **Account composite PK**: Joins always match both `id` AND `userId`.
- **Order → Account**: LEFT JOIN on `accountId` + `accountUserId` (nullable FK).
- **AccountBalance → Account**: JOIN on `accountId` + `userId`.
- **MarketData → SymbolProfile**: Natural key join on `dataSource` + `symbol` (no FK).
- **`_UserWatchlist`**: `A` = SymbolProfile.id, `B` = User.id.
- **SymbolProfileOverrides**: `COALESCE(spo."assetClass", sp."assetClass")` to prefer overrides.
- **Money rounding**: `ROUND(x::numeric, 2)` for all monetary display values.
- **Standard filters**: `isDraft = false` on Order, `isExcluded = false` on Account.
