// Hotel/room rows are keyed by city ("Bagan", "Taunggyi"), but destinations, domestic
// visitor data, and everything else are keyed by state/region ("Mandalay", "Shan"). Without
// this mapping, hotel capacity would only ever match a region whose name happens to equal a
// city name. Shared by the Destinations map (destinations.ts) and Crowd Monitoring
// (crowd.ts) -- both need the exact same city->region assignment, so this lives in one place
// rather than being copy-pasted and risking the two drifting apart.
//
// Keys are normalized with normalizePlace() (letters only -- no spaces, no hyphens) so a raw
// place name like "Kyauk Phyu" or "Hpa-An" reliably matches "kyaukphyu"/"hpaan" instead of
// silently missing because of spacing/punctuation differences from how the key was typed.
//
// Every place NOT in this table falls into UNMAPPED_REGION_KEY rather than using its own raw
// name as a fake "region" -- a raw town name can accidentally be a substring of (or contain)
// a real region name after normalization (e.g. "Chin Shwe Haw", a Shan State town, contains
// "chin" and would silently inflate Chin State's hotel count via a fuzzy match). Bucketing
// the unmapped remainder under one inert key guarantees it can never collide with a real
// region name.
export const UNMAPPED_REGION_KEY = "__unmapped__";

export function normalizePlace(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

export const CITY_TO_REGION: Record<string, string> = {
  aungban: "shan", kalaw: "shan", kyaington: "shan", kyaukme: "shan", lashio: "shan",
  muse: "shan", naungcho: "shan", naunghkio: "shan", naunghklo: "shan", nyaungshwe: "shan",
  pindaya: "shan", tachileik: "shan", taunggyi: "shan", thibaw: "shan", laukkai: "shan",
  namsam: "shan", namsamloilin: "shan", ywarngan: "shan", phekhone: "shan", kyaingtong: "shan",
  hopone: "shan", maingsat: "shan", maisat: "shan", theinni: "shan", chinshwehaw: "shan",
  pinlaung: "shan",
  bagan: "mandalay", mandalay: "mandalay", meikhtila: "mandalay", kyaukse: "mandalay",
  myingyan: "mandalay", pyinoolwin: "mandalay", pyawbwe: "mandalay", thazi: "mandalay",
  yamaethin: "mandalay", singu: "mandalay", sintgaing: "mandalay", mogok: "mandalay",
  pyinmana: "naypyitaw", naypyitaw: "naypyitaw",
  yangon: "yangon",
  bago: "bago", taungoo: "bago", pyay: "bago", dikeoo: "bago", nyaunglaypin: "bago",
  thayawaddy: "bago", latpadan: "bago", paukkhaung: "bago",
  chaungtha: "ayeyarwady", ngwesaung: "ayeyarwady", pathein: "ayeyarwady", myaungmya: "ayeyarwady",
  hinthata: "ayeyarwady", maubin: "ayeyarwady", laputtar: "ayeyarwady", kyonepyaw: "ayeyarwady",
  sittwe: "rakhine", mrauku: "rakhine", kyaukphyu: "rakhine", ngapali: "rakhine",
  thandwe: "rakhine", munaung: "rakhine", manaung: "rakhine", gwa: "rakhine", taunggote: "rakhine",
  shwethaungyan: "rakhine",
  mawlamyaing: "mon", mawlamyaingkyun: "mon", kyaikhto: "mon", thahtone: "mon", mudone: "mon",
  thanphyuzayat: "mon", ye: "mon", yay: "mon", beelin: "mon", paung: "mon", phayarthonzu: "mon",
  hpaan: "kayin", myawaddy: "kayin", karen: "kayin",
  loikaw: "kayah", dmolsol: "kayah", hpasawng: "kayah",
  dawei: "tanintharyi", myeik: "tanintharyi", kawthaung: "tanintharyi", bokpyin: "tanintharyi",
  lawei: "tanintharyi", lwegel: "tanintharyi",
  myitkyina: "kachin", putao: "kachin", bhamaw: "kachin", bhamauk: "kachin", phakant: "kachin",
  moenyin: "kachin", moekaung: "kachin", winemaw: "kachin",
  kanpatlet: "chin", kanpatlat: "chin", mindat: "chin", matupi: "chin", matubi: "chin",
  sagaing: "sagaing", monywa: "sagaing", shwebo: "sagaing", katha: "sagaing", kalay: "sagaing",
  tamu: "sagaing", yinmarpin: "sagaing", htigyaing: "sagaing", homemalin: "sagaing", inndaw: "sagaing",
  magwe: "magway", pakokku: "magway", minbu: "magway", minbue: "magway", yenangyaung: "magway",
  yaynanchaung: "magway", chauk: "magway", gangaw: "magway", taungtwingyi: "magway",
  taungtwingyl: "magway", natmauk: "magway", aunglan: "magway", pwintphyu: "magway",
};
