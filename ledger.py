"""
ledger.py
Implements the tamper-evident hash-chain ledger for Sanchay.

Each ledger entry stores a SHA-256 hash computed over its own fields plus
the hash of the entry immediately before it (previous_hash). This creates
a hash chain: if any single field of any past entry is altered, that
entry's stored current_hash will no longer match a freshly recomputed
hash, and every entry after it becomes detectably invalid too.

This is a lightweight, dependency-free alternative to blockchain -
same tamper-evidence guarantee, no consensus/mining/network overhead.
"""

import hashlib
from datetime import datetime, timezone

GENESIS_HASH = "0" * 64  # hash chain starts from this fixed genesis value


def compute_hash(group_id, member_id, transaction_type, amount, timestamp, note, previous_hash):
    """Compute a SHA-256 hash over the entry's fields + previous_hash.

    Amount is always normalized to a fixed-precision float string before
    hashing. Without this, an amount inserted as a Python int (e.g. 5000)
    would hash differently from the same value read back from SQLite,
    where REAL columns always come back as floats (5000.0) - causing
    false-positive "tampering" detections on perfectly untouched data.
    """
    normalized_amount = f"{float(amount):.2f}"
    payload = f"{group_id}|{member_id}|{transaction_type}|{normalized_amount}|{timestamp}|{note}|{previous_hash}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get_last_entry(conn):
    """Return the most recently inserted ledger row, or None if the ledger is empty."""
    cur = conn.cursor()
    cur.execute("SELECT * FROM ledger ORDER BY entry_id DESC LIMIT 1;")
    return cur.fetchone()


def add_entry(conn, group_id, member_id, transaction_type, amount, note=""):
    """Append a new entry to the hash-chain ledger and persist it."""
    last = get_last_entry(conn)
    previous_hash = last["current_hash"] if last else GENESIS_HASH

    timestamp = datetime.now(timezone.utc).isoformat()
    current_hash = compute_hash(
        group_id, member_id, transaction_type, amount, timestamp, note, previous_hash
    )

    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO ledger
            (group_id, member_id, transaction_type, amount, timestamp, note, previous_hash, current_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (group_id, member_id, transaction_type, amount, timestamp, note, previous_hash, current_hash),
    )
    conn.commit()

    return {
        "entry_id": cur.lastrowid,
        "group_id": group_id,
        "member_id": member_id,
        "transaction_type": transaction_type,
        "amount": amount,
        "timestamp": timestamp,
        "note": note,
        "previous_hash": previous_hash,
        "current_hash": current_hash,
    }


def get_all_entries(conn):
    """Return every ledger entry ordered by insertion (chain order)."""
    cur = conn.cursor()
    cur.execute("SELECT * FROM ledger ORDER BY entry_id ASC;")
    return [dict(row) for row in cur.fetchall()]


def verify_chain(conn):
    """
    Walk the entire chain from genesis and recompute every hash.

    Returns a dict:
        valid: bool               - True only if every entry checks out
        total_entries: int
        broken_at: int | None      - entry_id of the first invalid entry, if any
        details: list[dict]       - per-entry status for the ledger table UI
    """
    entries = get_all_entries(conn)
    expected_previous = GENESIS_HASH
    broken_at = None
    details = []

    for entry in entries:
        recomputed = compute_hash(
            entry["group_id"],
            entry["member_id"],
            entry["transaction_type"],
            entry["amount"],
            entry["timestamp"],
            entry["note"],
            entry["previous_hash"],
        )

        # An entry is valid only if:
        # 1) its previous_hash matches what the chain expects at this position, AND
        # 2) its stored current_hash matches what we recompute from its own fields
        chain_link_ok = entry["previous_hash"] == expected_previous
        hash_ok = recomputed == entry["current_hash"]
        is_valid = chain_link_ok and hash_ok

        if not is_valid and broken_at is None:
            broken_at = entry["entry_id"]

        details.append({
            "entry_id": entry["entry_id"],
            "valid": is_valid,
            "chain_link_ok": chain_link_ok,
            "hash_ok": hash_ok,
        })

        # Continue the expected chain using the entry's *stored* hash so that
        # a single corrupted entry is flagged, without cascading false
        # positives from a hash we already know is wrong.
        expected_previous = entry["current_hash"]

    return {
        "valid": broken_at is None,
        "total_entries": len(entries),
        "broken_at": broken_at,
        "details": details,
    }
