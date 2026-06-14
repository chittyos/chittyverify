job "fractal-evaluator" {
  # FIX 1: datacenter regression corrected. v0 had "homelab" (correct, matches the
  # 5 chittymini nodes); v1 broke it to "chittymini-cluster" -> blocked eval, 0 allocs.
  datacenters = ["homelab"]
  type        = "service"

  update {
    max_parallel     = 1
    min_healthy_time = "10s"
    healthy_deadline = "3m"
    auto_revert      = true
  }

  group "evaluators" {
    # FIX 5: count 3 -> 1. The reckoner does a full-table upsert with no partitioning;
    # 3 concurrent identical writers were tripling write load and spamming
    # agent_trust_history with redundant delta=0 rows every 30s. Single writer is
    # correct; Nomad reschedules the alloc on failure (auto_revert + service type).
    count = 1

    # FIX 4: removed `network { mode = "bridge" }`. Bridge mode forces Nomad's CNI
    # bridge plugin >= 0.4.0, which the 2012 Mac-Mini homelab nodes lack -> all 5
    # nodes ConstraintFiltered -> 0 allocs (same 0-alloc failure class as the v1 DC
    # regression, different cause). This worker is outbound-only (egress to Neon over
    # Postgres); no ingress, ports, or service mesh. Docker's default networking
    # (NAT egress) is sufficient and needs no CNI.

    task "evaluator-node" {
      driver = "docker"

      config {
        image   = "python:3.12-slim"
        command = "bash"
        args    = ["-c", "pip install --quiet psycopg2-binary && python /app/evaluator.py"]
        volumes = [
          "local/evaluator.py:/app/evaluator.py",
        ]
      }

      # FIX 2: secret injection. Vault is NOT wired into this Nomad cluster
      # (agent/self -> vault config: NONE), so {{ with secret "kv/..." }} silently
      # rendered EMPTY. Replaced with Nomad Variables (encrypted at rest; the task
      # reads its own nomad/jobs/<id> path via Workload Identity). The variable
      # nomad/jobs/fractal-evaluator must hold item key "url" = ChittyOS-Core DB URL.
      template {
        data        = <<EOF
{{ with nomadVar "nomad/jobs/fractal-evaluator" }}
NEON_DB_URL="{{ .url }}"
{{ end }}
POLL_INTERVAL="30"
EOF
        destination = "secrets/env.txt"
        env         = true
      }

      # FIX 3: the evaluator.py SOURCE. The original job mounted local/evaluator.py
      # but NOTHING created it -> the mount was empty/nonexistent. Inline the real
      # DRL VY reckoner as its own template stanza so the file exists in the alloc.
      template {
        destination   = "local/evaluator.py"
        change_mode   = "restart"
        perms         = "0644"
        # NOTE: this is a placeholder. At deploy time, substitute the full contents
        # of .fractal-evaluator/evaluator.py here (or use an artifact{} block fetching
        # it from a pinned source). Keep the file identical to the validated script.
        data          = <<PYEOF
# >>> REPLACE WITH CONTENTS OF .fractal-evaluator/evaluator.py <<<
PYEOF
      }

      resources {
        cpu    = 200
        memory = 256
      }
    }
  }
}
