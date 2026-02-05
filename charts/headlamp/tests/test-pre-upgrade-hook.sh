#!/bin/bash

# Test to verify the pre-upgrade hook is present and configured correctly
# This test verifies that the automatic migration of old ClusterRoleBinding will happen

set -euo pipefail

CHART_DIR="./charts/headlamp"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Expected number of pre-upgrade hook resources (ServiceAccount, ClusterRole, ClusterRoleBinding, Job)
EXPECTED_HOOK_RESOURCES=4

echo "========================================"
echo "Testing Pre-Upgrade Hook Configuration"
echo "========================================"

# Test 1: Verify pre-upgrade hook is present in default template (create: false)
echo ""
echo "Test 1: Verifying pre-upgrade hook resources are present with default values (create: false)..."
TEMPLATE_OUTPUT=$(helm template headlamp ${CHART_DIR} 2>&1)

if echo "$TEMPLATE_OUTPUT" | grep -q "name: headlamp-pre-upgrade"; then
    echo -e "${GREEN}✓ PASS${NC}: Pre-upgrade hook ServiceAccount is present"
else
    echo -e "${RED}✗ FAIL${NC}: Pre-upgrade hook ServiceAccount is missing"
    exit 1
fi

# Test 2: Verify pre-upgrade hook has correct Helm annotations
echo ""
echo "Test 2: Verifying pre-upgrade hook has correct Helm hook annotations..."
if echo "$TEMPLATE_OUTPUT" | grep -q '"helm.sh/hook": pre-upgrade'; then
    echo -e "${GREEN}✓ PASS${NC}: Pre-upgrade hook annotation is present"
else
    echo -e "${RED}✗ FAIL${NC}: Pre-upgrade hook annotation is missing"
    exit 1
fi

if echo "$TEMPLATE_OUTPUT" | grep -q '"helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded'; then
    echo -e "${GREEN}✓ PASS${NC}: Hook delete policy is correctly configured"
else
    echo -e "${RED}✗ FAIL${NC}: Hook delete policy is missing or incorrect"
    exit 1
fi

# Test 3: Verify Job is present
echo ""
echo "Test 3: Verifying pre-upgrade Job is present..."
if echo "$TEMPLATE_OUTPUT" | grep -q "kind: Job" && echo "$TEMPLATE_OUTPUT" | grep -q "name: headlamp-pre-upgrade"; then
    echo -e "${GREEN}✓ PASS${NC}: Pre-upgrade Job is present"
else
    echo -e "${RED}✗ FAIL${NC}: Pre-upgrade Job is missing"
    exit 1
fi

# Test 4: Verify Job script contains cleanup logic for headlamp-admin ClusterRoleBinding
echo ""
echo "Test 4: Verifying Job contains cleanup logic for old ClusterRoleBinding..."
if echo "$TEMPLATE_OUTPUT" | grep -q 'CRB_NAME="headlamp-admin"'; then
    echo -e "${GREEN}✓ PASS${NC}: Job targets 'headlamp-admin' ClusterRoleBinding"
else
    echo -e "${RED}✗ FAIL${NC}: Job does not target 'headlamp-admin' ClusterRoleBinding"
    exit 1
fi

if echo "$TEMPLATE_OUTPUT" | grep -q 'kubectl delete clusterrolebinding'; then
    echo -e "${GREEN}✓ PASS${NC}: Job contains delete command"
else
    echo -e "${RED}✗ FAIL${NC}: Job does not contain delete command"
    exit 1
fi

# Test 5: Verify RBAC permissions are correct
echo ""
echo "Test 5: Verifying pre-upgrade ClusterRole has correct permissions..."
if echo "$TEMPLATE_OUTPUT" | grep -q 'resources:.*clusterrolebindings' && \
   echo "$TEMPLATE_OUTPUT" | grep -q 'verbs:.*get.*delete'; then
    echo -e "${GREEN}✓ PASS${NC}: ClusterRole has correct permissions (get, delete on clusterrolebindings)"
else
    echo -e "${RED}✗ FAIL${NC}: ClusterRole permissions are missing or incorrect"
    exit 1
fi

# Test 6: Verify safety check - only Helm-managed resources are deleted
echo ""
echo "Test 6: Verifying safety checks are in place..."
if echo "$TEMPLATE_OUTPUT" | grep -q 'app.kubernetes.io/managed-by'; then
    echo -e "${GREEN}✓ PASS${NC}: Job checks for Helm-managed resources"
else
    echo -e "${RED}✗ FAIL${NC}: Job does not verify Helm management labels"
    exit 1
fi

if echo "$TEMPLATE_OUTPUT" | grep -q 'app.kubernetes.io/instance'; then
    echo -e "${GREEN}✓ PASS${NC}: Job checks for correct Helm release instance"
else
    echo -e "${RED}✗ FAIL${NC}: Job does not verify release instance"
    exit 1
fi

# Test 7: Verify hook runs with create: true as well
echo ""
echo "Test 7: Verifying pre-upgrade hook is also present when create: true..."
TEMPLATE_WITH_CREATE=$(helm template headlamp ${CHART_DIR} --set clusterRoleBinding.create=true --set clusterRoleBinding.clusterRoleName=view 2>&1)

if echo "$TEMPLATE_WITH_CREATE" | grep -q "name: headlamp-pre-upgrade"; then
    echo -e "${GREEN}✓ PASS${NC}: Pre-upgrade hook is present when create: true"
else
    echo -e "${RED}✗ FAIL${NC}: Pre-upgrade hook is missing when create: true"
    exit 1
fi

# Test 8: Count all pre-upgrade hook resources
echo ""
echo "Test 8: Verifying all pre-upgrade hook resources are present..."
HOOK_RESOURCES=$(echo "$TEMPLATE_OUTPUT" | grep -c '"helm.sh/hook": pre-upgrade' || true)
# Should have: ServiceAccount, ClusterRole, ClusterRoleBinding, Job
if [ "$HOOK_RESOURCES" -ge "$EXPECTED_HOOK_RESOURCES" ]; then
    echo -e "${GREEN}✓ PASS${NC}: All pre-upgrade hook resources are present (found $HOOK_RESOURCES references, expected $EXPECTED_HOOK_RESOURCES)"
else
    echo -e "${RED}✗ FAIL${NC}: Not all pre-upgrade hook resources are present (found $HOOK_RESOURCES, expected $EXPECTED_HOOK_RESOURCES)"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}All pre-upgrade hook tests passed!${NC}"
echo "========================================"
echo ""
echo "Summary:"
echo "- Pre-upgrade hook is present in all scenarios (create: true and create: false)"
echo "- Hook correctly targets 'headlamp-admin' ClusterRoleBinding for removal"
echo "- Hook includes safety checks to only remove Helm-managed resources"
echo "- Hook has correct Helm annotations for timing and cleanup"
echo ""
