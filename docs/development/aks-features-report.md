# AKS Features That Could Be Supported by Headlamp

This report lists Azure Kubernetes Service (AKS) features that Headlamp could support,
ranked by implementation difficulty. It also covers CNCF project extensions that AKS uses,
existing Headlamp plugins that already provide coverage, and what
[AKS desktop](https://github.com/Azure/aks-desktop) (built on Headlamp) has already
implemented.

## Sources Consulted

- [headlamp-k8s/plugins](https://github.com/headlamp-k8s/plugins/) — official Headlamp plugins
- [Artifact Hub — Headlamp plugins](https://artifacthub.io/packages/search?kind=21&sort=relevance) — plugin registry
- [Azure/aks-desktop](https://github.com/Azure/aks-desktop) — AKS desktop (built on Headlamp)
- [AKS integrations docs](https://learn.microsoft.com/en-us/azure/aks/integrations) — official AKS add-ons/extensions list
- [docs/platforms.md](../platforms.md) — Headlamp tested platforms and CNCF integrations

## Difficulty Scale

| Rating | Meaning |
|--------|---------|
| ✅ Done | Already covered by an existing official or community plugin, or by AKS desktop |
| 🟢 Easy | Can be done with existing plugin APIs or small frontend changes; mostly UI work using standard Kubernetes APIs |
| 🟡 Medium | Requires new frontend components, CRD-aware views, or moderate backend work |
| 🔴 Hard | Requires significant backend changes, new external API integrations, or Azure-specific API calls |

---

## Part 1: Existing Plugin Coverage

Many AKS-relevant features are **already covered** by official plugins in
[headlamp-k8s/plugins](https://github.com/headlamp-k8s/plugins/) or by community plugins.
These do not need new implementation — they just need to be installed.

### Official Headlamp Plugins (headlamp-k8s/plugins)

| Plugin | AKS Feature Covered | Notes |
|--------|---------------------|-------|
| [app-catalog](https://github.com/headlamp-k8s/plugins/tree/main/app-catalog) | **Helm chart management** — install charts, manage releases | Desktop only; shipped by default |
| [keda](https://github.com/headlamp-k8s/plugins/tree/main/keda) | **KEDA event-driven autoscaling** — view/manage ScaledObjects, ScaledJobs | Supports Prometheus metrics integration |
| [karpenter](https://github.com/headlamp-k8s/plugins/tree/main/karpenter) | **Karpenter / Node Auto-Provisioning** — NodePool, NodeClaim, NodeClass visualization | Includes pending pod dashboard and real-time metrics |
| [flux](https://github.com/headlamp-k8s/plugins/tree/main/flux) | **Flux GitOps** — visualize and manage Flux CD resources | Covers GitRepository, Kustomization, HelmRelease |
| [cert-manager](https://github.com/headlamp-k8s/plugins/tree/main/cert-manager) | **cert-manager** — view/manage certificates, issuers, certificate requests | |
| [opencost](https://github.com/headlamp-k8s/plugins/tree/main/opencost) | **Cost monitoring** — workload cost visibility | Needs OpenCost installed in cluster |
| [prometheus](https://github.com/headlamp-k8s/plugins/tree/main/prometheus) | **Prometheus metrics** — charts in workload detail views | Shipped by default with desktop and CI builds |
| [knative](https://github.com/headlamp-k8s/plugins/tree/main/knative) | **Knative serverless** — view/manage Knative resources | |
| [cluster-api](https://github.com/headlamp-k8s/plugins/tree/main/cluster-api) | **Cluster API** — management cluster visualization | |
| [backstage](https://github.com/headlamp-k8s/plugins/tree/main/backstage) | **Backstage integration** — links to Backstage resource views | |
| [ai-assistant](https://github.com/headlamp-k8s/plugins/tree/main/ai-assistant) | **AI capabilities** — AI-powered cluster assistance | |
| [plugin-catalog](https://github.com/headlamp-k8s/plugins/tree/main/plugin-catalog) | **Plugin discovery** — browse/install plugins from Artifact Hub | Shipped by default |

### Community / External Plugins

| Plugin | AKS Feature Covered | Notes |
|--------|---------------------|-------|
| [Gatekeeper](https://github.com/sozercan/gatekeeper-headlamp-plugin) | **OPA Gatekeeper / Azure Policy** — manage policies, violations, community policy library | |
| [Trivy](https://github.com/kubebeam/trivy-headlamp-plugin) | **Vulnerability scanning** — compliance and vulnerability reports | |
| [Kyverno](https://github.com/kubebeam/kyverno-headlamp-plugin) | **Kyverno policies** — policy and report views | Repo archived; plugin unmaintained |
| [Kubescape](https://github.com/kubescape/headlamp-plugin) | **Security scanning** — configuration and vulnerability scanning | |
| [KubeVirt](https://github.com/buttahtoast/headlamp-plugins/tree/main/kubevirt) | **VM workloads** — manage KubeVirt virtual machines | |
| [Inspektor Gadget](https://github.com/inspektor-gadget/headlamp-plugin/) | **eBPF debugging** — run gadgets, visualize observability data | |
| [KAITO](https://github.com/kaito-project/headlamp-kaito) | **AI model deployment** — KAITO AKS extension UI for model deployment and GPU provisioning | |
| [Strimzi](https://github.com/cesaroangelo/strimzi-headlamp) | **Apache Kafka** — manage Strimzi resources on Kubernetes | |

### AKS Desktop (Built on Headlamp)

[Azure/aks-desktop](https://github.com/Azure/aks-desktop) is Microsoft's desktop application
built directly on Headlamp. It already implements several AKS-specific features as Headlamp
plugins that could inform or be upstreamed to the open-source project:

| Feature | Description |
|---------|-------------|
| **Projects** | Groups related workloads, services, and configs into logical units with namespace isolation, resource quotas, and access controls |
| **Guided Deployment Wizard** | Step-by-step application deployment with auto-generated K8s manifests following AKS best practices |
| **Azure AD Login & Cluster Import** | Sign in with Azure account, merge AKS credentials into kubeconfig |
| **Workload Identity** | Integration with Azure Workload Identity for secure cloud resource access |
| **ACR Integration** | Deploy container images from Azure Container Registry |
| **GitHub Pipelines** | Pipeline deployment and GitHub authentication for DevOps workflows |
| **Resource Quota Awareness** | Deployment wizard warns when exceeding namespace resource quotas |
| **Developer Mode** (preview) | Heroku-like experience for deploying from source repositories |
| **Multi-tenancy** | Enhanced authentication handling for multi-tenant AKS setups |

---

## Part 2: AKS Features Not Yet Covered

These features are **not yet covered** by any existing plugin or AKS desktop feature and
would need new work.

### 1. Node Pool Visualization & Grouping

**Difficulty:** 🟢 Easy

**What Headlamp has today:** Node list with CPU/memory metrics, OS/architecture info, and
status. Headlamp already detects AKS node names (e.g. `aks-agentpool-*-vmss*`) and shows
Windows OS icons.

**What would need to be done:**
- Group nodes by node pool using the `kubernetes.azure.com/agentpool` label that AKS adds
  to every node.
- Show node pool summary cards (node count, total CPU/memory, VM SKU) in the Node list view.
- This only requires frontend changes to read and group by labels already available via the
  standard Kubernetes API.

---

### 2. Network Policy Visualization

**Difficulty:** 🟢 Easy

**What Headlamp has today:** Full NetworkPolicy list and detail views. Cilium
NetworkPolicy CRDs auto-appear via CRD discovery.

**What would need to be done:**
- Add a visual diagram of NetworkPolicy rules (ingress/egress allow/deny) to the existing
  detail view.
- For Cilium-specific CiliumNetworkPolicy CRDs, render endpoint selectors and L7 rules
  in a readable format.
- All data comes from standard Kubernetes APIs; this is frontend visualization work.

---

### 3. VPA (Vertical Pod Autoscaler) Recommendations View

**Difficulty:** 🟢 Easy

**What Headlamp has today:** VPA resources are listed and viewable with a basic detail view.

**What would need to be done:**
- Prominently show recommendations (target, lower bound, upper bound, uncapped target)
  per container.
- Show a comparison table: current resource requests/limits vs VPA recommendations.
- Highlight containers where current requests differ significantly from recommendations.
- All data is in the VPA status subresource via standard K8s API. Purely frontend work.

---

### 4. Virtual Node Indicators

**Difficulty:** 🟢 Easy

**What Headlamp has today:** Nodes are fully supported with status, capacity, and conditions.

**What would need to be done:**
- Detect virtual nodes by their taint (`virtual-kubelet.io/provider: azure`) and label.
- Show virtual nodes with a distinct icon or badge indicating they are ACI-backed.
- All data is available from the standard Node API. Small frontend enhancement.

---

### 5. Istio Service Mesh Visualization

**Difficulty:** 🟡 Medium

**What Headlamp has today:** Gateway API resources (Gateway, HTTPRoute, GRPCRoute, etc.)
are supported. Istio CRDs auto-appear via CRD discovery. The Prometheus plugin already
provides workload-level metrics.

**What would need to be done:**
- Create dedicated views for Istio resources: VirtualService, DestinationRule,
  ServiceEntry, AuthorizationPolicy, PeerAuthentication.
- Build a service mesh topology view showing traffic flow between services with
  mTLS status indicators.
- For live traffic metrics (request rate, error rate, latency), leverage the existing
  Prometheus plugin or add Istio-specific PromQL queries.
- Rated medium because while CRD data is easy, the traffic topology visualization
  requires non-trivial graph layout work.

---

### 6. Azure Workload Identity Visualization

**Difficulty:** 🟡 Medium

**What Headlamp has today:** Full ServiceAccount views with annotations and labels.
AKS desktop already supports Workload Identity during deployment.

**What would need to be done:**
- Detect Azure Workload Identity annotations on ServiceAccounts
  (`azure.workload.identity/client-id`, `azure.workload.identity/tenant-id`).
- Show which pods are using workload identity and what Azure identity they map to.
- Display the relationship: ServiceAccount → Federated Identity Credential →
  Azure Managed Identity.
- Rated medium because showing the full trust chain requires understanding Azure-specific
  annotation conventions.

---

### 7. Dapr (Distributed Application Runtime) Views

**Difficulty:** 🟡 Medium

**What Headlamp has today:** Dapr CRDs auto-appear via CRD discovery.

**What would need to be done:**
- Create dedicated views for Dapr Components (state stores, pub/sub, bindings, secret
  stores) showing their type, version, and metadata.
- Show which applications have Dapr sidecars injected (detect `dapr.io/enabled`
  annotation on pods/deployments).
- Display Dapr Configuration resources with tracing, metrics, and middleware pipeline
  settings.
- Rated medium because understanding Dapr's component model and sidecar injection
  patterns requires dedicated UI components.

---

### 8. OpenTelemetry Collector & Instrumentation Views

**Difficulty:** 🟡 Medium

**What Headlamp has today:** OpenTelemetry CRDs auto-appear via CRD discovery if
the operator is installed.

**What would need to be done:**
- Build views for OpenTelemetryCollector and Instrumentation CRDs showing pipeline
  configuration (receivers, processors, exporters).
- Display instrumentation status per namespace/workload.
- Rated medium because the OpenTelemetry Operator CRDs have complex nested pipeline
  configurations that need meaningful visualization.

---

### 9. Azure Key Vault Secrets Provider (Secrets Store CSI Driver)

**Difficulty:** 🟡 Medium

**What Headlamp has today:** Full Secret and ConfigMap views. SecretProviderClass CRDs
auto-appear via CRD discovery.

**What would need to be done:**
- Create a dedicated SecretProviderClass detail view showing which Key Vault secrets
  are being synced, their sync status, and rotation configuration.
- Show the relationship: SecretProviderClass → Pod (via volume mount) → Kubernetes
  Secret (if syncSecret is enabled).
- Display SecretProviderClassPodStatus resources showing per-pod sync status.

---

### 10. Grafana Dashboard Deep Links

**Difficulty:** 🟡 Medium

**What Headlamp has today:** The Prometheus plugin provides workload-level charts.
No Grafana linking.

**What would need to be done:**
- Allow configuring a Grafana base URL (auto-detect from known AKS managed Grafana
  configurations).
- Add "Open in Grafana" links from resource detail views to pre-filtered Grafana
  dashboards.
- Rated medium because it requires configurable URL templating and detection logic.

---

### 11. eTag-Based Conflict Detection for Resource Edits

**Difficulty:** 🟡 Medium

**What Headlamp has today:** YAML editor for resources with apply/update functionality.

**What would need to be done:**
- Implement optimistic concurrency control using Kubernetes `resourceVersion`.
- Show a conflict resolution UI when a resource has been modified by another user
  between read and write (409 Conflict response handling).
- Display a diff between the user's changes and the current server state.
- Rated medium because the Kubernetes API already supports this; the work is in
  building the conflict detection and resolution UI.

---

### 12. Container Insights / Azure Monitor Log Integration

**Difficulty:** 🔴 Hard

**What Headlamp has today:** Pod log streaming via the Kubernetes API. No Azure Monitor
integration.

**What would need to be done:**
- Integrate with Azure Monitor REST API to query Container Insights logs
  (KQL queries against Log Analytics workspace).
- Build a log explorer UI that supports KQL-based filtering and aggregation.
- Requires Azure AD OAuth2 authentication, separate from Kubernetes auth.
- Rated hard because it requires a completely new Azure-specific authentication and
  API integration path outside the Kubernetes API.

---

### 13. AKS Cluster Upgrade & Maintenance Management

**Difficulty:** 🔴 Hard

**What Headlamp has today:** Shows cluster version info on nodes. No upgrade management.

**What would need to be done:**
- Show available Kubernetes version upgrades for the cluster.
- Display planned maintenance windows and their schedules.
- Show node image upgrade status across node pools.
- Requires Azure ARM API calls (`Microsoft.ContainerService/managedClusters`) with
  Azure AD authentication.
- Rated hard because it requires Azure ARM API integration and upgrade workflows have
  serious production safety implications.

---

### 14. Azure Cost Management Integration

**Difficulty:** 🔴 Hard

**What Headlamp has today:** The OpenCost plugin provides Kubernetes-native cost
visibility. No Azure-specific cost features.

**What would need to be done:**
- Integrate with Azure Cost Management API for per-namespace, per-workload Azure
  billing data.
- Requires Azure AD authentication and ARM API calls.
- Rated hard due to Azure API dependency. Note: for Kubernetes-native cost analysis,
  the existing OpenCost plugin is the recommended approach.

---

### 15. AKS Security Dashboard (Microsoft Defender for Containers)

**Difficulty:** 🔴 Hard

**What Headlamp has today:** Trivy and Kubescape plugins provide Kubernetes-native
vulnerability scanning. No Azure Defender integration.

**What would need to be done:**
- Integrate with Microsoft Defender for Containers API for vulnerability scan results.
- Display runtime threat detection alerts and security recommendations.
- Requires Azure Security Center API integration with Azure AD authentication.
- Rated hard because it depends entirely on Azure-specific APIs outside Kubernetes.

---

## Part 3: CNCF Project Extensions Used by AKS

The following CNCF projects are officially integrated with or supported by AKS. For each,
the current Headlamp support status is listed.

### Graduated CNCF Projects

| # | Project | AKS Integration | Headlamp Status | Gap |
|---|---------|----------------|-----------------|-----|
| 1 | **Kubernetes** | Core platform | ✅ Full support | None |
| 2 | **Prometheus** | Azure Managed Prometheus | ✅ [prometheus plugin](https://github.com/headlamp-k8s/plugins/tree/main/prometheus) — charts in workload details | None |
| 3 | **Flux** | GitOps extension | ✅ [flux plugin](https://github.com/headlamp-k8s/plugins/tree/main/flux) — Flux resource visualization | None |
| 4 | **OPA (Gatekeeper)** | Azure Policy add-on | ✅ [Gatekeeper plugin](https://github.com/sozercan/gatekeeper-headlamp-plugin) — policies, violations, community library | None (community plugin) |
| 5 | **Istio** | Managed Istio service mesh | ⚠️ Gateway API supported; Istio CRDs auto-discovered; no dedicated plugin | 🟡 Medium — Istio-specific views needed |
| 6 | **Helm** | Add-on/extension deployment | ✅ [app-catalog plugin](https://github.com/headlamp-k8s/plugins/tree/main/app-catalog) — Helm chart install & release management | Desktop only |
| 7 | **CoreDNS** | Cluster DNS (managed) | ✅ ConfigMap viewable; pods visible | None |
| 8 | **containerd** | Container runtime (managed) | ✅ Container info visible in Pod details | None |
| 9 | **etcd** | Backing store (managed) | N/A — not user-accessible in managed AKS | N/A |

### Incubating CNCF Projects

| # | Project | AKS Integration | Headlamp Status | Gap |
|---|---------|----------------|-----------------|-----|
| 1 | **KEDA** | Managed autoscaling add-on | ✅ [keda plugin](https://github.com/headlamp-k8s/plugins/tree/main/keda) — ScaledObject/ScaledJob UI with Prometheus metrics | None |
| 2 | **Dapr** | Extension for microservices | ⚠️ CRDs auto-discovered; no dedicated plugin | 🟡 Medium — Dapr component & sidecar views needed |
| 3 | **Karpenter** | Node Auto-Provisioning | ✅ [karpenter plugin](https://github.com/headlamp-k8s/plugins/tree/main/karpenter) — NodePool, NodeClaim, pending pod dashboard | None |
| 4 | **Cilium** | Azure CNI dataplane | ⚠️ CRDs auto-discovered; no dedicated plugin | 🟢 Easy — CiliumNetworkPolicy views |
| 5 | **OpenTelemetry** | Auto-instrumentation | ⚠️ CRDs auto-discovered; no dedicated plugin | 🟡 Medium — collector & instrumentation views |
| 6 | **Virtual Kubelet** | Virtual Nodes (ACI) | ⚠️ Nodes visible but not distinguished | 🟢 Easy — badge/icon for virtual nodes |
| 7 | **Secrets Store CSI** | Key Vault secrets | ⚠️ CRDs auto-discovered; no dedicated plugin | 🟡 Medium — SecretProviderClass views |
| 8 | **Argo CD** | User-installable GitOps | ⚠️ CRDs auto-discovered; no dedicated plugin | 🟡 Medium — Application sync dashboard |
| 9 | **OpenCost** | Cost analysis | ✅ [opencost plugin](https://github.com/headlamp-k8s/plugins/tree/main/opencost) — workload cost visibility | None |
| 10 | **Knative** | User-installable serverless | ✅ [knative plugin](https://github.com/headlamp-k8s/plugins/tree/main/knative) — Knative resource management | None |

### Sandbox / Other CNCF Projects

| # | Project | AKS Integration | Headlamp Status | Gap |
|---|---------|----------------|-----------------|-----|
| 1 | **Inspektor Gadget** | eBPF debugging | ✅ [plugin](https://github.com/inspektor-gadget/headlamp-plugin/) — gadget execution & visualization | None (community plugin) |
| 2 | **KubeVirt** | VM workloads | ✅ [plugin](https://github.com/buttahtoast/headlamp-plugins/tree/main/kubevirt) — VM management | None (community plugin) |
| 3 | **Kyverno** | Policy engine | ⚠️ [plugin](https://github.com/kubebeam/kyverno-headlamp-plugin) exists but repo is archived (unmaintained) | 🟡 Medium — needs new maintainer or rebuild |
| 4 | **Trivy** | Vulnerability scanning | ✅ [plugin](https://github.com/kubebeam/trivy-headlamp-plugin) — compliance & vulnerability reports | None (community plugin) |
| 5 | **Kubescape** | Security scanning | ✅ [plugin](https://github.com/kubescape/headlamp-plugin) — configuration & vulnerability scanning | None (community plugin) |
| 6 | **NGINX Ingress** | Web App Routing add-on | ✅ Ingress/IngressClass fully supported in core | None |
| 7 | **cert-manager** | Certificate management | ✅ [cert-manager plugin](https://github.com/headlamp-k8s/plugins/tree/main/cert-manager) — certificate & issuer UI | None |

### Other AKS-Relevant Projects (Not CNCF)

| # | Project | AKS Integration | Headlamp Status | Gap |
|---|---------|----------------|-----------------|-----|
| 1 | **KAITO** | AI/ML model deployment | ✅ [KAITO plugin](https://github.com/kaito-project/headlamp-kaito) — model deployment & GPU provisioning UI | None (community plugin) |
| 2 | **Grafana** | Azure Managed Grafana | ❌ No integration | 🟡 Medium — deep links to dashboards |
| 3 | **Volcano** | Batch scheduling | ✅ [volcano plugin](https://github.com/headlamp-k8s/plugins/tree/main/volcano) — Volcano job management | None |

---

## Part 4: Summary Ranked by Difficulty

### ✅ Already Covered (existing plugins — install and use)

| Feature | Plugin | Type |
|---------|--------|------|
| Helm chart management | [app-catalog](https://github.com/headlamp-k8s/plugins/tree/main/app-catalog) | Official (desktop) |
| KEDA autoscaling | [keda](https://github.com/headlamp-k8s/plugins/tree/main/keda) | Official |
| Karpenter / NAP | [karpenter](https://github.com/headlamp-k8s/plugins/tree/main/karpenter) | Official |
| Flux GitOps | [flux](https://github.com/headlamp-k8s/plugins/tree/main/flux) | Official |
| cert-manager | [cert-manager](https://github.com/headlamp-k8s/plugins/tree/main/cert-manager) | Official |
| OpenCost | [opencost](https://github.com/headlamp-k8s/plugins/tree/main/opencost) | Official |
| Prometheus metrics | [prometheus](https://github.com/headlamp-k8s/plugins/tree/main/prometheus) | Official (default) |
| OPA Gatekeeper | [Gatekeeper](https://github.com/sozercan/gatekeeper-headlamp-plugin) | Community |
| Trivy scanning | [Trivy](https://github.com/kubebeam/trivy-headlamp-plugin) | Community |
| Kubescape scanning | [Kubescape](https://github.com/kubescape/headlamp-plugin) | Community |
| KubeVirt VMs | [KubeVirt](https://github.com/buttahtoast/headlamp-plugins/tree/main/kubevirt) | Community |
| Inspektor Gadget | [Inspektor Gadget](https://github.com/inspektor-gadget/headlamp-plugin/) | Community |
| KAITO AI models | [KAITO](https://github.com/kaito-project/headlamp-kaito) | Community |
| Knative serverless | [knative](https://github.com/headlamp-k8s/plugins/tree/main/knative) | Official |
| Volcano batch | [volcano](https://github.com/headlamp-k8s/plugins/tree/main/volcano) | Official |

### 🟢 Easy (small frontend changes, existing Kubernetes APIs)

| Feature | Effort Estimate | Notes |
|---------|----------------|-------|
| Node pool grouping / visualization | ~2-3 days | Label-based grouping in existing Node list |
| VPA recommendations comparison | ~1-2 days | Enhancement to existing VPA detail view |
| Virtual Node indicators | ~1 day | Badge/icon in existing Node view |
| Network Policy visualization | ~3-5 days | Diagram component for policy rules |
| Cilium NetworkPolicy views | ~2-3 days | CRD detail view plugin |

### 🟡 Medium (new components, CRD aggregation, some backend work)

| Feature | Effort Estimate | Notes |
|---------|----------------|-------|
| Istio service mesh views | ~5-10 days | CRD views + mesh topology visualization |
| Workload Identity visualization | ~3-5 days | ServiceAccount annotation parsing |
| Key Vault CSI driver views | ~3-5 days | SecretProviderClass CRD status views |
| Dapr component views | ~3-5 days | CRD views + sidecar detection |
| OpenTelemetry views | ~3-5 days | Collector and instrumentation CRD views |
| Grafana dashboard links | ~2-3 days | Configurable external dashboard URL linking |
| Argo CD Application views | ~5-8 days | Application CRD sync status dashboard |
| eTag conflict detection | ~3-5 days | resourceVersion conflict UI in YAML editor |
| Kyverno policy views (revive) | ~5-8 days | Archived plugin needs new maintainer or rebuild |

### 🔴 Hard (Azure-specific APIs, new auth flows)

| Feature | Effort Estimate | Notes |
|---------|----------------|-------|
| Azure Monitor / Container Insights | ~10-15 days | Azure AD auth + Log Analytics KQL API |
| AKS cluster upgrade management | ~10-15 days | Azure ARM API + upgrade safety workflows |
| Planned maintenance windows | ~8-10 days | Azure ARM API integration |
| Azure Cost Management integration | ~10-15 days | Azure AD auth + Cost Management API |
| Defender for Containers dashboard | ~10-15 days | Azure Security Center API integration |

---

## Part 5: Recommended Implementation Order

### Phase 1: Quick Wins (Easy, High Impact)
1. **Node pool visualization** — Group nodes by AKS node pool label; immediate UX improvement.
2. **VPA recommendations** — Show current vs recommended resources side-by-side.
3. **Virtual Node indicators** — Badge/icon to distinguish ACI-backed nodes.
4. **Network Policy diagrams** — Visual ingress/egress rule representation.

### Phase 2: Fill Remaining CNCF Gaps (Medium)
5. **Istio service mesh views** — Growing AKS adoption; no plugin exists yet.
6. **Argo CD dashboard** — Popular GitOps alternative to Flux; no plugin exists yet.
7. **Dapr component views** — Official AKS extension; no plugin exists yet.
8. **Key Vault CSI driver views** — Common AKS security pattern; no plugin exists yet.

### Phase 3: Enhanced Experiences (Medium)
9. **Workload Identity visualization** — AKS desktop supports this during deployment; Headlamp could show it for existing resources.
10. **OpenTelemetry views** — Increasingly important for AKS observability.
11. **Grafana dashboard links** — Deep links from Headlamp to Grafana dashboards.
12. **Kyverno plugin revival** — Archived community plugin needs new maintainer.

### Phase 4: Azure-Specific Features (Hard)
13. **Azure Monitor integration** — High value but requires Azure-specific auth work.
14. **Cluster upgrade management** — Important for operations but complex to implement.
15. **Azure Cost Management** — High demand but the OpenCost plugin covers K8s-native costs.

---

## Part 6: Key Takeaway

Of the 34 AKS-relevant features analyzed, **15 are already covered** by existing official
or community plugins, and **9 more are implemented by AKS desktop**. The remaining gaps are:
- **5 Easy items** — small frontend enhancements (node pools, VPA, virtual nodes, network
  policy visualization, Cilium)
- **9 Medium items** — new plugin development needed (Istio, Argo CD, Dapr, Key Vault CSI,
  OpenTelemetry, Workload Identity, Grafana links, eTag conflict detection, Kyverno revival)
- **5 Hard items** — Azure-specific API integrations (Monitor, upgrades, maintenance, cost
  management, Defender)

The existing plugin ecosystem covers the most commonly requested CNCF integrations
(KEDA, Karpenter, Flux, Helm, Prometheus, cert-manager, OPA Gatekeeper, OpenCost, Trivy,
Kubescape, KubeVirt, Inspektor Gadget, KAITO). Additionally,
[AKS desktop](https://github.com/Azure/aks-desktop) (built on Headlamp) has already
implemented several Azure-specific features (Projects, Deployment Wizard, Workload Identity,
ACR integration) that could inform future upstream contributions.

---

## Part 7: CNCF Projects Used by Startups

This section maps the CNCF projects that well-funded, high-growth tech startups typically
adopt at each stage, and identifies Headlamp's current plugin coverage for each. Data is
based on the [CNCF Annual Survey 2024](https://www.cncf.io/reports/cncf-annual-survey-2024/),
[CNCF Project Velocity 2025](https://www.cncf.io/blog/2026/02/09/what-cncf-project-velocity-in-2025-reveals-about-cloud-natives-future/),
the [Argo CD End User Survey 2025](https://www.cncf.io/announcements/2025/07/24/cncf-end-user-survey-finds-argo-cd-as-majority-adopted-gitops-solution-for-kubernetes/),
and the [State of Dapr Report 2025](https://www.prnewswire.com/news-releases/cloud-native-computing-foundation-releases-2025-state-of-dapr-report-highlighting-adoption-trends-and-ai-innovations-302416413.html).

### Early-Stage Startups (Seed → Series A)

Focus: ship fast, keep complexity low, small team (2–10 engineers).

| CNCF Project | Why Startups Use It | Headlamp Plugin? | Gap |
|---|---|---|---|
| **Kubernetes** | Core orchestrator — 93% production adoption (CNCF 2024 survey) | ✅ Core — full support | None |
| **Helm** | Package manager — used by 75% of K8s users | ✅ [app-catalog](https://github.com/headlamp-k8s/plugins/tree/main/app-catalog) — install charts, manage releases | Desktop only |
| **Prometheus** | Monitoring and alerting — essential from day one | ✅ [prometheus](https://github.com/headlamp-k8s/plugins/tree/main/prometheus) — workload detail charts | Shipped by default |
| **cert-manager** | Automated TLS certificates — set-and-forget | ✅ [cert-manager](https://github.com/headlamp-k8s/plugins/tree/main/cert-manager) — view/manage certs | None |
| **Ingress NGINX** | Simple HTTP(S) ingress for web apps | ✅ Core — Ingress/IngressClass fully supported | None |
| **CoreDNS** | Cluster DNS (managed by K8s) | ✅ Core — ConfigMap viewable, pods visible | None |
| **containerd** | Container runtime (managed by K8s) | ✅ Core — container info in Pod details | None |
| **External Secrets Operator** | Sync secrets from Vault/AWS/Azure — avoids hardcoded secrets | ⚠️ [Community plugin](https://github.com/magohl/external-secrets-operator-headlamp-plugin) — ExternalSecret/SecretStore views | Community maintained |
| **Kustomize** | Environment-specific manifest overlays | ✅ Core — K8s resources fully visible post-apply | N/A (build-time tool) |

**Headlamp coverage: 8/9 projects covered.** External Secrets Operator has a community plugin.

### Growth-Stage Startups (Series A → Series C)

Focus: scale reliability, multi-team workflows, compliance, observability.

| CNCF Project | Why Startups Use It | Headlamp Plugin? | Gap |
|---|---|---|---|
| **Argo CD** | GitOps — 60% of K8s clusters use it (CNCF 2025 survey); 97% in production | ❌ No plugin | 🟡 Medium — Application CRD sync dashboard |
| **Flux** | GitOps alternative — Kustomization/HelmRelease reconciliation | ✅ [flux](https://github.com/headlamp-k8s/plugins/tree/main/flux) — visualize Flux resources | None |
| **OpenTelemetry** | Unified traces/metrics/logs — fastest-growing CNCF project by contributions | ❌ No plugin | 🟡 Medium — Collector/Instrumentation CRD views |
| **Cilium** | eBPF networking, security, observability — replacing kube-proxy at scale | ⚠️ CRDs auto-discovered | 🟢 Easy — CiliumNetworkPolicy detail views |
| **Envoy / Envoy Gateway** | Ingress and API gateway — underpins Istio, Ambassador, Contour | ✅ [Community plugin](https://artifacthub.io/packages/headlamp/headlamp-envoy-gateway/envoy-gateway) — HTTPRoute, auth, retry policies | Community maintained |
| **Crossplane** | Infrastructure-as-code via K8s APIs — Graduated CNCF (Oct 2025), used by 1000+ orgs | ❌ No plugin | 🟡 Medium — CompositeResource/Claim/Provider views |
| **Backstage** | Internal developer portal — golden paths, service catalog | ✅ [backstage](https://github.com/headlamp-k8s/plugins/tree/main/backstage) — links to Backstage views | None |
| **KEDA** | Event-driven autoscaling — scale to zero, respond to queues/events | ✅ [keda](https://github.com/headlamp-k8s/plugins/tree/main/keda) — ScaledObject/ScaledJob views | None |
| **Karpenter** | Intelligent node autoscaling — cost optimization | ✅ [karpenter](https://github.com/headlamp-k8s/plugins/tree/main/karpenter) — NodePool/NodeClaim dashboard | None |
| **OPA / Gatekeeper** | Policy enforcement — compliance guardrails | ✅ [Community plugin](https://github.com/sozercan/gatekeeper-headlamp-plugin) — policies, violations | Community maintained |
| **Falco** | Runtime security — syscall monitoring, threat detection | ❌ No plugin | 🟡 Medium — alert dashboard, rule viewer |
| **Istio** | Service mesh — mTLS, traffic management, observability | ⚠️ Gateway API supported; CRDs auto-discovered | 🟡 Medium — mesh topology, VirtualService views |
| **Linkerd** | Lightweight service mesh — simpler alternative to Istio | ❌ No plugin | 🟡 Medium — mesh status, proxy injection views |
| **Dapr** | Distributed application runtime — state, pub/sub, service invocation | ❌ No plugin | 🟡 Medium — Component/sidecar status views |
| **OpenCost** | Kubernetes cost monitoring and optimization | ✅ [opencost](https://github.com/headlamp-k8s/plugins/tree/main/opencost) — workload cost visibility | None |
| **Trivy** | Vulnerability scanning — container images, IaC, SBOM | ✅ [Community plugin](https://github.com/kubebeam/trivy-headlamp-plugin) — compliance/vulnerability reports | Community maintained |
| **Kubescape** | Security posture — CIS benchmarks, NSA hardening | ✅ [Community plugin](https://github.com/kubescape/headlamp-plugin) — config/vulnerability scanning | Community maintained |
| **Harbor** | Container registry — vulnerability scanning, signing, replication | ❌ No plugin | 🟡 Medium — registry/repository browser |
| **Rook** | Ceph storage orchestration — distributed block/object/file | ✅ [Community plugin](https://github.com/privilegedescalation/headlamp-rook-plugin) — CephCluster health, pools, CSI | Community maintained |
| **Thanos** | Long-term Prometheus storage — multi-cluster metrics | ⚠️ Compatible via [prometheus](https://github.com/headlamp-k8s/plugins/tree/main/prometheus) plugin (Prometheus-compatible API) | None (indirect) |
| **Kubeflow** | ML workflows — training, serving, pipelines | ✅ [kubeflow](https://github.com/headlamp-k8s/plugins/tree/main/kubeflow) — foundational resource views | Evolving |

**Headlamp coverage: 14/21 projects have plugins (official or community).** Key gaps for
growth startups are **Argo CD**, **Crossplane**, **Falco**, **Linkerd**, **Dapr**, **Harbor**,
and **OpenTelemetry**.

### Summary: Startup CNCF Stack Coverage

| Stage | Total Projects | Plugin Coverage | Key Gaps |
|---|---|---|---|
| **Early-stage** (Seed–Series A) | 9 | **8 covered** (89%) | External Secrets (community plugin exists) |
| **Growth-stage** (Series A–C) | 21 | **14 covered** (67%) | Argo CD, Crossplane, Falco, Linkerd, Dapr, Harbor, OpenTelemetry |

### Recommended Startup-Focused Plugin Priorities

These are ordered by impact (how many startups use the project) × feasibility:

1. **Argo CD** — 60% of K8s clusters; most-requested missing plugin. Application sync
   status, health tree, rollback history.
2. **Crossplane** — CNCF Graduated (2025); the "Golden Triangle" (Backstage + Argo CD +
   Crossplane) is the emerging platform engineering standard. CompositeResource/Claim views.
3. **Falco** — Runtime security is non-negotiable for funded startups with enterprise
   customers. Alert dashboard, rule viewer, event timeline.
4. **OpenTelemetry** — Fastest-growing CNCF project; traces/metrics/logs. Collector and
   Instrumentation CRD views.
5. **Linkerd** — Simpler mesh alternative gaining share vs Istio. Service mesh status and
   traffic metrics.
6. **Harbor** — Container registry management. Image browser, vulnerability results,
   replication status.
7. **Dapr** — Official AKS extension; growing AI integration. Component and sidecar views.
