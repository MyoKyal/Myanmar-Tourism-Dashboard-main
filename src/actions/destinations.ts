"use server";

import { getDb } from "@/lib/db";
import { GlobalFiltersState } from "@/lib/FilterContext";
import { destinationProfiles } from "@/lib/documentStore";

export async function getDestinationsMapData(filters: GlobalFiltersState) {
    const db = getDb();

    // Filtering logic
    const params: any[] = [];
    let filterCondition = "";
    if (filters.year !== 'All') {
        filterCondition = "WHERE year = ?";
        params.push(parseInt(filters.year));
    } else if (filters.yearRange) {
        filterCondition = "WHERE year >= ? AND year <= ?";
        params.push(filters.yearRange[0], filters.yearRange[1]);
    }

    // 1. Domestic Visitors by Region
    const domesticVisitors = db.prepare(`
        SELECT region, SUM(visitors_millions) * 1000000 as visitors 
        FROM domestic_visitors 
        ${filterCondition} 
        GROUP BY region
    `).all(...params) as any[];

    // 2. Hotel Capacity by Region
    let capacityParams = [...params];
    let capacityFilter = filterCondition;

    if (filters.year === 'All') {
        const latestYear = db.prepare(`SELECT MAX(year) as maxYear FROM hotels_rooms ${filterCondition}`).get(...params) as any;
        if (latestYear && latestYear.maxYear) {
            capacityFilter = "WHERE year = ?";
            capacityParams = [latestYear.maxYear];
        } else {
            capacityFilter = "WHERE 1=0";
        }
    }

    const rawHotelCapacity = db.prepare(`
        SELECT place, SUM(hotels) as hotels, SUM(rooms) as rooms 
        FROM hotels_rooms 
        ${capacityFilter} 
        GROUP BY place
    `).all(...capacityParams) as any[];

    // City to Region mapping dictionary to roll up hotel data
    const cityToRegion: Record<string, string> = {
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
        'chauk': 'magway', 'gangaw': 'magway', 'taung twin gyi': 'magway'
    };

    const aggregatedHotels: Record<string, { hotels: number, rooms: number }> = {};

    for (const row of rawHotelCapacity) {
        let pNorm = row.place.toLowerCase().replace(/[^a-z ]/g, "").trim();
        let mappedRegion = cityToRegion[pNorm] || pNorm; // fallback to place itself if not mapped

        if (!aggregatedHotels[mappedRegion]) {
            aggregatedHotels[mappedRegion] = { hotels: 0, rooms: 0 };
        }
        aggregatedHotels[mappedRegion].hotels += row.hotels;
        aggregatedHotels[mappedRegion].rooms += row.rooms;
    }

    const hotelCapacity = Object.entries(aggregatedHotels).map(([region, data]) => ({
        region,
        hotels: data.hotels,
        rooms: data.rooms
    }));

    // 3. Best Travel Months (from Document Store)
    const seasonality = destinationProfiles;

    return {
        domesticVisitors,
        hotelCapacity,
        seasonality
    };
}
