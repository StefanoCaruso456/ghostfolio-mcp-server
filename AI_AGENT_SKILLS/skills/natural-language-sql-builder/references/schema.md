# Ghostfolio Database Schema Reference (SQL-Relevant)

## Tables

### "Order"
- PK: `id TEXT`
- `accountId TEXT NULL` — FK composite → Account(id, userId), ON DELETE SET NULL
- `accountUserId TEXT NULL` — part of composite FK above
- `comment TEXT NULL`
- `createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `currency TEXT NULL`
- `date TIMESTAMP(3) NOT NULL`
- `fee DOUBLE PRECISION NOT NULL`
- `isDraft BOOLEAN NOT NULL DEFAULT false`
- `quantity DOUBLE PRECISION NOT NULL`
- `symbolProfileId TEXT NOT NULL` — FK → SymbolProfile(id), ON DELETE RESTRICT
- `type TEXT NOT NULL` — enum: BUY, SELL, DIVIDEND, FEE, INTEREST, LIABILITY
- `unitPrice DOUBLE PRECISION NOT NULL`
- `updatedAt TIMESTAMP(3) NOT NULL`
- `userId TEXT NOT NULL` — FK → User(id), ON DELETE CASCADE
- Indexes: accountId, date, isDraft, userId

### "Account"
- **COMPOSITE PK: `(id, userId)`**
- `id TEXT NOT NULL DEFAULT uuid()`
- `userId TEXT NOT NULL` — FK → User(id), ON DELETE CASCADE
- `balance DOUBLE PRECISION NOT NULL DEFAULT 0`
- `comment TEXT NULL`
- `createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `currency TEXT NULL`
- `isExcluded BOOLEAN NOT NULL DEFAULT false`
- `name TEXT NULL`
- `platformId TEXT NULL` — FK → Platform(id), ON DELETE SET NULL
- `updatedAt TIMESTAMP(3) NOT NULL`
- Indexes: currency, id (standalone), isExcluded, name, userId

### "AccountBalance"
- PK: `id TEXT`
- `accountId TEXT NOT NULL` — composite FK → Account(id, userId), ON DELETE CASCADE
- `userId TEXT NOT NULL` — part of composite FK above
- `createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `date TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updatedAt TIMESTAMP(3) NOT NULL`
- `value DOUBLE PRECISION NOT NULL`
- UNIQUE: (accountId, date)
- Indexes: accountId, date

### "SymbolProfile"
- PK: `id TEXT`
- `assetClass TEXT NULL` — enum: ALTERNATIVE_INVESTMENT, COMMODITY, EQUITY, FIXED_INCOME, LIQUIDITY, REAL_ESTATE
- `assetSubClass TEXT NULL` — enum: BOND, CASH, COLLECTIBLE, COMMODITY, CRYPTOCURRENCY, ETF, MUTUALFUND, PRECIOUS_METAL, PRIVATE_EQUITY, STOCK
- `comment TEXT NULL`
- `countries JSONB NULL`
- `createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `currency TEXT NOT NULL`
- `cusip TEXT NULL`
- `dataSource TEXT NOT NULL` — enum: ALPHA_VANTAGE, COINGECKO, EOD_HISTORICAL_DATA, FINANCIAL_MODELING_PREP, GHOSTFOLIO, GOOGLE_SHEETS, MANUAL, RAPID_API, YAHOO
- `figi TEXT NULL`
- `figiComposite TEXT NULL`
- `figiShareClass TEXT NULL`
- `holdings JSONB NULL DEFAULT '[]'`
- `isActive BOOLEAN NOT NULL DEFAULT true`
- `isin TEXT NULL`
- `name TEXT NULL`
- `scraperConfiguration JSONB NULL`
- `sectors JSONB NULL`
- `symbol TEXT NOT NULL`
- `symbolMapping JSONB NULL`
- `updatedAt TIMESTAMP(3) NOT NULL`
- `url TEXT NULL`
- `userId TEXT NULL` — FK → User(id), ON DELETE CASCADE
- UNIQUE: (dataSource, symbol)
- Indexes: assetClass, currency, cusip, dataSource, isActive, isin, name, symbol

### "SymbolProfileOverrides"
- PK: `symbolProfileId TEXT` — FK → SymbolProfile(id), ON DELETE CASCADE
- `assetClass TEXT NULL`
- `assetSubClass TEXT NULL`
- `countries JSONB NULL DEFAULT '[]'`
- `holdings JSONB NULL DEFAULT '[]'`
- `name TEXT NULL`
- `sectors JSONB NULL DEFAULT '[]'`
- `updatedAt TIMESTAMP(3) NOT NULL`
- `url TEXT NULL`

### "MarketData"
- PK: `id TEXT`
- `createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `dataSource TEXT NOT NULL`
- `date TIMESTAMP(3) NOT NULL`
- `marketPrice DOUBLE PRECISION NOT NULL`
- `state TEXT NOT NULL DEFAULT 'CLOSE'` — enum: CLOSE, INTRADAY
- `symbol TEXT NOT NULL`
- UNIQUE: (dataSource, date, symbol)
- Indexes: dataSource, (dataSource + symbol), date, marketPrice, state, symbol
- **NO FK to SymbolProfile** — join via natural key (dataSource, symbol)

### "Tag"
- PK: `id TEXT`
- `name TEXT NOT NULL`
- `userId TEXT NULL` — FK → User(id), ON DELETE CASCADE
- UNIQUE: (name, userId)
- Indexes: name

### "_OrderToTag" (implicit Prisma join table)
- COMPOSITE PK: `(A, B)`
- `A TEXT NOT NULL` → Order(id), ON DELETE CASCADE
- `B TEXT NOT NULL` → Tag(id), ON DELETE CASCADE
- Index: B

### "_UserWatchlist" (implicit Prisma join table)
- COMPOSITE PK: `(A, B)`
- `A TEXT NOT NULL` → SymbolProfile(id), ON DELETE CASCADE
- `B TEXT NOT NULL` → User(id), ON DELETE CASCADE
- Index: B

### "User" (join-relevant only)
- PK: `id TEXT`
- `createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updatedAt TIMESTAMP(3) NOT NULL`

## Join Rules

1. **Account composite PK**: Always join on BOTH `id` AND `userId`.
2. **Order → Account**: `o."accountId" = a."id" AND o."accountUserId" = a."userId"` (LEFT JOIN, nullable).
3. **AccountBalance → Account**: `ab."accountId" = a."id" AND ab."userId" = a."userId"`.
4. **MarketData → SymbolProfile**: `md."dataSource" = sp."dataSource" AND md."symbol" = sp."symbol"` (natural key, no FK).
5. **_OrderToTag**: `A` = Order.id, `B` = Tag.id (alphabetical: Order < Tag).
6. **_UserWatchlist**: `A` = SymbolProfile.id, `B` = User.id (alphabetical: SymbolProfile < User).
7. **Timestamps**: `TIMESTAMP(3)` = millisecond precision, no timezone. Use `::date` for date-only.
8. **Money**: `DOUBLE PRECISION` — always `ROUND(x::numeric, 2)` for display.
9. **Currency**: Plain TEXT, no automatic conversion. Aggregates across currencies are mixed.
10. **Standard filters**: `isDraft = false` on Order, `isExcluded = false` on Account, `isActive = true` on SymbolProfile.
11. **SymbolProfileOverrides**: Use `COALESCE(spo."assetClass", sp."assetClass")` to prefer overrides.
