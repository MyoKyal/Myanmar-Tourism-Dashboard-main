import { MongoClient, ObjectId, type Db } from 'mongodb';
import { hashPassword } from './password';
import type { Role } from './auth';

export type TourismDocument = {
  _id: string;
  dataset: string;
  type: 'arrival' | 'accommodation' | 'expenditure' | 'country' | 'visa' | 'domestic' | 'monthly' | 'economics';
  year: number;
  payload: Record<string, unknown>;
  source: 'official-csv' | 'modeled-2025' | 'reported-2025' | 'world-bank-api';
};

export type UserRecord = {
  _id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  /** Enforced in actions/manageDestinations.ts's saveDestinationAction -- a Destination
   *  Manager may only edit the destination named here, checked against the session's JWT on
   *  every save, not just at page-render time. Page-level access alone (allowedPaths() in
   *  lib/auth.ts) only gates which pages a role can open, not which row within one. */
  assignedDestination?: string;
  businessName?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
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
  /** Real management fields, not present on the seed data below (seeded destinations
   *  default to ACTIVE / undefined on first write). INACTIVE destinations are excluded from
   *  Decision Center scoring and clustering, but stay editable so a Destination Manager or
   *  Super Admin can reactivate one without re-creating it. */
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt?: Date;
  updatedBy?: string;
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

// Seed data only -- not exported. Every reader (Decision Center scoring, clustering, the
// Destinations map, and the manage-destinations admin UI) goes through the `destinations`
// Mongo collection instead, via getAllDestinations()/getDestinationProfile() below. That
// collection is what admin edits actually change; this array only ever supplies the initial
// values and is never read again after seedMongo() runs once at startup. Keeping it
// unexported makes "importing this by mistake and getting stale data" a compile error
// instead of a bug someone has to notice at runtime.
const SEED_DESTINATION_PROFILES: Omit<DestinationProfile, 'status'>[] = [
  { destination: 'Yangon', country: 'Myanmar', dailyCost: 115, safetyScore: 70, safetyNotes: 'Urban destination; use registered taxis and monitor local advisories.', safetyNotesMm: 'မြို့ပြဒေသ; မှတ်ပုံတင်ထားသော တက္ကစီများကို အသုံးပြုပြီး ဒေသန္တရအကြံပြုချက်များကို စောင့်ကြည့်ပါ။', peakMonths: ['October', 'November', 'December', 'January', 'February', 'March'], shoulderMonths: ['April', 'September'], visaRule: 'Most foreign passports should check eVisa or embassy requirements before travel.', visaRuleMm: 'နိုင်ငံခြားနိုင်ငံကူးလက်မှတ်အများစုသည် ခရီးမထွက်မီ eVisa သို့မဟုတ် သံရုံးလိုအပ်ချက်များကို စစ်ဆေးသင့်သည်။' },
  { destination: 'Mandalay', country: 'Myanmar', dailyCost: 104, safetyScore: 66, safetyNotes: 'Cultural city; plan transport between dispersed heritage sites.', safetyNotesMm: 'ယဉ်ကျေးမှုမြို့တော်; ပြန့်ကျဲနေသော အမွေအနှစ်နေရာများကြား သွားလာရေးကို ကြိုတင်စီစဉ်ပါ။', peakMonths: ['December', 'January', 'February'], shoulderMonths: ['November', 'March'], visaRule: 'Check eVisa eligibility and approved entry points for your passport.', visaRuleMm: 'eVisa အရည်အချင်းနှင့် သင့်နိုင်ငံကူးလက်မှတ်အတွက် ခွင့်ပြုထားသော ဝင်ပေါက်များကို စစ်ဆေးပါ။' },
  { destination: 'Bagan', country: 'Myanmar', dailyCost: 132, safetyScore: 68, safetyNotes: 'Hot, open archaeological area; use licensed guides and carry water.', safetyNotesMm: 'ပူနွေးသော ပွင့်လင်းရှေးဟောင်းဒေသ; လိုင်စင်ရ လမ်းညွှန်များကို အသုံးပြုပြီး ရေသယ်ဆောင်ပါ။', peakMonths: ['December', 'January', 'February'], shoulderMonths: ['November', 'March'], visaRule: 'Tourist visa/eVisa rules vary by nationality; verify before booking.', visaRuleMm: 'ခရီးသွားဗီဇာ/eVisa စည်းမျဉ်းများသည် နိုင်ငံသားအလိုက် ကွဲပြားသည်; မှာယူမီ စစ်ဆေးပါ။' },
  { destination: 'Inle Lake', country: 'Myanmar', dailyCost: 143, safetyScore: 67, safetyNotes: 'Lake transport is weather-sensitive; book licensed boat operators.', safetyNotesMm: 'ကန်ပေါ်သွားလာရေးသည် ရာသီဥတုအပေါ်မူတည်သည်; လိုင်စင်ရ လှေလုပ်ငန်းရှင်များထံ ကြိုတင်မှာယူပါ။', peakMonths: ['October', 'November', 'December', 'January', 'February'], shoulderMonths: ['March', 'September'], visaRule: 'Check current tourist visa requirements for your passport.', visaRuleMm: 'သင့်နိုင်ငံကူးလက်မှတ်အတွက် လက်ရှိခရီးသွားဗီဇာလိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Ngapali Beach', country: 'Myanmar', dailyCost: 236, safetyScore: 64, safetyNotes: 'Seasonal coastal destination; confirm flights and hotel operations before paying.', safetyNotesMm: 'ရာသီအလိုက် ကမ်းရိုးတန်းဒေသ; ငွေမပေးချေမီ လေယာဉ်နှင့် ဟိုတယ်လည်ပတ်မှုများကို အတည်ပြုပါ။', peakMonths: ['November', 'December', 'January', 'February', 'March'], shoulderMonths: ['October', 'April'], visaRule: 'Confirm approved arrival point and current visa requirements.', visaRuleMm: 'ခွင့်ပြုထားသော ရောက်ရှိရာနေရာနှင့် လက်ရှိဗီဇာလိုအပ်ချက်များကို အတည်ပြုပါ။' },
  { destination: 'Shan State', country: 'Myanmar', dailyCost: 151, safetyScore: 60, safetyNotes: 'Travel conditions vary by township; check local access advisories.', safetyNotesMm: 'ခရီးသွားလာရေးအခြေအနေများသည် မြို့နယ်အလိုက် ကွဲပြားသည်; ဒေသန္တရဝင်ရောက်ခွင့် အကြံပြုချက်များကို စစ်ဆေးပါ။', peakMonths: ['October', 'November', 'December', 'January', 'February', 'March'], shoulderMonths: ['April', 'September'], visaRule: 'Confirm regional travel permissions in addition to visa requirements.', visaRuleMm: 'ဗီဇာလိုအပ်ချက်များအပြင် ဒေသန္တရ ခရီးသွားခွင့်ပြုချက်များကိုပါ အတည်ပြုပါ။' },
  { destination: 'Mon State', country: 'Myanmar', dailyCost: 96, safetyScore: 62, safetyNotes: 'Road travel can be long; use trusted transport providers.', safetyNotesMm: 'လမ်းခရီးသည် ကြာမြင့်နိုင်သည်; ယုံကြည်ရသော သယ်ယူပို့ဆောင်ရေးဝန်ဆောင်မှုများကို အသုံးပြုပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Check tourist visa requirements and permitted destinations.', visaRuleMm: 'ခရီးသွားဗီဇာလိုအပ်ချက်များနှင့် ခွင့်ပြုထားသော ခရီးစဉ်များကို စစ်ဆေးပါ။' },
  { destination: 'Rakhine State', country: 'Myanmar', dailyCost: 123, safetyScore: 45, safetyNotes: 'Access and security conditions can change quickly; verify before travel.', safetyNotesMm: 'ဝင်ရောက်ခွင့်နှင့် လုံခြုံရေးအခြေအနေများသည် လျင်မြန်စွာ ပြောင်းလဲနိုင်သည်; ခရီးမထွက်မီ စစ်ဆေးပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Confirm visa, entry point, and regional access with official sources.', visaRuleMm: 'ဗီဇာ၊ ဝင်ပေါက်နှင့် ဒေသန္တရဝင်ရောက်ခွင့်ကို တရားဝင်ရင်းမြစ်များဖြင့် အတည်ပြုပါ။' },
  { destination: 'Chin State', country: 'Myanmar', dailyCost: 110, safetyScore: 42, safetyNotes: 'Remote terrain; specialist transport and local permissions may be required.', safetyNotesMm: 'ဝေးလံသောဒေသ; အထူးသယ်ယူပို့ဆောင်ရေးနှင့် ဒေသန္တရခွင့်ပြုချက် လိုအပ်နိုင်သည်။', peakMonths: ['October', 'November', 'December', 'January', 'February', 'March'], shoulderMonths: ['April', 'September'], visaRule: 'Verify regional permits and entry requirements before planning.', visaRuleMm: 'စီစဉ်မီ ဒေသန္တရခွင့်ပြုချက်များနှင့် ဝင်ရောက်ရေးလိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Kayin State', country: 'Myanmar', dailyCost: 93, safetyScore: 52, safetyNotes: 'Check road access and local advisories for remote attractions.', safetyNotesMm: 'ဝေးလံသောနေရာများအတွက် လမ်းဝင်ရောက်ခွင့်နှင့် ဒေသန္တရအကြံပြုချက်များကို စစ်ဆေးပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Confirm permitted travel areas for your passport.', visaRuleMm: 'သင့်နိုင်ငံကူးလက်မှတ်အတွက် ခွင့်ပြုထားသော ခရီးသွားနိုင်သည့်နေရာများကို အတည်ပြုပါ။' },
  { destination: 'Kachin State', country: 'Myanmar', dailyCost: 132, safetyScore: 40, safetyNotes: 'Remote and mountainous; use local operators and confirm access.', safetyNotesMm: 'ဝေးလံပြီး တောင်ပေါ်ဒေသ; ဒေသခံလုပ်ငန်းရှင်များကို အသုံးပြုပြီး ဝင်ရောက်ခွင့်ကို အတည်ပြုပါ။', peakMonths: ['October', 'November', 'December', 'January', 'February', 'March'], shoulderMonths: ['April', 'September'], visaRule: 'Check regional permits and current entry requirements.', visaRuleMm: 'ဒေသန္တရခွင့်ပြုချက်များနှင့် လက်ရှိဝင်ရောက်ရေးလိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Sagaing Region', country: 'Myanmar', dailyCost: 88, safetyScore: 44, safetyNotes: 'Review current transport and security guidance before travel.', safetyNotesMm: 'ခရီးမထွက်မီ လက်ရှိသယ်ယူပို့ဆောင်ရေးနှင့် လုံခြုံရေးလမ်းညွှန်ချက်များကို ပြန်လည်သုံးသပ်ပါ။', peakMonths: ['December', 'January', 'February'], shoulderMonths: ['November', 'March'], visaRule: 'Confirm regional access and visa requirements.', visaRuleMm: 'ဒေသန္တရဝင်ရောက်ခွင့်နှင့် ဗီဇာလိုအပ်ချက်များကို အတည်ပြုပါ။' },
  { destination: 'Tanintharyi Region', country: 'Myanmar', dailyCost: 159, safetyScore: 50, safetyNotes: 'Island and coastal access is seasonal; confirm boats and flights.', safetyNotesMm: 'ကျွန်းနှင့် ကမ်းရိုးတန်းဝင်ရောက်ခွင့်သည် ရာသီအလိုက်ဖြစ်သည်; လှေနှင့် လေယာဉ်များကို အတည်ပြုပါ။', peakMonths: ['November', 'December', 'January', 'February', 'March'], shoulderMonths: ['October', 'April'], visaRule: 'Check entry point and regional permissions for your passport.', visaRuleMm: 'သင့်နိုင်ငံကူးလက်မှတ်အတွက် ဝင်ပေါက်နှင့် ဒေသန္တရခွင့်ပြုချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Ayeyarwady Region', country: 'Myanmar', dailyCost: 99, safetyScore: 55, safetyNotes: 'Allow extra road time and confirm local transport.', safetyNotesMm: 'အပိုလမ်းခရီးအချိန်ထားပြီး ဒေသန္တရသယ်ယူပို့ဆောင်ရေးကို အတည်ပြုပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Verify tourist visa and destination access requirements.', visaRuleMm: 'ခရီးသွားဗီဇာနှင့် ခရီးစဉ်ဝင်ရောက်ခွင့်လိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Naypyidaw', country: 'Myanmar', dailyCost: 110, safetyScore: 72, safetyNotes: 'Sprawling city; plan point-to-point transport in advance.', safetyNotesMm: 'ကျယ်ဝန်းသောမြို့တော်; နေရာမှနေရာသို့ သွားလာရေးကို ကြိုတင်စီစဉ်ပါ။', peakMonths: ['October', 'November', 'December', 'January', 'February', 'March'], shoulderMonths: ['April', 'September'], visaRule: 'Check current tourist visa requirements for your passport.', visaRuleMm: 'သင့်နိုင်ငံကူးလက်မှတ်အတွက် လက်ရှိခရီးသွားဗီဇာလိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Bago Region', country: 'Myanmar', dailyCost: 104, safetyScore: 60, safetyNotes: 'Major transit hub and heritage site; use licensed transport.', safetyNotesMm: 'အဓိကသွားလာရေးဗဟိုချက်နှင့် အမွေအနှစ်နေရာ; လိုင်စင်ရ သယ်ယူပို့ဆောင်ရေးကို အသုံးပြုပါ။', peakMonths: ['November', 'December', 'January', 'February'], shoulderMonths: ['October', 'March'], visaRule: 'Standard tourist visa applies.', visaRuleMm: 'စံသတ်မှတ် ခရီးသွားဗီဇာ သက်ဆိုင်သည်။' },
  { destination: 'Kayah State', country: 'Myanmar', dailyCost: 123, safetyScore: 48, safetyNotes: 'Mountainous and remote; verify local access and transport availability.', safetyNotesMm: 'တောင်ပေါ်ပြီး ဝေးလံသောဒေသ; ဒေသန္တရဝင်ရောက်ခွင့်နှင့် သယ်ယူပို့ဆောင်ရေးရရှိနိုင်မှုကို စစ်ဆေးပါ။', peakMonths: ['October', 'November', 'December', 'January', 'February', 'March'], shoulderMonths: ['April', 'September'], visaRule: 'Check regional permits and current entry requirements.', visaRuleMm: 'ဒေသန္တရခွင့်ပြုချက်များနှင့် လက်ရှိဝင်ရောက်ရေးလိုအပ်ချက်များကို စစ်ဆေးပါ။' },
  { destination: 'Magway Region', country: 'Myanmar', dailyCost: 96, safetyScore: 50, safetyNotes: 'Central dry zone; carry water and confirm transport between sites.', safetyNotesMm: 'အလယ်ပိုင်းခြောက်သွေ့ဒေသ; ရေသယ်ဆောင်ပြီး နေရာများကြား သယ်ယူပို့ဆောင်ရေးကို အတည်ပြုပါ။', peakMonths: ['December', 'January', 'February'], shoulderMonths: ['November', 'March'], visaRule: 'Standard tourist visa applies.', visaRuleMm: 'စံသတ်မှတ် ခရီးသွားဗီဇာ သက်ဆိုင်သည်။' },
];

async function seedMongo() {
  const db = await getMongoDb();
  const docs = db.collection(collectionName('documents'));
  await Promise.all([
    docs.createIndex({ dataset: 1, year: 1 }),
    docs.createIndex({ type: 1, year: 1 }),
    db.collection(collectionName('destinations')).createIndex({ destination: 1 }, { unique: true }),
  ]);
  // $setOnInsert, not $set -- this collection replaced the old 4-collection destination_cost
  // / destination_safety / destination_seasonality / destination_visa split, which used $set
  // on every startup specifically so a code-level edit (e.g. differentiating seasonality per
  // destination) always reached the database. That reasoning no longer applies: destinations
  // are now a real admin-editable entity (see actions/manageDestinations.ts), so forcibly
  // overwriting on every restart would silently discard a Super Admin's or Destination
  // Manager's real edit the next time the server restarts. This seed only ever supplies the
  // starting values for a destination that doesn't exist in the database yet.
  await Promise.all(SEED_DESTINATION_PROFILES.map((p) =>
    db.collection(collectionName('destinations')).updateOne(
      { destination: p.destination },
      { $setOnInsert: { ...p, status: 'ACTIVE', updatedAt: new Date(), updatedBy: 'seed' } },
      { upsert: true }
    )
  ));

  await seedDemoUsers(db);
}

// One demo account per role, so the login screen and RBAC are actually testable without a
// user-management UI (that's Phase 3 work -- "Manage users" in the admin dashboard). Unlike
// the destinationProfiles upsert above, this uses $setOnInsert: a user is a mutable entity
// (someone could change their name or password later), so re-running the seed must create a
// missing demo account without ever reverting a real change to an existing one.
async function seedDemoUsers(db: Db) {
  const users = db.collection(collectionName('users'));
  await users.createIndex({ email: 1 }, { unique: true });
  const demoPasswordHash = await hashPassword('Demo@2025');
  const demoAccounts: Omit<UserRecord, '_id'>[] = [
    { email: 'admin@myanmar-tourism.gov.mm', passwordHash: demoPasswordHash, fullName: 'Aye Aye Win', role: 'SUPER_ADMIN', status: 'ACTIVE', createdAt: new Date() },
    { email: 'bagan.manager@myanmar-tourism.gov.mm', passwordHash: demoPasswordHash, fullName: 'Kyaw Zin Latt', role: 'DESTINATION_MANAGER', assignedDestination: 'Bagan', status: 'ACTIVE', createdAt: new Date() },
    { email: 'owner@ngapali-bay-resort.example', passwordHash: demoPasswordHash, fullName: 'Su Su Hlaing', role: 'BUSINESS_USER', businessName: 'Ngapali Bay Resort', status: 'ACTIVE', createdAt: new Date() },
    { email: 'tourist@example.com', passwordHash: demoPasswordHash, fullName: 'Alex Traveler', role: 'TOURIST', status: 'ACTIVE', createdAt: new Date() },
  ];
  await Promise.all(demoAccounts.map((account) =>
    users.updateOne({ email: account.email }, { $setOnInsert: account }, { upsert: true })
  ));
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  await ready();
  const db = await getMongoDb();
  const doc = await db.collection(collectionName('users')).findOne({ email: email.toLowerCase().trim() });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { _id: String(_id), ...(rest as Omit<UserRecord, '_id'>) };
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  await ready();
  const db = await getMongoDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null; // malformed id -- treat as not-found rather than throwing on user input
  }
  const doc = await db.collection(collectionName('users')).findOne({ _id: objectId });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { _id: String(_id), ...(rest as Omit<UserRecord, '_id'>) };
}

/** All accounts, for the Super-Admin-only user management list. Unlike getUserByEmail (used
 *  by the login flow, which genuinely needs passwordHash to verify a login), this is the one
 *  read path whose result reaches a client component -- so the hash comes out here, not just
 *  gets displayed-but-ignored by the UI. A field that never needs to leave the server
 *  shouldn't be sent to the browser on the chance every caller remembers to drop it. */
export async function getAllUsers(): Promise<Omit<UserRecord, 'passwordHash'>[]> {
  await ready();
  const db = await getMongoDb();
  const docs = await db.collection(collectionName('users')).find({}).sort({ email: 1 }).toArray();
  return docs.map((doc) => {
    const { _id, passwordHash: _passwordHash, ...rest } = doc;
    return { _id: String(_id), ...(rest as Omit<UserRecord, '_id' | 'passwordHash'>) };
  });
}

export type CreateUserInput = Omit<UserRecord, '_id' | 'passwordHash' | 'createdAt'> & { passwordPlain: string };

/** Throws on a duplicate email (the unique index created in seedDemoUsers enforces it at the
 *  database level) -- the caller is expected to catch and turn that into a user-facing
 *  message, the same division of responsibility as every other write in this file. */
export async function createUser(input: CreateUserInput): Promise<string> {
  await ready();
  const db = await getMongoDb();
  const passwordHash = await hashPassword(input.passwordPlain);
  const doc: Omit<UserRecord, '_id'> = {
    email: input.email.toLowerCase().trim(),
    passwordHash,
    fullName: input.fullName,
    role: input.role,
    status: input.status,
    ...(input.assignedDestination ? { assignedDestination: input.assignedDestination } : {}),
    ...(input.businessName ? { businessName: input.businessName } : {}),
    createdAt: new Date(),
  };
  const result = await db.collection(collectionName('users')).insertOne(doc);
  return String(result.insertedId);
}

export type UpdateUserInput = Partial<Pick<UserRecord, 'fullName' | 'role' | 'status' | 'assignedDestination' | 'businessName'>> & { passwordPlain?: string };

export async function updateUser(id: string, input: UpdateUserInput): Promise<void> {
  await ready();
  const db = await getMongoDb();
  const { passwordPlain, ...fields } = input;
  const set: Record<string, unknown> = { ...fields };
  if (passwordPlain) set.passwordHash = await hashPassword(passwordPlain);
  await db.collection(collectionName('users')).updateOne({ _id: new ObjectId(id) }, { $set: set });
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

// The old signature took a `nationality` param for a per-nationality visa rule lookup, but
// every row was ever seeded with nationality '*' -- the parameter never actually selected a
// different rule from any real data. Dropped rather than kept as unused-but-harmless, since
// an unused parameter that LOOKS load-bearing is worse than no parameter at all.
function toDestinationProfile(doc: Record<string, unknown>): DestinationProfile {
  return {
    destination: String(doc.destination),
    country: String(doc.country),
    dailyCost: Number(doc.dailyCost),
    safetyScore: Number(doc.safetyScore),
    safetyNotes: String(doc.safetyNotes || ''),
    safetyNotesMm: String(doc.safetyNotesMm || doc.safetyNotes || ''),
    peakMonths: (doc.peakMonths || []) as string[],
    shoulderMonths: (doc.shoulderMonths || []) as string[],
    visaRule: String(doc.visaRule || 'Verify current visa rules with an official source.'),
    visaRuleMm: String(doc.visaRuleMm || doc.visaRule || 'တရားဝင်ရင်းမြစ်ဖြင့် လက်ရှိဗီဇာစည်းမျဉ်းများကို စစ်ဆေးပါ။'),
    status: doc.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    updatedAt: doc.updatedAt as Date | undefined,
    updatedBy: doc.updatedBy as string | undefined,
  };
}

export async function getDestinationProfile(destination: string): Promise<DestinationProfile | null> {
  await ready();
  const db = await getMongoDb();
  const doc = await db.collection(collectionName('destinations')).findOne({ destination: { $regex: `^${destination}$`, $options: 'i' } });
  return doc ? toDestinationProfile(doc) : null;
}

/** Every destination, for scoring/clustering/the map/the admin list. `includeInactive` is
 *  false by default -- Decision Center scoring and clustering should never recommend or
 *  categorize a destination a Super Admin has deliberately deactivated, but the admin list
 *  itself needs to see (and be able to reactivate) inactive ones, hence the flag rather than
 *  two separate functions. */
export async function getAllDestinations(includeInactive = false): Promise<DestinationProfile[]> {
  await ready();
  const db = await getMongoDb();
  const query = includeInactive ? {} : { status: { $ne: 'INACTIVE' } };
  const docs = await db.collection(collectionName('destinations')).find(query).sort({ destination: 1 }).toArray();
  return docs.map(toDestinationProfile);
}

/** Create-or-update. `originalName` lets a rename change the document's key without leaving
 *  an orphaned duplicate under the old name -- update the old doc's `destination` field in
 *  place (same _id story as a natural-key collection) rather than delete-then-insert, so a
 *  rename can't ever race a concurrent read into seeing neither name. */
export async function upsertDestination(profile: Omit<DestinationProfile, 'status' | 'updatedAt'> & { status?: DestinationProfile['status'] }, updatedBy: string, originalName?: string): Promise<void> {
  await ready();
  const db = await getMongoDb();
  const collection = db.collection(collectionName('destinations'));
  const filter = originalName ? { destination: originalName } : { destination: profile.destination };
  await collection.updateOne(
    filter,
    { $set: { ...profile, status: profile.status ?? 'ACTIVE', updatedAt: new Date(), updatedBy } },
    { upsert: true }
  );
}

/** Keeps a Destination Manager's account pointed at the right row after a Super Admin
 *  renames their destination -- without this, upsertDestination's in-place rename leaves
 *  assignedDestination (in both the user's Mongo record and, until they next log in, their
 *  JWT) referring to a name that no longer resolves to any destination. */
export async function reassignDestinationManagers(oldName: string, newName: string): Promise<void> {
  await ready();
  const db = await getMongoDb();
  await db.collection(collectionName('users')).updateMany({ assignedDestination: oldName }, { $set: { assignedDestination: newName } });
}

export async function deleteDestinationRecord(destination: string): Promise<void> {
  await ready();
  const db = await getMongoDb();
  await db.collection(collectionName('destinations')).deleteOne({ destination });
}

export async function refreshTourismDocuments() {
  seedPromise = null;
  await ready();
}
