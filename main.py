"""
main.py
Sanchay - Trust Engine for Chit Funds
FastAPI backend entrypoint. Exposes REST endpoints for the ledger,
integrity verification, risk scoring, and demo-data seeding.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

import database
import ledger
import risk_model
import seed_data

app = FastAPI(
    title="Sanchay - Trust Engine for Chit Funds",
    description="Tamper-evident hash-chain ledger + payment-history default-risk scoring for ROSCA / chit-fund groups.",
    version="1.0.0",
)

# CORS: allow the Vite dev server (and any origin, since this is a hackathon
# prototype with no auth) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    database.init_db()


class LedgerEntryCreate(BaseModel):
    group_id: str = Field(..., examples=["GRP-101"])
    member_id: str = Field(..., examples=["MBR-001"])
    transaction_type: str = Field(..., examples=["Contribution"])
    amount: float = Field(..., gt=0)
    note: Optional[str] = ""


@app.get("/")
def root():
    return {
        "service": "Sanchay - Trust Engine for Chit Funds",
        "status": "running",
        "endpoints": ["/ledger", "/verify", "/risk/{member_id}", "/seed-demo-data"],
    }


@app.get("/ledger")
def get_ledger():
    """Return every ledger entry in chain order."""
    conn = database.get_connection()
    try:
        entries = ledger.get_all_entries(conn)
        verification = ledger.verify_chain(conn)
        status_by_id = {d["entry_id"]: d["valid"] for d in verification["details"]}
        for entry in entries:
            entry["integrity_status"] = "valid" if status_by_id.get(entry["entry_id"], False) else "invalid"
        return {"entries": entries, "count": len(entries)}
    finally:
        conn.close()


@app.post("/ledger")
def create_ledger_entry(payload: LedgerEntryCreate):
    """Add a new entry to the hash-chain ledger."""
    if payload.transaction_type not in ("Contribution", "Payout"):
        raise HTTPException(status_code=400, detail="transaction_type must be 'Contribution' or 'Payout'.")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be greater than zero.")

    conn = database.get_connection()
    try:
        entry = ledger.add_entry(
            conn,
            group_id=payload.group_id,
            member_id=payload.member_id,
            transaction_type=payload.transaction_type,
            amount=payload.amount,
            note=payload.note or "",
        )
        return entry
    finally:
        conn.close()


@app.get("/verify")
def verify_ledger():
    """Verify the entire hash chain and report any tampering."""
    conn = database.get_connection()
    try:
        result = ledger.verify_chain(conn)
        return result
    finally:
        conn.close()


@app.get("/risk/{member_id}")
def get_member_risk(member_id: str):
    """Return the default-risk score, level, and explanation for a member."""
    conn = database.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT member_id FROM members WHERE member_id = ?", (member_id,))
        exists = cur.fetchone()
    finally:
        conn.close()

    if not exists:
        raise HTTPException(status_code=404, detail=f"Member '{member_id}' not found. Seed demo data first.")

    return risk_model.score_member_cached(member_id)


@app.get("/members")
def list_members():
    """Return all known members (used by the frontend's member selector)."""
    conn = database.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT member_id, name, group_id FROM members ORDER BY member_id ASC;")
        return {"members": [dict(row) for row in cur.fetchall()]}
    finally:
        conn.close()


@app.post("/seed-demo-data")
def seed_demo_data_endpoint():
    """Wipe and regenerate synthetic demo data: members + hash-chained ledger entries."""
    result = seed_data.seed_demo_data()
    return {"message": "Demo data seeded successfully.", **result}
