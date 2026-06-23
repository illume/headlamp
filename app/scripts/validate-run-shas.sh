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

# Validates that workflow run SHAs match the release tag commit.
# This is a supply-chain safety check to ensure binary-source consistency.
#
# Usage: validate-run-shas.sh <release_name> <repo> <run_ids_csv>
#   release_name: The release version (e.g. 0.9.0)
#   repo:         The GitHub repository (e.g. kubernetes-sigs/headlamp)
#   run_ids_csv:  Comma-separated workflow run IDs

set -euo pipefail

# Resolve the tag name for a given release, trying both with and without 'v' prefix.
# Prints the resolved tag name to stdout. Returns 1 if not found.
resolve_tag() {
  local release_name="$1"
  local tag_name="$release_name"

  if git rev-parse "refs/tags/$tag_name" >/dev/null 2>&1; then
    echo "$tag_name"
    return 0
  fi

  tag_name="v$release_name"
  if git rev-parse "refs/tags/$tag_name" >/dev/null 2>&1; then
    echo "$tag_name"
    return 0
  fi

  echo "Error: Tag '$release_name' or 'v$release_name' not found." >&2
  return 1
}

# Get the commit SHA that a tag points to.
get_tag_sha() {
  local tag_name="$1"
  git rev-list -n 1 "refs/tags/$tag_name"
}

# Get the head SHA for a given workflow run ID.
get_run_sha() {
  local run_id="$1"
  local repo="$2"
  gh run view "$run_id" --repo "$repo" --json headSha -q .headSha
}

# Validate that all provided run IDs were built from the expected SHA.
# Returns 0 if all match, 1 on first mismatch or error.
validate_runs() {
  local expected_sha="$1"
  local tag_name="$2"
  local repo="$3"
  shift 3
  local run_ids=("$@")

  for run_id in "${run_ids[@]}"; do
    run_id=$(echo "$run_id" | xargs)

    if [ -z "$run_id" ]; then
      continue
    fi

    local run_sha
    run_sha=$(get_run_sha "$run_id" "$repo")

    if [ -z "$run_sha" ]; then
      echo "Error: Could not determine SHA for workflow run ID $run_id." >&2
      return 1
    fi

    echo "Run ID: $run_id"
    echo "Run SHA: $run_sha"

    if [ "$expected_sha" != "$run_sha" ]; then
      echo "Error: Workflow run SHA mismatch!" >&2
      echo "  Run ID:      $run_id" >&2
      echo "  Run SHA:     $run_sha" >&2
      echo "  Expected:    $expected_sha (from tag $tag_name)" >&2
      echo "" >&2
      echo "  This means the workflow run was triggered from a different commit" >&2
      echo "  than the release tag points to. Uploading these artifacts could" >&2
      echo "  result in binaries that don't correspond to the tagged source." >&2
      return 1
    fi
  done

  return 0
}

# Main entrypoint. Only runs when the script is executed directly (not sourced).
main() {
  if [ $# -lt 3 ]; then
    echo "Usage: $0 <release_name> <repo> <run_ids_csv>" >&2
    exit 1
  fi

  local release_name="$1"
  local repo="$2"
  local run_ids_csv="$3"

  # Ensure tags are available
  git fetch --tags --force origin

  local tag_name
  tag_name=$(resolve_tag "$release_name")

  local expected_sha
  expected_sha=$(get_tag_sha "$tag_name")

  echo "Expected release SHA: $expected_sha (from tag $tag_name)"

  IFS=',' read -ra run_ids <<< "$run_ids_csv"

  validate_runs "$expected_sha" "$tag_name" "$repo" "${run_ids[@]}"
}

# Allow sourcing for testing without executing main
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
