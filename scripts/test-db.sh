#!/usr/bin/env bash
# Applies the migrations to a throwaway local Postgres database and runs the
# row-level-security tests. Needs `psql`, `createdb`, and `dropdb` on PATH and
# a Postgres server you can connect to (set PGHOST/PGUSER etc. if needed).
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${PEERNOTE_TEST_DB:-peernote_test}"
dropdb --if-exists "$DB"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT

# Roles are cluster-wide; creating them twice is harmless.
psql -q -d "$DB" -f supabase/tests/00_supabase_stub.sql 2>&1 | grep -v "already exists" || true
for f in supabase/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"
done
output="$(psql -q -t -d "$DB" -f supabase/tests/rls_test.sql 2>&1)"
echo "$output" | grep -E "NOTICE:  ok|FAIL|ERROR" | sed 's/^.*NOTICE:  //'
echo "$output" | grep -q "ALL_RLS_TESTS_PASSED" && echo "All RLS tests passed." || { echo "RLS tests failed."; exit 1; }
