"use server";

import { getAnalyticsRows, destinationProfiles } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

// Hotel/room rows are keyed by city ("Bagan", "Taunggyi"), but the map and every other
// destination dataset are keyed by state/region ("Mandalay", "Shan"). Without this mapping,
// hotel capacity would only ever match a region whose name happens to equal a city name.
//
// Keys are normalized with normalizePlace() (letters only -- no spaces, no hyphens) so a
// raw place name like "Kyauk Phyu" or "Hpa-An" reliably matches "kyaukphyu"/"hpaan" instead
// of silently missing because of spacing/punctuation differences from how the key was typed.
//
// Every place NOT in this table falls into UNMAPPED_REGION_KEY rather than using its own raw
// name as a fake "region" -- a raw town name can accidentally be a substring of (or contain)
// a real region name after normalization (e.g. "Chin Shwe Haw", a Shan State town, contains
// "chin" and would silently inflate Chin State's hotel count on the map via the fuzzy
// includes() match in MapComponent.tsx). Bucketing the unmapped remainder under one inert key
// guarantees it can never collide with a real region name.
const UNMAPPED_REGION_KEY = '__unmapped__';

function normalizePlace(value: string): string {
    return value.toLowerCase().replace(/[^a-z]/g, "");
}

const CITY_TO_REGION: Record<string, string> = {
    aungban: 'shan', kalaw: 'shan', kyaington: 'shan', kyaukme: 'shan', lashio: 'shan',
    muse: 'shan', naungcho: 'shan', naunghkio: 'shan', naunghklo: 'shan', nyaungshwe: 'shan',
    pindaya: 'shan', tachileik: 'shan', taunggyi: 'shan', thibaw: 'shan', laukkai: 'shan',
    namsam: 'shan', namsamloilin: 'shan', ywarngan: 'shan', phekhone: 'shan', kyaingtong: 'shan',
    hopone: 'shan', maingsat: 'shan', maisat: 'shan', theinni: 'shan', chinshwehaw: 'shan',
    pinlaung: 'shan',
    bagan: 'mandalay', mandalay: 'mandalay', meikhtila: 'mandalay', kyaukse: 'mandalay',
    myingyan: 'mandalay', pyinoolwin: 'mandalay', pyawbwe: 'mandalay', thazi: 'mandalay',
    yamaethin: 'mandalay', singu: 'mandalay', sintgaing: 'mandalay', mogok: 'mandalay',
    pyinmana: 'naypyitaw', naypyitaw: 'naypyitaw',
    yangon: 'yangon',
    bago: 'bago', taungoo: 'bago', pyay: 'bago', dikeoo: 'bago', nyaunglaypin: 'bago',
    thayawaddy: 'bago', latpadan: 'bago', paukkhaung: 'bago',
    chaungtha: 'ayeyarwady', ngwesaung: 'ayeyarwady', pathein: 'ayeyarwady', myaungmya: 'ayeyarwady',
    hinthata: 'ayeyarwady', maubin: 'ayeyarwady', laputtar: 'ayeyarwady', kyonepyaw: 'ayeyarwady',
    sittwe: 'rakhine', mrauku: 'rakhine', kyaukphyu: 'rakhine', ngapali: 'rakhine',
    thandwe: 'rakhine', munaung: 'rakhine', manaung: 'rakhine', gwa: 'rakhine', taunggote: 'rakhine',
    shwethaungyan: 'rakhine',
    mawlamyaing: 'mon', mawlamyaingkyun: 'mon', kyaikhto: 'mon', thahtone: 'mon', mudone: 'mon',
    thanphyuzayat: 'mon', ye: 'mon', yay: 'mon', beelin: 'mon', paung: 'mon', phayarthonzu: 'mon',
    hpaan: 'kayin', myawaddy: 'kayin', karen: 'kayin',
    loikaw: 'kayah', dmolsol: 'kayah', hpasawng: 'kayah',
    dawei: 'tanintharyi', myeik: 'tanintharyi', kawthaung: 'tanintharyi', bokpyin: 'tanintharyi',
    lawei: 'tanintharyi', lwegel: 'tanintharyi',
    myitkyina: 'kachin', putao: 'kachin', bhamaw: 'kachin', bhamauk: 'kachin', phakant: 'kachin',
    moenyin: 'kachin', moekaung: 'kachin', winemaw: 'kachin',
    kanpatlet: 'chin', kanpatlat: 'chin', mindat: 'chin', matupi: 'chin', matubi: 'chin',
    sagaing: 'sagaing', monywa: 'sagaing', shwebo: 'sagaing', katha: 'sagaing', kalay: 'sagaing',
    tamu: 'sagaing', yinmarpin: 'sagaing', htigyaing: 'sagaing', homemalin: 'sagaing', inndaw: 'sagaing',
    magwe: 'magway', pakokku: 'magway', minbu: 'magway', minbue: 'magway', yenangyaung: 'magway',
    yaynanchaung: 'magway', chauk: 'magway', gangaw: 'magway', taungtwingyi: 'magway',
    taungtwingyl: 'magway', natmauk: 'magway', aunglan: 'magway', pwintphyu: 'magway',
};

export async function getDestinationsMapData(filters: GlobalFiltersState) {
    const q = yearQuery(filters);
    const [domestic, hotelRows] = await Promise.all([
        getAnalyticsRows("domestic_visitors", q),
        // Hotel capacity is a snapshot, not a sum-over-years metric — when no single year is
        // selected, pull every year and let the latest-year logic below pick the right one.
        getAnalyticsRows("hotels_rooms", filters.year === "All" ? {} : q),
    ]);

    const domesticMap: Record<string, { region: string; visitors: number }> = {};
    domestic.forEach((row) => {
        const region = String(row.region);
        domesticMap[region] ??= { region, visitors: 0 };
        domesticMap[region].visitors += Number(row.visitors_millions || 0) * 1_000_000;
    });

    let hotelSourceRows = hotelRows;
    if (filters.year === "All" && hotelRows.length) {
        const latestYear = Math.max(...hotelRows.map((row) => Number(row.year)));
        hotelSourceRows = hotelRows.filter((row) => Number(row.year) === latestYear);
    }

    const hotelMap: Record<string, { hotels: number; rooms: number }> = {};
    hotelSourceRows.forEach((row) => {
        const place = normalizePlace(String(row.place));
        const region = CITY_TO_REGION[place] || UNMAPPED_REGION_KEY;
        hotelMap[region] ??= { hotels: 0, rooms: 0 };
        hotelMap[region].hotels += Number(row.hotels || 0);
        hotelMap[region].rooms += Number(row.rooms || 0);
    });
    // The unmapped bucket is aggregated (so its capacity isn't silently lost from the totals
    // elsewhere on this page) but deliberately excluded from what the map matches against,
    // since UNMAPPED_REGION_KEY is designed to never match a real region name.
    const hotelCapacity = Object.entries(hotelMap)
        .filter(([region]) => region !== UNMAPPED_REGION_KEY)
        .map(([region, data]) => ({ region, hotels: data.hotels, rooms: data.rooms }));

    return {
        domesticVisitors: Object.values(domesticMap),
        hotelCapacity,
        seasonality: destinationProfiles,
    };
}
