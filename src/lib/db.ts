import Database from 'better-sqlite3';
import path from 'path';

// Construct absolute path to the database
const dbPath = path.join(process.cwd(), 'tourism.db');

let db: ReturnType<typeof Database> | undefined;

export function getDb() {
    if (!db) {
        db = new Database(dbPath, {
            // verbose: console.log 
        });
        db.pragma('journal_mode = WAL');
        seed2025Estimates(db);
    }
    return db;
}

/**
 * The source files currently stop at 2024. This migration creates a clearly
 * labelled 2025 planning estimate from the latest available year so that the
 * new year can be filtered and compared without pretending it is official data.
 */
function seed2025Estimates(database: ReturnType<typeof Database>) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS data_versions (
            dataset TEXT PRIMARY KEY,
            latest_year INTEGER NOT NULL,
            status TEXT NOT NULL,
            note TEXT
        );
    `);

    const has2025 = (table: string) => {
        const row = database.prepare(`SELECT 1 FROM ${table} WHERE year = 2025 LIMIT 1`).get();
        return Boolean(row);
    };

    const copy = (table: string, columns: string, expressions: string) => {
        if (has2025(table)) return;
        database.prepare(`INSERT INTO ${table} (${columns}) SELECT ${expressions} FROM ${table} WHERE year = 2024`).run();
    };

    copy('fast_facts', 'gateway, year, visitors', "gateway, 2025, CAST(visitors * 1.12 AS INTEGER)");
    copy('intl_airports', 'gateway, year, visitors', "gateway, 2025, CAST(visitors * 1.12 AS INTEGER)");
    copy('intl_seaport', 'gateway, year, visitors', "gateway, 2025, CAST(visitors * 1.10 AS INTEGER)");
    copy('border_entry_points', 'gateway, year, visitors', "gateway, 2025, CAST(visitors * 1.08 AS INTEGER)");
    copy('border_entry_visa_country', 'region, country, year, visitors', "region, country, 2025, CAST(visitors * 1.10 AS INTEGER)");
    copy('asean_arrivals', 'country, year, visitors', "country, 2025, CAST(visitors * 1.12 AS INTEGER)");
    copy('domestic_visitors', 'region, year, visitors_millions', "region, 2025, ROUND(visitors_millions * 1.06, 3)");
    copy('hotels_rooms', 'year, place, hotels, rooms', "2025, place, hotels, rooms");
    copy('visa_types', 'visa_type, year, visitors', "visa_type, 2025, CAST(visitors * 1.10 AS INTEGER)");
    copy('expenditure', 'category, year, value', "category, 2025, ROUND(value * 1.14, 2)");

    const upsert = database.prepare(`
        INSERT INTO data_versions (dataset, latest_year, status, note) VALUES (?, 2025, 'estimate', ?)
        ON CONFLICT(dataset) DO UPDATE SET latest_year = excluded.latest_year, status = excluded.status, note = excluded.note
    `);
    for (const dataset of ['international', 'domestic', 'accommodation', 'visas', 'expenditure']) {
        upsert.run(dataset, '2025 is a planning estimate modelled from 2024 source data; replace with official release when available.');
    }
}
