import { MongoClient, type Db, type Document } from 'mongodb';
import { getDb } from '@/lib/db';

export type TourismDocument = {
  _id: string;
  type: 'arrival' | 'accommodation' | 'expenditure' | 'country' | 'visa';
  year: number;
  payload: Record<string, unknown>;
  source: 'official-sqlite-import' | 'modeled-2025';
};

export type DestinationProfile = {
  destination: string;
  country: string;
  dailyCost: number;
  safetyScore: number;
  safetyNotes: string;
  peakMonths: string[];
  shoulderMonths: string[];
  visaRule: string;
};

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME || 'myanmar_tourism_dashboard';
const prefix = process.env.MONGODB_COLLECTION_PREFIX || 'myanmar_tourism_';
let clientPromise: Promise<MongoClient> | null = null;
let seedPromise: Promise<void> | null = null;

function mongoEnabled() {
  return Boolean(uri);
}

async function getMongoDb(): Promise<Db> {
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (!clientPromise) clientPromise = new MongoClient(uri, { appName: 'MyanmarTourismDashboard' }).connect();
  return (await clientPromise).db(databaseName);
}

function collectionName(name: string) {
  // Prefixing every collection prevents collisions with any other project in the same Atlas cluster.
  return `${prefix}${name}`;
}

const destinationProfiles: DestinationProfile[] = [
  { destination: 'Yangon', country: 'Myanmar', dailyCost: 42, safetyScore: 70, safetyNotes: 'Urban destination; use registered taxis and monitor local advisories.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Most foreign passports should check eVisa or embassy requirements before travel.' },
  { destination: 'Mandalay', country: 'Myanmar', dailyCost: 38, safetyScore: 66, safetyNotes: 'Cultural city; plan transport between dispersed heritage sites.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check eVisa eligibility and approved entry points for your passport.' },
  { destination: 'Bagan', country: 'Myanmar', dailyCost: 48, safetyScore: 68, safetyNotes: 'Hot, open archaeological area; use licensed guides and carry water.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Tourist visa/eVisa rules vary by nationality; verify before booking.' },
  { destination: 'Inle Lake', country: 'Myanmar', dailyCost: 52, safetyScore: 67, safetyNotes: 'Lake transport is weather-sensitive; book licensed boat operators.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check current tourist visa requirements for your passport.' },
  { destination: 'Ngapali Beach', country: 'Myanmar', dailyCost: 86, safetyScore: 64, safetyNotes: 'Seasonal coastal destination; confirm flights and hotel operations before paying.', peakMonths: ['November', 'December', 'January', 'February', 'March'], shoulderMonths: ['October', 'April'], visaRule: 'Confirm approved arrival point and current visa requirements.' },
  { destination: 'Shan State', country: 'Myanmar', dailyCost: 55, safetyScore: 60, safetyNotes: 'Travel conditions vary by township; check local access advisories.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Confirm regional travel permissions in addition to visa requirements.' },
  { destination: 'Mon State', country: 'Myanmar', dailyCost: 35, safetyScore: 62, safetyNotes: 'Road travel can be long; use trusted transport providers.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check tourist visa requirements and permitted destinations.' },
  { destination: 'Rakhine State', country: 'Myanmar', dailyCost: 45, safetyScore: 45, safetyNotes: 'Access and security conditions can change quickly; verify before travel.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Confirm visa, entry point, and regional access with official sources.' },
  { destination: 'Chin State', country: 'Myanmar', dailyCost: 40, safetyScore: 42, safetyNotes: 'Remote terrain; specialist transport and local permissions may be required.', peakMonths: ['October', 'November', 'December', 'January'], shoulderMonths: ['February', 'March'], visaRule: 'Verify regional permits and entry requirements before planning.' },
  { destination: 'Kayin State', country: 'Myanmar', dailyCost: 34, safetyScore: 52, safetyNotes: 'Check road access and local advisories for remote attractions.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Confirm permitted travel areas for your passport.' },
  { destination: 'Kachin State', country: 'Myanmar', dailyCost: 48, safetyScore: 40, safetyNotes: 'Remote and mountainous; use local operators and confirm access.', peakMonths: ['October', 'November', 'December', 'January'], shoulderMonths: ['February', 'March'], visaRule: 'Check regional permits and current entry requirements.' },
  { destination: 'Sagaing Region', country: 'Myanmar', dailyCost: 32, safetyScore: 44, safetyNotes: 'Review current transport and security guidance before travel.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Confirm regional access and visa requirements.' },
  { destination: 'Tanintharyi Region', country: 'Myanmar', dailyCost: 58, safetyScore: 50, safetyNotes: 'Island and coastal access is seasonal; confirm boats and flights.', peakMonths: ['November', 'December', 'January', 'February', 'March'], shoulderMonths: ['October', 'April'], visaRule: 'Check entry point and regional permissions for your passport.' },
  { destination: 'Ayeyarwady Region', country: 'Myanmar', dailyCost: 36, safetyScore: 55, safetyNotes: 'Allow extra road time and confirm local transport.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Verify tourist visa and destination access requirements.' },
  { destination: 'Naypyidaw', country: 'Myanmar', dailyCost: 40, safetyScore: 72, safetyNotes: 'Sprawling city; plan point-to-point transport in advance.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check current tourist visa requirements for your passport.' },
];

async function seedMongo() {
  if (!mongoEnabled()) return;
  const db = await getMongoDb();
  const docs = db.collection(collectionName('documents'));
  await Promise.all([
    docs.createIndex({ type: 1, year: 1 }),
    db.collection(collectionName('destination_cost')).createIndex({ destination: 1 }),
    db.collection(collectionName('destination_safety')).createIndex({ destination: 1 }),
    db.collection(collectionName('destination_seasonality')).createIndex({ destination: 1 }),
    db.collection(collectionName('destination_visa')).createIndex({ destination: 1, nationality: 1 }),
  ]);
  if (await docs.estimatedDocumentCount() === 0) {
    const sqlite = getDb();
    const documents: TourismDocument[] = [];
    const add = (rows: any[], type: TourismDocument['type'], key: (row: any) => string) => rows.forEach((row) => documents.push({ _id: `${type}:${key(row)}:${row.year}`, type, year: Number(row.year), payload: row, source: Number(row.year) === 2025 ? 'modeled-2025' : 'official-sqlite-import' }));
    add(sqlite.prepare('SELECT gateway, year, visitors FROM fast_facts').all() as any[], 'arrival', (row) => row.gateway);
    add(sqlite.prepare('SELECT gateway, year, visitors FROM border_entry_points').all() as any[], 'arrival', (row) => `border-${row.gateway}`);
    add(sqlite.prepare('SELECT place, year, hotels, rooms FROM hotels_rooms').all() as any[], 'accommodation', (row) => row.place);
    add(sqlite.prepare('SELECT category, year, value FROM expenditure').all() as any[], 'expenditure', (row) => row.category);
    add(sqlite.prepare('SELECT country, year, visitors FROM border_entry_visa_country').all() as any[], 'country', (row) => row.country);
    add(sqlite.prepare('SELECT visa_type, year, visitors FROM visa_types').all() as any[], 'visa', (row) => row.visa_type);
    if (documents.length) await docs.insertMany(documents as unknown as Document[]);
  }
  const cost = db.collection(collectionName('destination_cost'));
  if (await cost.estimatedDocumentCount() === 0) {
    await db.collection(collectionName('destination_cost')).insertMany(destinationProfiles.map((p) => ({ destination: p.destination, country: p.country, dailyCost: p.dailyCost, currency: 'USD', source: 'planning-baseline' })));
    await db.collection(collectionName('destination_safety')).insertMany(destinationProfiles.map((p) => ({ destination: p.destination, safetyScore: p.safetyScore, notes: p.safetyNotes, updatedAt: new Date(), source: 'planning-baseline' })));
    await db.collection(collectionName('destination_seasonality')).insertMany(destinationProfiles.map((p) => ({ destination: p.destination, peakMonths: p.peakMonths, shoulderMonths: p.shoulderMonths, source: 'planning-baseline' })));
    await db.collection(collectionName('destination_visa')).insertMany(destinationProfiles.map((p) => ({ destination: p.destination, nationality: '*', rule: p.visaRule, source: 'planning-baseline' })));
  }
}

async function ready() {
  if (!seedPromise) seedPromise = seedMongo();
  await seedPromise;
}

export async function getTourismCollection(type?: TourismDocument['type'], year?: number): Promise<TourismDocument[]> {
  if (mongoEnabled()) {
    await ready();
    const db = await getMongoDb();
    return db.collection(collectionName('documents')).find({ ...(type ? { type } : {}), ...(year ? { year } : {}) }, { projection: { _id: 1, type: 1, year: 1, payload: 1, source: 1 } }).toArray() as unknown as TourismDocument[];
  }
  // Development fallback: use the relational import directly, without creating a local JSON document database.
  const sqlite = getDb();
  const rows = type === 'accommodation' ? sqlite.prepare('SELECT place, year, hotels, rooms FROM hotels_rooms').all() : sqlite.prepare('SELECT gateway, year, visitors FROM fast_facts').all();
  return (rows as any[]).filter((row) => !year || row.year === year).map((row) => ({ _id: `${type || 'arrival'}:${row.gateway || row.place}:${row.year}`, type: type || 'arrival', year: row.year, payload: row, source: row.year === 2025 ? 'modeled-2025' : 'official-sqlite-import' })) as TourismDocument[];
}

export async function getDestinationProfile(destination: string, nationality: string): Promise<DestinationProfile | null> {
  const match = (value: string) => value.toLowerCase() === destination.toLowerCase();
  if (mongoEnabled()) {
    await ready();
    const db = await getMongoDb();
    const [cost, safety, seasonality, visa] = await Promise.all([
      db.collection(collectionName('destination_cost')).findOne({ destination: { $regex: `^${destination}$`, $options: 'i' } }),
      db.collection(collectionName('destination_safety')).findOne({ destination: { $regex: `^${destination}$`, $options: 'i' } }),
      db.collection(collectionName('destination_seasonality')).findOne({ destination: { $regex: `^${destination}$`, $options: 'i' } }),
      db.collection(collectionName('destination_visa')).findOne({ destination: { $regex: `^${destination}$`, $options: 'i' }, nationality: { $in: [nationality, '*'] } }),
    ]);
    if (!cost) return null;
    return { destination: String(cost.destination), country: String(cost.country), dailyCost: Number(cost.dailyCost), safetyScore: Number(safety?.safetyScore || 50), safetyNotes: String(safety?.notes || ''), peakMonths: (seasonality?.peakMonths || []) as string[], shoulderMonths: (seasonality?.shoulderMonths || []) as string[], visaRule: String(visa?.rule || 'Verify current visa rules with an official source.') };
  }
  return destinationProfiles.find((p) => match(p.destination)) || null;
}

export async function refreshTourismDocuments() {
  if (mongoEnabled()) { seedPromise = null; await ready(); return; }
  return 0;
}
