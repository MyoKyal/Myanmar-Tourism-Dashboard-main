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
const CITY_TO_REGION: Record<string, string> = {
    'aungban': 'shan', 'kalaw': 'shan', 'kyaington': 'shan', 'kyaukme': 'shan', 'lashio': 'shan',
    'muse': 'shan', 'naung cho': 'shan', 'naung hkio': 'shan', 'nyaung shwe': 'shan',
    'pindaya': 'shan', 'tachileik': 'shan', 'taunggyi': 'shan', 'thibaw': 'shan',
    'nam sam': 'shan', 'ywar ngan': 'shan', 'phe khone': 'shan', 'kyaing tong': 'shan',
    'ho pone': 'shan', 'maing sat': 'shan', 'mai sat': 'shan', 'theinni': 'shan',
    'bagan': 'mandalay', 'mandalay': 'mandalay', 'meikhtila': 'mandalay', 'kyaukse': 'mandalay',
    'myingyan': 'mandalay', 'pyin oo lwin': 'mandalay', 'pyaw bwe': 'mandalay', 'thazi': 'mandalay',
    'ya mae thin': 'mandalay', 'pyinmana': 'nay pyi taw', 'nay pyi taw': 'nay pyi taw',
    'naypyitaw': 'nay pyi taw', 'yangon': 'yangon',
    'bago': 'bago', 'taungoo': 'bago', 'pyay': 'bago', 'dike oo': 'bago', 'nyaung lay pin': 'bago',
    'chaungtha': 'ayeyarwady', 'ngwe saung': 'ayeyarwady', 'pathein': 'ayeyarwady', 'myaungmya': 'ayeyarwady',
    'hin thata': 'ayeyarwady', 'ma u bin': 'ayeyarwady', 'laputtar': 'ayeyarwady',
    'sittwe': 'rakhine', 'mrauk-u': 'rakhine', 'kyaukphyu': 'rakhine', 'ngapali': 'rakhine',
    'thandwe': 'rakhine', 'munaung': 'rakhine', 'gwa': 'rakhine', 'taung gote': 'rakhine',
    'mawlamyaing': 'mon', 'kyaikhto': 'mon', 'tha htone': 'mon', 'mudone': 'mon', 'thanphyu zayat': 'mon', 'ye': 'mon',
    'hpa-an': 'kayin', 'hpa - an': 'kayin', 'myawaddy': 'kayin', 'karen': 'kayin',
    'loikaw': 'kayah', 'd mol sol': 'kayah', 'hpasawng': 'kayah',
    'dawei': 'tanintharyi', 'myeik': 'tanintharyi', 'kawthaung': 'tanintharyi',
    'myitkyina': 'kachin', 'putao': 'kachin', 'bhamaw': 'kachin', 'phakant': 'kachin', 'moe nyin': 'kachin',
    'kanpatlet': 'chin', 'mindat': 'chin', 'matupi': 'chin', 'matubi': 'chin',
    'sagaing': 'sagaing', 'monywa': 'sagaing', 'shwe bo': 'sagaing', 'katha': 'sagaing', 'kalay': 'sagaing',
    'magwe': 'magway', 'pakokku': 'magway', 'min bu': 'magway', 'yenangyaung': 'magway',
    'chauk': 'magway', 'gangaw': 'magway', 'taung twin gyi': 'magway',
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
        const place = String(row.place).toLowerCase().replace(/[^a-z ]/g, "").trim();
        const region = CITY_TO_REGION[place] || place;
        hotelMap[region] ??= { hotels: 0, rooms: 0 };
        hotelMap[region].hotels += Number(row.hotels || 0);
        hotelMap[region].rooms += Number(row.rooms || 0);
    });
    const hotelCapacity = Object.entries(hotelMap).map(([region, data]) => ({ region, hotels: data.hotels, rooms: data.rooms }));

    return {
        domesticVisitors: Object.values(domesticMap),
        hotelCapacity,
        seasonality: destinationProfiles,
    };
}
