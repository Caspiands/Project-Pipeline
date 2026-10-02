#!/usr/bin/env bash
# Runs the database policy tests (pgTAP) in supabase/tests/*.sql.
#
# Default: against the local Supabase stack with `supabase test db` (needs Docker and `supabase start`).
# Fallback: set DATABASE_URL to run the same files with psql against any Postgres that has the
#           migration applied and the pgtap extension available, e.g.
#             DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres bash supabase/tests/run.sh
#
# Every test runs inside a transaction that is rolled back, so the database is left as it was.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -z "${DATABASE_URL:-}" ]; then
  exec npx supabase test db "$@"
fi

command -v psql >/dev/null || { echo "psql is not installed; install postgresql-client or unset DATABASE_URL to use Docker." >&2; exit 2; }

status=0
for file in supabase/tests/*.sql; do
  echo "# $file"
  if ! output=$(psql "$DATABASE_URL" -X -q -A -t -v ON_ERROR_STOP=1 -f "$file" 2>&1); then
    echo "$output"
    echo "not ok - $file aborted"
    status=1
    continue
  fi
  echo "$output"
  if grep -q '^not ok' <<<"$output"; then status=1; fi
done

if [ "$status" -eq 0 ]; then echo "# All policy tests passed."; else echo "# Some policy tests FAILED." >&2; fi
exit "$status"
