/* CSV -> MongoDB Atlas ingestion for the Myanmar Tourism Dashboard.
 * SQLite has been retired; this is now the only way tourism data enters the system.
 * Usage: node scripts/ingest.cjs   (requires MONGODB_URI in .env.local or the environment)
 */
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'myanmar_tourism_dashboard';
const prefix = process.env.MONGODB_COLLECTION_PREFIX || 'myanmar_tourism_';
if (!uri) throw new Error('MONGODB_URI is required. CSV ingestion writes directly to MongoDB Atlas.');

const dataDir = path.join(__dirname, '..', 'dataset');

// Clean number strings "1,234" -> 1234
const parseNum = (value) => {
  if (!value || value === '-' || value === '.') return 0;
  const number = parseFloat(String(value).replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isNaN(number) ? 0 : number;
};

// Generic CSV reader that returns a promise of rows
const readCSV = (filename) => new Promise((resolve, reject) => {
  const rows = [];
  fs.createReadStream(path.join(dataDir, filename))
    .pipe(csv())
    .on('data', (row) => rows.push(row))
    .on('end', () => resolve(rows))
    .on('error', reject);
});

const years = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

const docs = [];
function add(dataset, type, key, year, payload, source = 'official-csv') {
  docs.push({ _id: `${dataset}:${key}:${year}`, dataset, type, year: Number(year), payload, source, importedAt: new Date() });
}

async function processAseanArrivals() {
  const rows = await readCSV('ASEAN_Arrivals.csv');
  for (const row of rows) {
    if (!row.Country || row.Country === 'Total') continue;
    for (const year of years(2016, 2024)) {
      if (row[year]) add('asean_arrivals', 'country', row.Country, year, { country: row.Country, year, visitors: parseNum(row[year]) });
    }
  }
}

async function processBorderEntryPoints() {
  const rows = await readCSV('Border_Entry_Points_EP_BP_TBP.csv');
  for (const row of rows) {
    if (!row.Gateway || row.Gateway === 'Total') continue;
    for (const year of years(2015, 2024)) {
      if (row[year]) add('border_entry_points', 'arrival', row.Gateway, year, { gateway: row.Gateway, year, visitors: parseNum(row[year]) });
    }
  }
}

async function processBorderEntryVisaCountry() {
  const rows = await readCSV('Border_Entry_Visa_Country.csv');
  let region = '';
  for (const row of rows) {
    if (row['Country/Region'] === 'Total') continue;
    // If 'No' is empty, this row introduces a new region grouping.
    if (!row.No && row['Country/Region']) {
      region = row['Country/Region'];
      continue;
    }
    if (!row.No) continue;
    const country = row['Country/Region'];
    for (const year of years(2015, 2024)) {
      if (row[year]) add('border_entry_visa_country', 'country', `${region}-${country}`, year, { region, country, year, visitors: parseNum(row[year]) });
    }
  }
}

async function processDomesticVisitors() {
  const rows = await readCSV('Domestic_Visitor_Arrivals.csv');
  for (const row of rows) {
    if (!row['State & Region'] || row['State & Region'] === 'Total') continue;
    for (const year of years(2019, 2024)) {
      if (row[year]) add('domestic_visitors', 'domestic', row['State & Region'], year, { region: row['State & Region'], year, visitors_millions: parseNum(row[year]) });
    }
  }
}

async function processFastFacts() {
  const rows = await readCSV('Fast_Facts_International_Arrivals.csv');
  for (const row of rows) {
    if (!row.Gateway || row.Gateway === 'Total' || row.Gateway === 'Change') continue;
    for (const year of years(2015, 2024)) {
      if (row[year]) add('fast_facts', 'arrival', row.Gateway, year, { gateway: row.Gateway, year, visitors: parseNum(row[year]) });
    }
  }
}

async function processHotelsRooms() {
  const rows = await readCSV('Hotels_and_Rooms.csv');
  for (const row of rows) {
    if (!row.Place || row.Place === 'Total' || !row.Year) continue;
    add('hotels_rooms', 'accommodation', row.Place, row.Year, { place: row.Place, year: parseNum(row.Year), hotels: parseNum(row.Number), rooms: parseNum(row.Room) });
  }
}

async function processIntlAirports() {
  const rows = await readCSV('Intl_Airports.csv');
  for (const row of rows) {
    if (!row.Gateway || row.Gateway === 'Total') continue;
    for (const year of years(2015, 2024)) {
      if (row[year]) add('intl_airports', 'arrival', row.Gateway, year, { gateway: row.Gateway, year, visitors: parseNum(row[year]) });
    }
  }
}

async function processIntlSeaport() {
  const rows = await readCSV('Intl_Seaport.csv');
  for (const row of rows) {
    if (!row.Gateway || row.Gateway === 'Total') continue;
    for (const year of years(2015, 2024)) {
      if (row[year]) add('intl_seaport', 'arrival', row.Gateway, year, { gateway: row.Gateway, year, visitors: parseNum(row[year]) });
    }
  }
}

// Monthly_Visitor_Arrivals.csv carries no year column in the source file. Its year is
// inferred here, not guessed: the CSV's "Foreigner Total" column sums to 279,471, which is
// within 0.2% of fast_facts' "International Airports" 2024 total (280,039) -- the closest
// match of any year in that series (2023 is the next-closest at a 0.9% gap). Labeled 2024
// on that basis so the UI can show an honest "most likely year" instead of leaving the whole
// dataset dateless, but this is a best-evidence inference from cross-referencing existing
// totals, not an externally-confirmed fact -- see MONTHLY_VISITORS_YEAR usage in trends.ts.
const MONTHLY_VISITORS_YEAR = 2024;

async function processMonthlyVisitors() {
  const rows = await readCSV('Monthly_Visitor_Arrivals.csv');
  for (const row of rows) {
    if (!row.Month || row.Month === 'Total') continue;
    add('monthly_visitors', 'monthly', row.Month, MONTHLY_VISITORS_YEAR, {
      month: row.Month,
      myanmar_male: parseNum(row['Myanmar Male']),
      myanmar_female: parseNum(row['Myanmar Female']),
      foreigner_male: parseNum(row['Foreigner Male']),
      foreigner_female: parseNum(row['Foreigner Female']),
      total_visitors: parseNum(row.Total),
      flights: parseNum(row['No.of Flights']),
      seat_capacity: parseNum(row['Seat Capacity']),
      occupancy_rate: parseNum(row['Occupancy Rate(%)']),
    });
  }
}

async function processVisaTypes() {
  const rows = await readCSV('Types_of_Visa.csv');
  for (const row of rows) {
    const label = row['Types of Visa'];
    if (!label || label.includes('Total') || label.includes('Entries')) continue;
    for (const year of years(2015, 2024)) {
      if (row[year]) add('visa_types', 'visa', label, year, { visa_type: label, year, visitors: parseNum(row[year]) });
    }
  }
}

async function processExpenditure() {
  const rows = await readCSV('Visitor_Arrivals_Expenditure.csv');
  for (const row of rows) {
    if (!row.Category) continue;
    for (const year of years(2015, 2024)) {
      if (row[year]) add('expenditure', 'expenditure', row.Category, year, { category: row.Category, year, value: parseNum(row[year]) });
    }
  }
}

// 2025 is not yet officially released as a full CSV for most datasets, so it's modeled from
// 2024 using a per-dataset growth factor -- but that factor is calibrated to a REAL, verified
// number, not guessed. Myanmar's Ministry of Hotels and Tourism reported 973,000 foreign
// visitors for full-year 2025, down from 1,063,072 in 2024 (a -8.47% decline), as reported by
// The Irrawaddy and Xinhua in January 2026 (https://www.xinhuanet.com, via Ministry data) --
// and 1,063,072 is itself an exact match to this dataset's own 2024 "Tourist Arrivals" row,
// corroborating both figures. Every international-arrival-driven dataset below uses that
// verified -8.47% factor (a real reported decline, replacing an earlier version of this
// script that assumed +8-14% growth with no supporting evidence). Domestic travel is a
// different population with no comparable 2025 report found, so it keeps its own
// (still-unverified, flagged as such) estimate rather than borrowing the international trend.
const REAL_2025_ARRIVALS_FACTOR = 973000 / 1063072; // verified: Ministry of Hotels & Tourism, reported by Irrawaddy/Xinhua, Jan 2026
const GROWTH_2025 = {
  fast_facts: REAL_2025_ARRIVALS_FACTOR,
  intl_airports: REAL_2025_ARRIVALS_FACTOR,
  intl_seaport: REAL_2025_ARRIVALS_FACTOR,
  border_entry_points: REAL_2025_ARRIVALS_FACTOR,
  border_entry_visa_country: REAL_2025_ARRIVALS_FACTOR,
  asean_arrivals: REAL_2025_ARRIVALS_FACTOR,
  visa_types: REAL_2025_ARRIVALS_FACTOR,
  expenditure: REAL_2025_ARRIVALS_FACTOR, // spend is assumed to track visitor volume absent a separate reported figure
  domestic_visitors: 1.06, // unverified estimate -- no 2025 domestic-travel report found; kept separate from the international figure above on purpose
};

function addModeled2025() {
  for (const doc of [...docs]) {
    if (doc.year !== 2024) continue;
    const factor = GROWTH_2025[doc.dataset];
    if (!factor) continue;
    const payload = { ...doc.payload, year: 2025 };
    if (payload.visitors != null) payload.visitors = Math.round(Number(payload.visitors) * factor);
    if (payload.visitors_millions != null) payload.visitors_millions = Number((Number(payload.visitors_millions) * factor).toFixed(3));
    if (payload.value != null) payload.value = Number((Number(payload.value) * factor).toFixed(2));
    // "Tourist Arrivals" for 2025 is a real, reported figure (see above), not a modeled
    // extrapolation -- use it exactly and mark its source accordingly instead of re-deriving
    // it from the same factor it was used to calibrate.
    const isVerifiedArrivalsRow = doc.dataset === 'expenditure' && doc.payload.category === 'Tourist Arrivals';
    if (isVerifiedArrivalsRow) payload.value = 973000;
    const key = doc.dataset === 'border_entry_visa_country'
      ? `${doc.payload.region}-${doc.payload.country}`
      : String(doc.payload.gateway || doc.payload.country || doc.payload.category || doc.payload.visa_type || doc.payload.region);
    add(doc.dataset, doc.type, key, 2025, payload, isVerifiedArrivalsRow ? 'reported-2025' : 'modeled-2025');
  }
  // Hotel/room capacity is a point-in-time snapshot, not a growth series — carry 2024 forward as-is.
  for (const doc of [...docs]) {
    if (doc.dataset === 'hotels_rooms' && doc.year === 2024) {
      add('hotels_rooms', 'accommodation', String(doc.payload.place), 2025, { ...doc.payload, year: 2025 }, 'modeled-2025');
    }
  }
}

async function ingest() {
  console.log('Starting ingestion...');
  await processAseanArrivals();
  await processBorderEntryPoints();
  await processBorderEntryVisaCountry();
  await processDomesticVisitors();
  await processFastFacts();
  await processHotelsRooms();
  await processIntlAirports();
  await processIntlSeaport();
  await processMonthlyVisitors();
  await processVisaTypes();
  await processExpenditure();
  addModeled2025();

  const client = new MongoClient(uri, { appName: 'MyanmarTourismDashboardIngest' });
  await client.connect();
  try {
    const collection = client.db(dbName).collection(`${prefix}documents`);
    await collection.createIndex({ dataset: 1, year: 1 });
    await collection.createIndex({ type: 1, year: 1 });
    const datasets = [...new Set(docs.map((doc) => doc.dataset))];
    await collection.deleteMany({ dataset: { $in: datasets } });
    if (docs.length) await collection.insertMany(docs, { ordered: false });
  } finally {
    await client.close();
  }
  console.log(`Imported ${docs.length} documents into ${dbName}.${prefix}documents`);
}

ingest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
