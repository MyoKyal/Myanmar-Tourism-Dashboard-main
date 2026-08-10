const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'tourism.db');
const dataDir = path.join(__dirname, '..', 'dataset');

// Remove existing db if testing
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// 1. Create Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS asean_arrivals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country TEXT,
        year INTEGER,
        visitors INTEGER
    );
    CREATE TABLE IF NOT EXISTS border_entry_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gateway TEXT,
        year INTEGER,
        visitors INTEGER
    );
    CREATE TABLE IF NOT EXISTS border_entry_visa_country (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region TEXT,
        country TEXT,
        year INTEGER,
        visitors INTEGER
    );
    CREATE TABLE IF NOT EXISTS domestic_visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region TEXT,
        year INTEGER,
        visitors_millions REAL
    );
    CREATE TABLE IF NOT EXISTS fast_facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gateway TEXT,
        year INTEGER,
        visitors INTEGER
    );
    CREATE TABLE IF NOT EXISTS hotels_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER,
        place TEXT,
        hotels INTEGER,
        rooms INTEGER
    );
    CREATE TABLE IF NOT EXISTS intl_airports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gateway TEXT,
        year INTEGER,
        visitors INTEGER
    );
    CREATE TABLE IF NOT EXISTS intl_seaport (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gateway TEXT,
        year INTEGER,
        visitors INTEGER
    );
    CREATE TABLE IF NOT EXISTS monthly_visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT,
        myanmar_male INTEGER,
        myanmar_female INTEGER,
        foreigner_male INTEGER,
        foreigner_female INTEGER,
        total_visitors INTEGER,
        flights INTEGER,
        seat_capacity INTEGER
    );
    CREATE TABLE IF NOT EXISTS visa_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visa_type TEXT,
        year INTEGER,
        visitors INTEGER
    );
    CREATE TABLE IF NOT EXISTS expenditure (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        year INTEGER,
        value REAL
    );
`);

// Clean number strings "1,234" -> 1234
const parseNum = (str) => {
    if (!str || str === '-' || str === '.') return 0;
    const num = parseFloat(str.replace(/,/g, '').replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : num;
};

// Generic CSV Reader that returns a promise of rows
const readCSV = (filename) => {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(path.join(dataDir, filename))
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
};

const processAseanArrivals = async () => {
    const rows = await readCSV('ASEAN_Arrivals.csv');
    const insert = db.prepare('INSERT INTO asean_arrivals (country, year, visitors) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            if (row.Country && row.Country !== 'Total') {
                for (let year = 2016; year <= 2024; year++) {
                    if (row[year]) {
                        insert.run(row.Country, year, parseNum(row[year]));
                    }
                }
            }
        }
    });
    insertMany(rows);
};

const processBorderEntryPoints = async () => {
    const rows = await readCSV('Border_Entry_Points_EP_BP_TBP.csv');
    const insert = db.prepare('INSERT INTO border_entry_points (gateway, year, visitors) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            if (row.Gateway && row.Gateway !== 'Total') {
                for (let year = 2015; year <= 2024; year++) {
                    if (row[year]) {
                        insert.run(row.Gateway, year, parseNum(row[year]));
                    }
                }
            }
        }
    });
    insertMany(rows);
};

const processBorderEntryVisaCountry = async () => {
    const rows = await readCSV('Border_Entry_Visa_Country.csv');
    const insert = db.prepare('INSERT INTO border_entry_visa_country (region, country, year, visitors) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((rows) => {
        let currentRegion = '';
        for (const row of rows) {
            if (row['Country/Region'] === 'Total') continue;

            // if 'No' is empty, it's a region row in this CSV format
            if (!row['No'] && row['Country/Region']) {
                currentRegion = row['Country/Region'];
            } else if (row['No']) {
                const country = row['Country/Region'];
                for (let year = 2015; year <= 2024; year++) {
                    if (row[year]) {
                        insert.run(currentRegion, country, year, parseNum(row[year]));
                    }
                }
            }
        }
    });
    insertMany(rows);
};

const processDomesticVisitors = async () => {
    const rows = await readCSV('Domestic_Visitor_Arrivals.csv');
    const insert = db.prepare('INSERT INTO domestic_visitors (region, year, visitors_millions) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            if (row['State & Region'] && row['State & Region'] !== 'Total') {
                for (let year = 2019; year <= 2024; year++) {
                    if (row[year]) {
                        insert.run(row['State & Region'], year, parseNum(row[year]));
                    }
                }
            }
        }
    });
    insertMany(rows);
};

const processFastFacts = async () => {
    const rows = await readCSV('Fast_Facts_International_Arrivals.csv');
    const insert = db.prepare('INSERT INTO fast_facts (gateway, year, visitors) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            // Ignore Change row
            if (row.Gateway && row.Gateway !== 'Total' && row.Gateway !== 'Change') {
                for (let year = 2015; year <= 2024; year++) {
                    if (row[year]) {
                        insert.run(row.Gateway, year, parseNum(row[year]));
                    }
                }
            }
        }
    });
    insertMany(rows);
};

const processHotelsRooms = async () => {
    const rows = await readCSV('Hotels_and_Rooms.csv');
    const insert = db.prepare('INSERT INTO hotels_rooms (year, place, hotels, rooms) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            if (row.Place && row.Place !== 'Total' && row.Year) {
                insert.run(parseNum(row.Year), row.Place, parseNum(row.Number), parseNum(row.Room));
            }
        }
    });
    insertMany(rows);
};

const processIntlAirports = async () => {
    const rows = await readCSV('Intl_Airports.csv');
    const insert = db.prepare('INSERT INTO intl_airports (gateway, year, visitors) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            if (row.Gateway && row.Gateway !== 'Total') {
                for (let year = 2015; year <= 2024; year++) {
                    if (row[year]) {
                        insert.run(row.Gateway, year, parseNum(row[year]));
                    }
                }
            }
        }
    });
    insertMany(rows);
};

const processIntlSeaport = async () => {
    const rows = await readCSV('Intl_Seaport.csv');
    const insert = db.prepare('INSERT INTO intl_seaport (gateway, year, visitors) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            if (row.Gateway && row.Gateway !== 'Total') {
                for (let year = 2015; year <= 2024; year++) {
                    if (row[year]) {
                        insert.run(row.Gateway, year, parseNum(row[year]));
                    }
                }
            }
        }
    });
    insertMany(rows);
};

const processMonthlyVisitors = async () => {
    const rows = await readCSV('Monthly_Visitor_Arrivals.csv');
    const insert = db.prepare(`
        INSERT INTO monthly_visitors 
        (month, myanmar_male, myanmar_female, foreigner_male, foreigner_female, total_visitors, flights, seat_capacity) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            if (row.Month && row.Month !== 'Total') {
                insert.run(
                    row.Month,
                    parseNum(row['Myanmar Male']),
                    parseNum(row['Myanmar Female']),
                    parseNum(row['Foreigner Male']),
                    parseNum(row['Foreigner Female']),
                    parseNum(row['Total']),
                    parseNum(row['No.of Flights']),
                    parseNum(row['Seat Capacity'])
                );
            }
        }
    });
    insertMany(rows);
};

const processVisaTypes = async () => {
    const rows = await readCSV('Types_of_Visa.csv');
    const insert = db.prepare('INSERT INTO visa_types (visa_type, year, visitors) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            if (row['Types of Visa'] && !row['Types of Visa'].includes('Total') && !row['Types of Visa'].includes('Entries')) {
                for (let year = 2015; year <= 2024; year++) {
                    if (row[year]) {
                        insert.run(row['Types of Visa'], year, parseNum(row[year]));
                    }
                }
            }
        }
    });
    insertMany(rows);
};

const processExpenditure = async () => {
    const rows = await readCSV('Visitor_Arrivals_Expenditure.csv');
    const insert = db.prepare('INSERT INTO expenditure (category, year, value) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            if (row.Category) {
                for (let year = 2015; year <= 2024; year++) {
                    if (row[year]) {
                        insert.run(row.Category, year, parseNum(row[year]));
                    }
                }
            }
        }
    });
    insertMany(rows);
};

const ingestAll = async () => {
    console.log('Starting ingestion...');
    await processAseanArrivals();
    await processBorderEntryPoints();
    await processBorderEntryVisaCountry();
    await processDomesticVisitors();
    await processFastFacts();
    await processHotelsRooms();
    await processIntlAirports();
    await processIntlSeaport();
    await processMonthlyVisitors();
    await processVisaTypes();
    await processExpenditure();
    console.log('Database ingestion complete! Saved to tourism.db');
};

ingestAll().catch(console.error);
