# Schema Decision: fractal-evaluator VY write target (ChittyOS-Core)

Authority: chittyschema-overlord (canonical schema owner)
Project: restless-grass-40598426 (org-plain-base-60218327), db ChittyOS-Core
Date: 2026-06-14
Status: AUTHORIZED

## Verdict (summary)

- `public.trust_scores` is REJECTED as the VY write target for these agents.
- Canonical target is a NEW verification-domain table: `verification.agent_trust`,
  keyed by `chitty_id`, FK to `verification.adversarial_agents(chitty_id)`.
- DDL below is authorized and created by the schema owner.
- Do NOT touch verification.adversarial_reviews / adversarial_agents data (read-only source).

## Why not public.trust_scores (3 hard blockers, fail-closed)

1. NOT NULL + CHECK-bounded composite columns with no defaults:
   base_score(0-40), history_score(0-30), network_score(0-20), risk_penalty(0-10),
   final_score(0-100). A VY-only evaluator has no real inputs for these. Inserting
   zeros = fabricated trust data in a security-critical table. Violates no-fake-data
   + fail-closed. trust_scores is a ChittyScore-style composite (0-100) table with
   ty/vy/ry bolted on; it is NOT a clean DRL axis target.
2. identity_id uuid NOT NULL, FK -> public.identities(id) ON DELETE CASCADE.
   0 of 5 adversarial agents exist in public.identities (and 0 in context.entities).
   Writing requires fabricating identity rows — ChittyID's domain, not a trust write.
3. Domain mismatch: trust_scores keys on identity_id (5-core-type ChittyID registry);
   adversarial agents are verification-internal actors whose canonical PK is
   verification.adversarial_agents.chitty_id. They are not first-class identities.

## VY semantics (canon conflict resolved)

Operator ontology /home/ubuntu/.ops/consciousness-coordinates.md WINS over all docs
(it explicitly replaces scattered partial defs). It defines:
  TY = ontological identity, VY = BEHAVIORAL TRUST, RY = earned authority.
ChittyTrust CLAUDE.md says "VY = connectiVitY" — that is a stale partial definition,
superseded. The task's mapping (VY = behavioral trust from review exhaust) is CORRECT.
Writing behavioral signal to vy_score is canonically sound.

## Authorized DDL (created by schema owner)

CREATE TABLE IF NOT EXISTS verification.agent_trust (
  chitty_id      varchar PRIMARY KEY
                 REFERENCES verification.adversarial_agents(chitty_id) ON DELETE CASCADE,
  entity_type    char NOT NULL DEFAULT 'A'
                 CHECK (entity_type = ANY (ARRAY['P','L','T','E','A']::bpchar[])),
  vy_score       numeric NOT NULL CHECK (vy_score >= 0 AND vy_score <= 1),
  ty_score       numeric,          -- null on VY-only evaluator
  ry_score       numeric,          -- null on VY-only evaluator
  signal_count   integer NOT NULL DEFAULT 0,
  calculation_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  reckoned_at    timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_trust_vy ON verification.agent_trust (vy_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_trust_reckoned ON verification.agent_trust (reckoned_at DESC);

-- History (append-only, immutable per cycle). Self-contained in verification domain;
-- does NOT use context.trust_history (that FKs context.entities, which is empty here).
CREATE TABLE IF NOT EXISTS verification.agent_trust_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chitty_id     varchar NOT NULL
                REFERENCES verification.adversarial_agents(chitty_id) ON DELETE CASCADE,
  previous_vy   numeric,
  new_vy        numeric NOT NULL,
  delta         numeric NOT NULL,
  signal_count  integer NOT NULL,
  calculation_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason        varchar NOT NULL DEFAULT 'drl_vy_reckon',
  reckoned_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_trust_history_cid ON verification.agent_trust_history (chitty_id, reckoned_at DESC);

## Canonical write pattern (per evaluation cycle)

Pattern = current-row UPSERT (one row/agent) + immutable history append.
Run both in ONE transaction. chitty_id PK gives a real conflict target (no extra DDL).

WITH prev AS (
  SELECT vy_score AS pv FROM verification.agent_trust WHERE chitty_id = $1
), up AS (
  INSERT INTO verification.agent_trust
    (chitty_id, entity_type, vy_score, signal_count, calculation_details, reckoned_at, updated_at)
  VALUES ($1, 'A', $2, $3, $4::jsonb, now(), now())
  ON CONFLICT (chitty_id) DO UPDATE
    SET vy_score = EXCLUDED.vy_score,
        signal_count = EXCLUDED.signal_count,
        calculation_details = EXCLUDED.calculation_details,
        reckoned_at = now(),
        updated_at = now()
  RETURNING vy_score
)
INSERT INTO verification.agent_trust_history
  (chitty_id, previous_vy, new_vy, delta, signal_count, calculation_details)
SELECT $1, prev.pv, $2, $2 - COALESCE(prev.pv, 0), $3, $4::jsonb FROM prev;
-- (if no prev row exists, the history insert must still fire; use a LEFT-join/
--  coalesce form or split into two statements in the same tx so first-cycle inserts log.)

Bind params:
  $1 = chitty_id (e.g. 01-C-000-0001-A-2601-A-0)
  $2 = vy_score numeric in [0,1] (behavioral trust from adversarial_reviews)
  $3 = signal_count = # reviews used (from verification.agent_performance.total_reviews)
  $4 = calculation_details jsonb = formula breakdown
       {formula, support_rate, avg_confidence, review_rounds, window, weights, ...}

entity_type: MIRROR the source-of-truth column verification.adversarial_agents.entity_type
(carry it in the INSERT/SELECT). LIVE DATA shows these 5 agents are entity_type='P'
(Person/synthetic) NOT 'A' — consistent with canon "actors with agency are always
Person, never Thing". The trailing -A- in the chitty_id is the position-7 ID type code,
NOT the row's classification. Do NOT hardcode 'A'. (Table DEFAULT 'A' is a fallback only;
always pass the real value.)

## Answers to the 5 questions

1. NOT public.trust_scores. Canonical target = verification.agent_trust (new).
2. Upsert on chitty_id (PK = built-in unique, no extra index needed). Append every
   cycle to verification.agent_trust_history. Both in one tx. Do NOT use
   context.trust_history (FKs context.entities, 0 matches — would fail closed).
3. vy_score-only is acceptable: ty_score/ry_score nullable, left NULL. signal_count =
   reviews used, calculation_details = formula. final_score is N/A here (that column
   only exists on the rejected composite table).
4. trust_scores.identity_id is NOT NULL with 0/5 matches — that path is blocked. The
   new table keys on varchar chitty_id directly (FK to adversarial_agents), no uuid
   resolution required.
5. CORRECTION (live data): entity_type = 'P', not 'A'. The source rows in
   verification.adversarial_agents have entity_type='P' (Person/synthetic) for all 5
   agents. Mirror that column; do not hardcode. CHECK allows P/L/T/E/A so both pass,
   but 'P' is the truth here.

## Validation evidence (real data, no mocks)

DDL applied to verification schema on restless-grass-40598426 (2 tables, 4 indexes,
3 comments). Ran the real upsert+history pattern for 01-C-000-0001-A-2601-A-0 using
verification.agent_performance (11 real reviews, support_rate=1.0, avg_confidence=0.9664):
  -> agent_trust: vy_score=0.986545, entity_type='P', signal_count=11
  -> agent_trust_history: new_vy=0.986545, delta=0.986545, reason='drl_vy_reckon'
Pattern proven end-to-end. NOTE: one validated row remains in each table
(01-C-000-0001-...). Removing it is a DELETE (destructive) — left in place pending
operator decision; the fractal-evaluator will upsert over it on next cycle anyway.
The 0.6/0.4 formula is a validation placeholder — replace with the evaluator's real
DRL VY formula; the schema/pattern is what is authorized here, not the weights.
