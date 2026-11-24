{{/*
Expand the name of the chart.
*/}}
{{- define "headlamp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Build the name of the administrator settings ConfigMap.
*/}}
{{- define "headlamp.adminSettingsName" -}}
{{- printf "%s-admin-settings" (include "headlamp.fullname" . | trunc 48 | trimSuffix "-") }}
{{- end }}

{{/*
Build the admin settings document. Per-plugin settings in pluginsManager configuration
act as defaults; explicit config.settings values take precedence.
*/}}
{{- define "headlamp.adminSettings" -}}
{{- $settings := deepCopy (.Values.config.settings | default dict) -}}
{{- $defaults := deepCopy (get $settings "defaults" | default dict) -}}
{{- $pluginDefaults := deepCopy (get $defaults "plugins" | default dict) -}}
{{- if .Values.pluginsManager.enabled -}}
  {{- $managerConfig := .Values.pluginsManager.config | default (fromYaml (.Values.pluginsManager.configContent | default "{}")) -}}
  {{- range ($managerConfig.plugins | default list) -}}
    {{- if .settings -}}
      {{- $settingsName := .settingsName | default .name -}}
      {{- $explicit := deepCopy (get $pluginDefaults $settingsName | default dict) -}}
      {{- $_ := set $pluginDefaults $settingsName (mergeOverwrite (deepCopy .settings) $explicit) -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- if $pluginDefaults -}}
  {{- $_ := set $defaults "plugins" $pluginDefaults -}}
{{- end -}}
{{- if $defaults -}}
  {{- $_ := set $settings "defaults" $defaults -}}
{{- end -}}
{{- toJson $settings -}}
{{- end }}

{{/*
Return the plugin manager configuration as YAML. Structured config takes
precedence over the legacy configContent string.
*/}}
{{- define "headlamp.pluginsManagerConfig" -}}
{{- if .Values.pluginsManager.config -}}
{{- toYaml .Values.pluginsManager.config -}}
{{- else -}}
{{- .Values.pluginsManager.configContent -}}
{{- end -}}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "headlamp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Expand the namespace of the release.
Allows overriding it for multi-namespace deployments in combined charts.
*/}}
{{- define "headlamp.namespace" -}}
  {{- if .Values.namespaceOverride }}
    {{- .Values.namespaceOverride | trunc 63 | trimSuffix "-" -}}
  {{- else if .Release.Namespace }}
    {{- .Release.Namespace | trunc 63 | trimSuffix "-" -}}
  {{- else -}}
    default
  {{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "headlamp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "headlamp.labels" -}}
helm.sh/chart: {{ include "headlamp.chart" . }}
{{ include "headlamp.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "headlamp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "headlamp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "headlamp.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "headlamp.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}


{{/*
Check if readOnlyRootFilesystem is enabled, returns string "true" if enabled, otherwise returns "false".
*/}}
{{- define "headlamp.readOnlyRootFilesystem" -}}
{{- $securityContextReadOnly := and .securityContext (hasKey .securityContext "readOnlyRootFilesystem") .securityContext.readOnlyRootFilesystem -}}
{{- if $securityContextReadOnly -}}true{{- else -}}false{{- end -}}
{{- end }}

{{/*
Compute whether to auto-add a writable /tmp emptyDir for a container with
readOnlyRootFilesystem: true.

- addMount is false when the user already has a volumeMount at /tmp
  (avoids duplicate mountPath).
- addVolume is false when the user already has a /tmp mount (avoids an
  orphaned volume) OR when a volume with mountName already exists (allows
  users to supply their own headlamp-tmp with custom emptyDir settings
  such as sizeLimit, while the chart still wires up the /tmp mount).

Input (dict):
  volumeMounts - list of existing volumeMounts for this container
  volumes      - list of existing pod-level volumes
  readOnly     - bool: is readOnlyRootFilesystem active for this container
  mountName    - string: name for the auto-created volume (e.g. "headlamp-tmp")

Output (YAML dict, intended for use with fromYaml):
  addMount: bool
  addVolume: bool
*/}}
{{- define "headlamp.tmpVolumeContext" -}}
{{- $hasTmpMount := false -}}
{{- range .volumeMounts -}}
  {{- if eq .mountPath "/tmp" -}}{{- $hasTmpMount = true -}}{{- end -}}
{{- end -}}
{{- $hasTmpVolume := false -}}
{{- range .volumes -}}
  {{- if eq .name $.mountName -}}{{- $hasTmpVolume = true -}}{{- end -}}
{{- end -}}
addMount: {{ and .readOnly (not $hasTmpMount) }}
addVolume: {{ and .readOnly (not $hasTmpMount) (not $hasTmpVolume) }}
{{- end }}
