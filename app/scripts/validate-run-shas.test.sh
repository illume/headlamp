#!/bin/bash
# Copyright 2025 The Kubernetes Authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Tests for validate-run-shas.sh
# Run: bash app/scripts/validate-run-shas.test.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the script under test (does not execute main due to the guard)
source "$SCRIPT_DIR/validate-run-shas.sh"

PASS=0
FAIL=0

assert_eq() {
  local expected="$1"
  local actual="$2"
  local msg="${3:-}"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $msg"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $msg"
    echo "    expected: '$expected'"
    echo "    actual:   '$actual'"
    FAIL=$((FAIL + 1))
  fi
}

assert_exit_code() {
  local expected="$1"
  shift
  local actual=0
  "$@" >/dev/null 2>&1 || actual=$?
  assert_eq "$expected" "$actual" "$*"
}

# --- Setup: create a temporary git repo for testing ---
TEST_DIR=$(mktemp -d)
ORIGINAL_DIR=$(pwd)
trap 'cd "$ORIGINAL_DIR"; rm -rf "$TEST_DIR"' EXIT

setup_test_repo() {
  cd "$TEST_DIR"
  git init -q
  git commit --allow-empty -m "initial" -q
  COMMIT_SHA=$(git rev-parse HEAD)
  git tag "0.9.0"
  git tag "v1.0.0"
  # Add a second commit for mismatch tests
  git commit --allow-empty -m "second" -q
  SECOND_SHA=$(git rev-parse HEAD)
}

setup_test_repo

# --- Test: resolve_tag ---
echo "=== resolve_tag ==="

# Should find tag without 'v' prefix
result=$(resolve_tag "0.9.0")
assert_eq "0.9.0" "$result" "finds tag without v prefix"

# Should find tag with 'v' prefix when bare name doesn't exist
result=$(resolve_tag "1.0.0")
assert_eq "v1.0.0" "$result" "finds tag with v prefix fallback"

# Should fail for nonexistent tag
assert_exit_code "1" resolve_tag "nonexistent"

# --- Test: get_tag_sha ---
echo ""
echo "=== get_tag_sha ==="

result=$(get_tag_sha "0.9.0")
assert_eq "$COMMIT_SHA" "$result" "returns correct SHA for tag"

result=$(get_tag_sha "v1.0.0")
assert_eq "$COMMIT_SHA" "$result" "returns correct SHA for v-prefixed tag"

# --- Test: validate_runs with matching SHA ---
echo ""
echo "=== validate_runs (matching) ==="

# Mock get_run_sha to return the expected SHA
get_run_sha() {
  echo "$COMMIT_SHA"
}

assert_exit_code "0" validate_runs "$COMMIT_SHA" "0.9.0" "owner/repo" "12345"

# --- Test: validate_runs with mismatched SHA ---
echo ""
echo "=== validate_runs (mismatch) ==="

get_run_sha() {
  echo "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
}

assert_exit_code "1" validate_runs "$COMMIT_SHA" "0.9.0" "owner/repo" "12345"

# --- Test: validate_runs with empty run SHA ---
echo ""
echo "=== validate_runs (empty run SHA) ==="

get_run_sha() {
  echo ""
}

assert_exit_code "1" validate_runs "$COMMIT_SHA" "0.9.0" "owner/repo" "12345"

# --- Test: validate_runs skips empty run IDs ---
echo ""
echo "=== validate_runs (skips empty) ==="

get_run_sha() {
  # Should not be called for empty run IDs
  echo "should-not-be-called"
  return 1
}

assert_exit_code "0" validate_runs "$COMMIT_SHA" "0.9.0" "owner/repo" "  "

# --- Test: validate_runs with multiple run IDs, all match ---
echo ""
echo "=== validate_runs (multiple runs, all match) ==="

get_run_sha() {
  echo "$COMMIT_SHA"
}

assert_exit_code "0" validate_runs "$COMMIT_SHA" "0.9.0" "owner/repo" "111" "222" "333"

# --- Test: validate_runs with multiple run IDs, second fails ---
echo ""
echo "=== validate_runs (multiple runs, second mismatches) ==="

# Use a file-based counter since get_run_sha runs in a subshell
COUNTER_FILE="$TEST_DIR/.call_count"
echo "0" > "$COUNTER_FILE"
get_run_sha() {
  local run_id="$1"
  local count
  count=$(cat "$COUNTER_FILE")
  count=$((count + 1))
  echo "$count" > "$COUNTER_FILE"
  if [ "$count" -eq 2 ]; then
    echo "badbadbadbadbadbadbadbadbadbadbadbadbadbad"
  else
    echo "$COMMIT_SHA"
  fi
}

assert_exit_code "1" validate_runs "$COMMIT_SHA" "0.9.0" "owner/repo" "111" "222" "333"

# --- Summary ---
echo ""
echo "==============================="
echo "Results: $PASS passed, $FAIL failed"
echo "==============================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
