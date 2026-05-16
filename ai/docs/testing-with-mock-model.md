# Testing the AI Assistant with the Mock Testing Model

This guide explains how to run the Headlamp AI assistant plugin with the
**mock-testing-model** provider on a simulated Kubernetes cluster using
[KWOK](https://kwok.sigs.k8s.io/) — no real cloud resources or API keys needed.

## Prerequisites

- Node.js ≥ 20.11.1, npm ≥ 10
- Go (for the Headlamp backend)
- [KWOK](https://kwok.sigs.k8s.io/docs/user/installation/) or
  [kwokctl](https://kwok.sigs.k8s.io/docs/user/kwokctl-manage-cluster/)
- A built copy of the Headlamp frontend and backend

## 1. Create a KWOK cluster

```bash
kwokctl create cluster --name headlamp-test
```

Optionally deploy some workloads so the dashboard has data:

```bash
kubectl create deployment nginx-deployment --image=nginx --replicas=3
```

## 2. Build everything

```bash
# From the repo root:
npm run ai:install && npm run ai:build   # build the @headlamp-k8s/ai library
npm run frontend:build                    # build the React frontend
cd backend && go build -o headlamp-server # build the Go backend
```

## 3. Build and install the plugin

```bash
cd plugins/examples/ai-assistant
npm install
npx @kinvolk/headlamp-plugin build

# Copy the built plugin to the Headlamp plugins directory
mkdir -p ~/.config/Headlamp/plugins/ai-assistant
cp dist/main.js  ~/.config/Headlamp/plugins/ai-assistant/
cp package.json  ~/.config/Headlamp/plugins/ai-assistant/
```

## 4. Start the Headlamp backend

```bash
./backend/headlamp-server \
  -kubeconfig ~/.kube/config \
  -html-static-dir frontend/build \
  -plugins-dir ~/.config/Headlamp/plugins
```

Open <http://localhost:4466> in your browser.

## 5. Configure the mock-testing-model

1. Click the **AI Assistant** button in the app bar.
2. Switch the mode dropdown from **Holmes Agent** to **Chat**.
3. Click **Settings** (gear icon) → **Add Provider** → **Mock Testing Model**.
4. Optionally fill in a **Demo Sequence** name (e.g. `cluster-exploration-demo`)
   or leave blank for template matching.
5. Click **Save**.

## 6. Chat with the mock model

Type any of the fixture prompts, for example:

| Prompt | Expected response |
|--------|-------------------|
| `Hello` | Greeting message |
| `What is a Pod?` | Explains what a Pod is (variable `<<resource>>` = "Pod") |
| `How do I create a Deployment?` | `kubectl create` / Headlamp instructions |
| `List all services in kube-system` | `kubectl get` command with namespace |
| `What namespaces are available?` | Namespaces overview |

The `<<variable>>` syntax in fixtures means any value can be substituted.
For example, "What is a Service?" also matches because `<<resource>>` captures "Service".

## Screenshots

### AI Assistant responding with mock-testing-model on a KWOK cluster

![AI Assistant with mock-testing-model](https://github.com/user-attachments/assets/7618cfef-c939-4ceb-940b-b64ea29147f1)

### Selecting the Mock Testing Model provider

![Select provider dialog](https://github.com/user-attachments/assets/8c951d38-6347-4034-aefa-6fbbe79233fe)

### Configuring the mock-testing-model

![Configure dialog](https://github.com/user-attachments/assets/01a7f0a7-9a89-4df0-af58-b845b14c17d6)

## Adding custom fixtures

Create a directory of `.json` files and point the provider config at it:

```json
[
  {
    "prompt": "How many replicas does <<name>> have?",
    "response": "The deployment **<<name>>** currently has 3 replicas."
  }
]
```

Set the **Custom Fixtures Directory** field in the provider config dialog
to the absolute path of that directory.

## Sequence playback (demo mode)

For scripted demos, create a sequence file:

```json
{
  "name": "my-demo",
  "description": "A walkthrough of cluster features",
  "sequence": [
    { "prompt": "Hello",         "response": "Welcome to the demo!" },
    { "prompt": "Show nodes",    "response": "You have 3 nodes..." },
    { "prompt": "Show pods",     "response": "Running 5 pods..." }
  ]
}
```

Set the **Demo Sequence** field to `my-demo` in the provider config.
Each message you send will return the next response in order, regardless
of what you actually type.
