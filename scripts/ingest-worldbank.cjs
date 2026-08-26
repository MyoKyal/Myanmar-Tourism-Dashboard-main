/* World Bank Open Data -> MongoDB ingestion.
 * Pulls real, independently-published economic indicators for Myanmar (GDP and
 * international tourism receipts) to ground the dashboard's expenditure figures
 * against an external source, and to compute tourism's share of GDP -- a figure
 * the existing CSV-derived datasets never provide.
 * Source: World Bank World Development Indicators, https://data.worldbank.org
 * Usage: node scripts/ingest-worldbank.cjs   (requires MONGODB_URI in .env.local)
 */
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'myanmar_tourism_dashboard';
const prefix = process.env.MONGODB_COLLECTION_PREFIX || 'myanmar_tourism_';
if (!uri) throw new Error('MONGODB_URI is required.');

const COUNTRY = 'MMR';
const INDICATORS = {
  gdpUsd: 'NY.GDP.MKTP.CD',            // GDP (current US$)
  receiptsUsd: 'ST.INT.RCPT.CD',       // International tourism, receipts (current US$)
};

async function fetchIndicator(indicator) {
  const url = `https://api.worldbank.org/v2/country/${COUNTRY}/indicator/${indicator}?format=json&per_page=200`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`World Bank API request failed for ${indicator}: ${res.status}`);
  const json = await res.json();
  const rows = json[1] || [];
  const byYear = {};
  for (const row of rows) {
    if (row.value != null) byYear[Number(row.date)] = Number(row.value);
  }
  return byYear;
}

async function ingest() {
  console.log('Fetching World Bank indicators for Myanmar...');
  const [gdpByYear, receiptsByYear] = await Promise.all([
    fetchIndicator(INDICATORS.gdpUsd),
    fetchIndicator(INDICATORS.receiptsUsd),
  ]);

  const docs = [];
  const importedAt = new Date();
  for (const [year, gdpUsd] of Object.entries(gdpByYear)) {
    docs.push({ _id: `worldbank_gdp:MMR:${year}`, dataset: 'worldbank_gdp', type: 'economics', year: Number(year), payload: { year: Number(year), gdpUsd }, source: 'world-bank-api', importedAt });
  }
  for (const [year, receiptsUsd] of Object.entries(receiptsByYear)) {
    docs.push({ _id: `worldbank_tourism_receipts:MMR:${year}`, dataset: 'worldbank_tourism_receipts', type: 'economics', year: Number(year), payload: { year: Number(year), receiptsUsd }, source: 'world-bank-api', importedAt });
  }

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
  console.log(`Imported ${docs.length} documents (GDP: ${Object.keys(gdpByYear).length} years, tourism receipts: ${Object.keys(receiptsByYear).length} years) into ${dbName}.${prefix}documents`);
}

ingest().catch((err) => {
  console.error('World Bank ingestion failed:', err);
  process.exit(1);
});
