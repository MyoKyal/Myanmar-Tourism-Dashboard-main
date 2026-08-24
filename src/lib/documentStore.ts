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
  safetyNotesMm: string;
  peakMonths: string[];
  shoulderMonths: string[];
  visaRule: string;
  visaRuleMm: string;
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
  { destination: 'Yangon', country: 'Myanmar', dailyCost: 42, safetyScore: 70, safetyNotes: 'Urban destination; use registered taxis and monitor local advisories.', safetyNotesMm: 'မြို့ပြဒေသ; မှတ်ပုံတင်ထားသော တက္ကစီများကို အသုံးပြုပြီး ဒေသန္တရအကြံပြုချက်များကို စောင့်ကြည့်ပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Most foreign passports should check eVisa or embassy requirements before travel.', visaRuleMm: 'နိုင်ငံခြားနိုင်ငံကူးလက်မှတ်အများစုသည် ခရီးမထွက်မီ eVisa သို့မဟုတ် သံရုံးလိုအပ်ချက်များကို စစ်ဆေးသင့်သည်။' },
  { destination: 'Mandalay', country: 'Myanmar', dailyCost: 38, safetyScore: 66, safetyNotes: 'Cultural city; plan transport between dispersed heritage sites.', safetyNotesMm: 'ယဉ်ကျေးမှုမြို့တော်; ပြန့်ကျဲနေသော အမွေအနှစ်နေရာများကြား သွားလာရေးကို ကြိုတင်စီစဉ်ပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check eVisa eligibility and approved entry points for your passport.', visaRuleMm: 'eVisa အရည်အချင်းနှင့် သင့်နိုင်ငံကူးလက်မှတ်အတွက် ခွင့်ပြုထားသော ဝင်ပေါက်များကို စစ်ဆေးပါ။' },
  { destination: 'Bagan', country: 'Myanmar', dailyCost: 48, safetyScore: 68, safetyNotes: 'Hot, open archaeological area; use licensed guides and carry water.', safetyNotesMm: 'ပူနွေးသော ပွင့်လင်းရှေးဟောင်းဒေသ; လိုင်စင်ရ လမ်းညွှန်များကို အသုံးပြုပြီး ရေသယ်ဆောင်ပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Tourist visa/eVisa rules vary by nationality; verify before booking.', visaRuleMm: 'ခရီးသွားဗီဇာ/eVisa စည်းမျဉ်းများသည် နိုင်ငံသားအလိုက် ကွဲပြားသည်; မှာယူမီ စစ်ဆေးပါ။' },
  { destination: 'Inle Lake', country: 'Myanmar', dailyCost: 52, safetyScore: 67, safetyNotes: 'Lake transport is weather-sensitive; book licensed boat operators.', safetyNotesMm: 'ကန်ပေါ်သွားလာရေးသည် ရာသီဥတုအပေါ်မူတည်သည်; လိုင်စင်ရ လှေလုပ်ငန်းရှင်များထံ ကြိုတင်မှာယူပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check current tourist visa requirements for your passport.', visaRuleMm: 'သင့်နိုင်ငံကူးလက်မှတ်အတွက် လက်ရှိခရီးသွားဗီဇာလိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Ngapali Beach', country: 'Myanmar', dailyCost: 86, safetyScore: 64, safetyNotes: 'Seasonal coastal destination; confirm flights and hotel operations before paying.', safetyNotesMm: 'ရာသီအလိုက် ကမ်းရိုးတန်းဒေသ; ငွေမပေးချေမီ လေယာဉ်နှင့် ဟိုတယ်လည်ပတ်မှုများကို အတည်ပြုပါ။', peakMonths: ['November', 'December', 'January', 'February', 'March'], shoulderMonths: ['October', 'April'], visaRule: 'Confirm approved arrival point and current visa requirements.', visaRuleMm: 'ခွင့်ပြုထားသော ရောက်ရှိရာနေရာနှင့် လက်ရှိဗီဇာလိုအပ်ချက်များကို အတည်ပြုပါ။' },
  { destination: 'Shan State', country: 'Myanmar', dailyCost: 55, safetyScore: 60, safetyNotes: 'Travel conditions vary by township; check local access advisories.', safetyNotesMm: 'ခရီးသွားလာရေးအခြေအနေများသည် မြို့နယ်အလိုက် ကွဲပြားသည်; ဒေသန္တရဝင်ရောက်ခွင့် အကြံပြုချက်များကို စစ်ဆေးပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Confirm regional travel permissions in addition to visa requirements.', visaRuleMm: 'ဗီဇာလိုအပ်ချက်များအပြင် ဒေသန္တရ ခရီးသွားခွင့်ပြုချက်များကိုပါ အတည်ပြုပါ။' },
  { destination: 'Mon State', country: 'Myanmar', dailyCost: 35, safetyScore: 62, safetyNotes: 'Road travel can be long; use trusted transport providers.', safetyNotesMm: 'လမ်းခရီးသည် ကြာမြင့်နိုင်သည်; ယုံကြည်ရသော သယ်ယူပို့ဆောင်ရေးဝန်ဆောင်မှုများကို အသုံးပြုပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check tourist visa requirements and permitted destinations.', visaRuleMm: 'ခရီးသွားဗီဇာလိုအပ်ချက်များနှင့် ခွင့်ပြုထားသော ခရီးစဉ်များကို စစ်ဆေးပါ။' },
  { destination: 'Rakhine State', country: 'Myanmar', dailyCost: 45, safetyScore: 45, safetyNotes: 'Access and security conditions can change quickly; verify before travel.', safetyNotesMm: 'ဝင်ရောက်ခွင့်နှင့် လုံခြုံရေးအခြေအနေများသည် လျင်မြန်စွာ ပြောင်းလဲနိုင်သည်; ခရီးမထွက်မီ စစ်ဆေးပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Confirm visa, entry point, and regional access with official sources.', visaRuleMm: 'ဗီဇာ၊ ဝင်ပေါက်နှင့် ဒေသန္တရဝင်ရောက်ခွင့်ကို တရားဝင်ရင်းမြစ်များဖြင့် အတည်ပြုပါ။' },
  { destination: 'Chin State', country: 'Myanmar', dailyCost: 40, safetyScore: 42, safetyNotes: 'Remote terrain; specialist transport and local permissions may be required.', safetyNotesMm: 'ဝေးလံသောဒေသ; အထူးသယ်ယူပို့ဆောင်ရေးနှင့် ဒေသန္တရခွင့်ပြုချက် လိုအပ်နိုင်သည်။', peakMonths: ['October', 'November', 'December', 'January'], shoulderMonths: ['February', 'March'], visaRule: 'Verify regional permits and entry requirements before planning.', visaRuleMm: 'စီစဉ်မီ ဒေသန္တရခွင့်ပြုချက်များနှင့် ဝင်ရောက်ရေးလိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Kayin State', country: 'Myanmar', dailyCost: 34, safetyScore: 52, safetyNotes: 'Check road access and local advisories for remote attractions.', safetyNotesMm: 'ဝေးလံသောနေရာများအတွက် လမ်းဝင်ရောက်ခွင့်နှင့် ဒေသန္တရအကြံပြုချက်များကို စစ်ဆေးပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Confirm permitted travel areas for your passport.', visaRuleMm: 'သင့်နိုင်ငံကူးလက်မှတ်အတွက် ခွင့်ပြုထားသော ခရီးသွားနိုင်သည့်နေရာများကို အတည်ပြုပါ။' },
  { destination: 'Kachin State', country: 'Myanmar', dailyCost: 48, safetyScore: 40, safetyNotes: 'Remote and mountainous; use local operators and confirm access.', safetyNotesMm: 'ဝေးလံပြီး တောင်ပေါ်ဒေသ; ဒေသခံလုပ်ငန်းရှင်များကို အသုံးပြုပြီး ဝင်ရောက်ခွင့်ကို အတည်ပြုပါ။', peakMonths: ['October', 'November', 'December', 'January'], shoulderMonths: ['February', 'March'], visaRule: 'Check regional permits and current entry requirements.', visaRuleMm: 'ဒေသန္တရခွင့်ပြုချက်များနှင့် လက်ရှိဝင်ရောက်ရေးလိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Sagaing Region', country: 'Myanmar', dailyCost: 32, safetyScore: 44, safetyNotes: 'Review current transport and security guidance before travel.', safetyNotesMm: 'ခရီးမထွက်မီ လက်ရှိသယ်ယူပို့ဆောင်ရေးနှင့် လုံခြုံရေးလမ်းညွှန်ချက်များကို ပြန်လည်သုံးသပ်ပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Confirm regional access and visa requirements.', visaRuleMm: 'ဒေသန္တရဝင်ရောက်ခွင့်နှင့် ဗီဇာလိုအပ်ချက်များကို အတည်ပြုပါ။' },
  { destination: 'Tanintharyi Region', country: 'Myanmar', dailyCost: 58, safetyScore: 50, safetyNotes: 'Island and coastal access is seasonal; confirm boats and flights.', safetyNotesMm: 'ကျွန်းနှင့် ကမ်းရိုးတန်းဝင်ရောက်ခွင့်သည် ရာသီအလိုက်ဖြစ်သည်; လှေနှင့် လေယာဉ်များကို အတည်ပြုပါ။', peakMonths: ['November', 'December', 'January', 'February', 'March'], shoulderMonths: ['October', 'April'], visaRule: 'Check entry point and regional permissions for your passport.', visaRuleMm: 'သင့်နိုင်ငံကူးလက်မှတ်အတွက် ဝင်ပေါက်နှင့် ဒေသန္တရခွင့်ပြုချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Ayeyarwady Region', country: 'Myanmar', dailyCost: 36, safetyScore: 55, safetyNotes: 'Allow extra road time and confirm local transport.', safetyNotesMm: 'အပိုလမ်းခရီးအချိန်ထားပြီး ဒေသန္တရသယ်ယူပို့ဆောင်ရေးကို အတည်ပြုပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Verify tourist visa and destination access requirements.', visaRuleMm: 'ခရီးသွားဗီဇာနှင့် ခရီးစဉ်ဝင်ရောက်ခွင့်လိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Naypyidaw', country: 'Myanmar', dailyCost: 40, safetyScore: 72, safetyNotes: 'Sprawling city; plan point-to-point transport in advance.', safetyNotesMm: 'ကျယ်ဝန်းသောမြို့တော်; နေရာမှနေရာသို့ သွားလာရေးကို ကြိုတင်စီစဉ်ပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check current tourist visa requirements for your passport.', visaRuleMm: 'သင့်နိုင်ငံကူးလက်မှတ်အတွက် လက်ရှိခရီးသွားဗီဇာလိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Bago Region', country: 'Myanmar', dailyCost: 38, safetyScore: 60, safetyNotes: 'Major transit hub and heritage site; use licensed transport.', safetyNotesMm: 'အဓိကသွားလာရေးဗဟိုချက်နှင့် အမွေအနှစ်နေရာ; လိုင်စင်ရ သယ်ယူပို့ဆောင်ရေးကို အသုံးပြုပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Standard tourist visa applies.', visaRuleMm: 'စံသတ်မှတ် ခရီးသွားဗီဇာ သက်ဆိုင်သည်။' },
  { destination: 'Kayah State', country: 'Myanmar', dailyCost: 45, safetyScore: 48, safetyNotes: 'Mountainous and remote; verify local access and transport availability.', safetyNotesMm: 'တောင်ပေါ်ပြီး ဝေးလံသောဒေသ; ဒေသန္တရဝင်ရောက်ခွင့်နှင့် သယ်ယူပို့ဆောင်ရေးရရှိနိုင်မှုကို စစ်ဆေးပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check regional permits and current entry requirements.', visaRuleMm: 'ဒေသန္တရခွင့်ပြုချက်များနှင့် လက်ရှိဝင်ရောက်ရေးလိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Magway Region', country: 'Myanmar', dailyCost: 35, safetyScore: 50, safetyNotes: 'Central dry zone; carry water and confirm transport between sites.', safetyNotesMm: 'အလယ်ပိုင်းခြောက်သွေ့ဒေသ; ရေသယ်ဆောင်ပြီး နေရာများကြား သယ်ယူပို့ဆောင်ရေးကို အတည်ပြုပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Standard tourist visa applies.', visaRuleMm: 'စံသတ်မှတ် ခရီးသွားဗီဇာ သက်ဆိုင်သည်။' },
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
    await db.collection(collectionName('destination_safety')).insertMany(destinationProfiles.map((p) => ({ destination: p.destination, safetyScore: p.safetyScore, notes: p.safetyNotes, notesMm: p.safetyNotesMm, updatedAt: new Date(), source: 'planning-baseline' })));
    await db.collection(collectionName('destination_seasonality')).insertMany(destinationProfiles.map((p) => ({ destination: p.destination, peakMonths: p.peakMonths, shoulderMonths: p.shoulderMonths, source: 'planning-baseline' })));
    await db.collection(collectionName('destination_visa')).insertMany(destinationProfiles.map((p) => ({ destination: p.destination, nationality: '*', rule: p.visaRule, ruleMm: p.visaRuleMm, source: 'planning-baseline' })));
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
    safetyNotesMm: String(safety?.notesMm || safety?.notes || ''),
    peakMonths: (seasonality?.peakMonths || []) as string[],
    shoulderMonths: (seasonality?.shoulderMonths || []) as string[],
    visaRule: String(visa?.rule || 'Verify current visa rules with an official source.'),
    visaRuleMm: String(visa?.ruleMm || visa?.rule || 'တရားဝင်ရင်းမြစ်ဖြင့် လက်ရှိဗီဇာစည်းမျဉ်းများကို စစ်ဆေးပါ။'),
  };
}

export async function refreshTourismDocuments() {
  seedPromise = null;
  await ready();
}
