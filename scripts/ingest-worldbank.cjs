/* World Bank Open Data -> MongoDB ingestion.
 * Pulls real, independently-published economic indicators to ground the dashboard's
 * expenditure figures against an external source, compute tourism's share of GDP, and
 * benchmark Myanmar's tourism revenue against its ASEAN neighbors -- none of which the
 * existing CSV-derived datasets can do on their own.
 * Source: World Bank World Development Indicators, https://data.worldbank.org
 * Usage: node scripts/ingest-worldbank.cjs   (requires MONGODB_URI in .env.local)
 *
 * ST.INT.RCPT.CD (tourism receipts) genuinely stops at 2019-2020 for Myanmar and every ASEAN
 * neighbor checked -- confirmed by querying the live API directly, not an artifact of when
 * this script last ran. The four related indicators (ST.INT.ARVL, ST.INT.XPND.CD,
 * ST.INT.TRNR.CD, ST.INT.TVLR.CD) show the same cutoff for Myanmar, so this is a real gap in
 * World Bank's post-pandemic/coup-era reporting for the region, not something re-running this
 * script or picking a different indicator can fix. Re-running it will pick up newer years
 * automatically if/when the World Bank ever backfills them -- no code change needed then.
 */
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'myanmar_tourism_dashboard';
const prefix = process.env.MONGODB_COLLECTION_PREFIX || 'myanmar_tourism_';
if (!uri) throw new Error('MONGODB_URI is required.');

const GDP_INDICATOR = 'NY.GDP.MKTP.CD';        // GDP (current US$)
const RECEIPTS_INDICATOR = 'ST.INT.RCPT.CD';   // International tourism, receipts (current US$)

// Country names match the exact strings used in the existing asean_arrivals dataset
// (see scripts/ingest.cjs / ASEAN_Arrivals.csv), so the two can be joined/displayed
// consistently without a second name-normalization step.
const RECEIPTS_COUNTRIES = {
  MMR: 'Myanmar',
  BRN: 'Brunei Darussalam',
  KHM: 'Cambodia',
  IDN: 'Indonesia',
  LAO: 'Lao PDR',
  MYS: 'Malaysia',
  PHL: 'Philippines',
  SGP: 'Singapore',
  THA: 'Thailand',
  VNM: 'Viet Nam',
};

async function fetchIndicator(iso3, indicator) {
  const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${indicator}?format=json&per_page=200`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`World Bank API request failed for ${iso3}/${indicator}: ${res.status}`);
  const json = await res.json();
  const rows = json[1] || [];
  const byYear = {};
  for (const row of rows) {
    if (row.value != null) byYear[Number(row.date)] = Number(row.value);
  }
  return byYear;
}

async function ingest() {
  console.log('Fetching World Bank indicators...');
  const [gdpByYear, ...receiptsResults] = await Promise.all([
    fetchIndicator('MMR', GDP_INDICATOR),
    ...Object.keys(RECEIPTS_COUNTRIES).map((iso3) => fetchIndicator(iso3, RECEIPTS_INDICATOR)),
  ]);

  const docs = [];
  const importedAt = new Date();
  for (const [year, gdpUsd] of Object.entries(gdpByYear)) {
    docs.push({ _id: `worldbank_gdp:MMR:${year}`, dataset: 'worldbank_gdp', type: 'economics', year: Number(year), payload: { year: Number(year), country: 'Myanmar', gdpUsd }, source: 'world-bank-api', importedAt });
  }

  let receiptsYearCount = 0;
  Object.keys(RECEIPTS_COUNTRIES).forEach((iso3, i) => {
    const country = RECEIPTS_COUNTRIES[iso3];
    const byYear = receiptsResults[i];
    for (const [year, receiptsUsd] of Object.entries(byYear)) {
      docs.push({ _id: `worldbank_tourism_receipts:${iso3}:${year}`, dataset: 'worldbank_tourism_receipts', type: 'economics', year: Number(year), payload: { year: Number(year), country, countryIso3: iso3, receiptsUsd }, source: 'world-bank-api', importedAt });
      receiptsYearCount += 1;
    }
  });

  if (docs.length === 0) throw new Error('World Bank API returned no usable data -- aborting without touching the database.');

  const client = new MongoClient(uri, { appName: 'MyanmarTourismDashboardIngest' });
  await client.connect();
  try {
    const collection = client.db(dbName).collection(`${prefix}documents`);
    const datasets = [...new Set(docs.map((doc) => doc.dataset))];
    await collection.deleteMany({ dataset: { $in: datasets } });
    await collection.insertMany(docs, { ordered: false });
  } finally {
    await client.close();
  }
  console.log(`Imported ${docs.length} documents (GDP: ${Object.keys(gdpByYear).length} years for Myanmar, tourism receipts: ${receiptsYearCount} country-years across ${Object.keys(RECEIPTS_COUNTRIES).length} countries) into ${dbName}.${prefix}documents`);
}

ingest().catch((err) => {
  console.error('World Bank ingestion failed:', err);
  process.exit(1);
});
