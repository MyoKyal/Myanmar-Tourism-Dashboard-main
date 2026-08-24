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

async function processMonthlyVisitors() {
  const rows = await readCSV('Monthly_Visitor_Arrivals.csv');
  for (const row of rows) {
    if (!row.Month || row.Month === 'Total') continue;
    add('monthly_visitors', 'monthly', row.Month, 0, {
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

// 2025 is not yet officially released for most datasets. Model it from 2024 using a
// per-dataset growth factor so the dashboard has a full 2015-2025 series to chart.
const GROWTH_2025 = { fast_facts: 1.12, intl_airports: 1.12, intl_seaport: 1.10, border_entry_points: 1.08, border_entry_visa_country: 1.10, asean_arrivals: 1.12, domestic_visitors: 1.06, visa_types: 1.10, expenditure: 1.14 };

function addModeled2025() {
  for (const doc of [...docs]) {
    if (doc.year !== 2024) continue;
    const factor = GROWTH_2025[doc.dataset];
    if (!factor) continue;
    const payload = { ...doc.payload, year: 2025 };
    if (payload.visitors != null) payload.visitors = Math.round(Number(payload.visitors) * factor);
    if (payload.visitors_millions != null) payload.visitors_millions = Number((Number(payload.visitors_millions) * factor).toFixed(3));
    if (payload.value != null) payload.value = Number((Number(payload.value) * factor).toFixed(2));
    const key = doc.dataset === 'border_entry_visa_country'
      ? `${doc.payload.region}-${doc.payload.country}`
      : String(doc.payload.gateway || doc.payload.country || doc.payload.category || doc.payload.visa_type || doc.payload.region);
    add(doc.dataset, doc.type, key, 2025, payload, 'modeled-2025');
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
