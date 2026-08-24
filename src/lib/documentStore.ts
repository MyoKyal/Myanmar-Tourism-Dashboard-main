import { MongoClient, type Db } from 'mongodb';

export type TourismDocument = {
  _id: string;
  dataset: string;
  type: 'arrival' | 'accommodation' | 'expenditure' | 'country' | 'visa' | 'domestic' | 'monthly';
  year: number;
  payload: Record<string, unknown>;
  source: 'official-csv' | 'modeled-2025';
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

let clientPromise: Promise<MongoClient> | null = null;
let seedPromise: Promise<void> | null = null;

function mongoUri() {
  return process.env.MONGODB_URI?.trim();
}

function databaseName() {
  return process.env.MONGODB_DB_NAME || 'myanmar_tourism_dashboard';
}

function collectionPrefix() {
  return process.env.MONGODB_COLLECTION_PREFIX || 'myanmar_tourism_';
}

async function getMongoDb(): Promise<Db> {
  const uri = mongoUri();
  if (!uri || uri.includes('<username>') || uri.includes('<password>') || uri.includes('<cluster>')) {
    throw new Error('MongoDB is not configured. Create .env.local from .env.example, replace the placeholder MONGODB_URI with your MongoDB Atlas connection string, restart npm run dev, and run node scripts/ingest.cjs.');
  }
  if (!clientPromise) clientPromise = new MongoClient(uri, { appName: 'MyanmarTourismDashboard' }).connect();
  return (await clientPromise).db(databaseName());
}

function collectionName(name: string) {
  // Prefixing every collection prevents collisions with any other project in the same Atlas cluster.
  return `${collectionPrefix()}${name}`;
}

export const destinationProfiles: DestinationProfile[] = [
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
  { destination: 'Bago Region', country: 'Myanmar', dailyCost: 38, safetyScore: 60, safetyNotes: 'Major transit hub and heritage site; use licensed transport.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Standard tourist visa applies.' },
  { destination: 'Kayah State', country: 'Myanmar', dailyCost: 45, safetyScore: 48, safetyNotes: 'Mountainous and remote; verify local access and transport availability.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check regional permits and current entry requirements.' },
  { destination: 'Magway Region', country: 'Myanmar', dailyCost: 35, safetyScore: 50, safetyNotes: 'Central dry zone; carry water and confirm transport between sites.', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Standard tourist visa applies.' },
];

async function seedMongo() {
  const db = await getMongoDb();
  const docs = db.collection(collectionName('documents'));
  await Promise.all([
    docs.createIndex({ dataset: 1, year: 1 }),
    docs.createIndex({ type: 1, year: 1 }),
    db.collection(collectionName('destination_cost')).createIndex({ destination: 1 }),
    db.collection(collectionName('destination_safety')).createIndex({ destination: 1 }),
    db.collection(collectionName('destination_seasonality')).createIndex({ destination: 1 }),
    db.collection(collectionName('destination_visa')).createIndex({ destination: 1, nationality: 1 }),
  ]);
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

// Raw document access, keyed by the document's analytical `type`. Kept for callers
// (e.g. the Decision Center) that need the full document envelope (_id, dataset, source).
export async function getTourismCollection(type?: TourismDocument['type'], year?: number): Promise<TourismDocument[]> {
  await ready();
  const db = await getMongoDb();
  return db.collection(collectionName('documents')).find(
    { ...(type ? { type } : {}), ...(year ? { year } : {}) },
    { projection: { _id: 1, dataset: 1, type: 1, year: 1, payload: 1, source: 1 } }
  ).toArray() as unknown as TourismDocument[];
}

// Flattened access, keyed by CSV `dataset` (e.g. 'fast_facts', 'hotels_rooms'). This is what
// every analytics action uses — it returns each document's payload merged with its year/source.
export async function getAnalyticsRows(dataset: string, filters?: { year?: number; fromYear?: number; toYear?: number }): Promise<Record<string, unknown>[]> {
  await ready();
  const db = await getMongoDb();
  const yearQuery = filters?.year
    ? { year: filters.year }
    : filters?.fromYear || filters?.toYear
      ? { year: { ...(filters.fromYear ? { $gte: filters.fromYear } : {}), ...(filters.toYear ? { $lte: filters.toYear } : {}) } }
      : {};
  const docs = await db.collection(collectionName('documents')).find({ dataset, ...yearQuery }, { projection: { payload: 1, year: 1, source: 1 } }).toArray();
  return docs.map((doc) => ({ ...(doc.payload as Record<string, unknown>), year: doc.year, source: doc.source }));
}

export async function getDestinationProfile(destination: string, nationality: string): Promise<DestinationProfile | null> {
  await ready();
  const db = await getMongoDb();
  const [cost, safety, seasonality, visa] = await Promise.all([
    db.collection(collectionName('destination_cost')).findOne({ destination: { $regex: `^${destination}$`, $options: 'i' } }),
    db.collection(collectionName('destination_safety')).findOne({ destination: { $regex: `^${destination}$`, $options: 'i' } }),
    db.collection(collectionName('destination_seasonality')).findOne({ destination: { $regex: `^${destination}$`, $options: 'i' } }),
    db.collection(collectionName('destination_visa')).findOne({ destination: { $regex: `^${destination}$`, $options: 'i' }, nationality: { $in: [nationality, '*'] } }),
  ]);
  if (!cost) return null;
  return {
    destination: String(cost.destination),
    country: String(cost.country),
    dailyCost: Number(cost.dailyCost),
    safetyScore: Number(safety?.safetyScore || 50),
    safetyNotes: String(safety?.notes || ''),
    peakMonths: (seasonality?.peakMonths || []) as string[],
    shoulderMonths: (seasonality?.shoulderMonths || []) as string[],
    visaRule: String(visa?.rule || 'Verify current visa rules with an official source.'),
  };
}

export async function refreshTourismDocuments() {
  seedPromise = null;
  await ready();
}
