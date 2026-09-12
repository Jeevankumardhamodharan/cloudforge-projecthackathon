"""
seed_data.py
Generates realistic SYNTHETIC demo data for Sanchay so judges can see the
full application working immediately: a chit-fund group, its members, and
a history of contribution/payout ledger entries built through the real
hash-chain (ledger.add_entry), plus resets the risk-model history cache
so risk scores line up with a fresh demo run.

No real people or real financial data are used - all names and IDs are
fictional placeholders for demo purposes only.
"""

import random
from datetime import datetime, timedelta, timezone

import database
import ledger
import risk_model

DEMO_GROUP_ID = "GRP-101"

DEMO_MEMBERS = [
    ("MBR-001", "A. Kumar"),
    ("MBR-002", "S. Priya"),
    ("MBR-003", "R. Muthu"),
    ("MBR-004", "V. Lakshmi"),
    ("MBR-005", "K. Suresh"),
    ("MBR-006", "N. Deepa"),
]

MONTHLY_CONTRIBUTION = 5000


def seed_demo_data():
    """Wipe existing data and rebuild a fresh, consistent demo dataset."""
    database.reset_db()
    risk_model.reset_history_cache()

    conn = database.get_connection()
    cur = conn.cursor()

    for member_id, name in DEMO_MEMBERS:
        cur.execute(
            "INSERT INTO members (member_id, name, group_id) VALUES (?, ?, ?)",
            (member_id, name, DEMO_GROUP_ID),
        )
    conn.commit()

    # Build ledger entries cycle-by-cycle so the hash chain reads in
    # chronological order, mirroring the member's synthetic payment history.
    n_cycles = 8
    base_time = datetime.now(timezone.utc) - timedelta(days=30 * n_cycles)

    for cycle in range(n_cycles):
        cycle_time_note = base_time + timedelta(days=30 * cycle)

        for member_id, name in DEMO_MEMBERS:
            history = risk_model.get_or_create_history(member_id)
            paid_on_time = history[cycle] if cycle < len(history) else 1

            if paid_on_time:
                note = f"Cycle {cycle + 1} contribution - on time"
                amount = MONTHLY_CONTRIBUTION
            else:
                note = f"Cycle {cycle + 1} contribution - late/partial"
                amount = round(MONTHLY_CONTRIBUTION * random.uniform(0.3, 0.8), 2)

            ledger.add_entry(
                conn,
                group_id=DEMO_GROUP_ID,
                member_id=member_id,
                transaction_type="Contribution",
                amount=amount,
                note=note,
            )

        # One member takes the payout for this cycle (typical chit-fund rotation)
        payout_member = DEMO_MEMBERS[cycle % len(DEMO_MEMBERS)][0]
        payout_amount = MONTHLY_CONTRIBUTION * len(DEMO_MEMBERS) * 0.9  # minus commission
        ledger.add_entry(
            conn,
            group_id=DEMO_GROUP_ID,
            member_id=payout_member,
            transaction_type="Payout",
            amount=round(payout_amount, 2),
            note=f"Cycle {cycle + 1} payout (auction/rotation winner)",
        )

    conn.close()

    return {
        "group_id": DEMO_GROUP_ID,
        "members_created": len(DEMO_MEMBERS),
        "cycles_seeded": n_cycles,
    }
