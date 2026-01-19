#!/bin/bash
# Copyright 2025 The Kubernetes Authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e

MINIKUBE_PROFILE="headlamp-e2e-test"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "============================================"
echo "Headlamp E2E Tests with Minikube"
echo "============================================"
echo "Profile: $MINIKUBE_PROFILE"
echo ""

# Cleanup function to ensure minikube is stopped even on failure
cleanup() {
    echo ""
    echo "============================================"
    echo "Cleaning up..."
    echo "============================================"
    if minikube profile list | grep -q "$MINIKUBE_PROFILE"; then
        echo "Deleting minikube profile: $MINIKUBE_PROFILE"
        minikube delete -p "$MINIKUBE_PROFILE" || true
    fi
}

# Register cleanup function to run on exit
trap cleanup EXIT

# Check if minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "Error: minikube is not installed. Please install minikube first."
    echo "See: https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: docker is not installed. Please install docker first."
    exit 1
fi

# Start minikube with a dedicated profile
echo "Starting minikube with profile: $MINIKUBE_PROFILE"
minikube start -p "$MINIKUBE_PROFILE" --driver=docker --wait=all

# Set kubectl context to the minikube profile
echo "Setting kubectl context to: $MINIKUBE_PROFILE"
kubectl config use-context "$MINIKUBE_PROFILE"

# Build Docker images if they don't exist
echo ""
echo "============================================"
echo "Building Docker images..."
echo "============================================"
cd "$PROJECT_ROOT"

if ! docker images | grep -q "ghcr.io/headlamp-k8s/headlamp.*latest"; then
    echo "Building Headlamp image..."
    DOCKER_IMAGE_VERSION=latest make image
else
    echo "Headlamp image already exists, skipping build."
fi

if ! docker images | grep -q "ghcr.io/headlamp-k8s/headlamp-plugins-test.*latest"; then
    echo "Building plugins test image..."
    # Build plugin example for testing
    cd plugins/examples/pod-counter
    npm ci
    npm run build
    cd "$PROJECT_ROOT"
    
    cd plugins/headlamp-plugin
    npm ci
    node bin/headlamp-plugin.js extract ../examples/pod-counter ../../.plugins/
    cd "$PROJECT_ROOT"
    
    DOCKER_IMAGE_VERSION=latest DOCKER_PLUGINS_IMAGE_NAME=headlamp-plugins-test make build-plugins-container
else
    echo "Plugins test image already exists, skipping build."
fi

# Load images into minikube
echo ""
echo "============================================"
echo "Loading Docker images into minikube..."
echo "============================================"
minikube -p "$MINIKUBE_PROFILE" image load ghcr.io/headlamp-k8s/headlamp:latest
minikube -p "$MINIKUBE_PROFILE" image load ghcr.io/headlamp-k8s/headlamp-plugins-test:latest

# Create service account and RBAC
echo ""
echo "============================================"
echo "Setting up RBAC..."
echo "============================================"
kubectl create serviceaccount headlamp-admin --namespace kube-system
kubectl create clusterrolebinding headlamp-admin --serviceaccount=kube-system:headlamp-admin --clusterrole=cluster-admin

# Generate token for tests
echo "Generating service account token..."
export HEADLAMP_TEST_TOKEN=$(kubectl create token headlamp-admin --duration 24h -n kube-system)

# Get cluster info for kubeconfig
export TEST_CA_DATA=$(kubectl config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')
export TEST_SERVER=$(kubectl config view --raw --minify -o jsonpath='{.clusters[0].cluster.server}')

# Create a second dummy cluster configuration for multi-cluster tests
# Using the same cluster but with different context names
export TEST2_CA_DATA=$TEST_CA_DATA
export TEST2_SERVER=$TEST_SERVER
export HEADLAMP_TEST2_TOKEN=$HEADLAMP_TEST_TOKEN

# Deploy Headlamp
echo ""
echo "============================================"
echo "Deploying Headlamp to minikube..."
echo "============================================"
cd "$SCRIPT_DIR"
envsubst < kubernetes-headlamp-ci.yaml | kubectl apply -f -

# Wait for deployment to be ready
echo "Waiting for Headlamp deployment to be ready..."
kubectl wait deployment -n kube-system headlamp --for condition=Available=True --timeout=120s

# Get service URL
echo ""
echo "============================================"
echo "Getting service URL..."
echo "============================================"
SERVICE_PORT=$(kubectl get services headlamp -n kube-system -o=jsonpath='{.spec.ports[0].nodePort}')
MINIKUBE_IP=$(minikube ip -p "$MINIKUBE_PROFILE")
export SERVICE_URL="http://${MINIKUBE_IP}:${SERVICE_PORT}"

echo "Headlamp URL: $SERVICE_URL"

# Test that Headlamp is accessible
echo "Testing Headlamp accessibility..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s -L "$SERVICE_URL" | grep -q "Headlamp: Kubernetes Web UI"; then
        echo "✓ Headlamp is accessible"
        break
    fi
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "Error: Headlamp is not accessible after $max_attempts attempts"
        kubectl get pods -n kube-system -l app.kubernetes.io/name=headlamp
        kubectl logs -n kube-system -l app.kubernetes.io/name=headlamp --tail=50
        exit 1
    fi
    echo "Waiting for Headlamp to be accessible (attempt $attempt/$max_attempts)..."
    sleep 2
done

# Install playwright dependencies
echo ""
echo "============================================"
echo "Installing test dependencies..."
echo "============================================"
cd "$SCRIPT_DIR"
if [ ! -d "node_modules" ]; then
    npm ci
fi
npx playwright install --with-deps

# Run e2e tests
echo ""
echo "============================================"
echo "Running Playwright e2e tests..."
echo "============================================"
export HEADLAMP_TEST_URL=$SERVICE_URL
npx playwright test

exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo ""
    echo "============================================"
    echo "❌ E2E tests failed with exit code $exit_code"
    echo "============================================"
    echo "Debugging information:"
    kubectl get pods -n kube-system -l app.kubernetes.io/name=headlamp
    kubectl logs -n kube-system -l app.kubernetes.io/name=headlamp --tail=100
    exit $exit_code
else
    echo ""
    echo "============================================"
    echo "✓ All E2E tests passed successfully!"
    echo "============================================"
fi
