# Myanmar Tourism Dashboard — Project Explanation

## 1. What the project does

This is a tourism data analysis and management dashboard for Myanmar. It turns tourism datasets into:

- KPI cards for international visitors, domestic visitors, hotels, rooms, and expenditure.
- Interactive charts for yearly trends, monthly seasonality, visitor origins, entry points, visas, accommodation, and spending.
- Filters for year, month, country, and other business dimensions.
- A Decision Center that converts user constraints into a practical travel recommendation.
- English/Myanmar language switching and light/dark display modes.

The application runs at `http://127.0.0.1:3000` in development mode.

## 2. High-level structure

```text
src/
  app/                    Next.js routes and page UI
    page.tsx              Main overview
    international/        International visitor analysis
    domestic/             Domestic tourism analysis
    trends/               Time trends and seasonality
    visas/                Visa analysis
    entry-points/         Airport, border, and seaport analysis
    hotels/               Hotel and room analysis
    expenditure/          Tourism expenditure analysis
    decisions/            Interactive decision-making screen
  actions/                Server-side analytics and decision functions
  components/             Shared sidebar, filters, KPI cards, preferences
  lib/
    db.ts                 SQLite compatibility/import database
    documentStore.ts      MongoDB Atlas document collection adapter
    FilterContext.tsx     Shared filter state
scripts/
  ingest.cjs              CSV-to-SQLite ingestion utility
dataset/                  Source CSV files
tourism.db                Existing relational import database
MongoDB Atlas             Primary document database for this project
```

## 3. Technology stack

- **Next.js 16** and the App Router for routing, server actions, and rendering.
- **React 19** for interactive UI.
- **TypeScript** for application code and data contracts.
- **Tailwind CSS 4** for styling.
- **Recharts** for charts.
- **Lucide React** for interface icons.
- **SQLite / better-sqlite3** for the original import and compatibility layer.
- **MongoDB Atlas** for the NoSQL decision and document workflows.
- **CSV parser** for ingesting the supplied datasets.

## 4. NoSQL: the main focus

### Why NoSQL is useful here

Tourism data arrives in different shapes: arrivals, passports, visas, hotels, rooms, expenditure, and destinations do not all share the same fields. A document model can store each record with its own payload without forcing every dataset into one rigid schema.

### How this project uses it

`src/lib/documentStore.ts` is the MongoDB Atlas boundary. It exposes a collection-style API:

```ts
getTourismCollection('arrival', 2025)
```

Each document has:

```ts
{
  _id: "arrival:International Airports:2025",
  type: "arrival",
  year: 2025,
  payload: { gateway: "International Airports", visitors: 123456 },
  source: "modeled-2025"
}
```

The store imports the existing analytical records into MongoDB Atlas on first use and reads them through indexed collections. No local JSON document database is created. If `MONGODB_URI` is not configured during local development, the adapter reads the existing SQLite import directly as a compatibility fallback.

The document contract is intentionally isolated so the application can evolve without changing the Decision Center API.

### Atlas isolation

This project does not use a generic database name or generic collection names. It uses:

- Database: `myanmar_tourism_dashboard`
- Collection prefix: `myanmar_tourism_`
- Optional environment overrides: `MONGODB_DB_NAME` and `MONGODB_COLLECTION_PREFIX`

That allows it to share an Atlas cluster with other projects without reading or writing their databases or collections. For stronger isolation, create an Atlas database user whose role is limited to `myanmar_tourism_dashboard`.

### MongoDB collections

- `myanmar_tourism_documents` — imported arrivals, accommodation, expenditure, country, and visa documents.
- `myanmar_tourism_destination_cost` — daily planning cost by destination.
- `myanmar_tourism_destination_safety` — safety score and operational notes.
- `myanmar_tourism_destination_seasonality` — peak and shoulder months.
- `myanmar_tourism_destination_visa` — passport/visa planning rules.

The destination collections are seeded with a planning baseline on first connection and should be reviewed by an administrator before public or commercial use.

### Current migration status

The new Decision Center reads from MongoDB Atlas. Existing chart pages retain the SQLite compatibility layer so the historical dashboard continues to work while the migration is incremental and safe. The same collection contract can be used to migrate every analytics action later.

## 5. Data lifecycle

1. Source CSV files live in `dataset/`.
2. `scripts/ingest.cjs` imports those files into `tourism.db`.
3. The database startup migration creates 2025 planning estimates from the latest 2024 values when official 2025 rows are unavailable.
4. `documentStore.ts` imports the records into MongoDB Atlas collections.
5. Server actions aggregate or filter those documents for the UI.
6. Client pages render charts, KPIs, and decision results.

### Important 2025 note

The current 2025 rows are **modeled estimates**, not official government statistics. They are marked with `source: "modeled-2025"` and should be replaced when official 2025 releases are available.

## 6. How decision making works

The Decision Center accepts:

- Budget per person in USD
- Passport nationality
- Number of travel days
- Number of travellers
- Trip purpose: leisure, business, or family
- Preferred destination region

The server action `makeTravelDecision()` then:

1. Normalizes invalid or extreme inputs.
2. Calculates total budget and daily budget per person.
3. Chooses a destination using purpose, budget, and region preference.
4. Adds a reserve recommendation (12% of total budget).
5. Calculates budget risk: low, medium, or high.
6. Gives passport/visa guidance based on ASEAN versus non-ASEAN nationality.
7. Returns a confidence score and the reasons used in the recommendation.

Supported regions include Yangon, Mandalay, Bagan, Inle Lake, Shan, Mon, Rakhine, Chin, Kayin, Kachin, Sagaing, Tanintharyi, Ayeyarwady, Naypyidaw, and Ngapali/beach destinations.

This is a transparent rules-based decision engine, not an opaque AI model. That makes the result explainable and easy to audit. It can later be upgraded with destination-level prices, live visa APIs, hotel availability, safety data, weather, or a trained recommendation model.

## 7. User interface functions

- **Light mode** is the default; the preference is saved in browser storage.
- **Dark mode** is available from the sidebar.
- **Myanmar language** can be toggled from the sidebar for the navigation and decision screen.
- **Global filters** update the analytical pages and insight cards.
- **Decision Center** provides a form-driven recommendation rather than a passive chart. It uses destination cost, safety, seasonality, and visa collections when returning a recommendation.

## 8. Running the project

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

For Atlas-backed mode, copy `.env.example` to `.env.local`, fill in `MONGODB_URI`, and use a project-specific Atlas user/database. Never commit `.env.local`.

For a production compilation check:

```bash
npm run build
```

## 9. Recommended next expansion

For a larger production system, the next improvements would be:

- Add monitoring, backups, and role-based access controls for the MongoDB Atlas database.
- Move all chart actions from SQLite to the document repository.
- Add user accounts, saved scenarios, and decision history.
- Add destination-level cost, safety, seasonality, and visa collections.
- Add an admin import screen for new CSV/API data.
- Add official 2025 data and a data-quality approval workflow.
- Add BigQuery/Spark only when data volume justifies a big-data platform.
