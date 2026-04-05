# AKS Features That Could Be Supported by Headlamp

This report lists Azure Kubernetes Service (AKS) features that Headlamp could support,
ranked by implementation difficulty. It also covers the CNCF project extensions that AKS
uses and how Headlamp could integrate with them.

## Difficulty Scale

| Rating | Meaning |
|--------|---------|
| 🟢 Easy | Can be done with existing plugin APIs or small frontend changes; mostly UI work using standard Kubernetes APIs that Headlamp already queries |
| 🟡 Medium | Requires new frontend components, CRD-aware views, or moderate backend work; may need new API calls or data aggregation |
| 🔴 Hard | Requires significant backend changes, new external API integrations, or complex UX workflows; may need new protocols or Azure-specific API calls |

---

## Part 1: AKS Features

### 1. Node Pool Visualization & Management

**Difficulty:** 🟢 Easy

**What Headlamp has today:** Node list with CPU/memory metrics, OS/architecture info, and
status. Headlamp already detects AKS node names (e.g. `aks-agentpool-*-vmss*`) and Windows
OS icons.

**What would need to be done:**
- Group nodes by node pool using the `agentpool` label that AKS adds to every node
  (`kubernetes.azure.com/agentpool`).
- Show node pool summary cards (node count, total CPU/memory, VM SKU) in the Node list view.
- This only requires frontend changes to the existing Node list component to read and group
  by labels that are already available via the standard Kubernetes API.

---

### 2. KEDA ScaledObject / ScaledJob Visualization

**Difficulty:** 🟢 Easy

**What Headlamp has today:** CRD auto-discovery already lists KEDA CRDs
(`scaledobjects.keda.sh`, `scaledjobs.keda.sh`, `triggerauthentications.keda.sh`) in the
sidebar and shows their YAML. HPA resources are fully supported.

**What would need to be done:**
- Build a dedicated KEDA detail view (plugin or core) that shows ScaledObject trigger
  configuration, current metrics, and the linked HPA in a human-readable format instead of
  raw YAML.
- Show the relationship between ScaledObject → HPA → Deployment in the resource map.
- This is straightforward because KEDA CRDs are standard Kubernetes resources; the work is
  purely UI/UX to present the data more clearly.

---

### 3. Network Policy Visualization for Azure CNI / Cilium

**Difficulty:** 🟢 Easy

**What Headlamp has today:** Full NetworkPolicy list and detail views. Cilium
NetworkPolicy CRDs would auto-appear via CRD discovery.

**What would need to be done:**
- Add a visual representation of NetworkPolicy rules (ingress/egress allow/deny diagram)
  to the existing detail view.
- For Cilium-specific CiliumNetworkPolicy CRDs, create a plugin or detail view section
  that renders the Cilium-specific fields (endpoint selectors, L7 rules) in a readable
  format.
- All data comes from standard Kubernetes APIs; this is frontend visualization work.

---

### 4. Karpenter (Node Auto-Provisioning) NodePool & NodeClaim Views

**Difficulty:** 🟢 Easy

**What Headlamp has today:** CRD auto-discovery will list Karpenter CRDs (`nodepools.karpenter.sh`,
`nodeclaims.karpenter.sh`, `aksnodeclasses.karpenter.azure.com`) in the sidebar.

**What would need to be done:**
- Build a dedicated Karpenter dashboard view (plugin) showing NodePool configurations,
  active NodeClaims, and their mapped Nodes.
- Show provisioning status, disruption budgets, and consolidation policies in a
  human-readable format.
- Add Karpenter NodePool → NodeClaim → Node relationships to the resource map.
- All data is available via CRD APIs; the work is frontend components.

---

### 5. Istio Service Mesh Visualization

**Difficulty:** 🟡 Medium

**What Headlamp has today:** Headlamp supports Gateway API resources (Gateway, HTTPRoute,
GRPCRoute, etc.) which Istio can use. CRD discovery shows Istio CRDs
(`virtualservices.networking.istio.io`, `destinationrules.networking.istio.io`, etc.).

**What would need to be done:**
- Create dedicated views for Istio resources: VirtualService, DestinationRule,
  ServiceEntry, AuthorizationPolicy, PeerAuthentication.
- Build a service mesh topology view showing traffic flow between services with
  mTLS status indicators.
- To show live traffic metrics (request rate, error rate, latency), would need to
  query the Prometheus API or Istio's built-in metrics endpoint, which requires
  backend proxy support for Prometheus queries.
- Rated medium because while CRD data is easy, the traffic topology and metrics
  visualization requires Prometheus integration and non-trivial graph layout work.

---

### 6. Flux GitOps Status Dashboard

**Difficulty:** 🟡 Medium

**What Headlamp has today:** Flux is listed as a known integration on the platforms page.
CRD discovery shows Flux CRDs (`kustomizations.kustomize.toolkit.fluxcd.io`,
`gitrepositories.source.toolkit.fluxcd.io`, `helmreleases.helm.toolkit.fluxcd.io`, etc.).

**What would need to be done:**
- Create a GitOps dashboard view showing all Flux sources (GitRepository, OCIRepository,
  HelmRepository) with their sync status and last reconciliation time.
- Show Kustomization and HelmRelease reconciliation status with health indicators
  (ready/not-ready/suspended).
- Display dependency graphs between Flux resources (e.g., HelmRelease depends on
  HelmRepository).
- Add Flux conditions (Ready, Reconciling, Stalled) as first-class status indicators.
- Rated medium because it requires multiple CRD queries, status aggregation, and a new
  multi-resource dashboard; but no external API integration beyond standard K8s APIs.

---

### 7. Azure Workload Identity Visualization

**Difficulty:** 🟡 Medium

**What Headlamp has today:** Full ServiceAccount views with annotations and labels.

**What would need to be done:**
- Detect Azure Workload Identity annotations on ServiceAccounts
  (`azure.workload.identity/client-id`, `azure.workload.identity/tenant-id`).
- Show which pods are using workload identity and what Azure identity they map to.
- Display the trust relationship: ServiceAccount → Federated Identity Credential →
  Azure Managed Identity.
- Rated medium because while the K8s-side data (ServiceAccount annotations, pod
  projected volumes) is available via standard APIs, showing the full trust chain
  requires understanding Azure-specific annotation conventions and rendering them
  meaningfully.

---

### 8. OPA Gatekeeper / Azure Policy Constraint Visualization

**Difficulty:** 🟡 Medium

**What Headlamp has today:** CRD discovery shows Gatekeeper CRDs
(`constrainttemplates.templates.gatekeeper.sh`, various constraint CRDs). Mutating and
Validating webhook configurations are supported.

**What would need to be done:**
- Create a policy dashboard showing all ConstraintTemplates and their instantiated
  Constraints.
- Display constraint violations with links to the offending resources.
- Show audit results from Gatekeeper's status subresource (total violations, violation
  details per constraint).
- Render Rego policy snippets in ConstraintTemplate details with syntax highlighting.
- Rated medium because it requires aggregating data across multiple CRD types
  (ConstraintTemplate + each dynamically-generated Constraint CRD) and rendering
  violation details in a useful way.

---

### 9. Helm Release Management

**Difficulty:** 🟡 Medium

**What Headlamp has today:** No native Helm support. Helm releases are stored as
Kubernetes Secrets (type `helm.sh/release.v1`), which Headlamp can list.

**What would need to be done:**
- Parse Helm release Secrets to extract release metadata (name, chart, version, status,
  values).
- Show a Helm releases list view with release name, namespace, chart, version, revision,
  and status.
- Show release detail with deployed values, computed values, and release notes.
- Optionally, show the rendered manifests and link to the K8s resources they created.
- For install/upgrade/rollback operations, would need backend integration with the Helm
  SDK or CLI.
- Rated medium because read-only viewing of releases can be done by parsing Secrets
  (frontend only), but full lifecycle management requires backend Helm SDK integration.

---

### 10. VPA (Vertical Pod Autoscaler) Recommendations View

**Difficulty:** 🟢 Easy

**What Headlamp has today:** VPA resources are listed and viewable. Basic detail view
exists.

**What would need to be done:**
- Enhance the VPA detail view to prominently show recommendations (target, lower bound,
  upper bound, uncapped target) for each container.
- Show a comparison table: current resource requests/limits vs VPA recommendations.
- Highlight containers where current requests differ significantly from recommendations.
- All data is in the VPA status subresource, available via standard K8s API. This is
  purely frontend UI improvement.

---

### 11. Dapr (Distributed Application Runtime) Integration

**Difficulty:** 🟡 Medium

**What Headlamp has today:** CRD discovery shows Dapr CRDs if installed
(`components.dapr.io`, `configurations.dapr.io`, `subscriptions.dapr.io`).

**What would need to be done:**
- Create dedicated views for Dapr Components (state stores, pub/sub, bindings, secret
  stores) showing their type, version, and metadata.
- Show which applications have Dapr sidecars injected (detect `dapr.io/enabled`
  annotation on pods/deployments).
- Display Dapr Configuration resources with tracing, metrics, and middleware pipeline
  settings.
- Add Dapr sidecar status indicators to Pod views.
- Rated medium because while CRD data is available, understanding Dapr's component
  model and sidecar injection patterns requires dedicated UI components.

---

### 12. Managed Prometheus & Grafana Dashboard Links

**Difficulty:** 🟡 Medium

**What Headlamp has today:** Basic pod/node metrics via the `metrics.k8s.io` API.
Prometheus is listed as a known integration.

**What would need to be done:**
- Add a backend proxy endpoint for Prometheus queries (`/api/v1/query`,
  `/api/v1/query_range`) to enable richer metrics visualization.
- Build time-series charts for key metrics (CPU, memory, network, disk I/O) using
  PromQL queries.
- Allow configuring a Prometheus endpoint URL (auto-detect from known AKS monitoring
  add-on configurations).
- Optionally link to Azure Managed Grafana dashboards from resource detail views.
- Rated medium because it requires new backend proxy configuration and frontend charting
  components, but Prometheus has a well-documented HTTP API.

---

### 13. Container Insights / Azure Monitor Log Integration

**Difficulty:** 🔴 Hard

**What Headlamp has today:** Pod log streaming via the Kubernetes API. No Azure Monitor
integration.

**What would need to be done:**
- Integrate with Azure Monitor REST API to query Container Insights logs
  (KQL queries against Log Analytics workspace).
- Build a log explorer UI that supports KQL-based filtering and aggregation.
- This requires Azure authentication (OAuth2 with Azure AD tokens), which is a
  separate auth flow from Kubernetes authentication.
- Would need backend support for Azure Resource Manager API calls.
- Rated hard because it requires a completely new Azure-specific authentication and
  API integration path outside the Kubernetes API.

---

### 14. AKS Cluster Upgrade & Maintenance Management

**Difficulty:** 🔴 Hard

**What Headlamp has today:** Shows cluster version info on nodes. No upgrade management.

**What would need to be done:**
- Show available Kubernetes version upgrades for the cluster.
- Display planned maintenance windows and their schedules.
- Show node image upgrade status across node pools.
- To get this data, would need to call the Azure Resource Manager API
  (`Microsoft.ContainerService/managedClusters`) which requires Azure AD authentication.
- Optionally trigger upgrades via the ARM API.
- Rated hard because it requires Azure ARM API integration, Azure AD authentication,
  and the upgrade workflow has serious production safety implications.

---

### 15. Azure Key Vault Secrets Provider (Secrets Store CSI Driver)

**Difficulty:** 🟡 Medium

**What Headlamp has today:** Full Secret and ConfigMap views. CRD discovery shows
SecretProviderClass CRDs if the CSI driver is installed.

**What would need to be done:**
- Create a dedicated SecretProviderClass detail view showing which Key Vault secrets
  are being synced, their sync status, and rotation configuration.
- Show the relationship: SecretProviderClass → Pod (via volume mount) → Kubernetes
  Secret (if syncSecret is enabled).
- Display SecretProviderClassPodStatus resources showing per-pod sync status.
- All data is available via CRD APIs. Rated medium because it requires understanding
  the CSI driver's CRD schema and building a relationship view.

---

### 16. AKS Cost Analysis & Resource Optimization

**Difficulty:** 🔴 Hard

**What Headlamp has today:** OpenCost listed as a known plugin integration. No native
cost features.

**What would need to be done:**
- Integrate with OpenCost API or Azure Cost Management API to show per-namespace,
  per-workload cost breakdowns.
- Build cost dashboard with trends, projections, and optimization recommendations.
- For Azure Cost Management, requires Azure AD authentication and ARM API calls.
- For OpenCost, requires configuring the OpenCost API endpoint and building a
  dashboard UI.
- Rated hard for Azure Cost Management (Azure API dependency); would be medium if
  using OpenCost exclusively (standard Kubernetes API pattern).

---

### 17. AKS Security Dashboard (Microsoft Defender for Containers)

**Difficulty:** 🔴 Hard

**What Headlamp has today:** No security scanning or compliance features natively.

**What would need to be done:**
- Integrate with Microsoft Defender for Containers API to show vulnerability scan
  results for container images.
- Display runtime threat detection alerts and security recommendations.
- Show compliance status against security benchmarks (CIS, Azure Security Benchmark).
- Requires Azure Security Center API integration with Azure AD authentication.
- Rated hard because it depends entirely on Azure-specific APIs outside Kubernetes.

---

### 18. Virtual Node (Virtual Kubelet / ACI Burst)

**Difficulty:** 🟢 Easy

**What Headlamp has today:** Nodes are fully supported with status, capacity, and
conditions.

**What would need to be done:**
- Detect virtual nodes by their taint (`virtual-kubelet.io/provider: azure`) and label.
- Show virtual nodes with a distinct icon or badge indicating they are ACI-backed.
- Display ACI-specific capacity info (pods scheduled, burst status).
- All data is available from the standard Node API. This is a small frontend
  enhancement to the existing Node views.

---

### 19. Planned Maintenance Windows

**Difficulty:** 🔴 Hard

**What Headlamp has today:** No maintenance window management.

**What would need to be done:**
- Query Azure ARM API for AKS maintenance configurations
  (`Microsoft.ContainerService/managedClusters/maintenanceConfigurations`).
- Display scheduled maintenance windows with timing details.
- Allow creating/editing maintenance schedules via the ARM API.
- Rated hard because it requires Azure ARM API integration and authentication.

---

### 20. eTag-Based Conflict Detection for Resource Edits

**Difficulty:** 🟡 Medium

**What Headlamp has today:** YAML editor for resources with apply/update functionality.

**What would need to be done:**
- Implement optimistic concurrency control using Kubernetes resource versions
  (the `resourceVersion` field already serves this purpose in the Kubernetes API).
- Show a conflict resolution UI when a resource has been modified by another user
  between read and write (412 Conflict response handling).
- Display a diff between the user's changes and the current server state.
- Rated medium because the Kubernetes API already supports this via `resourceVersion`;
  the work is in building the conflict detection and resolution UI.

---

## Part 2: CNCF Project Extensions Used by AKS

The following CNCF projects are officially integrated with or supported by AKS. For each,
the current Headlamp support status and what could be done is listed.

### Graduated CNCF Projects

| # | Project | AKS Integration | Headlamp Status | Difficulty |
|---|---------|----------------|-----------------|------------|
| 1 | **Kubernetes** | Core platform | ✅ Full support | N/A |
| 2 | **Prometheus** | Azure Managed Prometheus add-on for metrics collection | ⚠️ Basic metrics via metrics API; no PromQL | 🟡 Medium — add Prometheus query proxy and time-series charts |
| 3 | **Flux** | GitOps extension for continuous delivery | ⚠️ CRDs auto-discovered; community plugin exists | 🟡 Medium — build dedicated GitOps dashboard with sync status |
| 4 | **OPA (Gatekeeper)** | Azure Policy add-on for policy enforcement | ⚠️ CRDs auto-discovered; raw YAML only | 🟡 Medium — build policy dashboard with violation details |
| 5 | **Istio** | Managed Istio service mesh add-on | ⚠️ Gateway API supported; Istio CRDs auto-discovered | 🟡 Medium — build service mesh topology and traffic views |
| 6 | **Helm** | Used internally by AKS for add-on/extension deployment | ❌ No Helm support | 🟡 Medium — parse Helm Secrets for read-only release view |
| 7 | **CoreDNS** | Cluster DNS (managed by AKS) | ✅ ConfigMap viewable; CoreDNS pods visible | 🟢 Easy — no action needed |
| 8 | **containerd** | Container runtime (managed by AKS) | ✅ Container info visible in Pod details | 🟢 Easy — no action needed |
| 9 | **etcd** | Backing store (managed by AKS control plane) | N/A — not accessible in managed AKS | N/A |

### Incubating CNCF Projects

| # | Project | AKS Integration | Headlamp Status | Difficulty |
|---|---------|----------------|-----------------|------------|
| 1 | **KEDA** | Managed add-on for event-driven autoscaling | ⚠️ CRDs auto-discovered; raw YAML only | 🟢 Easy — build ScaledObject/ScaledJob detail views |
| 2 | **Dapr** | Extension for distributed application runtime | ⚠️ CRDs auto-discovered; raw YAML only | 🟡 Medium — build component and sidecar status views |
| 3 | **Karpenter** | Node Auto-Provisioning (NAP) for dynamic scaling | ⚠️ CRDs auto-discovered; raw YAML only | 🟢 Easy — build NodePool/NodeClaim dashboard |
| 4 | **Cilium** | Azure CNI with Cilium dataplane for networking | ⚠️ CRDs auto-discovered; raw YAML only | 🟢 Easy — add CiliumNetworkPolicy detail views |
| 5 | **OpenTelemetry** | Application monitoring auto-instrumentation | ⚠️ CRDs auto-discovered if operator installed | 🟡 Medium — build collector and instrumentation views |
| 6 | **Virtual Kubelet** | Virtual Nodes (ACI burst) | ⚠️ Virtual nodes visible as regular nodes | 🟢 Easy — add virtual node badge and ACI indicators |
| 7 | **Secrets Store CSI Driver** | Azure Key Vault secrets provider | ⚠️ CRDs auto-discovered; raw YAML only | 🟡 Medium — build SecretProviderClass status views |
| 8 | **Grafana** | Azure Managed Grafana for dashboards | ❌ No integration | 🟡 Medium — add deep links to Grafana dashboards |
| 9 | **Argo CD** | User-installable GitOps alternative to Flux | ⚠️ CRDs auto-discovered; raw YAML only | 🟡 Medium — build Application sync status dashboard |
| 10 | **OpenCost** | Cost analysis and FinOps | ⚠️ Listed as known integration (plugin) | 🟡 Medium — build cost dashboard via OpenCost API |

### Sandbox / Other CNCF Projects

| # | Project | AKS Integration | Headlamp Status | Difficulty |
|---|---------|----------------|-----------------|------------|
| 1 | **Inspektor Gadget** | eBPF-based debugging and tracing | ⚠️ Listed as known integration | 🟡 Medium — build trace visualization views |
| 2 | **KubeVirt** | VM workloads on Kubernetes | ⚠️ Listed as known integration | 🟡 Medium — build VM lifecycle management views |
| 3 | **Kyverno** | Policy engine (alternative to OPA) | ⚠️ CRDs auto-discovered; raw YAML only | 🟡 Medium — build policy and report views |
| 4 | **Trivy** | Vulnerability scanning | ⚠️ Listed as known integration | 🟡 Medium — build vulnerability report dashboard |
| 5 | **NGINX Ingress** | Web Application Routing add-on | ✅ Ingress/IngressClass fully supported | 🟢 Easy — already supported |
| 6 | **cert-manager** | Certificate management (user-installed) | ⚠️ CRDs auto-discovered; raw YAML only | 🟢 Easy — build Certificate status views |

---

## Part 3: Summary Ranked by Difficulty

### 🟢 Easy (small frontend changes, uses existing Kubernetes APIs)

| Feature | Effort Estimate | Notes |
|---------|----------------|-------|
| Node pool grouping / visualization | ~2-3 days | Label-based grouping in existing Node list |
| KEDA ScaledObject detail views | ~2-3 days | CRD detail view plugin |
| Karpenter NodePool dashboard | ~2-3 days | CRD detail view plugin |
| VPA recommendations comparison | ~1-2 days | Enhancement to existing VPA detail view |
| Virtual Node indicators | ~1 day | Badge/icon in existing Node view |
| Cilium NetworkPolicy views | ~2-3 days | CRD detail view plugin |
| cert-manager Certificate views | ~2-3 days | CRD detail view plugin |
| Network Policy visualization | ~3-5 days | Diagram component for policy rules |

### 🟡 Medium (new components, CRD aggregation, some backend work)

| Feature | Effort Estimate | Notes |
|---------|----------------|-------|
| Flux GitOps dashboard | ~5-8 days | Multi-CRD aggregation, dependency graph |
| Istio service mesh views | ~5-10 days | CRD views + Prometheus for traffic metrics |
| OPA Gatekeeper policy dashboard | ~5-8 days | ConstraintTemplate + dynamic Constraint CRDs |
| Helm release viewer (read-only) | ~3-5 days | Parse Helm Secrets; no backend changes |
| Workload Identity visualization | ~3-5 days | ServiceAccount annotation parsing |
| Key Vault CSI driver views | ~3-5 days | SecretProviderClass CRD status views |
| Prometheus query integration | ~5-8 days | Backend proxy + frontend time-series charts |
| Dapr component views | ~3-5 days | CRD views + sidecar detection |
| OpenTelemetry views | ~3-5 days | Collector and instrumentation CRD views |
| Grafana dashboard links | ~2-3 days | Configurable external dashboard URL linking |
| Argo CD Application views | ~5-8 days | Application CRD sync status dashboard |
| OpenCost dashboard | ~5-8 days | OpenCost API integration + cost charts |
| eTag conflict detection | ~3-5 days | resourceVersion conflict UI in YAML editor |
| Inspektor Gadget views | ~3-5 days | Trace CRD visualization |
| KubeVirt VM views | ~5-8 days | VM lifecycle management CRD views |
| Kyverno policy views | ~5-8 days | Policy and report CRD views |
| Trivy vulnerability dashboard | ~5-8 days | VulnerabilityReport CRD aggregation |

### 🔴 Hard (Azure-specific APIs, new auth flows, complex integrations)

| Feature | Effort Estimate | Notes |
|---------|----------------|-------|
| Azure Monitor / Container Insights | ~10-15 days | Azure AD auth + Log Analytics KQL API |
| AKS cluster upgrade management | ~10-15 days | Azure ARM API + upgrade safety workflows |
| Planned maintenance windows | ~8-10 days | Azure ARM API integration |
| Azure Cost Management integration | ~10-15 days | Azure AD auth + Cost Management API |
| Defender for Containers dashboard | ~10-15 days | Azure Security Center API integration |

---

## Part 4: Recommended Implementation Order

Based on impact and difficulty, here is a suggested order for implementation:

### Phase 1: Quick Wins (Easy, High Impact)
1. **Node pool visualization** — Improves the AKS experience immediately with minimal effort.
2. **KEDA ScaledObject views** — KEDA is one of the most popular AKS add-ons.
3. **VPA recommendations** — Directly helps users optimize resource allocation.
4. **Virtual Node indicators** — Small change, makes ACI nodes immediately recognizable.

### Phase 2: CNCF Ecosystem (Medium, High Value)
5. **Flux GitOps dashboard** — GitOps is the primary deployment model for AKS workloads.
6. **Helm release viewer** — Helm is ubiquitous; even read-only viewing is very valuable.
7. **OPA Gatekeeper dashboard** — Policy compliance is a top enterprise concern.
8. **Prometheus integration** — Unlocks richer metrics for all other features.

### Phase 3: Advanced Networking & Security (Medium)
9. **Istio service mesh views** — Service mesh adoption is growing rapidly on AKS.
10. **Karpenter dashboard** — NAP is increasingly used for cost optimization.
11. **Workload Identity views** — Security-focused users need identity visibility.
12. **Key Vault CSI driver views** — Secrets management is critical for production workloads.

### Phase 4: Azure-Specific Features (Hard)
13. **Azure Monitor integration** — High value but requires Azure-specific auth work.
14. **Cluster upgrade management** — Important for operations but complex to implement safely.
15. **Cost analysis** — High demand but depends on Azure or OpenCost API integration.
