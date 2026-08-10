"use server";

import { getDb } from "@/lib/db";
import { GlobalFiltersState } from "@/lib/FilterContext";

export async function getHotelsData(filters: GlobalFiltersState) {
    const db = getDb();

    // Base params for filtering logic
    let filterCondition = "";
    const params: any[] = [];
    if (filters.year !== 'All') {
        filterCondition = "WHERE year = ?";
        params.push(parseInt(filters.year));
    } else if (filters.yearRange) {
        filterCondition = "WHERE year >= ? AND year <= ?";
        params.push(filters.yearRange[0], filters.yearRange[1]);
    }

    // Since the original dataset includes "Total" rows sometimes, my ingestion script stripped "Total" where place === 'Total'.
    // 1. Total hotels and rooms (aggregated over years if multiple selected, but usually capacity is a snapshot so if 'All' years, we should probably average or pick the latest. But for simplicity, we just SUM over what's provided or if 'All', take the max year to be accurate? The user requirement says "Total hotels, Total rooms". It makes sense to display the latest year if multiple are selected for capacity.)

    let capacityParams = [...params];
    let capacityFilter = filterCondition;

    // If multiple years are selected, we shouldn't sum hotel capacity since it's a point-in-time metric. Let's take the latest year in the range. 
    if (filters.year === 'All') {
        const latestYear = db.prepare(`SELECT MAX(year) as maxYear FROM hotels_rooms ${filterCondition}`).get(...params) as any;
        if (latestYear && latestYear.maxYear) {
           capacityFilter = "WHERE year = ?";
           capacityParams = [latestYear.maxYear];
        } else {
            capacityFilter = "WHERE 1=0"; // fallback
        }
    }

    const totalRow = db.prepare(`
        SELECT SUM(hotels) as totalHotels, SUM(rooms) as totalRooms 
        FROM hotels_rooms 
        ${capacityFilter}
    `).get(...capacityParams) as any;

    const totalHotels = totalRow?.totalHotels || 0;
    const totalRooms = totalRow?.totalRooms || 0;
    const avgRoomsPerHotel = totalHotels > 0 ? (totalRooms / totalHotels).toFixed(1) : 0;

    // 2. Top regions by hotel capacity
    const regions = db.prepare(`
        SELECT place as name, SUM(hotels) as hotels, SUM(rooms) as rooms 
        FROM hotels_rooms 
        ${capacityFilter} 
        GROUP BY place
        ORDER BY rooms DESC
        LIMIT 15
    `).all(...capacityParams) as any[];

    // 3. Hotel capacity trends (across all years)
    const trendsCondition = filters.yearRange ? "WHERE year >= ? AND year <= ?" : "";
    const trendsParams = filters.yearRange ? [filters.yearRange[0], filters.yearRange[1]] : [];
    const yearlyTrends = db.prepare(`
        SELECT year, SUM(hotels) as hotels, SUM(rooms) as rooms 
        FROM hotels_rooms 
        ${trendsCondition}
        GROUP BY year 
        ORDER BY year
    `).all(...trendsParams) as any[];

    return {
        totalHotels,
        totalRooms,
        avgRoomsPerHotel,
        regions,
        yearlyTrends
    };
}
