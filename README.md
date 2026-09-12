# Sanchay — Trust Engine for Chit Funds

## 1. Problem Statement

Chit funds (ROSCAs — Rotating Savings and Credit Associations) are one of India's
oldest and largest informal financial systems, moving billions of rupees a year
through community-run savings groups. Yet most groups still run entirely on
**paper registers or WhatsApp messages**:

- Contribution and payout records can be edited or lost with no trace.
- Members have no independent way to verify their own payment history.
- Foremen (group organizers) have no data-driven way to judge which members
  are becoming a default risk before it happens — they rely on gut feeling.

This lack of a verifiable, tamper-evident record is one of the biggest
trust gaps preventing chit funds from being taken seriously by formal
financial institutions and from scaling safely.

## 2. Solution

**Sanchay** ("savings" in Hindi/Sanskrit) is a lightweight digital trust layer
for chit-fund groups:

1. A **tamper-evident hash-chain ledger** records every contribution and
   payout. Each entry cryptographically links to the one before it, so any
   attempt to edit history is immediately detectable — without the cost,
   complexity, or energy overhead of a blockchain.
2. A **payment-history-based default-risk score**, built on survival-analysis
   concepts, gives foremen an early, explainable signal about which members
   are becoming unreliable — before a payout cycle is disrupted.

## 3. Key Features

- 📒 **Digital Ledger** — structured contribution/payout records replacing
  paper and chat logs.
- 🔗 **Hash-Chain Integrity** — SHA-256 hash chain with a one-click
  "Verify Ledger Integrity" check that pinpoints exactly which entry was
  tampered with, if any.
- 📊 **Explainable Risk Scoring** — a Kaplan-Meier survival-analysis model
  scores each member's default risk (Low / Medium / High) from their
  contribution history, with a plain-language explanation for every score.
- 🖥️ **Fintech-style Dashboard** — totals, member overview, ledger status,
  and recent transactions at a glance.
- ⚡ **One-click Demo Data** — realistic synthetic data for an instant,
  judge-ready demo.

## 4. Technology Stack

| Layer            | Technology                                   |
|-------------------|----------------------------------------------|
| Frontend          | React.js, Vite, JavaScript, CSS               |
| Backend           | Python, FastAPI, REST APIs                    |
| Database          | SQLite                                        |
| Integrity Layer   | SHA-256 hash-chained ledger (no blockchain)   |
| Risk Modelling    | NumPy-based Kaplan-Meier survival analysis, synthetic ROSCA payment data |

## 5. System Architecture

```
React UI  (Dashboard / Ledger / Risk / Add-Transaction)
   ↓  REST (fetch)
FastAPI REST API   (main.py)
   ↓
SQLite Database    (database.py)
   ↓
Hash-Chain Ledger  (ledger.py — SHA-256, previous_hash → current_hash)
   ↓
Payment History    (seed_data.py — synthetic contribution cycles)
   ↓
Survival-Analysis Risk Model (risk_model.py — Kaplan-Meier estimator)
   ↓
Risk Score & Financial Insights (risk level + human-readable explanation)
```

## 6. Project Structure

```
sanchay-trust-engine/
│
├── backend/
│   ├── main.py            FastAPI app + all REST endpoints
│   ├── database.py        SQLite connection & schema init
│   ├── ledger.py           Hash-chain logic (add / verify)
│   ├── risk_model.py       Synthetic data + Kaplan-Meier risk scoring
│   ├── seed_data.py        Demo data generator
│   └── requirements.txt
│
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── styles.css
│       └── components/
│           ├── Dashboard.jsx
│           ├── Ledger.jsx
│           ├── RiskScore.jsx
│           └── TransactionForm.jsx
│
├── README.md
├── .gitignore
└── requirements.txt
```

## 7. How to Run the Backend

Requires Python 3.10+.

```bash
cd backend
pip install -r requirements.txt          # or: pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload
```

The API starts at **http://127.0.0.1:8000**. The SQLite database
(`backend/sanchay.db`) and its tables are created automatically on first run
— no manual migration step is needed.

Interactive API docs are available at `http://127.0.0.1:8000/docs`.

## 8. How to Run the Frontend

Requires Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```

The app starts at **http://127.0.0.1:5173** and talks to the backend at
`http://127.0.0.1:8000` (configured in `src/api.js`). Run the backend first.

## 9. API Endpoints

| Method | Endpoint                | Description                                          |
|--------|--------------------------|-------------------------------------------------------|
| GET    | `/`                      | Health check / service info                           |
| GET    | `/ledger`                | List every ledger entry, with per-entry integrity status |
| POST   | `/ledger`                | Add a new contribution/payout entry to the hash chain  |
| GET    | `/verify`                | Verify the entire hash chain; reports the first broken entry, if any |
| GET    | `/risk/{member_id}`      | Get a member's risk score, level, and explanation      |
| GET    | `/members`               | List all known members                                |
| POST   | `/seed-demo-data`        | Wipe and regenerate synthetic demo data                |

## 10. How Hash-Chain Verification Works

Every ledger entry stores two fields: `previous_hash` and `current_hash`.

1. When a new entry is added, its `previous_hash` is set to the
   `current_hash` of the entry immediately before it (the very first entry
   points to a fixed genesis hash of all zeros).
2. `current_hash` is a SHA-256 digest computed over the entry's own fields
   (group, member, type, amount, timestamp, note) **plus** `previous_hash`.
3. To verify the ledger, the backend walks every entry from the start and
   recomputes each hash from scratch, checking that:
   - the entry's `previous_hash` matches the previous entry's *stored*
     `current_hash` (the chain link), and
   - the entry's own recomputed hash matches its *stored* `current_hash`
     (the content check).
4. If **any** field of **any** past entry is edited directly in the
   database, its recomputed hash will no longer match what's stored —
   `/verify` reports that specific `entry_id` as invalid, without needing
   blockchain-style consensus or mining.

This gives the same tamper-evidence guarantee as a blockchain, at a
fraction of the complexity, for a single-organization ledger.

## 11. How Risk Scoring Works

Each member's contribution history is modelled as a sequence of
on-time / missed payment cycles. The backend fits a **Kaplan-Meier
survival curve** to this sequence — the same product-limit estimator used
in medical and reliability survival analysis, here re-purposed to estimate
the probability a member "survives" (keeps paying reliably) through each
successive due date.

- **Risk score** = `1 − final survival probability` (higher = riskier).
- **Risk level**: Low (`< 30%`), Medium (`30–60%`), High (`≥ 60%`).
- Every score comes with a **plain-language explanation**: number of
  cycles paid on time vs. missed, the survival probability, and a note on
  recent payment trend — so the score is never a black box.

We implement Kaplan-Meier ourselves with NumPy rather than depending on
`scikit-survival`, because that library needs a compiled C/Cython
toolchain that's fragile to install in constrained hackathon/offline
environments. For a single-covariate (payment history) prototype, this
from-scratch estimator is fully transparent, dependency-light, and easy
for judges to read line-by-line — while implementing the same underlying
survival-analysis math.

All payment histories used in the demo are **synthetically generated** —
no real member or financial data is used anywhere in this project.

## 12. Demo Instructions

1. Start the backend (`uvicorn main:app --reload`) and frontend (`npm run dev`).
2. Open the app and go to the **Dashboard** tab.
3. Click **"Load Sample Demo Data"** — this seeds 6 synthetic members, one
   chit-fund group, and 8 cycles of contributions/payouts through the real
   hash-chain ledger.
4. Go to **Ledger** and click **"Verify Ledger Integrity"** — it should show
   a green "Ledger Verified" state.
5. Go to **Risk Score**, pick a member from the dropdown, and read their
   risk score and explanation.

## 13. How to Test Ledger Tampering Detection

1. Seed demo data and confirm the ledger verifies as valid (see above).
2. Stop the backend, then directly edit `backend/sanchay.db` with any SQLite
   tool (or a one-line Python script) to change the `amount` or `note` of
   an existing row in the `ledger` table, e.g.:
   ```bash
   python3 -c "
   import sqlite3
   conn = sqlite3.connect('backend/sanchay.db')
   conn.execute('UPDATE ledger SET amount = 99999 WHERE entry_id = 3')
   conn.commit()
   "
   ```
3. Restart the backend, go to the **Ledger** tab, and click
   **"Verify Ledger Integrity"** again.
4. The app now shows a red **"Tampering Detected"** state and flags entry
   `#3` (and every entry after it) as invalid, because the recomputed hash
   no longer matches what was stored.

## 14. How to Test Risk Scoring

1. On the **Risk Score** tab, select different seeded members
   (`MBR-001`…`MBR-006`) from the dropdown — each has a different synthetic
   payment history, so you'll see a spread of Low/Medium/High risk levels.
2. Read the "Why this score?" explanation for each — it shows the exact
   on-time/missed counts and survival probability driving that score.
3. You can also add a new missed **Contribution** for a member via
   **Add Transaction**, then re-check their risk score after re-seeding or
   restarting the backend (the in-memory synthetic history cache is
   regenerated at seed time — the risk model demonstrates the *scoring
   method*, not live re-scoring from manually added transactions).

## 15. What to Show in a 2-Minute Hackathon Demo

1. **(15s)** Open the Dashboard, click "Load Sample Demo Data" — show totals
   populate instantly.
2. **(30s)** Go to Ledger, show the hash-chain table (previous/current
   hash columns), click "Verify Ledger Integrity" → green "Ledger Verified".
3. **(30s)** Tamper with the SQLite DB live (or show a prepared corrupted
   copy), refresh, click Verify again → red "Tampering Detected", pointing
   at the exact broken entry. This is the "wow" moment.
4. **(30s)** Go to Risk Score, pick two contrasting members (one Low, one
   High risk), and read out their explanations — emphasize it's not a
   black box.
5. **(15s)** Close on the problem/solution framing: "This is a lightweight,
   verifiable alternative to blockchain for community finance."

## 16. Future Enhancements

- Multi-group and multi-foreman support with role-based access.
- SMS/WhatsApp bot integration so members can log contributions directly.
- Export a signed, shareable "proof of payment history" PDF per member.
- Cross-group risk benchmarking and a foreman-facing alert system.
- Optional external audit trail (e.g. periodic anchoring of the ledger's
  latest hash to a public timestamping service) for extra tamper evidence.

## Disclaimer

**This is a hackathon prototype.** The default-risk score is a simplified,
illustrative model built on synthetic data. It is **not** a real lending,
credit, or underwriting decision tool and must not be used as one without
substantial further validation, real data, and regulatory review.
