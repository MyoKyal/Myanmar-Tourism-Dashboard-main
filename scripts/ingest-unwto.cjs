/* UN Tourism (untourism.int) Data Dashboard -> MongoDB ingestion.
 *
 * World Bank's ST.INT.RCPT.CD indicator (see ingest-worldbank.cjs) mirrors the same
 * underlying UN Tourism series, but that mirror lags well behind UN Tourism's own site for
 * several ASEAN countries -- e.g. the World Bank API returns Thailand only through 2022,
 * while UN Tourism's own dashboard already shows Thailand's full 2025 figure. Confirmed by
 * checking data.worldbank.org's own indicator page directly, which cites "UN Tourism" as
 * its source and (for Myanmar specifically) shows the identical 1995-2019 range as the API
 * -- so this isn't a case of picking a "better" source, it's the SAME primary source with
 * less publishing lag for countries other than Myanmar.
 *
 * There is no public bulk API or CSV export for this dashboard (it's a Power BI embed with
 * per-country filters, not a queryable dataset), so these figures were read by hand from its
 * Tourism Receipts > Annual page, one ASEAN country at a time, on 2026-09-10 -- the citation
 * visible on each chart reads "UN Tourism, May 2026". This script re-inserts that fixed,
 * hand-curated snapshot; it does not re-query the dashboard, unlike ingest-worldbank.cjs's
 * live API calls. Re-run it only after manually re-checking the dashboard for a newer
 * snapshot and updating RECEIPTS_2025 below.
 *
 * Deliberately excluded, per the same real-vs-simulated-data discipline as the rest of this
 * project:
 *   - Myanmar: no receipts data past 2019/2020 on UN Tourism's own dashboard either -- a
 *     real reporting gap independently confirmed in both sources, not something this file
 *     can fix.
 *   - Lao PDR: does not appear as a selectable country for this indicator on the dashboard
 *     at all -- no 2025 figure exists to record.
 *   - Viet Nam: the dashboard's latest period for Viet Nam is "Jan-Jun 2025" (a partial-year
 *     figure, +24.7% vs Jan-Jun 2024) with no full-year USD total yet -- recording a
 *     "2025" annual figure from that would misrepresent a half-year number as a full year.
 *
 * Usage: node scripts/ingest-unwto.cjs   (requires MONGODB_URI in .env.local)
 */
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'myanmar_tourism_dashboard';
const prefix = process.env.MONGODB_COLLECTION_PREFIX || 'myanmar_tourism_';
if (!uri) throw new Error('MONGODB_URI is required.');

// USD figures converted from the dashboard's "USD billion" display (e.g. 44.8 -> 44,800,000,000)
// to match worldbank_tourism_receipts' existing raw-USD unit convention.
const RECEIPTS_2025 = [
  { country: 'Thailand', countryIso3: 'THA', receiptsUsd: 44_800_000_000, changePct: 5.9 },
  { country: 'Singapore', countryIso3: 'SGP', receiptsUsd: 27_500_000_000, changePct: 12.1 },
  { country: 'Malaysia', countryIso3: 'MYS', receiptsUsd: 25_800_000_000, changePct: 23.9 },
  { country: 'Indonesia', countryIso3: 'IDN', receiptsUsd: 18_300_000_000, changePct: 13.7, note: 'Year-to-date figure on the source dashboard, not a confirmed full-year total.' },
  { country: 'Philippines', countryIso3: 'PHL', receiptsUsd: 8_700_000_000, changePct: -6.1 },
  { country: 'Cambodia', countryIso3: 'KHM', receiptsUsd: 3_800_000_000, changePct: 5.1 },
  { country: 'Brunei Darussalam', countryIso3: 'BRN', receiptsUsd: 160_000_000, changePct: 24.0 },
];

async function ingest() {
  const importedAt = new Date();
  const docs = RECEIPTS_2025.map((row) => ({
    _id: `unwto_tourism_receipts:${row.countryIso3}:2025`,
    dataset: 'unwto_tourism_receipts',
    type: 'economics',
    year: 2025,
    payload: { year: 2025, country: row.country, countryIso3: row.countryIso3, receiptsUsd: row.receiptsUsd, changePct: row.changePct, ...(row.note ? { note: row.note } : {}) },
    source: 'unwto-dashboard',
    importedAt,
  }));

  const client = new MongoClient(uri, { appName: 'MyanmarTourismDashboardIngest' });
  await client.connect();
  try {
    const collection = client.db(dbName).collection(`${prefix}documents`);
    await collection.deleteMany({ dataset: 'unwto_tourism_receipts' });
    await collection.insertMany(docs, { ordered: false });
  } finally {
    await client.close();
  }
  console.log(`Imported ${docs.length} documents (2025 tourism receipts for ${docs.length} ASEAN countries) into ${dbName}.${prefix}documents`);
}

ingest().catch((err) => {
  console.error('UN Tourism ingestion failed:', err);
  process.exit(1);
});
