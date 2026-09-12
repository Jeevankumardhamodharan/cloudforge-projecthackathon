"""
database.py
Handles SQLite connection and schema initialization for Sanchay - Trust Engine.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sanchay.db")


def get_connection():
    """Return a new SQLite connection with row factory set to dict-like rows."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    """Create tables if they do not already exist."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS ledger (
            entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id TEXT NOT NULL,
            member_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL CHECK(transaction_type IN ('Contribution', 'Payout')),
            amount REAL NOT NULL,
            timestamp TEXT NOT NULL,
            note TEXT,
            previous_hash TEXT NOT NULL,
            current_hash TEXT NOT NULL
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS members (
            member_id TEXT PRIMARY KEY,
            name TEXT,
            group_id TEXT
        );
    """)

    conn.commit()
    conn.close()


def reset_db():
    """Wipe all data (used by demo-data seeding so re-seeding is idempotent)."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM ledger;")
    cur.execute("DELETE FROM members;")
    conn.commit()
    conn.close()
