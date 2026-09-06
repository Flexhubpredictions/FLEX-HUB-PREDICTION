const Database = require("better-sqlite3");
const path = require("path");

// ==========================================
// FLEX HUB PREDICTIONS DATABASE
// ==========================================

const dbPath = path.join(__dirname, "flexhub.db");

const db = new Database(dbPath);

// Improve SQLite performance
db.pragma("journal_mode = WAL");

// ==========================================
// USERS TABLE
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        username TEXT NOT NULL UNIQUE,

        email TEXT NOT NULL UNIQUE,

        password TEXT NOT NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

console.log("Users table is ready.");


// ==========================================
// PREDICTIONS TABLE
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        league TEXT NOT NULL,

        home_team TEXT NOT NULL,

        away_team TEXT NOT NULL,

        match_date TEXT NOT NULL,

        match_time TEXT NOT NULL,

        prediction TEXT NOT NULL,

        analysis TEXT,

        category TEXT NOT NULL DEFAULT 'regular',

        status TEXT NOT NULL DEFAULT 'pending',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

console.log("Predictions table is ready.");


// ==========================================
// VIP SUBSCRIPTIONS TABLE
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS vip_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        code TEXT NOT NULL UNIQUE,

        plan TEXT NOT NULL,

        duration_days INTEGER NOT NULL,

        status TEXT NOT NULL DEFAULT 'unused',

        user_id INTEGER,

        activated_at TEXT,

        expires_at TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
        REFERENCES users(id)
    )
`);

console.log("VIP subscriptions table is ready.");


// ==========================================
// DATABASE READY
// ==========================================

console.log("FLEX HUB database connected.");


// ==========================================
// EXPORT DATABASE
// ==========================================

module.exports = db;