# fractal-evaluator — deploy runbook

Status: 2026-06-14. **DEPLOYED + VERIFIED LIVE** on homelab Nomad (job `fractal-evaluator`,
count=1). 3 real VY rows in `verification.agent_trust` (0.987413372 / 0.967305291 /
0.98195591, entity_type='P', n=11); agents 0004/0005 fail-closed (no real signals).
`agent_trust` upserts every poll; `agent_trust_history` appends only on real change
(|delta|>1e-9). Reproduce with `python3 deploy.py --plan|--run`.

The credential gate below was CLEARED by chittyconnect-concierge (Nomad Variable
`nomad/jobs/fractal-evaluator` provisioned shell→shell). The `neondb_owner` rotation
remains pending an operator 1Password Connect token refresh — see ChittyTask 34a28586.
History below is the original blocked-state record, kept for provenance.

## What was wrong (ground truth, differs from the original report)
1. `datacenters=["chittymini-cluster"]` (job v1) does not match node DC `homelab` →
   blocked eval, **0 allocations** (NOT "3 allocs on a mock"). v0 had `homelab` (correct);
   v1 regressed it.
2. **Vault is NOT integrated** into this Nomad cluster (`/v1/agent/self` → vault: NONE).
   So `{{ with secret "kv/data/chittyos/database" }}` rendered EMPTY; NEON_DB_URL never set.
   (The env-var mismatch in the original report is moot — no script + no DB binding at all.)
3. **No `evaluator.py` source** existed: job mounted `local/evaluator.py` but nothing created it.

## Fixes (durable here)
- `evaluator.py` — real DRL VY reckoner. Reads `verification.adversarial_reviews` ⋈
  `verification.adversarial_agents` from ChittyOS-Core; writes `verification.agent_trust`
  (+ `_history`) via the overlord-authorized upsert+history transaction. Errors logged, never swallowed.
- `fractal-evaluator.nomad.hcl` — DC→`homelab`; secret template→Nomad Variables; evaluator.py
  inlined as a `template` stanza. (Paste evaluator.py contents into the marked block before deploy.)
- Write target: `verification.agent_trust` / `_history` (authorized + created by chittyschema-overlord,
  see ../.schema-decisions/fractal-evaluator-vy-write-target.md). NOT `public.trust_scores` (rejected:
  NOT NULL composite cols + identity_id FK with 0 agent matches).

## DRL VY formula (validated against real exhaust, read-only)
Per /home/ubuntu/.ops/consciousness-coordinates.md: VY = behavioral trust.
Per review i: outcome_i=1 if verdict='support' else 0; quality_i=confidence∈[0,1];
recency w_i=0.5^(age_days/30). base=Σ(w_i·(0.6·outcome+0.4·quality))/Σw_i.
consistency=1−stdev(per-review score). raw=0.25·consistency+0.75·base.
Cold-start: conf=min(1,n/5); VY=clamp01(conf·raw+(1−conf)·0.5).
Validated (read-only SELECT, real data): 0001 VY=0.9874 (n=11), 0002 VY=0.9673 (n=11),
0003 VY=0.9820 (n=11). entity_type='P' (mirrored from source; canon: agents are Person).

## THE GATE (deployment prerequisite)
Nomad Variable `nomad/jobs/fractal-evaluator` does not exist (GET → 404).
Cannot be created this session: ChittyOS-Core DB URL lives only in `op://ChittyOS-Secrets/NEON_DATABASE_URL`,
and this session's 1Password Connect token gets 401 on both `ChittyOS-Secrets` and `ChittyOS-Integrations`
(so `op read` and `neonctl --api-key` both fail to mint it in-shell). The URL is available via the
ChittyConnect broker (`chittyos/neon_get_connection_string`) but only into agent context — transiting
context→shell is policy-blocked, and pasting is not allowed. → POLICY_BLOCKED_CHITTYCONNECT_UNAVAILABLE.

## To unblock + finish (operator / authorized broker)
1. Provision the secret into the Nomad Variable (shell→shell, never a literal):
   ```
   export NEON_API_KEY="$(op read op://ChittyOS-Integrations/neon/api_key)"   # needs vault read grant
   neonctl connection-string --project-id restless-grass-40598426 \
     --database-name neondb --role-name neondb_owner \
   | python3 -c 'import sys,json,urllib.request; u=sys.stdin.read().strip();
     assert "ep-green-water" in u;
     b=json.dumps({"Path":"nomad/jobs/fractal-evaluator","Items":{"url":u}}).encode();
     print(urllib.request.urlopen(urllib.request.Request(
       "http://100.69.69.5:4646/v1/var/nomad/jobs/fractal-evaluator",data=b,method="PUT")).status)'
   ```
   (Or grant this session's Connect token read on ChittyOS-Secrets, or PUT the var by any in-lane means.)
2. Paste evaluator.py contents into the `local/evaluator.py` template block in the .hcl.
3. `nomad job run fractal-evaluator.nomad.hcl` (against http://100.69.69.5:4646).
4. Verify (real, no mocks): after one 30s cycle,
   `SELECT chitty_id, vy_score, signal_count, reckoned_at FROM verification.agent_trust
    WHERE calculation_details->>'source'='verification.adversarial_reviews';`
   Expect 3 real rows. Read alloc stdout: expect "SCORED <cid> vy=… n=11", not pip noise.

## Security note
The ChittyOS-Core pooled `neondb_owner` URL was exposed in THIS agent's context (returned by the
Neon MCP + ChittyConnect broker during resolution). Recommend rotating that role password
(`npg_…` on ep-green-water-…us-east-2) as a precaution; it was never written to disk or shell.
