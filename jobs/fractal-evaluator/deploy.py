#!/usr/bin/env python3
"""
Reproducible deploy for the fractal-evaluator Nomad job.

The job inlines evaluator.py into a `template` stanza so the file exists in the
alloc (the homelab cluster has no artifact source for it). Because we submit via
the Nomad HTTP API (no local `nomad` CLI on the deploy host), we splice
evaluator.py into the .nomad.hcl PYEOF block, parse HCL->JSON, then register.

Prereqs (NOT handled here — credential lane is chittyconnect-concierge / chittyagent-neon):
  - Nomad Variable `nomad/jobs/fractal-evaluator` must hold {"url": <ChittyOS-Core neondb_owner URL>}.
    Provision it shell->shell; never echo the secret. See DEPLOY-RUNBOOK.md "THE GATE".

Usage:
  python3 deploy.py --plan     # splice + parse + dry-run plan (read-only)
  python3 deploy.py --run      # splice + parse + register the job
Env:
  NOMAD_ADDR (default http://100.69.69.5:4646)
"""
import os
import sys
import json
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
NOMAD = os.environ.get("NOMAD_ADDR", "http://100.69.69.5:4646").rstrip("/")
MARKER = (
    "data          = <<PYEOF\n"
    "# >>> REPLACE WITH CONTENTS OF .fractal-evaluator/evaluator.py <<<\n"
    "PYEOF"
)


def splice():
    hcl = open(os.path.join(HERE, "fractal-evaluator.nomad.hcl")).read()
    py = open(os.path.join(HERE, "evaluator.py")).read()
    if MARKER not in hcl:
        sys.exit("FATAL: marker block not found in .nomad.hcl (template drifted)")
    if "PYEOF" in py:
        sys.exit("FATAL: evaluator.py contains PYEOF — would break the heredoc")
    return hcl.replace(MARKER, "data          = <<PYEOF\n" + py + "PYEOF")


def post(path, obj, timeout=20):
    req = urllib.request.Request(
        NOMAD + path, data=json.dumps(obj).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--plan"
    job = post("/v1/jobs/parse", {"JobHCL": splice(), "Canonicalize": True})
    if mode == "--plan":
        p = post(f"/v1/job/{job['ID']}/plan", {"Job": job, "Diff": True})
        fa = p.get("FailedTGAllocs")
        print("PLAN:", "schedulable" if not fa else json.dumps(fa))
    elif mode == "--run":
        reg = post("/v1/jobs", {"Job": job})
        print("REGISTERED — EvalID:", reg.get("EvalID"))
    else:
        sys.exit("usage: deploy.py [--plan|--run]")


if __name__ == "__main__":
    main()
