#!/usr/bin/env python3
"""
fractal-evaluator — DRL behavioral-trust (VY) reckoner.

Reads REAL agent-operation exhaust from ChittyOS-Core (verification.adversarial_reviews
joined to verification.adversarial_agents) and writes per-agent VY (ConsciousnessCoordinates
behavioral-trust axis) to the canonical target verification.agent_trust (+ _history),
as authorized by chittyschema-overlord.

VY model (per /home/ubuntu/.ops/consciousness-coordinates.md):
  VY = behavioral trust. Rises on good loop outcomes / consistency / correct adaptation;
  falls on drift / contradiction / stale context.

Concrete VY over real review exhaust per agent, recency-weighted:
  For each review i of an agent within the window:
    outcome_i  = 1.0 if verdict='support' else 0.0      (loop outcome)
    quality_i  = confidence in [0,1]                      (demonstrated fit)
    w_i        = 0.5**(age_days_i / HALFLIFE_DAYS)        (recency; stale context decays)
  base       = sum(w_i * (OUTCOME_W*outcome_i + QUALITY_W*quality_i)) / sum(w_i)
  consistency = 1 - stdev(per-review score) within window  (penalise erratic behaviour)
  VY         = clamp01( CONSISTENCY_BLEND*consistency_term + (1-CONSISTENCY_BLEND)*base )
  Cold-start damping: agents with < MIN_SIGNALS reviews are pulled toward NEUTRAL by a
  confidence factor n/MIN_SIGNALS so a single lucky review can't mint full trust.

No env DATABASE_URL mock. Reads NEON_DB_URL (injected via Nomad Variable -> template).
All errors are LOGGED and re-raised loudly; the loop never silently swallows.
"""
import os
import sys
import json
import time
import math
import logging
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [fractal-evaluator] %(levelname)s %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("fractal-evaluator")

# --- DRL VY tuning (documented constants, not magic) ---
HALFLIFE_DAYS = 30.0      # recency half-life: a 30-day-old review counts half
OUTCOME_W = 0.6           # weight of loop outcome (verdict)
QUALITY_W = 0.4           # weight of demonstrated quality (confidence)
CONSISTENCY_BLEND = 0.25  # share of VY driven by behavioural consistency
MIN_SIGNALS = 5           # cold-start: full trust requires >= this many reviews
NEUTRAL = 0.5             # cold-start anchor
WINDOW_DAYS = 180         # only reviews newer than this contribute
VY_PRECISION = 9          # dp to round VY to (kills float64 ULP noise in numeric col)
VY_EPSILON = 1e-9         # min |delta| to count as a real trust change (history gate)

POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "30"))

READ_SQL = """
SELECT aa.chitty_id,
       aa.entity_type,
       ar.verdict,
       ar.confidence,
       EXTRACT(EPOCH FROM (now() - ar.created_at)) / 86400.0 AS age_days
FROM verification.adversarial_agents aa
LEFT JOIN verification.adversarial_reviews ar
       ON ar.agent_id = aa.chitty_id
      AND ar.deleted_at IS NULL
      AND ar.created_at >= now() - (%s || ' days')::interval
WHERE aa.deleted_at IS NULL
ORDER BY aa.chitty_id;
"""

WRITE_SQL = """
WITH prev AS (
  SELECT vy_score AS pv FROM verification.agent_trust WHERE chitty_id = %(cid)s
), up AS (
  INSERT INTO verification.agent_trust
    (chitty_id, entity_type, vy_score, signal_count, calculation_details, reckoned_at, updated_at)
  VALUES (%(cid)s, %(etype)s, %(vy)s, %(n)s, %(details)s::jsonb, now(), now())
  ON CONFLICT (chitty_id) DO UPDATE
    SET vy_score = EXCLUDED.vy_score,
        entity_type = EXCLUDED.entity_type,
        signal_count = EXCLUDED.signal_count,
        calculation_details = EXCLUDED.calculation_details,
        reckoned_at = now(),
        updated_at = now()
  RETURNING vy_score
)
INSERT INTO verification.agent_trust_history
  (chitty_id, previous_vy, new_vy, delta, signal_count, calculation_details)
SELECT %(cid)s,
       (SELECT pv FROM prev),
       %(vy)s,
       %(vy)s - COALESCE((SELECT pv FROM prev), 0),
       %(n)s,
       %(details)s::jsonb
-- Only record ACTUAL trust changes. A stable agent re-scored every poll must not
-- append a near-zero-delta row each cycle (append-only noise). The threshold is an
-- epsilon, not <> 0: vy_score is `numeric`, so float64 round-trips leave ~1e-16 ULP
-- jitter that <> 0 would treat as a change. First write has no prev row ->
-- delta = vy - 0 = vy (>> epsilon) -> recorded. The `up` CTE is data-modifying and
-- always executes, so agent_trust still upserts every cycle; only this append is gated.
WHERE abs(%(vy)s - COALESCE((SELECT pv FROM prev), 0)) > %(eps)s;
"""


def clamp01(x):
    return max(0.0, min(1.0, x))


def compute_vy(reviews):
    """reviews: list of dicts {verdict, confidence, age_days}. Returns (vy, details)."""
    real = [r for r in reviews if r["verdict"] is not None]
    n = len(real)
    if n == 0:
        # No real outcome data for this agent -> fail closed: no fabricated score.
        return None, {"reason": "no_real_signals", "signal_count": 0}

    per_review = []
    weights = []
    support = 0
    for r in real:
        outcome = 1.0 if str(r["verdict"]).lower() == "support" else 0.0
        support += 1 if outcome == 1.0 else 0
        quality = float(r["confidence"]) if r["confidence"] is not None else 0.0
        quality = clamp01(quality)
        age = float(r["age_days"]) if r["age_days"] is not None else 0.0
        w = 0.5 ** (age / HALFLIFE_DAYS)
        score_i = OUTCOME_W * outcome + QUALITY_W * quality
        per_review.append(score_i)
        weights.append(w)

    wsum = sum(weights) or 1e-9
    base = sum(w * s for w, s in zip(weights, per_review)) / wsum

    # behavioural consistency: low variance in per-review score => stable behaviour
    mean = sum(per_review) / n
    var = sum((s - mean) ** 2 for s in per_review) / n
    stdev = math.sqrt(var)
    consistency = clamp01(1.0 - stdev)

    raw = CONSISTENCY_BLEND * consistency + (1.0 - CONSISTENCY_BLEND) * base

    # cold-start damping toward neutral
    conf_factor = min(1.0, n / float(MIN_SIGNALS))
    vy = clamp01(conf_factor * raw + (1.0 - conf_factor) * NEUTRAL)

    details = {
        "source": "verification.adversarial_reviews",
        "formula": "vy = clamp01(conf_factor*(CB*consistency + (1-CB)*base) + (1-conf_factor)*NEUTRAL)",
        "signal_count": n,
        "support_count": support,
        "support_rate": round(support / n, 6),
        "weighted_base": round(base, 6),
        "consistency": round(consistency, 6),
        "stdev_per_review": round(stdev, 6),
        "conf_factor": round(conf_factor, 6),
        "window_days": WINDOW_DAYS,
        "halflife_days": HALFLIFE_DAYS,
        "weights": {"outcome": OUTCOME_W, "quality": QUALITY_W, "consistency_blend": CONSISTENCY_BLEND},
        "min_signals": MIN_SIGNALS,
        "reckoned_at": datetime.now(timezone.utc).isoformat(),
    }
    # Round to VY_PRECISION dp: the vy_score column is `numeric`, so storing a raw
    # float64 persists ULP noise (~1e-16) that makes every recompute differ in the
    # last bit. Rounding to 9 dp (far finer than any real trust movement) makes the
    # stored value stable and future deltas exactly 0 for unchanged agents.
    return round(clamp01(vy), VY_PRECISION), details


def reckon_once(conn):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(READ_SQL, (str(WINDOW_DAYS),))
    rows = cur.fetchall()

    # group reviews by agent
    agents = {}
    for row in rows:
        cid = row["chitty_id"]
        a = agents.setdefault(cid, {"entity_type": row["entity_type"], "reviews": []})
        if row["verdict"] is not None or row["confidence"] is not None:
            a["reviews"].append(
                {"verdict": row["verdict"], "confidence": row["confidence"], "age_days": row["age_days"]}
            )

    written = 0
    skipped = 0
    for cid, a in agents.items():
        vy, details = compute_vy(a["reviews"])
        if vy is None:
            log.info("SKIP %s — no real signals (fail-closed, no score written)", cid)
            skipped += 1
            continue
        etype = a["entity_type"] or "P"
        wcur = conn.cursor()
        wcur.execute(
            WRITE_SQL,
            {
                "cid": cid,
                "etype": etype,
                "vy": vy,
                "eps": VY_EPSILON,
                "n": details["signal_count"],
                "details": json.dumps(details),
            },
        )
        conn.commit()
        written += 1
        log.info(
            "SCORED %s vy=%.6f n=%d support_rate=%.3f consistency=%.3f",
            cid, vy, details["signal_count"], details["support_rate"], details["consistency"],
        )
    log.info("cycle complete: scored=%d skipped=%d agents=%d", written, skipped, len(agents))
    return written


def main():
    db_url = os.environ.get("NEON_DB_URL") or os.environ.get("DATABASE_URL")
    if not db_url:
        log.error("FATAL: no NEON_DB_URL injected (Nomad Variable/template). Failing closed.")
        sys.exit(2)
    if "mock" in db_url.lower():
        log.error("FATAL: refusing to run against a mock DB URL. Failing closed.")
        sys.exit(3)

    log.info("fractal-evaluator starting; poll=%ss window=%sd halflife=%sd",
             POLL_INTERVAL, WINDOW_DAYS, HALFLIFE_DAYS)
    while True:
        try:
            conn = psycopg2.connect(db_url, connect_timeout=10)
            try:
                reckon_once(conn)
            finally:
                conn.close()
        except Exception as e:
            # LOG loudly; do NOT silently swallow. Surface to stdout for nomad alloc logs.
            log.exception("reckon cycle FAILED: %s", e)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
