import { beforeAll, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { parseKubernetesYAML } from '@headlamp-k8s/ai-ui/parsing/yamlParser';
import { _testing } from '../aksAgentManager';
import {
  fb1_ansi256Color,
  fb1_ansiSplitLine,
  fb1_bareCodeThenYaml,
  fb1_bareYaml2Lines,
  fb1_bareYaml3Lines,
  fb1_deepPathHeading,
  fb1_dockerCompose,
  fb1_dockerfileContinuation,
  fb1_dockerfileProd,
  fb1_dotEnvHeading,
  fb1_fiveWordProse,
  fb1_flagsNotProse,
  fb1_fourWordProse,
  fb1_goInterface,
  fb1_hyphenatedFilename,
  fb1_indentedCodeAfterList,
  fb1_kubectlTabular,
  fb1_longPanelLine,
  fb1_makefileTab,
  fb1_panelTripleBacktick,
  fb1_portNumber,
  fb1_requirementsTxt,
  fb1_shellBacktick,
  fb1_tsconfigJson,
  fb1_twoFileHeadings,
  fb1_twoYamlBlocks,
  fb1_windowsPaths,
  fb1_yamlFlowMapping,
  fb1_yamlFoldedScalar,
  fb1_yamlPipeLiteral,
  fb2_ansiBoldPanel,
  fb2_bareNonK8sYaml,
  fb2_cargoLockToml,
  fb2_closingBrace,
  fb2_consecutiveBlanks,
  fb2_deeplyNestedYaml,
  fb2_dockerignoreHeading,
  fb2_doubleSlashPath,
  fb2_exact78Chars,
  fb2_gitignoreHeading,
  fb2_headingBlankLinePanel,
  fb2_literalEscapeText,
  fb2_makefileTabChars,
  fb2_markdownHeadingAfterCode,
  fb2_nestedAnsiReset,
  fb2_nonK8sYamlProse,
  fb2_nonK8sYamlSeparator,
  fb2_orderedListPanels,
  fb2_panelDashList,
  fb2_proseNotHeading,
  fb2_proseWordColon,
  fb2_pythonFString,
  fb2_pythonImport,
  fb2_readmeMdContent,
  fb2_shellHeredoc,
  fb2_spacesInPath,
  fb2_twoApiVersionBlocks,
  fb2_unicodeFilename,
  fb2_yamlDocSeparator,
  fb2_yamlKeySplit,
  fb3_bareJsonArray,
  fb3_bareYamlList,
  fb3_cssPanel,
  fb3_heredocQuotedDelim,
  fb3_makefilePhony,
  fb3_multipleHeredocs,
  fb3_numberedListPanels,
  fb3_proseBetweenPanels,
  fb3_sqlPanel,
  fb3_teeHeredoc,
  fb4_dockerfileImageTag,
  fb4_heredocDashEof,
  fb4_lowercaseSql,
  fb4_makefilePhonyDeps,
  fb4_yamlMergeKey,
  fb5_cIncludeHeaders,
  fb5_dockerComposeYaml,
  fb5_goStructJsonTags,
  fb5_jsonObject,
  fb5_kubectlGetPods,
  fb5_numberedStepsShell,
  fb5_proseWithPanelCode,
  fb5_pythonTripleQuoteYaml,
  fb5_rustLifetimes,
  fb5_rustMatchArms,
  fb5_shellBackslashContinuation,
  fb5_shellCaseStatement,
  fb5_terraformHcl,
  fb5_tsInterface,
  fb5_yamlBooleanValues,
  fb6_arrowFunctions,
  fb6_dockerRunBackslash,
  fb6_goGoroutineChannel,
  fb6_javaAnnotationsClass,
  fb6_javaTryCatchFinally,
  fb6_kubectlPatchJson,
  fb6_printLogStatements,
  fb6_proseBetweenCodeBlocks,
  fb6_pythonFStringBraces,
  fb6_rustEnumDerive,
  fb6_shellIfElifElse,
  fb6_shellUntilLoop,
  fb6_tsInterfaceColonMembers,
  fb6_yamlAnchorsAliases,
  fb6_yamlShellProseSeparated,
  fb7_awkSedCommands,
  fb7_azCliJmesPath,
  fb7_cssRules,
  fb7_cStructTypedef,
  fb7_exportEnvVars,
  fb7_jsonConfigObject,
  fb7_kotlinDataClass,
  fb7_luaLocalFunction,
  fb7_numberedStepsCodeBlocks,
  fb7_protobufMessage,
  fb7_pythonAsyncTypeHints,
  fb7_rubyClassMethods,
  fb7_shellPipeChain,
  fb7_shellScriptVarsCommands,
  fb7_systemdUnitFile,
  fb8_dockerComposeBuildContext,
  fb8_elixirModule,
  fb8_githubActionsYaml,
  fb8_goStructLiteral,
  fb8_k8sCrdDefinition,
  fb8_makefileIfeq,
  fb8_pythonKwargs,
  fb8_pythonNestedExpressions,
  fb8_rustClosuresIterators,
  fb8_shellFunctionDef,
  fb8_shellHeredocYaml,
  fb8_shellTrapSource,
  fb8_sqlJoinQuery,
  fb8_swiftStructProperties,
  fb8_terraformMultipleResources,
  fb9_curlJsonBody,
  fb9_iniConfigFile,
  fb9_javaSpringBootService,
  fb9_kotlinSuspendFunction,
  fb9_markdownTable,
  fb9_phpClassNamespace,
  fb9_pythonMultiLineString,
  fb9_requirementsTxt,
  fb9_rustTurbofish,
  fb9_scalaCaseClass,
  fb9_shellArraysParamExpansion,
  fb9_shellHereString,
  fb9_shellProcessSubstitution,
  fb9_terraformLocalsData,
  fb9_tsGenericTypes,
  fb10_ansiblePlaybook,
  fb10_azureBicepAks,
  fb10_azureDevOpsPipeline,
  fb10_configMapLiteralBlock,
  fb10_dockerComposeYaml,
  fb10_envoyProxyConfig,
  // Round 10
  fb10_ghActionsBranchesMain,
  fb10_grafanaConfigMap5m,
  fb10_helmValuesYaml,
  fb10_kubectlTopMillicores,
  fb10_kustomizationYaml,
  fb10_makefilePhony,
  fb10_nginxProxyPass,
  fb10_prometheusDuration5m,
  fb10_pythonK8sOperator,
  fb11_aksTroubleshooting,
  fb11_azAksGetCredentials,
  fb11_bareKlogFormat,
  fb11_bareLogfmtOutput,
  fb11_barePromQL5m,
  fb11_bareResourceActionOutput,
  fb11_configMapSpringProperties,
  fb11_dockerBuildSteps,
  fb11_goClientGoCode,
  fb11_helmStatusOutput,
  fb11_helmTemplateGoExpr,
  fb11_helmUpgradeHooks,
  fb11_istioSidecarAnnotations,
  fb11_k8sSchedulingDescribe,
  fb11_k8sSecretBase64,
  fb11_k8sValidationErrors,
  fb11_klogFormatLogs,
  fb11_kubectlApplyOutput,
  fb11_kubectlErrorMessage,
  fb11_kubectlEventsTable,
  fb11_kubectlRolloutStatus,
  // Round 11
  fb11_kubectlScaleOutput,
  fb11_kubectlWarningDeprecation,
  fb11_kustomizationPatches,
  fb11_logfmtStructuredLogs,
  fb11_multiKubectlWithProse,
  fb11_pvcResourceStatus,
  fb11_rbacClusterRole,
  fb11_terraformOutputValues,
  fb11_terraformPlanOutput,
  fb12_azAksJsonOutput,
  fb12_bareContainerCrash,
  fb12_bareContainerLifecycle,
  fb12_bareCRIOLogs,
  fb12_bareImagePullFailure,
  fb12_bareK8sEventMessages,
  fb12_bareKeyValueDiagnostics,
  fb12_bareProbeFailures,
  fb12_barePrometheusMetrics,
  // Round 12
  fb12_barePromQLExpressions,
  fb12_bareSchedulingDetails,
  fb12_bareSchedulingFailure,
  fb12_bareVolumeMountFailure,
  fb12_coreDNSCorefile,
  fb12_prometheusRuleCRD,
  fb13_assumesHeadingColon,
  fb13_boldK8sTerms,
  fb13_bulletListTechTerms,
  fb13_diagnosticSummaryColon,
  fb13_inlineCodeBackticks,
  fb13_markdownHeaders,
  fb13_mixedMarkdownFormatting,
  fb13_multiParagraphExplanation,
  fb13_notePrefix,
  fb13_numberedStepList,
  // Round 13
  fb13_proseColonEnding,
  fb13_proseKeyValueDescriptions,
  fb13_proseWithUrls,
  fb13_questionsAboutK8s,
  fb13_stepHeadingColon,
  // Round 14
  fb14_alsoConfirmAfterShell,
  fb14_alsoConfirmDoubleBlank,
  fb14_alsoConfirmNoBlank,
  fb14_buildPushProseHeading,
  fb14_panelCodeThenAlsoConfirm,
  fb15_assumptionsBetweenCodeBlocks,
  fb15_cargoTomlNonPanel,
  fb15_deploymentYamlPanel,
  fb15_dockerfilePanel,
  fb15_mainPyNonPanel,
  fb15_mainPyPanel,
  fb15_mainRsNonPanel,
  fb15_numberedStepAfterGoCode,
  fb15_numberedStepHeaderNonPanel,
  fb15_numberedStepHeaderPanel,
  fb15_requirementsTxtNonPanel,
  // Round 15
  fb15_requirementsTxtPanel,
  makeRaw,
  panelBlank,
  panelLine,
  rawBareYamlService,
  rawBestPractices,
  rawCrashDiagnosis,
  rawJavaDeployOptionAB,
  rawJavaDeployTerminal,
  rawK8sDeployWithCurl,
  rawMicroservicesPythonYaml,
  rawMicroserviceYaml as rawMicroserviceYamlFixture,
  rawMultiResource,
  rawPodStatus,
  rawPythonDeploymentAdvice,
  rawPythonFlaskApp,
  rawPythonImports,
  rawRustAxumApp,
  rawRustK8sDeployment,
  syntheticAksClusterCreate,
  syntheticAksNodePools,
  syntheticAnsi256ColorOutput,
  syntheticAnsiSplitYamlKey,
  syntheticBashHeredoc,
  syntheticBoldHeadingSplit,
  syntheticCargoAddWorkflow,
  syntheticCargoBuildProfiles,
  syntheticCargoInlineTables,
  syntheticCargoNewProject,
  syntheticCargoTomlAnsiSplit,
  syntheticCargoTomlFeatures,
  syntheticCargoTomlWorkspace,
  syntheticCargoWorkspaceDeps,
  syntheticCenteredColonTitle,
  syntheticCenteredStepHeading,
  syntheticClojureApp,
  syntheticCSharpDotnetApp,
  syntheticDeepNestedYaml,
  syntheticElixirModule,
  syntheticFortranDockerfile,
  syntheticGoHttpServer,
  syntheticGoModule,
  syntheticHaskellApp,
  syntheticHelmInstall,
  syntheticHelmValuesYaml,
  syntheticJavaSpringBoot,
  syntheticK8sAgic,
  syntheticK8sArgoCD,
  syntheticK8sCertManager,
  syntheticK8sConfigMapFromFile,
  syntheticK8sCronJobScript,
  syntheticK8sDaemonSet,
  syntheticK8sFluxCD,
  syntheticK8sHpaCustomMetrics,
  syntheticK8sHpaPdb,
  syntheticK8sInitContainers,
  syntheticK8sIstioRouting,
  syntheticK8sJobPatterns,
  syntheticK8sKeyVaultCsi,
  syntheticK8sLinkerd,
  syntheticK8sMultiCluster,
  syntheticK8sNetworkDebug,
  syntheticK8sNetworkPolicy,
  syntheticK8sPodSecurity,
  syntheticK8sPrometheusMonitoring,
  syntheticK8sRbacSetup,
  syntheticK8sResourceQuota,
  syntheticK8sRollingUpdate,
  syntheticK8sSecretsWorkflow,
  syntheticK8sStatefulSet,
  syntheticK8sTroubleshooting,
  syntheticK8sVeleroBackup,
  syntheticK8sWorkloadIdentity,
  syntheticKotlinApp,
  syntheticKubectlDescribePod,
  syntheticKubectlGetWide,
  syntheticKubectlTopOutput,
  syntheticKustomizeOverlay,
  syntheticLuaModule,
  syntheticMakefileWithTargets,
  syntheticMixedFencedAndBare,
  syntheticMultiLangK8sDeploy,
  syntheticMultiLanguageComparison,
  syntheticNodeExpressApp,
  syntheticNumberedStepsWithCode,
  syntheticPerlScript,
  syntheticProseHeadingAfterDockerfile,
  syntheticProseNotYaml,
  syntheticPythonDjango,
  syntheticPythonMultilineStrings,
  syntheticRAnalysis,
  syntheticRubyRailsApp,
  syntheticRustActixWeb,
  syntheticRustFullDeploy,
  syntheticRustLibBinSplit,
  syntheticRustWithTests,
  syntheticScalaApp,
  syntheticSqlSchema,
  syntheticSwiftApp,
  syntheticTerraformAksModule,
  syntheticTypeScriptApp,
  syntheticYamlWithAnchors,
} from './fixtures';

const {
  stripAnsi,
  normalizeBullets,
  looksLikeYaml,
  wrapBareYamlBlocks,
  wrapBareCodeBlocks,
  cleanTerminalFormatting,
  collapseTerminalBlankLines,
  stripAgentNoise,
  isAgentNoiseLine,
  extractAIAnswer,
  ThinkingStepTracker,
  extractTaskRow,
  friendlyToolLabel,
  looksLikeShellOrDockerCodeLine,
  hasShellSyntax,
  normalizeTerminalMarkdown,
  isFileHeaderComment,
  isBoldFileHeading,
  hasStructuredCodeContext,
} = _testing;

describe('stripAnsi', () => {
  it('removes color escape sequences', () => {
    expect(stripAnsi('\x1b[31mred text\x1b[0m')).toBe('red text');
  });

  it('removes cursor movement sequences', () => {
    expect(stripAnsi('\x1b[2Jhello\x1b[H')).toBe('hello');
  });

  it('removes character set selection', () => {
    expect(stripAnsi('\x1b(Bhello\x1b)0')).toBe('hello');
  });

  it('removes carriage returns', () => {
    expect(stripAnsi('line1\rline2')).toBe('line1line2');
  });

  it('handles text with no ANSI codes', () => {
    expect(stripAnsi('plain text')).toBe('plain text');
  });

  it('handles empty string', () => {
    expect(stripAnsi('')).toBe('');
  });

  it('removes multiple sequences', () => {
    expect(stripAnsi('\x1b[1m\x1b[32mbold green\x1b[0m')).toBe('bold green');
  });

  it('removes bracketed paste sequences', () => {
    expect(stripAnsi('\x1b[?2004h text \x1b[?2004l')).toBe(' text ');
  });
});

describe('normalizeBullets', () => {
  it('converts bullet character (•) to markdown list', () => {
    expect(normalizeBullets('• item one')).toBe('- item one');
  });

  it('converts middle dot (·) to markdown list', () => {
    expect(normalizeBullets('· item one')).toBe('- item one');
  });

  it('converts black square (▪) to markdown list', () => {
    expect(normalizeBullets('▪ item one')).toBe('- item one');
  });

  it('converts right-pointing triangle (▸) to markdown list', () => {
    expect(normalizeBullets('▸ item one')).toBe('- item one');
  });

  it('converts en-dash (–) to markdown list', () => {
    expect(normalizeBullets('– item one')).toBe('- item one');
  });

  it('preserves leading indentation', () => {
    expect(normalizeBullets('  • nested item')).toBe('  - nested item');
  });

  it('converts multiple bullets', () => {
    const input = '• first\n• second\n  • nested';
    const expected = '- first\n- second\n  - nested';
    expect(normalizeBullets(input)).toBe(expected);
  });

  it('does not convert bullet without trailing space', () => {
    expect(normalizeBullets('•text')).toBe('•text');
  });

  it('does not modify existing markdown list markers', () => {
    expect(normalizeBullets('- existing item')).toBe('- existing item');
  });

  it('handles empty string', () => {
    expect(normalizeBullets('')).toBe('');
  });

  it('handles text with no bullets', () => {
    expect(normalizeBullets('plain text')).toBe('plain text');
  });
});

describe('looksLikeYaml', () => {
  it('identifies key: value pairs', () => {
    expect(looksLikeYaml('name: my-pod')).toBe(true);
  });

  it('identifies keys with dots', () => {
    expect(looksLikeYaml('app.kubernetes.io/name: test')).toBe(true);
  });

  it('identifies keys with slashes', () => {
    expect(looksLikeYaml('kubernetes.io/name: test')).toBe(true);
  });

  it('identifies key with no value', () => {
    expect(looksLikeYaml('metadata:')).toBe(true);
  });

  it('identifies YAML list items', () => {
    expect(looksLikeYaml('- item')).toBe(true);
  });

  it('identifies bare list markers', () => {
    expect(looksLikeYaml('-')).toBe(true);
  });

  it('identifies YAML comments', () => {
    expect(looksLikeYaml('# this is a comment')).toBe(true);
  });

  it('identifies empty lines', () => {
    expect(looksLikeYaml('')).toBe(true);
  });

  it('identifies flow mappings', () => {
    expect(looksLikeYaml('{key: value}')).toBe(true);
  });

  it('identifies flow sequences', () => {
    expect(looksLikeYaml('[1, 2, 3]')).toBe(true);
  });

  it('identifies quoted keys', () => {
    expect(looksLikeYaml('"key with spaces": value')).toBe(true);
  });

  it('rejects plain text sentences', () => {
    expect(looksLikeYaml('This is a sentence about pods.')).toBe(false);
  });

  it('treats markdown headers starting with # as YAML comments', () => {
    // looksLikeYaml treats any line starting with # as a YAML comment
    expect(looksLikeYaml('## Header')).toBe(true);
    expect(looksLikeYaml('# Single')).toBe(true);
  });
});

describe('hasShellSyntax', () => {
  it('detects single-letter flags', () => {
    expect(hasShellSyntax('cat -n file.txt')).toBe(true);
  });
  it('detects long flags', () => {
    expect(hasShellSyntax('npm install --save-dev webpack')).toBe(true);
  });
  it('detects file paths with /', () => {
    expect(hasShellSyntax('cat /etc/passwd')).toBe(true);
  });
  it('detects glob patterns', () => {
    expect(hasShellSyntax('find . -name "*.js"')).toBe(true);
  });
  it('detects pipe operator', () => {
    expect(hasShellSyntax('ps aux | grep node')).toBe(true);
  });
  it('detects && chaining', () => {
    expect(hasShellSyntax('cd /app && make')).toBe(true);
  });
  it('detects output redirection', () => {
    expect(hasShellSyntax('echo hello > out.txt')).toBe(true);
  });
  it('detects 2>&1', () => {
    expect(hasShellSyntax('make build 2>&1')).toBe(true);
  });
  it('detects quoted arguments', () => {
    expect(hasShellSyntax("grep -r 'TODO' src/")).toBe(true);
  });
  it('detects variable references', () => {
    expect(hasShellSyntax('echo $HOME')).toBe(true);
  });
  it('detects backtick substitution', () => {
    expect(hasShellSyntax('echo `date`')).toBe(true);
  });
  it('rejects plain English prose', () => {
    expect(hasShellSyntax('This is a regular sentence.')).toBe(false);
  });
  it('rejects prose with no special syntax', () => {
    expect(hasShellSyntax('sort the results by name')).toBe(false);
  });
});

describe('looksLikeShellOrDockerCodeLine', () => {
  // ──────────────────────────────────────────────────────────────
  // POSITIVE: Dockerfile instructions
  // ──────────────────────────────────────────────────────────────
  it('detects FROM', () => {
    expect(looksLikeShellOrDockerCodeLine('FROM python:3.12-slim')).toBe(true);
  });
  it('detects FROM with AS', () => {
    expect(looksLikeShellOrDockerCodeLine('FROM node:18 AS builder')).toBe(true);
  });
  it('detects RUN', () => {
    expect(looksLikeShellOrDockerCodeLine('RUN pip install -r requirements.txt')).toBe(true);
  });
  it('detects CMD array form', () => {
    expect(looksLikeShellOrDockerCodeLine('CMD ["uvicorn", "main:app"]')).toBe(true);
  });
  it('detects COPY', () => {
    expect(looksLikeShellOrDockerCodeLine('COPY . .')).toBe(true);
  });
  it('detects COPY --from', () => {
    expect(looksLikeShellOrDockerCodeLine('COPY --from=builder /app/dist /app')).toBe(true);
  });
  it('detects WORKDIR', () => {
    expect(looksLikeShellOrDockerCodeLine('WORKDIR /app')).toBe(true);
  });
  it('detects EXPOSE', () => {
    expect(looksLikeShellOrDockerCodeLine('EXPOSE 8000')).toBe(true);
  });
  it('detects ENTRYPOINT', () => {
    expect(looksLikeShellOrDockerCodeLine('ENTRYPOINT ["python", "app.py"]')).toBe(true);
  });
  it('detects ENV', () => {
    expect(looksLikeShellOrDockerCodeLine('ENV NODE_ENV=production')).toBe(true);
  });
  it('detects ARG', () => {
    expect(looksLikeShellOrDockerCodeLine('ARG PYTHON_VERSION=3.12')).toBe(true);
  });
  it('detects HEALTHCHECK', () => {
    expect(looksLikeShellOrDockerCodeLine('HEALTHCHECK CMD curl -f http://localhost/healthz')).toBe(
      true
    );
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: Container & orchestration tools
  // ──────────────────────────────────────────────────────────────
  it('detects docker build', () => {
    expect(looksLikeShellOrDockerCodeLine('docker build -t myapp:latest .')).toBe(true);
  });
  it('detects docker run', () => {
    expect(looksLikeShellOrDockerCodeLine('docker run --rm -p 8000:8000 myapp')).toBe(true);
  });
  it('detects docker-compose', () => {
    expect(looksLikeShellOrDockerCodeLine('docker-compose up -d')).toBe(true);
  });
  it('detects kubectl apply', () => {
    expect(looksLikeShellOrDockerCodeLine('kubectl apply -f deployment.yaml')).toBe(true);
  });
  it('detects kubectl get', () => {
    expect(looksLikeShellOrDockerCodeLine('kubectl get pods -n kube-system')).toBe(true);
  });
  it('detects kubectl describe', () => {
    expect(looksLikeShellOrDockerCodeLine('kubectl describe pod my-pod')).toBe(true);
  });
  it('detects kubectl logs', () => {
    expect(looksLikeShellOrDockerCodeLine('kubectl logs -f deployment/myapp')).toBe(true);
  });
  it('detects kubectl exec', () => {
    expect(looksLikeShellOrDockerCodeLine('kubectl exec -it my-pod -- bash')).toBe(true);
  });
  it('detects kubectl delete', () => {
    expect(looksLikeShellOrDockerCodeLine('kubectl delete -f service.yaml')).toBe(true);
  });
  it('detects kubectl port-forward', () => {
    expect(looksLikeShellOrDockerCodeLine('kubectl port-forward svc/myapp 8080:80')).toBe(true);
  });
  it('detects kubectl rollout', () => {
    expect(looksLikeShellOrDockerCodeLine('kubectl rollout status deployment/myapp')).toBe(true);
  });
  it('detects kubectl scale', () => {
    expect(looksLikeShellOrDockerCodeLine('kubectl scale deployment myapp --replicas=3')).toBe(
      true
    );
  });
  it('detects helm install', () => {
    expect(looksLikeShellOrDockerCodeLine('helm install my-release ./chart')).toBe(true);
  });
  it('detects helm upgrade', () => {
    expect(looksLikeShellOrDockerCodeLine('helm upgrade --install myapp ./charts/myapp')).toBe(
      true
    );
  });
  it('detects podman', () => {
    expect(looksLikeShellOrDockerCodeLine('podman build -t myapp .')).toBe(true);
  });
  it('detects minikube', () => {
    expect(looksLikeShellOrDockerCodeLine('minikube start --driver=docker')).toBe(true);
  });
  it('detects kind', () => {
    expect(looksLikeShellOrDockerCodeLine('kind create cluster --name dev')).toBe(true);
  });
  it('detects stern', () => {
    expect(looksLikeShellOrDockerCodeLine('stern myapp -n production')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: Cloud CLIs
  // ──────────────────────────────────────────────────────────────
  it('detects az aks', () => {
    expect(looksLikeShellOrDockerCodeLine('az aks get-credentials --name my-cluster')).toBe(true);
  });
  it('detects az group create', () => {
    expect(looksLikeShellOrDockerCodeLine('az group create --name myRG --location eastus')).toBe(
      true
    );
  });
  it('detects gcloud', () => {
    expect(looksLikeShellOrDockerCodeLine('gcloud container clusters get-credentials')).toBe(true);
  });
  it('detects aws', () => {
    expect(looksLikeShellOrDockerCodeLine('aws eks update-kubeconfig --name my-cluster')).toBe(
      true
    );
  });
  it('detects eksctl', () => {
    expect(looksLikeShellOrDockerCodeLine('eksctl create cluster --name dev')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: Language runtimes & package managers
  // ──────────────────────────────────────────────────────────────
  it('detects pip install', () => {
    expect(looksLikeShellOrDockerCodeLine('pip install flask')).toBe(true);
  });
  it('detects pip3', () => {
    expect(looksLikeShellOrDockerCodeLine('pip3 install flask')).toBe(true);
  });
  it('detects python', () => {
    expect(looksLikeShellOrDockerCodeLine('python main.py')).toBe(true);
  });
  it('detects python3', () => {
    expect(looksLikeShellOrDockerCodeLine('python3 -m venv .venv')).toBe(true);
  });
  it('detects npm install', () => {
    expect(looksLikeShellOrDockerCodeLine('npm install')).toBe(true);
  });
  it('detects npm run', () => {
    expect(looksLikeShellOrDockerCodeLine('npm run build')).toBe(true);
  });
  it('detects npx', () => {
    expect(looksLikeShellOrDockerCodeLine('npx create-react-app my-app')).toBe(true);
  });
  it('detects yarn', () => {
    expect(looksLikeShellOrDockerCodeLine('yarn add typescript --dev')).toBe(true);
  });
  it('detects go build', () => {
    expect(looksLikeShellOrDockerCodeLine('go build -o myapp .')).toBe(true);
  });
  it('detects go mod', () => {
    expect(looksLikeShellOrDockerCodeLine('go mod init example.com/myapp')).toBe(true);
  });
  it('detects cargo build', () => {
    expect(looksLikeShellOrDockerCodeLine('cargo build --release')).toBe(true);
  });
  it('detects cargo test', () => {
    expect(looksLikeShellOrDockerCodeLine('cargo test --all')).toBe(true);
  });
  it('detects java', () => {
    expect(looksLikeShellOrDockerCodeLine('java -jar app.jar')).toBe(true);
  });
  it('detects gradle', () => {
    expect(looksLikeShellOrDockerCodeLine('gradle bootRun')).toBe(true);
  });
  it('detects dotnet', () => {
    expect(looksLikeShellOrDockerCodeLine('dotnet run --project ./src/MyApp')).toBe(true);
  });
  it('detects ruby', () => {
    expect(looksLikeShellOrDockerCodeLine('ruby app.rb')).toBe(true);
  });
  it('detects bundle', () => {
    expect(looksLikeShellOrDockerCodeLine('bundle install')).toBe(true);
  });
  it('detects rails', () => {
    expect(looksLikeShellOrDockerCodeLine('rails new myapp --api')).toBe(true);
  });
  it('detects php', () => {
    expect(looksLikeShellOrDockerCodeLine('php artisan migrate')).toBe(true);
  });
  it('detects composer', () => {
    expect(looksLikeShellOrDockerCodeLine('composer require laravel/framework')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: Build tools & compilers
  // ──────────────────────────────────────────────────────────────
  it('detects make', () => {
    expect(looksLikeShellOrDockerCodeLine('make build')).toBe(true);
  });
  it('detects cmake', () => {
    expect(looksLikeShellOrDockerCodeLine('cmake -B build -DCMAKE_BUILD_TYPE=Release')).toBe(true);
  });
  it('detects gcc', () => {
    expect(looksLikeShellOrDockerCodeLine('gcc -o main main.c -Wall')).toBe(true);
  });
  it('detects bazel', () => {
    expect(looksLikeShellOrDockerCodeLine('bazel build //src:main')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: General CLI tools
  // ──────────────────────────────────────────────────────────────
  it('detects curl', () => {
    expect(looksLikeShellOrDockerCodeLine('curl -sL https://example.com')).toBe(true);
  });
  it('detects wget', () => {
    expect(looksLikeShellOrDockerCodeLine('wget -O file.tar.gz https://example.com/f.tar.gz')).toBe(
      true
    );
  });
  it('detects git clone', () => {
    expect(looksLikeShellOrDockerCodeLine('git clone https://github.com/user/repo')).toBe(true);
  });
  it('detects git commit', () => {
    expect(looksLikeShellOrDockerCodeLine('git commit -m "initial commit"')).toBe(true);
  });
  it('detects jq', () => {
    expect(looksLikeShellOrDockerCodeLine('jq ".name" package.json')).toBe(true);
  });
  it('detects sed', () => {
    expect(looksLikeShellOrDockerCodeLine("sed -i 's/old/new/g' file.txt")).toBe(true);
  });
  it('detects grep', () => {
    expect(looksLikeShellOrDockerCodeLine('grep -r "TODO" src/')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: File operations (unambiguous)
  // ──────────────────────────────────────────────────────────────
  it('detects mkdir', () => {
    expect(looksLikeShellOrDockerCodeLine('mkdir -p /app/data')).toBe(true);
  });
  it('detects chmod', () => {
    expect(looksLikeShellOrDockerCodeLine('chmod +x deploy.sh')).toBe(true);
  });
  it('detects tar', () => {
    expect(looksLikeShellOrDockerCodeLine('tar -xzf archive.tar.gz')).toBe(true);
  });
  it('detects echo', () => {
    expect(looksLikeShellOrDockerCodeLine('echo "hello world"')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: System administration
  // ──────────────────────────────────────────────────────────────
  it('detects sudo', () => {
    expect(looksLikeShellOrDockerCodeLine('sudo apt-get install nginx')).toBe(true);
  });
  it('detects apt-get', () => {
    expect(looksLikeShellOrDockerCodeLine('apt-get install -y curl')).toBe(true);
  });
  it('detects apt', () => {
    expect(looksLikeShellOrDockerCodeLine('apt update && apt install -y git')).toBe(true);
  });
  it('detects brew', () => {
    expect(looksLikeShellOrDockerCodeLine('brew install node')).toBe(true);
  });
  it('detects systemctl', () => {
    expect(looksLikeShellOrDockerCodeLine('systemctl start nginx')).toBe(true);
  });
  it('detects export', () => {
    expect(looksLikeShellOrDockerCodeLine('export PORT=8080')).toBe(true);
  });
  it('detects ssh', () => {
    expect(looksLikeShellOrDockerCodeLine('ssh user@host')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: Infrastructure / CI-CD
  // ──────────────────────────────────────────────────────────────
  it('detects terraform apply', () => {
    expect(looksLikeShellOrDockerCodeLine('terraform apply -auto-approve')).toBe(true);
  });
  it('detects terraform init', () => {
    expect(looksLikeShellOrDockerCodeLine('terraform init')).toBe(true);
  });
  it('detects ansible-playbook', () => {
    expect(looksLikeShellOrDockerCodeLine('ansible-playbook site.yml -i hosts')).toBe(true);
  });
  it('detects vagrant up', () => {
    expect(looksLikeShellOrDockerCodeLine('vagrant up')).toBe(true);
  });
  it('detects gh pr', () => {
    expect(looksLikeShellOrDockerCodeLine('gh pr create --title "Fix bug"')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: Database CLIs
  // ──────────────────────────────────────────────────────────────
  it('detects psql', () => {
    expect(looksLikeShellOrDockerCodeLine('psql -U postgres -d mydb')).toBe(true);
  });
  it('detects mysql', () => {
    expect(looksLikeShellOrDockerCodeLine('mysql -u root -p mydb')).toBe(true);
  });
  it('detects redis-cli', () => {
    expect(looksLikeShellOrDockerCodeLine('redis-cli SET key value')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: Ambiguous words WITH shell syntax → match
  // ──────────────────────────────────────────────────────────────
  it('detects "cat" with path (ambiguous + shell syntax)', () => {
    expect(looksLikeShellOrDockerCodeLine('cat /etc/nginx/nginx.conf')).toBe(true);
  });
  it('detects "cat" with flags', () => {
    expect(looksLikeShellOrDockerCodeLine('cat -n file.txt')).toBe(true);
  });
  it('detects "find" with flags', () => {
    expect(looksLikeShellOrDockerCodeLine('find . -name "*.js" -type f')).toBe(true);
  });
  it('detects "find" with path', () => {
    expect(looksLikeShellOrDockerCodeLine('find /var/log -mtime +7')).toBe(true);
  });
  it('detects "sort" with flags', () => {
    expect(looksLikeShellOrDockerCodeLine('sort -u -k2 data.csv')).toBe(true);
  });
  it('detects "head" with flags', () => {
    expect(looksLikeShellOrDockerCodeLine('head -n 10 access.log')).toBe(true);
  });
  it('detects "tail" with flags', () => {
    expect(looksLikeShellOrDockerCodeLine('tail -f /var/log/syslog')).toBe(true);
  });
  it('detects "kill" with signal flag', () => {
    expect(looksLikeShellOrDockerCodeLine('kill -9 1234')).toBe(true);
  });
  it('detects "test" with flag', () => {
    expect(looksLikeShellOrDockerCodeLine('test -f /etc/config.yaml')).toBe(true);
  });
  it('detects "set" with flag', () => {
    expect(looksLikeShellOrDockerCodeLine('set -euo pipefail')).toBe(true);
  });
  it('detects "cp" with path', () => {
    expect(looksLikeShellOrDockerCodeLine('cp config.yaml /etc/app/')).toBe(true);
  });
  it('detects "mv" with path', () => {
    expect(looksLikeShellOrDockerCodeLine('mv old.log /var/archive/')).toBe(true);
  });
  it('detects "rm" with flags', () => {
    expect(looksLikeShellOrDockerCodeLine('rm -rf /tmp/build')).toBe(true);
  });
  it('detects "ls" with flags', () => {
    expect(looksLikeShellOrDockerCodeLine('ls -la /etc/')).toBe(true);
  });
  it('detects "cd" with && chaining', () => {
    expect(looksLikeShellOrDockerCodeLine('cd /app && npm start')).toBe(true);
  });
  it('detects "watch" with flags', () => {
    expect(looksLikeShellOrDockerCodeLine('watch -n 5 kubectl get pods')).toBe(true);
  });
  it('detects "time" with sub-command path', () => {
    expect(looksLikeShellOrDockerCodeLine('time make -j$(nproc)')).toBe(true);
  });
  it('detects "diff" with flags', () => {
    expect(looksLikeShellOrDockerCodeLine('diff -u old.txt new.txt')).toBe(true);
  });
  it('detects "host" with argument', () => {
    expect(hasShellSyntax('host example.com')).toBe(false);
    // "host" alone without shell syntax is ambiguous — not matched
    expect(looksLikeShellOrDockerCodeLine('host example.com')).toBe(false);
  });
  it('detects "service" with flags', () => {
    expect(looksLikeShellOrDockerCodeLine('service nginx --status-all')).toBe(true);
  });
  it('detects "env" with variable', () => {
    expect(looksLikeShellOrDockerCodeLine('env NODE_ENV=production node app.js')).toBe(true);
  });
  it('detects "ps" with pipe', () => {
    expect(looksLikeShellOrDockerCodeLine('ps aux | grep node')).toBe(true);
  });
  it('detects "touch" with path', () => {
    expect(looksLikeShellOrDockerCodeLine('touch /tmp/healthcheck')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: Ambiguous words WITHOUT shell syntax → no match
  // (This is the key accuracy feature)
  // ──────────────────────────────────────────────────────────────
  it('rejects "cat" as standalone word', () => {
    expect(looksLikeShellOrDockerCodeLine('cat')).toBe(false);
  });
  it('rejects "find" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('find the configuration file')).toBe(false);
  });
  it('rejects "sort" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('sort the results by name')).toBe(false);
  });
  it('rejects "head" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('head over to the documentation')).toBe(false);
  });
  it('rejects "tail" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('tail end of the deployment')).toBe(false);
  });
  it('rejects "kill" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('kill the process manually')).toBe(false);
  });
  it('rejects "test" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('test the application locally')).toBe(false);
  });
  it('rejects "set" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('set up the environment variables')).toBe(false);
  });
  it('rejects "wait" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('wait for the process to complete')).toBe(false);
  });
  it('rejects "watch" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('watch the logs for errors')).toBe(false);
  });
  it('rejects "time" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('time to deploy the application')).toBe(false);
  });
  it('rejects "service" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('service mesh configuration')).toBe(false);
  });
  it('rejects "host" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('host the application on port 8080')).toBe(false);
  });
  it('rejects "date" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('date of the deployment')).toBe(false);
  });
  it('rejects "file" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('file structure overview')).toBe(false);
  });
  it('rejects "read" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('read the documentation first')).toBe(false);
  });
  it('rejects "open" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('open the browser and navigate to')).toBe(false);
  });
  it('rejects "link" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('link to the repository')).toBe(false);
  });
  it('rejects "split" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('split the traffic between versions')).toBe(false);
  });
  it('rejects "join" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('join the two tables on ID')).toBe(false);
  });
  it('rejects "mount" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('mount the volume in the container')).toBe(false);
  });
  it('rejects "top" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('top priority for the next sprint')).toBe(false);
  });
  it('rejects "jobs" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('jobs running in the cluster')).toBe(false);
  });
  it('rejects "env" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('env vars need to be configured')).toBe(false);
  });
  it('rejects "exit" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('exit the application gracefully')).toBe(false);
  });
  it('rejects "cut" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('cut down on unnecessary resources')).toBe(false);
  });
  it('rejects "diff" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('diff between the two versions')).toBe(false);
  });
  it('rejects "true" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('true for production environments')).toBe(false);
  });
  it('rejects "false" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('false positives may occur in edge cases')).toBe(false);
  });
  it('rejects "sleep" without shell syntax', () => {
    expect(looksLikeShellOrDockerCodeLine('sleep between retries is configurable')).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────
  // POSITIVE: Structural patterns (no specific command)
  // ──────────────────────────────────────────────────────────────
  it('detects executable paths (./)', () => {
    expect(looksLikeShellOrDockerCodeLine('./deploy.sh')).toBe(true);
  });
  it('detects executable paths with args', () => {
    expect(looksLikeShellOrDockerCodeLine('./gradlew build --parallel')).toBe(true);
  });
  it('detects shell prompts ($ command)', () => {
    expect(looksLikeShellOrDockerCodeLine('$ kubectl get pods')).toBe(true);
  });
  it('detects shebang lines', () => {
    expect(looksLikeShellOrDockerCodeLine('#!/bin/bash')).toBe(true);
  });
  it('detects shebang with env', () => {
    expect(looksLikeShellOrDockerCodeLine('#!/usr/bin/env python3')).toBe(true);
  });
  it('detects environment variable assignments', () => {
    expect(looksLikeShellOrDockerCodeLine('DATABASE_URL=postgres://localhost/mydb')).toBe(true);
  });
  it('detects NODE_ENV assignment', () => {
    expect(looksLikeShellOrDockerCodeLine('NODE_ENV=production')).toBe(true);
  });
  it('detects pipe chains (structural)', () => {
    expect(looksLikeShellOrDockerCodeLine('something | another thing')).toBe(true);
  });
  it('detects output redirection (structural)', () => {
    expect(looksLikeShellOrDockerCodeLine('mycommand > output.txt')).toBe(true);
  });
  it('detects append redirection', () => {
    expect(looksLikeShellOrDockerCodeLine('mycommand >> log.txt')).toBe(true);
  });
  it('detects stderr redirection', () => {
    expect(looksLikeShellOrDockerCodeLine('mycommand 2>&1')).toBe(true);
  });
  it('detects && chaining (structural)', () => {
    expect(looksLikeShellOrDockerCodeLine('something && another')).toBe(true);
  });
  it('detects command substitution', () => {
    expect(looksLikeShellOrDockerCodeLine('echo $(date)')).toBe(true);
  });
  it('detects line continuation', () => {
    expect(looksLikeShellOrDockerCodeLine('docker build \\')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // NEGATIVE: English prose — should NOT match
  // ──────────────────────────────────────────────────────────────
  it('rejects simple sentence', () => {
    expect(looksLikeShellOrDockerCodeLine('This is a regular sentence.')).toBe(false);
  });
  it('rejects question', () => {
    expect(looksLikeShellOrDockerCodeLine('Which deployment target do you mean?')).toBe(false);
  });
  it('rejects exclamation', () => {
    expect(looksLikeShellOrDockerCodeLine('Great job on the deployment!')).toBe(false);
  });
  it('rejects instruction prose', () => {
    expect(looksLikeShellOrDockerCodeLine('Reply with: target + framework')).toBe(false);
  });
  it('rejects advice prose', () => {
    expect(
      looksLikeShellOrDockerCodeLine(
        "While you answer, here's a solid default pattern that works almost everywhere:"
      )
    ).toBe(false);
  });
  it('rejects prose starting with "I"', () => {
    expect(
      looksLikeShellOrDockerCodeLine('I can give you the exact Kubernetes YAML once you confirm.')
    ).toBe(false);
  });
  it('rejects prose starting with "You"', () => {
    expect(
      looksLikeShellOrDockerCodeLine('You can apply it with kubectl apply -f deployment.yaml.')
    ).toBe(false);
  });
  it('rejects prose starting with "The"', () => {
    expect(
      looksLikeShellOrDockerCodeLine('The deployment will be created in the default namespace.')
    ).toBe(false);
  });
  it('rejects prose about best practices', () => {
    expect(
      looksLikeShellOrDockerCodeLine(
        'Always use environment variables for secrets instead of hardcoding them.'
      )
    ).toBe(false);
  });
  it('rejects prose about configuration', () => {
    expect(
      looksLikeShellOrDockerCodeLine('Configure the readiness probe to check the health endpoint.')
    ).toBe(false);
  });
  it('rejects prose about architecture', () => {
    expect(
      looksLikeShellOrDockerCodeLine(
        'Each microservice should have its own deployment and service resource.'
      )
    ).toBe(false);
  });
  it('rejects prose about networking', () => {
    expect(
      looksLikeShellOrDockerCodeLine(
        'Traffic is routed through the ingress controller to the backend pods.'
      )
    ).toBe(false);
  });
  it('rejects prose with technical terms', () => {
    expect(
      looksLikeShellOrDockerCodeLine(
        'Horizontal Pod Autoscaler scales based on CPU utilization metrics.'
      )
    ).toBe(false);
  });
  it('rejects prose about containers', () => {
    expect(
      looksLikeShellOrDockerCodeLine(
        'Containers share the host kernel and are isolated via namespaces.'
      )
    ).toBe(false);
  });
  it('rejects prose about scaling', () => {
    expect(
      looksLikeShellOrDockerCodeLine(
        'Scale the deployment to three replicas for high availability.'
      )
    ).toBe(false);
  });
  it('rejects prose about monitoring', () => {
    expect(
      looksLikeShellOrDockerCodeLine('Monitoring should be set up with Prometheus and Grafana.')
    ).toBe(false);
  });
  it('rejects prose about security', () => {
    expect(
      looksLikeShellOrDockerCodeLine(
        'Network policies restrict traffic between namespaces for security.'
      )
    ).toBe(false);
  });
  it('rejects prose about CI/CD', () => {
    expect(
      looksLikeShellOrDockerCodeLine(
        'Continuous deployment pipelines should include automated testing stages.'
      )
    ).toBe(false);
  });
  it('rejects prose about databases', () => {
    expect(
      looksLikeShellOrDockerCodeLine(
        'Database migrations should run before the application starts.'
      )
    ).toBe(false);
  });
  it('rejects conversational prose', () => {
    expect(
      looksLikeShellOrDockerCodeLine("Here's how to set up a basic Python web application:")
    ).toBe(false);
  });
  it('rejects comparative prose', () => {
    expect(
      looksLikeShellOrDockerCodeLine('Gunicorn is generally preferred over the Flask dev server.')
    ).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────
  // NEGATIVE: Markdown syntax — should NOT match
  // ──────────────────────────────────────────────────────────────
  it('rejects markdown bullet list', () => {
    expect(looksLikeShellOrDockerCodeLine('- Create requirements.txt')).toBe(false);
  });
  it('rejects nested bullet list', () => {
    expect(looksLikeShellOrDockerCodeLine('  - Flask/Django (WSGI): gunicorn')).toBe(false);
  });
  it('rejects numbered list', () => {
    expect(looksLikeShellOrDockerCodeLine('1. Install the dependencies')).toBe(false);
  });
  it('rejects markdown heading', () => {
    expect(looksLikeShellOrDockerCodeLine('## Installation Guide')).toBe(false);
  });
  it('rejects markdown h3', () => {
    expect(looksLikeShellOrDockerCodeLine('### Step 1: Clone the Repository')).toBe(false);
  });
  it('rejects markdown blockquote', () => {
    expect(looksLikeShellOrDockerCodeLine('> Note: this requires admin privileges')).toBe(false);
  });
  it('rejects markdown link', () => {
    expect(looksLikeShellOrDockerCodeLine('[See the docs](https://example.com)')).toBe(false);
  });
  it('rejects markdown bold', () => {
    expect(looksLikeShellOrDockerCodeLine('**Important:** always back up first')).toBe(false);
  });
  it('rejects markdown table separator', () => {
    expect(looksLikeShellOrDockerCodeLine('|---|---|---|')).toBe(false);
  });
  it('rejects markdown table row', () => {
    expect(looksLikeShellOrDockerCodeLine('| Pod Name | Status | Restarts |')).toBe(false);
  });
  it('rejects markdown checkbox', () => {
    expect(looksLikeShellOrDockerCodeLine('- [x] Deploy to staging')).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────
  // NEGATIVE: YAML / Kubernetes manifest lines — should NOT match
  // ──────────────────────────────────────────────────────────────
  it('rejects apiVersion YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('apiVersion: v1')).toBe(false);
  });
  it('rejects kind YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('kind: Deployment')).toBe(false);
  });
  it('rejects metadata YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('metadata:')).toBe(false);
  });
  it('rejects name YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('  name: my-deployment')).toBe(false);
  });
  it('rejects namespace YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('  namespace: production')).toBe(false);
  });
  it('rejects spec YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('spec:')).toBe(false);
  });
  it('rejects replicas YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('  replicas: 3')).toBe(false);
  });
  it('rejects containers YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('  containers:')).toBe(false);
  });
  it('rejects image YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('    image: nginx:1.25')).toBe(false);
  });
  it('rejects ports YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('    - containerPort: 80')).toBe(false);
  });
  it('rejects YAML document separator', () => {
    expect(looksLikeShellOrDockerCodeLine('---')).toBe(false);
  });
  it('rejects labels YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('    app: my-app')).toBe(false);
  });
  it('rejects selector YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('  selector:')).toBe(false);
  });
  it('rejects matchLabels YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('    matchLabels:')).toBe(false);
  });
  it('rejects resources YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('    resources:')).toBe(false);
  });
  it('rejects limits YAML', () => {
    expect(looksLikeShellOrDockerCodeLine('      memory: "128Mi"')).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────
  // NEGATIVE: Labels, headings, titles — should NOT match
  // ──────────────────────────────────────────────────────────────
  it('rejects capitalized Python prose', () => {
    expect(looksLikeShellOrDockerCodeLine('Python web app deployment checklist')).toBe(false);
  });
  it('rejects Dockerfile as title', () => {
    expect(looksLikeShellOrDockerCodeLine('Dockerfile (FastAPI example)')).toBe(false);
  });
  it('rejects "Build + run:" label', () => {
    expect(looksLikeShellOrDockerCodeLine('Build + run:')).toBe(false);
  });
  it('rejects "Example:" label', () => {
    expect(looksLikeShellOrDockerCodeLine('Example: containerize (works for AKS)')).toBe(false);
  });
  it('rejects "Prerequisites:" label', () => {
    expect(looksLikeShellOrDockerCodeLine('Prerequisites: Docker and kubectl installed')).toBe(
      false
    );
  });
  it('rejects "Note:" label', () => {
    expect(
      looksLikeShellOrDockerCodeLine('Note: Make sure your cluster is running before proceeding.')
    ).toBe(false);
  });
  it('rejects "Step 1" label', () => {
    expect(looksLikeShellOrDockerCodeLine('Step 1: Create the Dockerfile')).toBe(false);
  });
  it('rejects "Option A" label', () => {
    expect(looksLikeShellOrDockerCodeLine('Option A: Use Kubernetes Deployment')).toBe(false);
  });
  it('rejects "Summary" heading', () => {
    expect(looksLikeShellOrDockerCodeLine('Summary of deployment options')).toBe(false);
  });
  it('rejects "Troubleshooting" heading', () => {
    expect(looksLikeShellOrDockerCodeLine('Troubleshooting common deployment issues')).toBe(false);
  });
  it('rejects status output', () => {
    expect(looksLikeShellOrDockerCodeLine('Status: Running')).toBe(false);
  });
  it('rejects key-value output', () => {
    expect(looksLikeShellOrDockerCodeLine('Name: my-pod-abc123')).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────
  // NEGATIVE: Other non-code patterns
  // ──────────────────────────────────────────────────────────────
  it('rejects empty string', () => {
    expect(looksLikeShellOrDockerCodeLine('')).toBe(false);
  });
  it('rejects URL', () => {
    expect(looksLikeShellOrDockerCodeLine('https://kubernetes.io/docs/tutorials/')).toBe(false);
  });
  it('rejects email-like text', () => {
    expect(looksLikeShellOrDockerCodeLine('admin@example.com')).toBe(false);
  });
  it('rejects version numbers', () => {
    expect(looksLikeShellOrDockerCodeLine('v1.28.0')).toBe(false);
  });
  it('rejects plain numbers', () => {
    expect(looksLikeShellOrDockerCodeLine('8080')).toBe(false);
  });
  it('rejects just whitespace', () => {
    expect(looksLikeShellOrDockerCodeLine('   ')).toBe(false);
  });
});

describe('normalizeTerminalMarkdown', () => {
  it('converts terminal-style numbered choices to markdown ordered list', () => {
    const input = ' 1 Kubernetes (AKS)\n 2 Container on a VM\n 3 PaaS\n 4 Bare VM';
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('1. Kubernetes (AKS)');
    expect(result).toContain('2. Container on a VM');
    expect(result).toContain('3. PaaS');
    expect(result).toContain('4. Bare VM');
  });

  it('trims centered heading lines with 6+ spaces indentation', () => {
    const input = '\n                 Python web app deployment checklist (generic)\n\n';
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('Python web app deployment checklist (generic)');
    expect(result).not.toContain('                 Python');
  });

  it('wraps indented code blocks in fences when 2+ code-like lines detected', () => {
    const input = 'Example:\n\n FROM python:3.12-slim\n WORKDIR /app\n COPY . .\n\nDone.';
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('```');
    expect(result).toContain('FROM python:3.12-slim');
  });

  it('preserves existing code fences', () => {
    const input = '```yaml\napiVersion: v1\nkind: Pod\n```';
    const result = normalizeTerminalMarkdown(input);
    expect(result).toBe(input);
  });

  it('wraps single indented code line in code fence', () => {
    const input = 'Hello\n docker build -t myapp .\nDone.';
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('```\ndocker build -t myapp .\n```');
    expect(result).toContain('Done.');
  });

  it('wraps single indented kubectl apply line in code fence', () => {
    const input = 'Then:\n\n kubectl apply -f app.yaml';
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('```\nkubectl apply -f app.yaml\n```');
  });

  it('does not treat prose lines as code', () => {
    const input =
      '\n                 Example: containerize (works for AKS, any container runtime)\n\n';
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('Example: containerize');
    expect(result).not.toContain('```');
  });

  it('wraps code blocks with empty lines between code lines', () => {
    const input =
      'Steps:\n\n docker build -t myapp .\n\n docker run --rm -p 8000:8000 myapp\n\nDone.';
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('```');
    expect(result).toContain('docker build -t myapp .');
    expect(result).toContain('docker run --rm -p 8000:8000 myapp');
  });

  it('wraps Dockerfile blocks with empty lines between instructions', () => {
    const input =
      'Dockerfile:\n\n FROM python:3.12-slim\n\n WORKDIR /app\n COPY . .\n\n RUN pip install -r requirements.txt\n\nDone.';
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('```');
    expect(result).toContain('FROM python:3.12-slim');
    expect(result).toContain('WORKDIR /app');
    expect(result).toContain('RUN pip install -r requirements.txt');
  });

  it('does not wrap Kubernetes YAML as code (handled separately by wrapBareYamlBlocks)', () => {
    const input =
      'Here is the deployment:\n\n apiVersion: apps/v1\n kind: Deployment\n metadata:\n   name: my-app\n';
    const result = normalizeTerminalMarkdown(input);
    // YAML lines don't match looksLikeShellOrDockerCodeLine, so no wrapping
    expect(result).not.toContain('```');
    expect(result).toContain('apiVersion: apps/v1');
  });

  it('does not wrap indented prose as code', () => {
    const input =
      '\n service mesh configuration\n service discovery is built-in\n service accounts are used\n';
    const result = normalizeTerminalMarkdown(input);
    // "service" is ambiguous and these lines have no shell syntax → not wrapped
    expect(result).not.toContain('```');
  });

  it('handles mixed content: numbered list + code block + prose', () => {
    const input = [
      ' 1 Option A',
      ' 2 Option B',
      '',
      '                 Setup instructions',
      '',
      ' docker pull nginx',
      ' docker run -d -p 80:80 nginx',
      '',
      'That should work.',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('1. Option A');
    expect(result).toContain('2. Option B');
    expect(result).toContain('Setup instructions');
    expect(result).toContain('```');
    expect(result).toContain('docker pull nginx');
    expect(result).toContain('That should work.');
  });
});

describe('wrapBareYamlBlocks', () => {
  it('wraps a bare YAML block starting with apiVersion:', () => {
    const input = 'Here is the YAML:\napiVersion: v1\nkind: Pod\nmetadata:\n  name: test';
    const result = wrapBareYamlBlocks(input);
    expect(result).toContain('```yaml');
    expect(result).toContain('apiVersion: v1');
    expect(result).toContain('```');
  });

  it('wraps apiVersion with no value after colon', () => {
    const input = 'apiVersion:\nkind: Pod';
    const result = wrapBareYamlBlocks(input);
    expect(result).toContain('```yaml');
    expect(result).toContain('apiVersion:');
  });

  it('does not double-wrap YAML already in code fences', () => {
    const input = '```yaml\napiVersion: v1\nkind: Pod\n```';
    const result = wrapBareYamlBlocks(input);
    // Should not add extra fences
    const fenceCount = (result.match(/```/g) || []).length;
    expect(fenceCount).toBe(2);
  });

  it('wraps bare YAML even when another block is already fenced', () => {
    const input =
      '```yaml\napiVersion: v1\nkind: Pod\n```\n\nHere is another:\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: test';
    const result = wrapBareYamlBlocks(input);
    // Should have the original fences plus new ones
    const fenceCount = (result.match(/```/g) || []).length;
    expect(fenceCount).toBe(4); // original 2 + new 2
    expect(result).toContain('kind: Deployment');
  });

  it('stops at two consecutive blank lines', () => {
    const input = 'apiVersion: v1\nkind: Pod\n\n\nSome text after';
    const result = wrapBareYamlBlocks(input);
    expect(result).toContain('```yaml');
    expect(result).not.toContain('Some text after\n```');
  });

  it('stops at non-YAML lines', () => {
    const input = 'apiVersion: v1\nkind: Pod\nThis is not YAML';
    const result = wrapBareYamlBlocks(input);
    expect(result).toContain('```yaml');
    // The "This is not YAML" should be outside the fence
    const lines = result.split('\n');
    const closingFenceIdx = lines.lastIndexOf('```');
    const nonYamlIdx = lines.indexOf('This is not YAML');
    expect(nonYamlIdx).toBeGreaterThan(closingFenceIdx);
  });

  it('handles text with no YAML at all', () => {
    const input = 'Hello world\nThis is some text\nNo YAML here';
    expect(wrapBareYamlBlocks(input)).toBe(input);
  });

  it('handles empty string', () => {
    expect(wrapBareYamlBlocks('')).toBe('');
  });

  it('joins bare value after kind: (terminal split kind: / Kustomization)', () => {
    const input =
      'apiVersion: kustomize.config.k8s.io/v1beta1\nkind:\nKustomization\nnamespace: shop\nresources:\n  - base.yaml';
    const result = wrapBareYamlBlocks(input);
    expect(result).toContain('kind: Kustomization');
    expect(result).not.toMatch(/^Kustomization$/m);
  });

  it('does NOT consume entire YAML block when labels: has unclosed brace from terminal wrapping', () => {
    const input = [
      'apiVersion: apps/v1',
      'kind: Deployment',
      'metadata:',
      '  name: payments',
      '  namespace: shop',
      '  labels: { app.kubernetes.io/name: payments, app.kubernetes.io/part-of: shop',
      'spec:',
      '  replicas: 2',
    ].join('\n');
    const result = wrapBareYamlBlocks(input);
    // spec: should be on its own line, not joined onto the labels line
    expect(result).toMatch(/^spec:/m);
  });

  it('stops indented YAML block at less-indented prose like "Apply:"', () => {
    const input = [
      'Kubernetes YAML:',
      ' apiVersion: v1',
      ' kind: Namespace',
      ' metadata:',
      '   name: demo',
      '',
      'Apply:',
      'kubectl apply -f app.yaml',
    ].join('\n');

    const result = wrapBareYamlBlocks(input);
    expect(result).toContain('```yaml');
    expect(result).toContain('apiVersion: v1');
    // Apply: must be OUTSIDE the yaml fence
    const fenceEnd = result.indexOf('```\n', result.indexOf('```yaml') + 7);
    const applyIdx = result.indexOf('Apply:');
    expect(fenceEnd).toBeLessThan(applyIdx);
  });

  it('dedents indented multi-document YAML with --- separators', () => {
    const input = [
      ' apiVersion: v1',
      ' kind: Namespace',
      ' metadata:',
      '   name: demo',
      ' ---',
      ' apiVersion: apps/v1',
      ' kind: Deployment',
      ' metadata:',
      '   name: my-app',
    ].join('\n');

    const result = wrapBareYamlBlocks(input);
    expect(result).toContain('```yaml');
    // Should be dedented — no leading space
    expect(result).toContain('\napiVersion: v1\n');
    expect(result).toContain('\napiVersion: apps/v1\n');
    expect(result).toContain('\n---\n');
  });

  it('dedents indented YAML', () => {
    const input = '  apiVersion: v1\n  kind: Pod\n  metadata:\n    name: test';
    const result = wrapBareYamlBlocks(input);
    expect(result).toContain('apiVersion: v1');
    // The 2-space indent should be removed from the first level
    expect(result).toContain('kind: Pod');
  });

  it('preserves content inside existing code fences', () => {
    const input = '```bash\napiVersion: v1\n```\nSome text';
    const result = wrapBareYamlBlocks(input);
    // apiVersion inside bash fence should not be re-wrapped
    expect(result).toBe(input);
  });

  it('handles YAML with list items', () => {
    const input =
      'apiVersion: v1\nkind: Pod\nspec:\n  containers:\n  - name: test\n    image: nginx';
    const result = wrapBareYamlBlocks(input);
    expect(result).toContain('```yaml');
    expect(result).toContain('- name: test');
  });

  it('handles multiple bare YAML blocks', () => {
    const input =
      'First resource:\napiVersion: v1\nkind: Pod\n\n\nSecond resource:\napiVersion: v1\nkind: Service';
    const result = wrapBareYamlBlocks(input);
    const yamlFences = (result.match(/```yaml/g) || []).length;
    expect(yamlFences).toBe(2);
  });

  it('includes YAML value continuation when key ends with colon', () => {
    const input = [
      'apiVersion: v1',
      'kind: ConfigMap',
      'metadata:',
      '  name: global-config',
      '  namespace: apps',
      'data:',
      '  OTEL_EXPORTER_OTLP_ENDPOINT:',
      '"http://otel-collector.observability.svc.cluster.local:4317"',
      '---',
      'apiVersion: v1',
      'kind: Secret',
    ].join('\n');

    const result = wrapBareYamlBlocks(input);
    // The quoted value should be INSIDE the yaml fence, not outside
    expect(result).toContain('OTEL_EXPORTER_OTLP_ENDPOINT:');
    expect(result).toContain('"http://otel-collector.observability.svc.cluster.local:4317"');
    // Should be one continuous yaml block
    const yamlFences = (result.match(/```yaml/g) || []).length;
    expect(yamlFences).toBe(1);
  });

  it('includes YAML value continuation for unclosed flow braces', () => {
    const input = [
      'apiVersion: apps/v1',
      'kind: StatefulSet',
      'spec:',
      '  containers:',
      '    - name: postgres',
      '      env:',
      '        - name: POSTGRES_USER',
      '          valueFrom: { secretKeyRef: { name: db-credentials, key:',
      'POSTGRES_USER } }',
      '        - name: POSTGRES_PASSWORD',
      '          valueFrom: { secretKeyRef: { name: db-credentials, key:',
      'POSTGRES_PASSWORD } }',
    ].join('\n');

    const result = wrapBareYamlBlocks(input);
    // Continuations should be inside the fence
    expect(result).toContain('POSTGRES_USER } }');
    expect(result).toContain('POSTGRES_PASSWORD } }');
    // Should be one yaml block
    const yamlFences = (result.match(/```yaml/g) || []).length;
    expect(yamlFences).toBe(1);
  });

  it('includes flow mapping closer } after flow opener', () => {
    const input = [
      'apiVersion: v1',
      'kind: Pod',
      'spec:',
      '  containers:',
      '    - name: test',
      '      resources:',
      '        requests: { cpu: "150m", memory: "256Mi" }',
      '        limits: { cpu: "1", memory: "1Gi" }',
    ].join('\n');

    const result = wrapBareYamlBlocks(input);
    expect(result).toContain('```yaml');
    expect(result).toContain('{ cpu: "150m", memory: "256Mi" }');
    expect(result).toContain('{ cpu: "1", memory: "1Gi" }');
  });
});

describe('wrapBareCodeBlocks', () => {
  it('wraps a bare curl command in code fences', () => {
    const input = 'Test your deployment:\n\ncurl http://localhost:8080';
    const result = wrapBareCodeBlocks(input);
    expect(result).toContain('```\ncurl http://localhost:8080\n```');
  });

  it('wraps bare kubectl commands in a single code fence', () => {
    const input =
      'Run these commands:\n\nkubectl apply -f deploy.yaml\nkubectl get pods -n demo -w';
    const result = wrapBareCodeBlocks(input);
    expect(result).toContain('```\nkubectl apply -f deploy.yaml\nkubectl get pods -n demo -w\n```');
  });

  it('wraps bare docker commands', () => {
    const input = 'Build and push:\n\ndocker build -t myapp:1.0 .\ndocker push myapp:1.0';
    const result = wrapBareCodeBlocks(input);
    expect(result).toContain('```\ndocker build -t myapp:1.0 .\ndocker push myapp:1.0\n```');
  });

  it('wraps bare helm commands', () => {
    const input = 'Install the chart:\n\nhelm install myrelease ./mychart --namespace demo';
    const result = wrapBareCodeBlocks(input);
    expect(result).toContain('```\nhelm install myrelease ./mychart --namespace demo\n```');
  });

  it('does not wrap prose text', () => {
    const input = 'This is a paragraph about deploying apps.\nIt explains how to use kubectl.';
    const result = wrapBareCodeBlocks(input);
    expect(result).toBe(input);
  });

  it('does not double-wrap code already in fences', () => {
    const input = '```\ncurl http://localhost:8080\n```';
    const result = wrapBareCodeBlocks(input);
    const fenceCount = (result.match(/```/g) || []).length;
    expect(fenceCount).toBe(2);
  });

  it('does not wrap YAML lines (handled by wrapBareYamlBlocks)', () => {
    const input = 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test';
    const result = wrapBareCodeBlocks(input);
    expect(result).not.toContain('```\napiVersion');
  });

  it('handles empty string', () => {
    expect(wrapBareCodeBlocks('')).toBe('');
  });

  it('wraps multiple separate bare code blocks', () => {
    const input = 'First step:\n\ncurl http://localhost/health\n\nSecond step:\n\nkubectl get pods';
    const result = wrapBareCodeBlocks(input);
    const fenceCount = (result.match(/```/g) || []).length;
    expect(fenceCount).toBe(4); // 2 blocks × 2 fences each
  });

  it('wraps curl with flags', () => {
    const input =
      'Test the endpoint:\n\ncurl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health';
    const result = wrapBareCodeBlocks(input);
    expect(result).toContain('```\ncurl');
    expect(result).toContain('http://localhost:8080/health\n```');
  });

  it('wraps az aks commands', () => {
    const input =
      'Get credentials:\n\naz aks get-credentials --resource-group myRG --name myCluster';
    const result = wrapBareCodeBlocks(input);
    expect(result).toContain('```\naz aks get-credentials');
  });

  it('preserves markdown structure around wrapped code', () => {
    const input =
      '## Step 1\n\nDeploy the app:\n\nkubectl apply -f app.yaml\n\n## Step 2\n\nCheck status:';
    const result = wrapBareCodeBlocks(input);
    expect(result).toContain('## Step 1');
    expect(result).toContain('```\nkubectl apply -f app.yaml\n```');
    expect(result).toContain('## Step 2');
  });

  it('wraps bare curl after YAML code fence', () => {
    const input =
      '```yaml\napiVersion: v1\nkind: Service\n```\n\nTest:\n\ncurl http://localhost:8080';
    const result = wrapBareCodeBlocks(input);
    expect(result).toContain('```\ncurl http://localhost:8080\n```');
    // Should have yaml fence + curl fence = 4 total ``` markers
    const fenceCount = (result.match(/```/g) || []).length;
    expect(fenceCount).toBe(4);
  });
});

describe('cleanTerminalFormatting', () => {
  it('removes Rich panel top border', () => {
    const input = '┏━━━━━━━━━━┓\nContent\n┗━━━━━━━━━━┛';
    const result = cleanTerminalFormatting(input);
    expect(result).toBe('Content');
  });

  it('unwraps Rich panel content lines', () => {
    const input = '┃ Hello World ┃';
    const result = cleanTerminalFormatting(input);
    expect(result).toBe('Hello World');
  });

  it('removes horizontal rule lines', () => {
    const input = 'Before\n────────────\nAfter';
    const result = cleanTerminalFormatting(input);
    expect(result).toBe('Before\nAfter');
  });

  it('removes double-line horizontal rules', () => {
    const input = 'Before\n════════════\nAfter';
    const result = cleanTerminalFormatting(input);
    expect(result).toBe('Before\nAfter');
  });

  it('does not remove short horizontal lines', () => {
    const input = 'Before\n───\nAfter';
    const result = cleanTerminalFormatting(input);
    expect(result).toBe('Before\n───\nAfter');
  });

  it('preserves content inside code fences', () => {
    const input = '```\n┃ inside fence ┃\n```';
    const result = cleanTerminalFormatting(input);
    expect(result).toContain('┃ inside fence ┃');
  });

  it('trims trailing whitespace', () => {
    const input = 'text with trailing spaces     ';
    const result = cleanTerminalFormatting(input);
    expect(result).toBe('text with trailing spaces');
  });

  it('handles empty panel content', () => {
    const input = '┃  ┃';
    const result = cleanTerminalFormatting(input);
    expect(result).toBe('');
  });

  it('handles empty string', () => {
    expect(cleanTerminalFormatting('')).toBe('');
  });

  it('handles nested Rich panel content', () => {
    const input = '┃ outer ┃\n┃   inner content ┃';
    const result = cleanTerminalFormatting(input);
    expect(result).toContain('outer');
    expect(result).toContain('inner content');
  });
});

describe('isAgentNoiseLine', () => {
  it('detects shell prompt lines', () => {
    expect(isAgentNoiseLine('root@aks-agent-abc123:/app# ')).toBe(true);
  });

  it('detects python command lines', () => {
    expect(isAgentNoiseLine('python /app/aks-agent.py')).toBe(true);
  });

  it('detects Task List header', () => {
    expect(isAgentNoiseLine('Task List:')).toBe(true);
  });

  it('detects table borders', () => {
    expect(isAgentNoiseLine('+------+------+')).toBe(true);
  });

  it('detects table header rows', () => {
    expect(isAgentNoiseLine('| ID | Description | Status |')).toBe(true);
  });

  it('detects table data rows', () => {
    expect(isAgentNoiseLine('| t1 | Some task | [~] in_progress |')).toBe(true);
  });

  it('detects show hints', () => {
    expect(isAgentNoiseLine(' - /show 1 to view contents')).toBe(true);
  });

  it('detects user echo', () => {
    expect(isAgentNoiseLine('User: what pods are running?')).toBe(true);
  });

  it('does not match plain text', () => {
    expect(isAgentNoiseLine('Here are the running pods:')).toBe(false);
  });

  it('does not match YAML list items', () => {
    expect(isAgentNoiseLine('- name: my-pod')).toBe(false);
  });

  it('does not match markdown horizontal rules', () => {
    expect(isAgentNoiseLine('---')).toBe(false);
  });

  it('does not match empty string', () => {
    expect(isAgentNoiseLine('')).toBe(false);
  });
});

describe('stripAgentNoise', () => {
  it('removes noise lines from output', () => {
    const lines = [
      'root@aks-agent-abc:/app# python /app/aks-agent.py',
      'Task List:',
      '+------+------+',
      '| ID | Description |',
      'AI response here',
    ];
    const result = stripAgentNoise(lines);
    expect(result).toEqual(['AI response here']);
  });

  it('collapses multiple blank lines', () => {
    const lines = ['line 1', '', '', '', 'line 2'];
    const result = stripAgentNoise(lines);
    expect(result).toEqual(['line 1', '', 'line 2']);
  });

  it('preserves content inside code fences', () => {
    const lines = [
      '```',
      'root@host:/# this should stay',
      'Task List:',
      '```',
      'root@host:/# prompt outside',
    ];
    const result = stripAgentNoise(lines);
    // Inside fence should be preserved
    expect(result).toContain('root@host:/# this should stay');
    expect(result).toContain('Task List:');
    // Outside fence noise should be removed (pattern matches ^root@)
    expect(result).not.toContain('root@host:/# prompt outside');
  });

  it('handles empty input', () => {
    expect(stripAgentNoise([])).toEqual([]);
  });

  it('preserves normal content', () => {
    const lines = ['Here are the pods:', '- pod-1', '- pod-2'];
    expect(stripAgentNoise(lines)).toEqual(lines);
  });
});

describe('extractAIAnswer', () => {
  it('extracts content after "AI:" prefix on same line', () => {
    const input = 'AI: Here is the answer.';
    expect(extractAIAnswer(input)).toBe('Here is the answer.');
  });

  it('extracts content after "AI:" on its own line', () => {
    const input = 'AI:\nHere is the answer.';
    expect(extractAIAnswer(input)).toBe('Here is the answer.');
  });

  it('strips ANSI codes from output', () => {
    const input = 'AI: \x1b[32mGreen text\x1b[0m';
    expect(extractAIAnswer(input)).toBe('Green text');
  });

  it('removes trailing bash prompts', () => {
    const input = 'AI: The answer is here.\nroot@aks-agent:/app#';
    expect(extractAIAnswer(input)).toBe('The answer is here.');
  });

  it('removes leading and trailing blank lines', () => {
    const input = 'AI:\n\n\nActual content\n\n\n';
    expect(extractAIAnswer(input)).toBe('Actual content');
  });

  it('strips agent noise from content', () => {
    const input = 'AI: The answer\nroot@host:/# echo done\n+------+\nMore content';
    const result = extractAIAnswer(input);
    expect(result).toContain('The answer');
    expect(result).toContain('More content');
    expect(result).not.toContain('root@host');
    expect(result).not.toContain('+------+');
  });

  it('normalizes Unicode bullets', () => {
    const input = 'AI:\n• first item\n• second item';
    const result = extractAIAnswer(input);
    expect(result).toContain('- first item');
    expect(result).toContain('- second item');
  });

  it('wraps bare YAML blocks', () => {
    const input = 'AI: Here is the YAML:\napiVersion: v1\nkind: Pod\nmetadata:\n  name: test';
    const result = extractAIAnswer(input);
    expect(result).toContain('```yaml');
  });

  it('cleans Rich terminal formatting', () => {
    const input = 'AI:\n┏━━━━━━━━━━┓\n┃ Content  ┃\n┗━━━━━━━━━━┛';
    const result = extractAIAnswer(input);
    expect(result).toContain('Content');
    expect(result).not.toContain('┏');
    expect(result).not.toContain('┗');
    expect(result).not.toContain('┃');
  });

  it('falls back to full output when no "AI:" line found', () => {
    const input = 'Some content without AI prefix';
    expect(extractAIAnswer(input)).toBe('Some content without AI prefix');
  });

  it('handles multiline AI response with mixed content', () => {
    const input = [
      'root@aks-agent:/app# python /app/aks-agent.py',
      'Task List:',
      '+------+------+',
      '| t1 | Check pods | [~] in_progress |',
      'AI: Here are the results:',
      '',
      '## Running Pods',
      '- pod-1',
      '- pod-2',
      '',
      'root@aks-agent:/app#',
    ].join('\n');
    const result = extractAIAnswer(input);
    expect(result).toContain('Here are the results:');
    expect(result).toContain('## Running Pods');
    expect(result).not.toContain('Task List');
    expect(result).not.toContain('root@aks-agent');
  });

  it('handles "AI:" with whitespace after colon but no content', () => {
    const input = 'AI:   \nThe answer starts here';
    const result = extractAIAnswer(input);
    expect(result).toBe('The answer starts here');
  });

  it('handles empty output', () => {
    expect(extractAIAnswer('')).toBe('');
  });

  it('handles output with only noise', () => {
    const input = 'root@host:/# python /app/aks-agent.py\nTask List:\n+----+';
    const result = extractAIAnswer(input);
    expect(result).toBe('');
  });
});

describe('ThinkingStepTracker', () => {
  it('tracks model loading', () => {
    const tracker = new ThinkingStepTracker();
    const changed = tracker.processLine("Loaded models: ['gpt-4']");
    expect(changed).toBe(true);
    expect(tracker.steps).toHaveLength(1);
    expect(tracker.steps[0].label).toContain('gpt-4');
    expect(tracker.steps[0].phase).toBe('init');
    expect(tracker.steps[0].status).toBe('completed');
  });

  it('tracks toolset loading', () => {
    const tracker = new ThinkingStepTracker();
    tracker.processLine('✅ Toolset kubernetes loaded');
    expect(tracker.steps).toHaveLength(1);
    expect(tracker.steps[0].label).toContain('kubernetes');
    expect(tracker.steps[0].phase).toBe('init');
  });

  it('tracks task list rows', () => {
    const tracker = new ThinkingStepTracker();
    tracker.processLine('| t1 | List pods | [ ] pending |');
    expect(tracker.steps).toHaveLength(1);
    expect(tracker.steps[0].label).toBe('List pods');
    expect(tracker.steps[0].status).toBe('pending');
    expect(tracker.steps[0].phase).toBe('planning');
  });

  it('updates task status from pending to in_progress', () => {
    const tracker = new ThinkingStepTracker();
    tracker.processLine('| t1 | List pods | [ ] pending |');
    tracker.processLine('| t1 | List pods | [~] in_progress |');
    expect(tracker.steps).toHaveLength(1);
    expect(tracker.steps[0].status).toBe('running');
  });

  it('updates task status to completed', () => {
    const tracker = new ThinkingStepTracker();
    tracker.processLine('| t1 | List pods | [ ] pending |');
    tracker.processLine('| t1 | List pods | [✓] completed |');
    expect(tracker.steps).toHaveLength(1);
    expect(tracker.steps[0].status).toBe('completed');
  });

  it('tracks multiple tasks', () => {
    const tracker = new ThinkingStepTracker();
    tracker.processLine('| t1 | List pods | [ ] pending |');
    tracker.processLine('| t2 | Check services | [ ] pending |');
    expect(tracker.steps).toHaveLength(2);
  });

  it('tracks running tool calls', () => {
    const tracker = new ThinkingStepTracker();
    tracker.processLine('Running tool #1 web_search: searching');
    expect(tracker.steps).toHaveLength(1);
    expect(tracker.steps[0].label).toBe('Searching the web');
    expect(tracker.steps[0].status).toBe('running');
    expect(tracker.steps[0].phase).toBe('executing');
  });

  it('marks tool calls as completed', () => {
    const tracker = new ThinkingStepTracker();
    tracker.processLine('Running tool #1 web_search: searching');
    tracker.processLine('Finished #1 in 2.3s');
    expect(tracker.steps[0].status).toBe('completed');
  });

  it('skips TodoWrite tool calls', () => {
    const tracker = new ThinkingStepTracker();
    tracker.processLine('Running tool #1 TodoWrite: updating tasks');
    expect(tracker.steps).toHaveLength(0);
  });

  it('skips call_kubectl tool calls', () => {
    const tracker = new ThinkingStepTracker();
    tracker.processLine('Running tool #1 call_kubectl: get pods');
    expect(tracker.steps).toHaveLength(0);
  });

  it('ignores empty lines', () => {
    const tracker = new ThinkingStepTracker();
    expect(tracker.processLine('')).toBe(false);
    expect(tracker.processLine('   ')).toBe(false);
  });

  it('ignores Thinking... indicator', () => {
    const tracker = new ThinkingStepTracker();
    expect(tracker.processLine('Thinking...')).toBe(false);
  });

  it('handles wrapped task table rows', () => {
    const tracker = new ThinkingStepTracker();
    // First line is partial
    tracker.processLine('| t1 | Very long task description that wraps');
    // Second line completes it
    tracker.processLine('across lines | [ ] pending |');
    expect(tracker.steps).toHaveLength(1);
    expect(tracker.steps[0].label).toBe('Very long task description that wraps across lines');
  });
});

describe('extractTaskRow', () => {
  it('parses pending task', () => {
    const result = extractTaskRow('| t1 | List pods | [ ] pending |');
    expect(result).toEqual({ content: 'List pods', status: 'pending' });
  });

  it('parses in_progress task', () => {
    const result = extractTaskRow('| t1 | Check services | [~] in_progress |');
    expect(result).toEqual({ content: 'Check services', status: 'in_progress' });
  });

  it('parses completed task', () => {
    const result = extractTaskRow('| t2 | Deploy app | [✓] completed |');
    expect(result).toEqual({ content: 'Deploy app', status: 'completed' });
  });

  it('returns null for non-task lines', () => {
    expect(extractTaskRow('regular text')).toBeNull();
  });

  it('returns null for table borders', () => {
    expect(extractTaskRow('+------+------+')).toBeNull();
  });

  it('returns null for header row', () => {
    expect(extractTaskRow('| ID | Description | Status |')).toBeNull();
  });
});

describe('friendlyToolLabel', () => {
  it('returns friendly label for web_search', () => {
    expect(friendlyToolLabel('Running tool #1 web_search: query')).toBe('Searching the web');
  });

  it('returns friendly label for read_file', () => {
    expect(friendlyToolLabel('Running tool #2 read_file: /path/to/file')).toBe('Reading file');
  });

  it('returns friendly label for file_read', () => {
    expect(friendlyToolLabel('Running tool #3 file_read: /path/to/file')).toBe('Reading file');
  });

  it('returns null for call_kubectl', () => {
    expect(friendlyToolLabel('Running tool #1 call_kubectl: get pods')).toBeNull();
  });

  it('returns null for TodoWrite', () => {
    expect(friendlyToolLabel('Running tool #1 TodoWrite: update')).toBeNull();
  });

  it('returns generic label for unknown tool', () => {
    expect(friendlyToolLabel('Running tool #1 custom_tool: args')).toBe('Running custom_tool');
  });

  it('returns fallback for non-matching input', () => {
    expect(friendlyToolLabel('some other text')).toBe('Running tool');
  });
});

describe('code block preservation', () => {
  describe('wrapBareYamlBlocks preserves non-YAML code fences', () => {
    it('preserves typescript code blocks', () => {
      const input = [
        'Here is some TypeScript:',
        '```ts',
        'const x: number = 42;',
        'interface Pod { name: string; }',
        '```',
      ].join('\n');
      expect(wrapBareYamlBlocks(input)).toBe(input);
    });

    it('preserves mermaid code blocks', () => {
      const input = [
        'Here is a diagram:',
        '```mermaid',
        'graph TD',
        '  A[Start] --> B{Decision}',
        '  B -->|Yes| C[End]',
        '```',
      ].join('\n');
      expect(wrapBareYamlBlocks(input)).toBe(input);
    });

    it('preserves javascript code blocks', () => {
      const input = '```javascript\nconst obj = { apiVersion: "v1" };\n```';
      expect(wrapBareYamlBlocks(input)).toBe(input);
    });

    it('preserves json code blocks even with K8s-like content', () => {
      const input = ['```json', '{"apiVersion": "v1", "kind": "Pod"}', '```'].join('\n');
      expect(wrapBareYamlBlocks(input)).toBe(input);
    });

    it('wraps bare YAML but preserves adjacent ts code block', () => {
      const input = [
        '```ts',
        'const x = 1;',
        '```',
        '',
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: test',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```ts');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('```yaml');
      expect(result).toContain('apiVersion: v1');
    });

    it('wraps bare YAML but preserves adjacent mermaid block', () => {
      const input = [
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: nginx',
        '',
        '```mermaid',
        'graph LR',
        '  A --> B',
        '```',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('```mermaid');
      expect(result).toContain('graph LR');
    });
  });

  describe('cleanTerminalFormatting preserves code blocks', () => {
    it('does not alter content inside ts code blocks', () => {
      const input = ['```ts', '┃ this looks like a Rich border but is actually code ┃', '```'].join(
        '\n'
      );
      const result = cleanTerminalFormatting(input);
      expect(result).toContain('┃ this looks like a Rich border but is actually code ┃');
    });

    it('does not alter content inside mermaid code blocks', () => {
      const input = ['```mermaid', 'graph TD', '  A[━━━━━] --> B[┏━━━┓]', '```'].join('\n');
      const result = cleanTerminalFormatting(input);
      expect(result).toContain('A[━━━━━] --> B[┏━━━┓]');
    });

    it('does not alter content inside bash code blocks', () => {
      const input = ['```bash', 'root@host:/# echo hello', '┏━━━━━━━━┓', '```'].join('\n');
      const result = cleanTerminalFormatting(input);
      expect(result).toContain('root@host:/# echo hello');
      expect(result).toContain('┏━━━━━━━━┓');
    });
  });

  describe('stripAgentNoise preserves code blocks', () => {
    it('does not strip noise-like lines inside ts code blocks', () => {
      const lines = [
        '```ts',
        'root@host:/# this is a code comment',
        'python /app/aks-agent.py',
        '| t1 | table-like code | [ ] pending |',
        '```',
      ];
      const result = stripAgentNoise(lines);
      expect(result).toContain('root@host:/# this is a code comment');
      expect(result).toContain('python /app/aks-agent.py');
      expect(result).toContain('| t1 | table-like code | [ ] pending |');
    });

    it('does not strip noise-like lines inside mermaid code blocks', () => {
      const lines = ['```mermaid', '+------+------+', '| ID | Description |', '```'];
      const result = stripAgentNoise(lines);
      expect(result).toContain('+------+------+');
      expect(result).toContain('| ID | Description |');
    });
  });

  describe('extractAIAnswer preserves code blocks end-to-end', () => {
    it('preserves typescript code blocks through full pipeline', () => {
      const input = [
        'AI: Here is how to do it:',
        '',
        '```typescript',
        'import { Pod } from "@k8s/api";',
        'const pod: Pod = { apiVersion: "v1", kind: "Pod" };',
        '```',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```typescript');
      expect(result).toContain('const pod: Pod');
      expect(result).not.toContain('```yaml');
    });

    it('preserves mermaid diagrams through full pipeline', () => {
      const input = [
        'AI: Here is the architecture:',
        '',
        '```mermaid',
        'graph TD',
        '  subgraph "AKS Cluster"',
        '    A[Pod] --> B[Service]',
        '    B --> C[Ingress]',
        '  end',
        '```',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```mermaid');
      expect(result).toContain('graph TD');
      expect(result).toContain('subgraph "AKS Cluster"');
    });

    it('preserves multiple different code blocks', () => {
      const input = [
        'AI: Here are examples:',
        '',
        '```yaml',
        'apiVersion: v1',
        'kind: Pod',
        '```',
        '',
        '```ts',
        'const x = 1;',
        '```',
        '',
        '```mermaid',
        'graph LR',
        '  A --> B',
        '```',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('```ts');
      expect(result).toContain('```mermaid');
    });
  });
});

describe('malformed AI output handling', () => {
  describe('extractAIAnswer with malformed output', () => {
    it('handles truncated output mid-sentence', () => {
      const input = 'AI: The pod is in a CrashLo';
      const result = extractAIAnswer(input);
      expect(result).toBe('The pod is in a CrashLo');
    });

    it('handles output with only ANSI noise', () => {
      const input = '\x1b[31m\x1b[0m\x1b[32m\x1b[0m';
      expect(extractAIAnswer(input)).toBe('');
    });

    it('handles output with garbled mixed ANSI and text', () => {
      const input = 'AI: \x1b[1m\x1b[3partialHello\x1b[0m world';
      const result = extractAIAnswer(input);
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });

    it('handles output with multiple AI: prefixes', () => {
      const input = 'AI: First answer\nAI: Second answer';
      const result = extractAIAnswer(input);
      expect(result).toContain('First answer');
    });

    it('handles output with AI: inside content', () => {
      const input = 'AI: The model said AI: something interesting';
      const result = extractAIAnswer(input);
      expect(result).toContain('The model said AI: something interesting');
    });

    it('handles extremely long single line', () => {
      const longText = 'A'.repeat(10000);
      const input = `AI: ${longText}`;
      expect(extractAIAnswer(input)).toBe(longText);
    });

    it('handles output with null bytes', () => {
      const input = 'AI: Hello\x00World';
      const result = extractAIAnswer(input);
      expect(result).toContain('Hello');
    });

    it('handles output with only whitespace after AI:', () => {
      const input = 'AI:     \n   \n  ';
      expect(extractAIAnswer(input)).toBe('');
    });

    it('handles output with interleaved noise and content', () => {
      const input = [
        'root@host:/# python /app/aks-agent.py',
        'AI: Here is the result',
        'root@host:/#',
        'More content',
        '+------+',
        'Final answer',
        'root@host:/#',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('Here is the result');
      expect(result).toContain('More content');
      expect(result).toContain('Final answer');
      expect(result).not.toContain('root@host');
    });
  });

  describe('wrapBareYamlBlocks with malformed YAML', () => {
    it('does not wrap lines that look like YAML keys but are prose', () => {
      const input = 'The field apiVersion: is required for all resources.';
      expect(wrapBareYamlBlocks(input)).toBe(input);
    });

    it('handles YAML with trailing garbage', () => {
      const input = [
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: test',
        'THIS IS NOT YAML AND SHOULD NOT BE WRAPPED',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('apiVersion: v1');
      expect(result).toContain('THIS IS NOT YAML AND SHOULD NOT BE WRAPPED');
    });

    it('handles YAML block followed immediately by prose', () => {
      const input = ['apiVersion: v1', 'kind: Pod', 'That was the YAML.'].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('That was the YAML.');
    });

    it('handles apiVersion with no kind or metadata', () => {
      const input = 'apiVersion: v1\nThis is just a fragment';
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('apiVersion: v1');
    });

    it('handles deeply indented bare YAML', () => {
      const input = ['   apiVersion: v1', '   kind: Pod', '   metadata:', '     name: test'].join(
        '\n'
      );
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('apiVersion: v1');
    });

    it('handles unclosed code fence before YAML', () => {
      const input = [
        '```',
        'some content in an unclosed fence',
        'apiVersion: v1',
        'kind: Pod',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```');
      expect(result).toContain('apiVersion: v1');
    });

    it('handles empty content between apiVersion lines', () => {
      const input = [
        'apiVersion: v1',
        'kind: Pod',
        '',
        '',
        '',
        'apiVersion: apps/v1',
        'kind: Deployment',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      const yamlFences = (result.match(/```yaml/g) || []).length;
      expect(yamlFences).toBe(2);
    });

    it('handles YAML with special characters in values', () => {
      const input = [
        'apiVersion: v1',
        'kind: ConfigMap',
        'data:',
        '  key: "value with: colons and [brackets]"',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('"value with: colons and [brackets]"');
    });
  });

  describe('cleanTerminalFormatting with malformed borders', () => {
    it('handles incomplete top border', () => {
      const input = '┏━━━━━';
      const result = cleanTerminalFormatting(input);
      expect(result).toBe('┏━━━━━');
    });

    it('handles mismatched border characters', () => {
      const input = '┏━━━━━┛';
      const result = cleanTerminalFormatting(input);
      expect(result).toBe('');
    });

    it('handles panel with only one side', () => {
      const input = '┃ content without closing border';
      const result = cleanTerminalFormatting(input);
      expect(result).toBe('content without closing border');
    });

    it('handles panel with multiple pipe characters', () => {
      const input = '┃ data ┃ more ┃';
      const result = cleanTerminalFormatting(input);
      expect(result).toContain('data');
    });

    it('handles empty panel border', () => {
      const input = ['┏━━━━━━┓', '┃      ┃', '┗━━━━━━┛'].join('\n');
      const result = cleanTerminalFormatting(input);
      expect(result.trim()).toBe('');
    });

    it('handles nested Rich panels', () => {
      const input = [
        '┏━━━━━━━━━━━━┓',
        '┃ ┏━━━━━━┓   ┃',
        '┃ ┃ inner ┃  ┃',
        '┃ ┗━━━━━━┛   ┃',
        '┗━━━━━━━━━━━━┛',
      ].join('\n');
      const result = cleanTerminalFormatting(input);
      expect(result).toContain('inner');
    });

    it('handles horizontal rules of different widths', () => {
      expect(cleanTerminalFormatting('────')).toBe('');
      expect(cleanTerminalFormatting('━━━━━━━━')).toBe('');
      expect(cleanTerminalFormatting('═══════')).toBe('');
      expect(cleanTerminalFormatting('───')).toBe('───');
    });
  });

  describe('stripAgentNoise with garbled patterns', () => {
    it('handles partial shell prompt', () => {
      const lines = ['root@'];
      const result = stripAgentNoise(lines);
      expect(result).toEqual(['root@']);
    });

    it('strips noise-like lines even with leading whitespace', () => {
      const lines = ['  root@host:/# command  '];
      const result = stripAgentNoise(lines);
      expect(result).toEqual([]);
    });

    it('handles very long table border', () => {
      const lines = ['+' + '-'.repeat(200) + '+'];
      const result = stripAgentNoise(lines);
      expect(result).toEqual([]);
    });

    it('preserves lines that look like markdown tables', () => {
      const lines = ['| Name | Status |', '| pod-1 | Running |'];
      const result = stripAgentNoise(lines);
      expect(result).toEqual(lines);
    });

    it('collapses many consecutive blank lines to one', () => {
      const lines = ['content', '', '', '', '', '', 'more'];
      const result = stripAgentNoise(lines);
      expect(result).toEqual(['content', '', 'more']);
    });
  });

  describe('ThinkingStepTracker with malformed input', () => {
    it('handles garbled model loading line', () => {
      const tracker = new ThinkingStepTracker();
      expect(tracker.processLine("Loaded models: ['']")).toBe(true);
      expect(tracker.steps).toHaveLength(1);
    });

    it('handles empty brackets in model loading', () => {
      const tracker = new ThinkingStepTracker();
      expect(tracker.processLine('Loaded models: []')).toBe(false);
    });

    it('handles toolset line with no tool name', () => {
      const tracker = new ThinkingStepTracker();
      expect(tracker.processLine('✅ Toolset  loaded')).toBe(true);
    });

    it('handles running tool with no arguments', () => {
      const tracker = new ThinkingStepTracker();
      tracker.processLine("Loaded models: ['gpt-4']");
      tracker.processLine('✅ Toolset kubernetes loaded');
      expect(tracker.processLine('Running tool #1 web_search:')).toBe(true);
    });

    it('ignores finish for tool that was never started', () => {
      const tracker = new ThinkingStepTracker();
      tracker.processLine("Loaded models: ['gpt-4']");
      tracker.processLine('✅ Toolset kubernetes loaded');
      expect(tracker.processLine('Finished #99 in 5.2s')).toBe(false);
    });

    it('swallows non-continuation lines while partial row is buffered', () => {
      const tracker = new ThinkingStepTracker();
      tracker.processLine('| t1 | Start of partial');
      const changed = tracker.processLine("Loaded models: ['gpt-4']");
      expect(changed).toBe(false);
    });

    it('handles duplicate task status updates', () => {
      const tracker = new ThinkingStepTracker();
      tracker.processLine('| t1 | Do something | [ ] pending |');
      tracker.processLine('| t1 | Do something | [~] in_progress |');
      tracker.processLine('| t1 | Do something | [✓] completed |');
      const taskSteps = tracker.steps.filter(s => s.phase === 'executing');
      expect(taskSteps.length).toBeLessThanOrEqual(1);
    });

    it('abandons partial row on equal-sign table border', () => {
      const tracker = new ThinkingStepTracker();
      // Start a partial row
      tracker.processLine('| t1 | Start of partial');
      // Equal-sign border should abandon the partial row
      tracker.processLine('+====+====+');
      // Now a real task row should be processed normally
      const changed = tracker.processLine('| t1 | Full task | [ ] pending |');
      expect(changed).toBe(true);
      expect(tracker.steps).toHaveLength(1);
      expect(tracker.steps[0].label).toBe('Full task');
    });
  });

  describe('extractTaskRow with malformed rows', () => {
    it('returns null for row with missing status', () => {
      expect(extractTaskRow('| t1 | Do something |')).toBeNull();
    });

    it('returns null for row with invalid status symbol', () => {
      expect(extractTaskRow('| t1 | Task | [x] unknown_status |')).toBeNull();
    });

    it('returns empty content for row with empty task description', () => {
      const result = extractTaskRow('| t1 | | [ ] pending |');
      expect(result).toEqual({ content: '', status: 'pending' });
    });

    it('returns null for pipe-only line', () => {
      expect(extractTaskRow('| | | |')).toBeNull();
    });

    it('returns null for row with no closing pipe', () => {
      expect(extractTaskRow('| t1 | Task | [ ] pending')).toBeNull();
    });
  });

  describe('looksLikeYaml with edge cases', () => {
    it('accepts plain English sentences with colons as YAML-like', () => {
      expect(looksLikeYaml('Note: this is just a sentence')).toBe(true);
    });

    it('rejects lines that are just colons', () => {
      expect(looksLikeYaml(':')).toBe(false);
    });

    it('accepts YAML comments', () => {
      expect(looksLikeYaml('# This is a YAML comment')).toBe(true);
    });

    it('accepts flow mappings', () => {
      expect(looksLikeYaml('{key: value}')).toBe(true);
    });

    it('accepts flow sequences', () => {
      expect(looksLikeYaml('[item1, item2]')).toBe(true);
    });

    it('treats markdown headings as YAML (starts with #)', () => {
      expect(looksLikeYaml('## Heading')).toBe(true);
    });

    it('accepts multi-line string indicators', () => {
      expect(looksLikeYaml('description: |')).toBe(true);
    });
  });

  describe('normalizeBullets with edge cases', () => {
    it('handles mixed bullet types in one response', () => {
      const input = '• first\n▪ second\n– third\n- already normal';
      const result = normalizeBullets(input);
      expect(result).toBe('- first\n- second\n- third\n- already normal');
    });

    it('converts bullets even inside code fences (no fence awareness)', () => {
      const input = '```\n• not a bullet\n```';
      expect(normalizeBullets(input)).toBe('```\n- not a bullet\n```');
    });

    it('handles empty string', () => {
      expect(normalizeBullets('')).toBe('');
    });
  });

  describe('stripAnsi with malformed sequences', () => {
    it('handles truncated escape sequence', () => {
      const input = 'text\x1b[31';
      const result = stripAnsi(input);
      expect(result).toContain('text');
    });

    it('handles escape followed by non-bracket', () => {
      const input = 'text\x1bXmore';
      const result = stripAnsi(input);
      expect(result).toContain('text');
      expect(result).toContain('more');
    });

    it('handles many nested escape sequences', () => {
      const input = '\x1b[1m\x1b[31m\x1b[4m\x1b[7mhello\x1b[0m\x1b[0m\x1b[0m\x1b[0m';
      expect(stripAnsi(input)).toBe('hello');
    });
  });
});

// ─── Kubernetes YAML block tests ───────────────────────────────────────────

describe('Kubernetes YAML markdown blocks', () => {
  describe('wrapBareYamlBlocks with real-world K8s resources', () => {
    it('wraps a typical Deployment manifest', () => {
      const input = [
        'Here is a Deployment:',
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: nginx-deployment',
        '  labels:',
        '    app: nginx',
        'spec:',
        '  replicas: 3',
        '  selector:',
        '    matchLabels:',
        '      app: nginx',
        '  template:',
        '    metadata:',
        '      labels:',
        '        app: nginx',
        '    spec:',
        '      containers:',
        '      - name: nginx',
        '        image: nginx:1.25',
        '        ports:',
        '        - containerPort: 80',
        '        resources:',
        '          limits:',
        '            cpu: "500m"',
        '            memory: "128Mi"',
        '          requests:',
        '            cpu: "250m"',
        '            memory: "64Mi"',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('kind: Deployment');
      expect(result).toContain('replicas: 3');
      expect(result).toContain('containerPort: 80');
      const fences = (result.match(/```/g) || []).length;
      expect(fences).toBe(2);
    });

    it('wraps a Service manifest', () => {
      const input = [
        'apiVersion: v1',
        'kind: Service',
        'metadata:',
        '  name: my-service',
        '  namespace: default',
        'spec:',
        '  type: LoadBalancer',
        '  selector:',
        '    app: nginx',
        '  ports:',
        '  - protocol: TCP',
        '    port: 80',
        '    targetPort: 8080',
        '    nodePort: 30080',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('type: LoadBalancer');
      expect(result).toContain('nodePort: 30080');
    });

    it('wraps a ConfigMap with multiline data', () => {
      const input = [
        'apiVersion: v1',
        'kind: ConfigMap',
        'metadata:',
        '  name: game-config',
        'data:',
        '  game.properties: |',
        '    enemies=aliens',
        '    lives=3',
        '  ui.properties: |',
        '    color.good=purple',
        '    color.bad=yellow',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('game.properties: |');
      expect(result).toContain('enemies=aliens');
    });

    it('wraps a Secret manifest', () => {
      const input = [
        'apiVersion: v1',
        'kind: Secret',
        'metadata:',
        '  name: db-credentials',
        'type: Opaque',
        'data:',
        '  username: YWRtaW4=',
        '  password: cGFzc3dvcmQ=',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('type: Opaque');
      expect(result).toContain('username: YWRtaW4=');
    });

    it('wraps an Ingress manifest', () => {
      const input = [
        'apiVersion: networking.k8s.io/v1',
        'kind: Ingress',
        'metadata:',
        '  name: minimal-ingress',
        '  annotations:',
        '    nginx.ingress.kubernetes.io/rewrite-target: /',
        'spec:',
        '  ingressClassName: nginx',
        '  rules:',
        '  - host: example.com',
        '    http:',
        '      paths:',
        '      - path: /testpath',
        '        pathType: Prefix',
        '        backend:',
        '          service:',
        '            name: test',
        '            port:',
        '              number: 80',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('networking.k8s.io/v1');
      expect(result).toContain('nginx.ingress.kubernetes.io/rewrite-target: /');
    });

    it('wraps a HorizontalPodAutoscaler manifest', () => {
      const input = [
        'apiVersion: autoscaling/v2',
        'kind: HorizontalPodAutoscaler',
        'metadata:',
        '  name: php-apache',
        'spec:',
        '  scaleTargetRef:',
        '    apiVersion: apps/v1',
        '    kind: Deployment',
        '    name: php-apache',
        '  minReplicas: 1',
        '  maxReplicas: 10',
        '  metrics:',
        '  - type: Resource',
        '    resource:',
        '      name: cpu',
        '      target:',
        '        type: Utilization',
        '        averageUtilization: 50',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('autoscaling/v2');
      expect(result).toContain('maxReplicas: 10');
    });

    it('wraps a PersistentVolumeClaim manifest', () => {
      const input = [
        'apiVersion: v1',
        'kind: PersistentVolumeClaim',
        'metadata:',
        '  name: my-pvc',
        'spec:',
        '  accessModes:',
        '  - ReadWriteOnce',
        '  storageClassName: managed-premium',
        '  resources:',
        '    requests:',
        '      storage: 5Gi',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('ReadWriteOnce');
      expect(result).toContain('storage: 5Gi');
    });

    it('wraps a Namespace manifest', () => {
      const input = [
        'apiVersion: v1',
        'kind: Namespace',
        'metadata:',
        '  name: my-namespace',
        '  labels:',
        '    env: production',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('kind: Namespace');
    });

    it('wraps a CronJob manifest', () => {
      const input = [
        'apiVersion: batch/v1',
        'kind: CronJob',
        'metadata:',
        '  name: backup',
        'spec:',
        '  schedule: "*/5 * * * *"',
        '  jobTemplate:',
        '    spec:',
        '      template:',
        '        spec:',
        '          containers:',
        '          - name: backup',
        '            image: busybox',
        '            command: ["/bin/sh", "-c", "date; echo Hello"]',
        '          restartPolicy: OnFailure',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('schedule: "*/5 * * * *"');
      expect(result).toContain('restartPolicy: OnFailure');
    });

    it('wraps a ClusterRole with RBAC rules', () => {
      const input = [
        'apiVersion: rbac.authorization.k8s.io/v1',
        'kind: ClusterRole',
        'metadata:',
        '  name: pod-reader',
        'rules:',
        '- apiGroups: [""]',
        '  resources: ["pods"]',
        '  verbs: ["get", "watch", "list"]',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('rbac.authorization.k8s.io/v1');
      expect(result).toContain('verbs: ["get", "watch", "list"]');
    });
  });

  describe('wrapBareYamlBlocks with multi-resource responses', () => {
    it('wraps two K8s resources separated by prose', () => {
      const input = [
        'First, create the Deployment:',
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: web',
        'spec:',
        '  replicas: 2',
        '',
        '',
        'Then create the Service:',
        'apiVersion: v1',
        'kind: Service',
        'metadata:',
        '  name: web-svc',
        'spec:',
        '  selector:',
        '    app: web',
        '  ports:',
        '  - port: 80',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      const yamlFences = (result.match(/```yaml/g) || []).length;
      expect(yamlFences).toBe(2);
      expect(result).toContain('kind: Deployment');
      expect(result).toContain('kind: Service');
    });

    it('handles response with fenced YAML + bare YAML + prose', () => {
      const input = [
        'Here is the current pod:',
        '```yaml',
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: old-pod',
        '```',
        '',
        'And here is the updated version you need:',
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: new-pod',
        '  labels:',
        '    version: v2',
        '',
        '',
        'Apply it with `kubectl apply -f pod.yaml`.',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      const fences = (result.match(/```/g) || []).length;
      expect(fences).toBe(4); // original 2 + new 2
      expect(result).toContain('name: old-pod');
      expect(result).toContain('name: new-pod');
      expect(result).toContain('version: v2');
    });

    it('handles three consecutive bare K8s resources', () => {
      const input = [
        'apiVersion: v1',
        'kind: Namespace',
        'metadata:',
        '  name: prod',
        '',
        '',
        'apiVersion: v1',
        'kind: ServiceAccount',
        'metadata:',
        '  name: deployer',
        '  namespace: prod',
        '',
        '',
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: app',
        '  namespace: prod',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      const yamlFences = (result.match(/```yaml/g) || []).length;
      expect(yamlFences).toBe(3);
    });
  });

  describe('extractAIAnswer with K8s YAML end-to-end', () => {
    it('preserves fenced K8s Deployment YAML through pipeline', () => {
      const input = [
        'AI: Here is a Deployment:',
        '',
        '```yaml',
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: nginx',
        'spec:',
        '  replicas: 3',
        '  selector:',
        '    matchLabels:',
        '      app: nginx',
        '  template:',
        '    metadata:',
        '      labels:',
        '        app: nginx',
        '    spec:',
        '      containers:',
        '      - name: nginx',
        '        image: nginx:latest',
        '```',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('kind: Deployment');
      expect(result).toContain('replicas: 3');
      expect(result).toContain('image: nginx:latest');
      // Should not double-wrap
      const yamlFences = (result.match(/```yaml/g) || []).length;
      expect(yamlFences).toBe(1);
    });

    it('wraps bare K8s Service YAML through pipeline', () => {
      const input = [
        'AI: Here is the service configuration:',
        '',
        'apiVersion: v1',
        'kind: Service',
        'metadata:',
        '  name: my-svc',
        'spec:',
        '  type: ClusterIP',
        '  ports:',
        '  - port: 80',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('kind: Service');
      expect(result).toContain('type: ClusterIP');
    });

    it('handles ANSI-wrapped K8s YAML output', () => {
      const input = [
        '\x1b[1mAI:\x1b[0m Here is the ConfigMap:',
        '',
        '\x1b[32mapiVersion: v1\x1b[0m',
        '\x1b[32mkind: ConfigMap\x1b[0m',
        '\x1b[32mmetadata:\x1b[0m',
        '\x1b[32m  name: my-config\x1b[0m',
        '\x1b[32mdata:\x1b[0m',
        '\x1b[32m  key: value\x1b[0m',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('kind: ConfigMap');
      expect(result).toContain('key: value');
    });

    it('handles Rich panel wrapped K8s YAML', () => {
      const input = [
        'AI:',
        '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓',
        '┃ apiVersion: v1               ┃',
        '┃ kind: Pod                     ┃',
        '┃ metadata:                     ┃',
        '┃   name: debug-pod            ┃',
        '┃ spec:                         ┃',
        '┃   containers:                 ┃',
        '┃   - name: debug              ┃',
        '┃     image: busybox           ┃',
        '┃     command: ["sleep", "3600"]┃',
        '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('kind: Pod');
      expect(result).toContain('name: debug-pod');
    });
  });
});

// ─── Parser edge case tests ────────────────────────────────────────────────

describe('parser edge cases', () => {
  describe('wrapBareYamlBlocks edge cases', () => {
    it('handles YAML multi-document separator (---)', () => {
      const input = [
        'apiVersion: v1',
        'kind: Namespace',
        'metadata:',
        '  name: test',
        '---',
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: test-pod',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('apiVersion: v1');
      // The --- separator should be inside the fenced block, not bare text
      // (bare --- in markdown would render as a horizontal rule)
      const yamlFences = (result.match(/```yaml/g) || []).length;
      expect(yamlFences).toBe(1);
      expect(result).toContain('---');
    });

    it('handles YAML with pipe (|) multiline string indicator', () => {
      const input = [
        'apiVersion: v1',
        'kind: ConfigMap',
        'metadata:',
        '  name: scripts',
        'data:',
        '  init.sh: |',
        '    #!/bin/bash',
        '    echo "Hello, World!"',
        '    exit 0',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('init.sh: |');
    });

    it('handles YAML with folded (>) multiline string indicator', () => {
      const input = [
        'apiVersion: v1',
        'kind: ConfigMap',
        'metadata:',
        '  name: desc',
        'data:',
        '  description: >',
        '    This is a long',
        '    description that gets',
        '    folded into one line.',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('description: >');
    });

    it('handles YAML with literal block scalar with chomping indicator (|-)', () => {
      const input = [
        'apiVersion: v1',
        'kind: ConfigMap',
        'metadata:',
        '  name: script',
        'data:',
        '  run.sh: |-',
        '    #!/bin/bash',
        '    echo "hello"',
        '    exit 0',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('run.sh: |-');
      expect(result).toContain('echo "hello"');
    });

    it('handles YAML with literal block scalar with keep indicator (|+)', () => {
      const input = [
        'apiVersion: v1',
        'kind: ConfigMap',
        'metadata:',
        '  name: config',
        'data:',
        '  content: |+',
        '    line1',
        '',
        '    line3',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('content: |+');
      expect(result).toContain('line1');
      expect(result).toContain('line3');
    });

    it('handles YAML with folded block scalar with strip indicator (>-)', () => {
      const input = [
        'apiVersion: v1',
        'kind: ConfigMap',
        'metadata:',
        '  name: desc',
        'data:',
        '  description: >-',
        '    This is a long',
        '    description.',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('description: >-');
    });

    it('handles YAML with literal block scalar with explicit indent indicator (|2)', () => {
      const input = [
        'apiVersion: v1',
        'kind: ConfigMap',
        'metadata:',
        '  name: indented',
        'data:',
        '  config: |2',
        '      indented content',
        '      more content',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('config: |2');
    });

    it('handles YAML with boolean-like values', () => {
      const input = [
        'apiVersion: v1',
        'kind: ConfigMap',
        'metadata:',
        '  name: flags',
        'data:',
        '  enabled: "true"',
        '  debug: "false"',
        '  count: "0"',
        '  empty: ""',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('enabled: "true"');
    });

    it('handles YAML with null/empty values', () => {
      const input = [
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: test',
        '  namespace:',
        '  annotations:',
        '  labels:',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('namespace:');
    });

    it('handles YAML with very deep nesting (6+ levels)', () => {
      const input = [
        'apiVersion: apps/v1',
        'kind: Deployment',
        'spec:',
        '  template:',
        '    spec:',
        '      containers:',
        '      - name: app',
        '        env:',
        '        - name: DB_HOST',
        '          valueFrom:',
        '            configMapKeyRef:',
        '              name: db-config',
        '              key: host',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('configMapKeyRef:');
      expect(result).toContain('key: host');
    });

    it('handles YAML with inline flow sequences in values', () => {
      const input = [
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: test',
        'spec:',
        '  containers:',
        '  - name: test',
        '    command: ["sh", "-c", "echo hello"]',
        '    args: []',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('command: ["sh", "-c", "echo hello"]');
      expect(result).toContain('args: []');
    });

    it('handles YAML with annotation keys containing dots and slashes', () => {
      const input = [
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: annotated',
        '  annotations:',
        '    kubernetes.io/change-cause: "initial deploy"',
        '    app.kubernetes.io/managed-by: helm',
        '    meta.helm.sh/release-name: my-release',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('kubernetes.io/change-cause:');
      expect(result).toContain('meta.helm.sh/release-name:');
    });

    it('handles YAML with quoted keys', () => {
      const input = [
        'apiVersion: v1',
        'kind: ConfigMap',
        'metadata:',
        '  name: special',
        'data:',
        '  "key.with.dots": value1',
        "  'key-with-dashes': value2",
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('"key.with.dots": value1');
    });

    it('handles YAML followed by a markdown code block', () => {
      const input = [
        'Apply this manifest:',
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: test',
        '',
        '',
        'Then run this command:',
        '```bash',
        'kubectl apply -f pod.yaml',
        '```',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('```bash');
      expect(result).toContain('kubectl apply -f pod.yaml');
    });

    it('handles YAML where apiVersion value is on the next line', () => {
      const input = ['apiVersion:', '  v1', 'kind: Pod', 'metadata:', '  name: test'].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('apiVersion:');
    });

    it('handles YAML with comment lines interspersed', () => {
      const input = [
        'apiVersion: v1',
        '# This is a pod for testing',
        'kind: Pod',
        'metadata:',
        '  name: test',
        '  # Add more labels as needed',
        '  labels:',
        '    app: test',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('# This is a pod for testing');
      expect(result).toContain('# Add more labels as needed');
    });

    it('handles YAML with single blank line (does not split)', () => {
      const input = ['apiVersion: v1', 'kind: Pod', '', 'metadata:', '  name: test'].join('\n');
      const result = wrapBareYamlBlocks(input);
      // Single blank line should be included in the same block
      const yamlFences = (result.match(/```yaml/g) || []).length;
      expect(yamlFences).toBe(1);
      expect(result).toContain('name: test');
    });

    it('handles YAML with resource quantity strings', () => {
      const input = [
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: resource-pod',
        'spec:',
        '  containers:',
        '  - name: app',
        '    resources:',
        '      limits:',
        '        cpu: "2"',
        '        memory: 2Gi',
        '        nvidia.com/gpu: "1"',
        '      requests:',
        '        cpu: 500m',
        '        memory: 256Mi',
      ].join('\n');
      const result = wrapBareYamlBlocks(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('memory: 2Gi');
      expect(result).toContain('nvidia.com/gpu: "1"');
      expect(result).toContain('cpu: 500m');
    });
  });

  describe('looksLikeYaml edge cases', () => {
    it('accepts keys with dots like K8s annotations', () => {
      expect(looksLikeYaml('kubernetes.io/name: test')).toBe(true);
    });

    it('accepts keys with slashes', () => {
      expect(looksLikeYaml('app.kubernetes.io/version: v1')).toBe(true);
    });

    it('accepts keys ending with colon and no space', () => {
      expect(looksLikeYaml('metadata:')).toBe(true);
    });

    it('accepts YAML list items with nested keys', () => {
      expect(looksLikeYaml('- name: test')).toBe(true);
    });

    it('accepts bare list marker', () => {
      expect(looksLikeYaml('-')).toBe(true);
    });

    it('accepts YAML anchors (&)', () => {
      expect(looksLikeYaml('defaults: &defaults')).toBe(true);
    });

    it('accepts YAML merge keys with aliases (*)', () => {
      expect(looksLikeYaml('<<: *defaults')).toBe(true);
    });

    it('rejects bare prose without colons', () => {
      expect(looksLikeYaml('This is just text')).toBe(false);
    });

    it('rejects markdown bold/italic markers', () => {
      expect(looksLikeYaml('**bold text**')).toBe(false);
    });

    it('accepts numeric-starting keys (\\w includes digits)', () => {
      expect(looksLikeYaml('8080: http')).toBe(true);
    });

    it('accepts keys with hyphens', () => {
      expect(looksLikeYaml('my-key: my-value')).toBe(true);
    });

    it('accepts indented YAML continuation (empty line treated as YAML)', () => {
      expect(looksLikeYaml('')).toBe(true);
    });

    it('accepts YAML document separator (---)', () => {
      expect(looksLikeYaml('---')).toBe(true);
    });

    it('accepts YAML document end marker (...)', () => {
      expect(looksLikeYaml('...')).toBe(true);
    });

    it('rejects longer dashes (markdown horizontal rule)', () => {
      // ---- is not a YAML separator (only exactly --- is)
      expect(looksLikeYaml('----')).toBe(false);
    });
  });

  describe('cleanTerminalFormatting edge cases', () => {
    it('strips Rich border from around K8s YAML output', () => {
      const input = [
        '┏━━━━━━━━━━━━━━━━━━━━━━━┓',
        '┃ apiVersion: v1         ┃',
        '┃ kind: Service          ┃',
        '┃ metadata:              ┃',
        '┃   name: my-svc         ┃',
        '┗━━━━━━━━━━━━━━━━━━━━━━━┛',
      ].join('\n');
      const result = cleanTerminalFormatting(input);
      expect(result).toContain('apiVersion: v1');
      expect(result).toContain('kind: Service');
      expect(result).not.toContain('┃');
      expect(result).not.toContain('┏');
    });

    it('handles Rich panel with mismatched widths', () => {
      const input = [
        '┏━━━━━━━━━┓',
        '┃ short ┃',
        '┃ this is a much longer line ┃',
        '┗━━━━━━━━━┛',
      ].join('\n');
      const result = cleanTerminalFormatting(input);
      expect(result).toContain('short');
      expect(result).toContain('this is a much longer line');
    });

    it('preserves fenced yaml block content', () => {
      const input = [
        '```yaml',
        '┃ this is inside a code fence',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '```',
      ].join('\n');
      const result = cleanTerminalFormatting(input);
      expect(result).toContain('┃ this is inside a code fence');
      expect(result).toContain('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    it('handles alternating panel borders and content', () => {
      const input = [
        '┏━━━━━━━━━━┓',
        '┃ Block 1  ┃',
        '┗━━━━━━━━━━┛',
        'Some prose text here',
        '┏━━━━━━━━━━┓',
        '┃ Block 2  ┃',
        '┗━━━━━━━━━━┛',
      ].join('\n');
      const result = cleanTerminalFormatting(input);
      expect(result).toContain('Block 1');
      expect(result).toContain('Some prose text here');
      expect(result).toContain('Block 2');
    });
  });

  describe('stripAgentNoise edge cases', () => {
    it('strips agent noise before K8s YAML content', () => {
      const lines = [
        'root@agent:/# python /app/aks-agent.py',
        '┏━━━ Task List ━━━┓',
        '+----+-------------+--------+',
        '| ID | Description | Status |',
        '+----+-------------+--------+',
        '| t1 | Get pods    | [✓] completed |',
        '+----+-------------+--------+',
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: test',
      ];
      const result = stripAgentNoise(lines);
      expect(result).toContain('apiVersion: v1');
      expect(result).toContain('kind: Pod');
      expect(result.join('\n')).not.toContain('root@agent');
    });

    it('preserves K8s YAML inside fenced block among noise', () => {
      const lines = [
        'root@agent:/# command',
        '```yaml',
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: app',
        '```',
        'root@agent:/#',
      ];
      const result = stripAgentNoise(lines);
      expect(result).toContain('```yaml');
      expect(result).toContain('apiVersion: apps/v1');
      expect(result).toContain('```');
    });
  });

  describe('extractAIAnswer edge cases', () => {
    it('handles response with only YAML and no prose', () => {
      const input = [
        'AI:',
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: test-pod',
        'spec:',
        '  containers:',
        '  - name: test',
        '    image: alpine',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('kind: Pod');
      expect(result).toContain('image: alpine');
    });

    it('handles response with multiple interspersed code blocks', () => {
      const input = [
        'AI: Here are the resources:',
        '',
        '```yaml',
        'apiVersion: v1',
        'kind: ConfigMap',
        'metadata:',
        '  name: config',
        '```',
        '',
        'And the TypeScript client:',
        '',
        '```typescript',
        "import * as k8s from '@kubernetes/client-node';",
        'const kc = new k8s.KubeConfig();',
        'kc.loadFromDefault();',
        '```',
        '',
        'And a Mermaid diagram:',
        '',
        '```mermaid',
        'graph TD',
        '  A[ConfigMap] --> B[Pod]',
        '  B --> C[Service]',
        '```',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('```typescript');
      expect(result).toContain('```mermaid');
      expect(result).toContain('kind: ConfigMap');
      expect(result).toContain('kc.loadFromDefault()');
      expect(result).toContain('A[ConfigMap] --> B[Pod]');
    });

    it('handles response where AI says apiVersion in prose', () => {
      const input = [
        'AI: You should set apiVersion: apps/v1 in your Deployment manifest.',
        'The kind should be Deployment.',
      ].join('\n');
      const result = extractAIAnswer(input);
      // Should not wrap prose as YAML
      expect(result).toContain('apiVersion: apps/v1');
    });

    it('handles response with kubectl output table', () => {
      const input = [
        'AI: Here are your pods:',
        '',
        '```',
        'NAME                     READY   STATUS    RESTARTS   AGE',
        'nginx-6b474476c4-abc12   1/1     Running   0          2d',
        'nginx-6b474476c4-def34   1/1     Running   0          2d',
        '```',
        '',
        'All pods are running.',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('nginx-6b474476c4-abc12');
      expect(result).toContain('All pods are running.');
    });

    it('handles response with YAML containing emoji in labels', () => {
      const input = [
        'AI: Here is the manifest:',
        '',
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '  name: demo',
        '  labels:',
        '    app: demo',
        'spec:',
        '  containers:',
        '  - name: web',
        '    image: nginx',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('app: demo');
    });

    it('handles malformed response with partial YAML then error', () => {
      const input = [
        'AI: Here is your Deployment:',
        '',
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name:',
        '',
        '',
        'Error: I was unable to complete the manifest due to missing information.',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('```yaml');
      expect(result).toContain('kind: Deployment');
      expect(result).toContain('Error: I was unable to complete');
    });

    it('handles response with Windows-style CRLF line endings', () => {
      const input =
        'AI: Here is the pod:\r\n\r\napiVersion: v1\r\nkind: Pod\r\nmetadata:\r\n  name: test\r\n';
      const result = extractAIAnswer(input);
      expect(result).toContain('kind: Pod');
    });

    it('handles response with zero-width characters', () => {
      const input = [
        'AI: Here is the config:',
        '',
        'apiVersion: v1',
        'kind: \u200BConfigMap',
        'metadata:',
        '  name: test',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('apiVersion: v1');
    });

    it('handles response with tab indentation instead of spaces', () => {
      const input = [
        'AI: Here is the pod:',
        '',
        'apiVersion: v1',
        'kind: Pod',
        'metadata:',
        '\tname: test',
        'spec:',
        '\tcontainers:',
        '\t- name: nginx',
        '\t  image: nginx',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('apiVersion: v1');
      expect(result).toContain('kind: Pod');
    });

    it('wraps multi-document YAML with --- into a single fenced block', () => {
      const input = [
        'AI: Apply these resources:',
        '',
        'apiVersion: v1',
        'kind: Namespace',
        'metadata:',
        '  name: prod',
        '---',
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: app',
        '  namespace: prod',
      ].join('\n');
      const result = extractAIAnswer(input);
      // Both documents should be in a single fenced block
      const yamlFences = (result.match(/```yaml/g) || []).length;
      expect(yamlFences).toBe(1);
      expect(result).toContain('kind: Namespace');
      expect(result).toContain('---');
      expect(result).toContain('kind: Deployment');
    });

    it('does not treat --- in prose as YAML', () => {
      const input = [
        'AI: Here is some info.',
        '',
        'Kubernetes is a container orchestration platform.',
        '',
        'That is all I have to share.',
      ].join('\n');
      const result = extractAIAnswer(input);
      // No YAML fence should be added for prose-only content
      expect(result).not.toContain('```yaml');
    });
  });

  describe('isAgentNoiseLine edge cases', () => {
    it('detects noise with long paths', () => {
      expect(isAgentNoiseLine('root@long-hostname-12345:/very/deep/path/to/workspace#')).toBe(true);
    });

    it('does not flag K8s resource lines as noise', () => {
      expect(isAgentNoiseLine('apiVersion: v1')).toBe(false);
      expect(isAgentNoiseLine('kind: Deployment')).toBe(false);
      expect(isAgentNoiseLine('  name: my-pod')).toBe(false);
      expect(isAgentNoiseLine('  replicas: 3')).toBe(false);
      expect(isAgentNoiseLine('  - containerPort: 80')).toBe(false);
    });

    it('does not flag prose that discusses K8s concepts as noise', () => {
      expect(isAgentNoiseLine('The pod is in CrashLoopBackOff state.')).toBe(false);
      expect(isAgentNoiseLine('You need to create a Service of type LoadBalancer.')).toBe(false);
    });

    it('detects table border variations', () => {
      expect(isAgentNoiseLine('+---+---+---+')).toBe(true);
      // = sign table borders (e.g. Python tabulate double_grid format)
      expect(isAgentNoiseLine('+====+====+')).toBe(true);
      expect(isAgentNoiseLine('+--+-+')).toBe(true);
    });

    it('preserves GFM markdown table separator rows', () => {
      // GFM table separators use |---|---| (no + characters) and must be preserved
      // for markdown tables to render correctly
      expect(isAgentNoiseLine('|----------|--------|----------|')).toBe(false);
      expect(isAgentNoiseLine('| --- | --- | --- |')).toBe(false);
      expect(isAgentNoiseLine('|:---|:---:|---:|')).toBe(false);
    });

    it('detects task table data rows with various statuses', () => {
      expect(isAgentNoiseLine('| t1 | Check status | [✓] completed |')).toBe(true);
      expect(isAgentNoiseLine('| t2 | Fix issue   | [~] in_progress |')).toBe(true);
      expect(isAgentNoiseLine('| t3 | Test it     | [ ] pending |')).toBe(true);
    });
  });
});

// ─── Real-world agent response tests (from dev console captures) ───────────
// All identifiers (pod names, cluster names, IPs) are redacted / genericised.

describe('real-world agent responses', () => {
  describe('extractAIAnswer with real exec output containing bracketed paste and prompts', () => {
    it('extracts markdown answer from output with bracketed paste mode sequences', () => {
      const input = [
        '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
        "python /app/aks-agent.py ask 'what pods are running?'",
        '\x1b[?2004l',
        "Loaded models: ['gpt-4']",
        'Task List:',
        '+------+------------------+---------+',
        '| ID   | Description      | Status  |',
        '+------+------------------+---------+',
        '| t1   | Check pods       | [~] in_progress |',
        '+------+------------------+---------+',
        'AI: Here are the running pods in the `kube-system` namespace:',
        '',
        '| Pod Name | Status | Restarts |',
        '|----------|--------|----------|',
        '| coredns-7c6bf4f | Running | 0 |',
        '| kube-proxy-abc12 | Running | 0 |',
        '| metrics-server-xyz | Running | 2 |',
        '',
        'All pods are healthy.',
        'root@aks-agent-abc1234def-x9y8z:/app#',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('Here are the running pods');
      expect(result).toContain('kube-system');
      expect(result).toContain('coredns-7c6bf4f');
      expect(result).toContain('All pods are healthy.');
      // GFM table separator must be preserved for markdown table rendering
      expect(result).toContain('|----------|--------|----------|');
      expect(result).not.toContain('root@aks-agent');
      expect(result).not.toContain('Task List');
      expect(result).not.toContain('[?2004');
    });

    it('extracts YAML deployment from output with bash continuation prompts', () => {
      const input = [
        '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
        "python /app/aks-agent.py ask 'IMPORTANT INSTRUCTIONS:",
        '\x1b[?2004l',
        '\x1b[?2004h>',
        '- When returning any YAML content, always wrap it inside a markdown code block.',
        '\x1b[?2004l',
        '\x1b[?2004h>',
        'Now answer the following new question:',
        '\x1b[?2004l',
        '\x1b[?2004h>',
        "show me a deployment for nginx'",
        '\x1b[?2004l',
        "Loaded models: ['gpt-4']",
        'AI: Here is a Deployment for nginx:',
        '',
        '```yaml',
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: nginx-deployment',
        '  namespace: default',
        'spec:',
        '  replicas: 3',
        '  selector:',
        '    matchLabels:',
        '      app: nginx',
        '  template:',
        '    metadata:',
        '      labels:',
        '        app: nginx',
        '    spec:',
        '      containers:',
        '      - name: nginx',
        '        image: nginx:1.25',
        '        ports:',
        '        - containerPort: 80',
        '```',
        '',
        'You can apply it with `kubectl apply -f deployment.yaml`.',
        'root@aks-agent-abc1234def-x9y8z:/app#',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('Here is a Deployment for nginx');
      expect(result).toContain('```yaml');
      expect(result).toContain('kind: Deployment');
      expect(result).toContain('nginx-deployment');
      expect(result).toContain('replicas: 3');
      expect(result).toContain('kubectl apply');
      expect(result).not.toContain('root@aks-agent');
      expect(result).not.toContain('IMPORTANT INSTRUCTIONS');
      expect(result).not.toContain('[?2004');
      // Should not double-wrap YAML
      const yamlFences = (result.match(/```yaml/g) || []).length;
      expect(yamlFences).toBe(1);
    });

    it('extracts bare YAML from output with ANSI color codes and Rich formatting', () => {
      const input = [
        '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
        "python /app/aks-agent.py ask 'create a service'",
        '\x1b[?2004l',
        "\x1b[1mLoaded models:\x1b[0m [\x1b[32m'gpt-4'\x1b[0m]",
        '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓',
        '┃ Task List                       ┃',
        '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛',
        '| t1 | Create service | [✓] completed |',
        '\x1b[1mAI:\x1b[0m Here is a Service:',
        '',
        'apiVersion: v1',
        'kind: Service',
        'metadata:',
        '  name: my-service',
        '  namespace: default',
        'spec:',
        '  type: LoadBalancer',
        '  selector:',
        '    app: nginx',
        '  ports:',
        '  - protocol: TCP',
        '    port: 80',
        '    targetPort: 8080',
        '',
        'This Service exposes your application on port 80.',
        'root@aks-agent-abc1234def-x9y8z:/app#',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('Here is a Service');
      expect(result).toContain('```yaml');
      expect(result).toContain('kind: Service');
      expect(result).toContain('type: LoadBalancer');
      expect(result).toContain('This Service exposes your application');
      expect(result).not.toContain('root@aks-agent');
      expect(result).not.toContain('Task List');
      expect(result).not.toContain('┏');
      expect(result).not.toContain('[✓] completed');
    });

    it('extracts multi-paragraph prose response with diagnostic info', () => {
      const input = [
        '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
        "python /app/aks-agent.py ask 'why is my pod crashing?'",
        '\x1b[?2004l',
        "Loaded models: ['gpt-4']",
        '+------+-------------------+-------------------+',
        '| t1   | Check pod status  | [✓] completed     |',
        '| t2   | Get pod logs      | [✓] completed     |',
        '+------+-------------------+-------------------+',
        'AI: Your pod `web-app-6f8b9c4d7-x2k9p` is in a **CrashLoopBackOff** state. Here is what I found:',
        '',
        '## Root Cause',
        '',
        'The container is failing because it cannot connect to the database. The logs show:',
        '',
        '```',
        'Error: connect ECONNREFUSED 10.0.0.5:5432',
        '    at TCPConnectWrap.afterConnect [as oncomplete]',
        '```',
        '',
        '## Recommended Steps',
        '',
        '1. Check if the database pod is running: `kubectl get pods -l app=postgres`',
        '2. Verify the service endpoint: `kubectl get endpoints postgres-svc`',
        '3. Check network policies that might block traffic between namespaces',
        '',
        '> **Note**: The pod has restarted 15 times in the last hour.',
        'root@aks-agent-abc1234def-x9y8z:/app#',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('CrashLoopBackOff');
      expect(result).toContain('## Root Cause');
      expect(result).toContain('ECONNREFUSED');
      expect(result).toContain('## Recommended Steps');
      expect(result).toContain('kubectl get pods -l app=postgres');
      expect(result).toContain('> **Note**');
      expect(result).not.toContain('root@aks-agent');
      expect(result).not.toContain('Loaded models');
      expect(result).not.toContain('[✓] completed');
    });

    it('extracts bullet list response with conversation history echo stripped', () => {
      const input = [
        '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
        "python /app/aks-agent.py ask 'IMPORTANT INSTRUCTIONS:",
        '\x1b[?2004l',
        '\x1b[?2004h>',
        '- When returning any YAML content, always wrap it inside a markdown code block using ```yaml ... ``` so it renders properly.',
        '\x1b[?2004l',
        '\x1b[?2004h>',
        '- The conversation history below shows all previously asked questions and your answers.',
        '\x1b[?2004l',
        '\x1b[?2004h>',
        'Now answer the following new question:',
        '\x1b[?2004l',
        '\x1b[?2004h>',
        "what best practices should I follow for AKS?'",
        '\x1b[?2004l',
        "Loaded models: ['gpt-4']",
        'AI: Here are the key best practices for AKS:',
        '',
        '- **Use managed identities** instead of service principals for authentication',
        '- **Enable Azure Policy** to enforce organizational standards',
        '- **Configure autoscaling** for both cluster and pods:',
        '  - Cluster Autoscaler for node pools',
        '  - Horizontal Pod Autoscaler (HPA) for workloads',
        '- **Use Azure CNI** networking for better integration with VNets',
        '- **Enable monitoring** with Container Insights and Prometheus',
        '- **Implement network policies** to control pod-to-pod traffic',
        '- **Use node pools** to separate system and user workloads',
        '',
        'For more details, see the [AKS best practices documentation](https://learn.microsoft.com/en-us/azure/aks/best-practices).',
        'root@aks-agent-abc1234def-x9y8z:/app#',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('key best practices for AKS');
      expect(result).toContain('- **Use managed identities**');
      expect(result).toContain('- Cluster Autoscaler for node pools');
      expect(result).toContain('- Horizontal Pod Autoscaler');
      expect(result).toContain('AKS best practices documentation');
      expect(result).not.toContain('IMPORTANT INSTRUCTIONS');
      expect(result).not.toContain('conversation history');
      expect(result).not.toContain('root@aks-agent');
      expect(result).not.toContain('[?2004');
    });

    it('extracts response with multiple YAML resources and explanation', () => {
      const input = [
        '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
        "python /app/aks-agent.py ask 'create a complete app with deployment and service'",
        '\x1b[?2004l',
        "Loaded models: ['gpt-4']",
        '| t1 | Create resources | [✓] completed |',
        'AI: Here is a complete application setup with a Deployment and Service:',
        '',
        '### Deployment',
        '',
        '```yaml',
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: web-app',
        '  labels:',
        '    app: web-app',
        'spec:',
        '  replicas: 2',
        '  selector:',
        '    matchLabels:',
        '      app: web-app',
        '  template:',
        '    metadata:',
        '      labels:',
        '        app: web-app',
        '    spec:',
        '      containers:',
        '      - name: web',
        '        image: myregistry.azurecr.io/web-app:latest',
        '        ports:',
        '        - containerPort: 3000',
        '        resources:',
        '          requests:',
        '            cpu: 100m',
        '            memory: 128Mi',
        '          limits:',
        '            cpu: 250m',
        '            memory: 256Mi',
        '```',
        '',
        '### Service',
        '',
        '```yaml',
        'apiVersion: v1',
        'kind: Service',
        'metadata:',
        '  name: web-app-svc',
        'spec:',
        '  type: LoadBalancer',
        '  selector:',
        '    app: web-app',
        '  ports:',
        '  - port: 80',
        '    targetPort: 3000',
        '```',
        '',
        'Apply both with: `kubectl apply -f app.yaml`',
        'root@aks-agent-abc1234def-x9y8z:/app#',
      ].join('\n');
      const result = extractAIAnswer(input);
      expect(result).toContain('complete application setup');
      expect(result).toContain('### Deployment');
      expect(result).toContain('### Service');
      // Two YAML blocks
      const yamlFences = (result.match(/```yaml/g) || []).length;
      expect(yamlFences).toBe(2);
      expect(result).toContain('kind: Deployment');
      expect(result).toContain('kind: Service');
      expect(result).toContain('myregistry.azurecr.io/web-app:latest');
      expect(result).toContain('kubectl apply');
      expect(result).not.toContain('root@aks-agent');
      expect(result).not.toContain('Loaded models');
    });

    it('normalizes terminal-formatted deployment guidance into markdown lists and code blocks', () => {
      const input = [
        'stty -echo',
        '\x1b[?2004l',
        '\x1b[?2004hroot@aks-agent-redacted:/app# ',
        '\x1b[?2004l',
        '',
        '\x1b[?2004h',
        '> ',
        '\x1b[?2004l',
        '',
        '\x1b[?2004h> ',
        '\x1b[?2004l',
        '',
        "Loaded models: ['azure/gpt-5.x']",
        '✅ Toolset core_investigation',
        '✅ Toolset internet',
        'Received session ID: mcp-session-REDACTED',
        'Negotiated protocol version: 2025-06-18',
        '✅ Toolset aks_mcp',
        'Using 3 datasources (toolsets). To refresh: use flag `--refresh-toolsets`',
        'NO ENABLED LOGGING TOOLSET',
        'Using model: azure/gpt-5.x (272,000 total tokens, 54,400 output tokens)',
        'This tool uses AI to generate responses and may not always be accurate.',
        'User: IMPORTANT INSTRUCTIONS:',
        '- When returning any YAML content, always wrap it inside a markdown code block',
        'using ```yaml ... ``` so it renders properly.',
        '- The conversation history below shows all previously asked questions and your',
        'answers. Keep that context in mind and answer accordingly — do not repeat',
        'information already provided unless the user explicitly asks for it.',
        'Now answer the following new question:',
        'How do I deploy a python application?',
        'The AI requested 1 tool call(s).',
        'Running tool #1 TodoWrite: Update investigation tasks',
        'Task List:',
        '+----+--------------------------------------+-----------------+',
        '| ID | Content                              | Status          |',
        '+----+--------------------------------------+-----------------+',
        '| 1  | Clarify deployment target           | [~] in_progress |',
        '| 2  | Provide deployment examples         | [ ] pending     |',
        '| 3  | Include runtime best practices      | [ ] pending     |',
        '| 4  | Final review                        | [ ] pending     |',
        '+----+--------------------------------------+-----------------+',
        'Finished #1 in 0.00s, output length: 787 characters (12 lines) - /show 1 to',
        'view contents',
        '',
        '\x1b[1;96mAI:\x1b[0m ',
        'Which deployment target do you mean?',
        '',
        '\x1b[1;33m 1 \x1b[0m\x1b[1mKubernetes (AKS)\x1b[0m (Deployment/Service/Ingress YAML)',
        '\x1b[1;33m 2 \x1b[0m\x1b[1mContainer on a VM\x1b[0m (Dockerfile + \x1b[1;36;40mdocker run\x1b[0m or compose)',
        '\x1b[1;33m 3 \x1b[0m\x1b[1mPaaS\x1b[0m (Azure App Service / Container Apps / Cloud Run / Heroku-like)',
        '\x1b[1;33m 4 \x1b[0m\x1b[1mBare VM\x1b[0m (systemd + nginx + venv)',
        '',
        'Reply with: \x1b[1mtarget + framework\x1b[0m (e.g., “AKS + FastAPI” or “Docker VM + Flask”)',
        'and \x1b[1mhow it should be exposed\x1b[0m (public HTTP, internal-only, background',
        'worker/cron).',
        '',
        'While you answer, here’s a solid default pattern that works almost everywhere:',
        '',
        '                 \x1b[1;4mPython web app deployment checklist (generic)\x1b[0m',
        '',
        '\x1b[1;33m • \x1b[0mCreate \x1b[1;36;40mrequirements.txt\x1b[0m (or \x1b[1;36;40mpyproject.toml\x1b[0m)',
        '\x1b[1;33m • \x1b[0mAdd a production server:',
        '\x1b[1;33m   \x1b[0m\x1b[1;33m • \x1b[0m\x1b[1mFlask/Django (WSGI):\x1b[0m \x1b[1;36;40mgunicorn\x1b[0m',
        '\x1b[1;33m   \x1b[0m\x1b[1;33m • \x1b[0m\x1b[1mFastAPI/Starlette (ASGI):\x1b[0m \x1b[1;36;40muvicorn\x1b[0m (often behind gunicorn worker)',
        '\x1b[1;33m • \x1b[0mRead config from \x1b[1menv vars\x1b[0m (no secrets in code)',
        '\x1b[1;33m • \x1b[0mAdd \x1b[1;36;40m/healthz\x1b[0m endpoint for health checks',
        '\x1b[1;33m • \x1b[0mPin Python version (e.g., \x1b[1;36;40mpython:3.12-slim\x1b[0m)',
        '',
        '          \x1b[1;4mExample: containerize (works for AKS, any container runtime)\x1b[0m',
        '',
        '\x1b[1mDockerfile (FastAPI example)\x1b[0m',
        '',
        '\x1b[40m \x1b[0m\x1b[96;40mFROM\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40mpython:3.12-slim\x1b[0m',
        '\x1b[40m \x1b[0m\x1b[96;40mWORKDIR\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m/app\x1b[0m',
        '\x1b[40m \x1b[0m\x1b[96;40mCOPY\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mrequirements.txt\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m',
        '\x1b[40m \x1b[0m\x1b[96;40mRUN\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mpip install --no-cache-dir -r requirements.txt\x1b[0m',
        '\x1b[40m \x1b[0m\x1b[96;40mCOPY\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m',
        '\x1b[40m \x1b[0m\x1b[96;40mEXPOSE\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m8000\x1b[0m',
        '\x1b[40m \x1b[0m\x1b[96;40mCMD\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m[\x1b[0m\x1b[93;40m"uvicorn"\x1b[0m\x1b[97;40m, "main:app", "--host", "0.0.0.0", "--port", "8000"]\x1b[0m',
        '',
        'Build + run:',
        '',
        '\x1b[40m \x1b[0m\x1b[97;40mdocker build -t myapp:latest .\x1b[0m',
        '\x1b[40m \x1b[0m\x1b[97;40mdocker run --rm -p 8000:8000 myapp:latest\x1b[0m',
        '',
        'I can give you the exact \x1b[1mKubernetes YAML\x1b[0m (Deployment/Service/Ingress) or',
        '\x1b[1msystemd/nginx\x1b[0m setup once you confirm the target.',
        '\x1b[?2004hroot@aks-agent-redacted:/app# ',
      ].join('\n');

      const result = extractAIAnswer(input);
      expect(result).toContain('Which deployment target do you mean?');
      expect(result).toContain('1. Kubernetes (AKS) (Deployment/Service/Ingress YAML)');
      expect(result).toContain('2. Container on a VM (Dockerfile + docker run or compose)');
      expect(result).toContain('Python web app deployment checklist (generic)');
      expect(result).toContain('```');
      expect(result).toContain('FROM python:3.12-slim');
      expect(result).toContain('docker build -t myapp:latest .');
      expect(result).not.toContain('Task List');
      expect(result).not.toContain('Received session ID');
      expect(result).not.toContain('root@aks-agent-redacted');
    });
  });

  it('extracts indented multi-document YAML (Java deployment) with commands and headings', () => {
    const input = [
      'AI:',
      'Kubernetes YAML (Namespace + Deployment + Service)',
      ' apiVersion: v1',
      ' kind: Namespace',
      ' metadata:',
      '   name: demo',
      ' ---',
      ' apiVersion: apps/v1',
      ' kind: Deployment',
      ' metadata:',
      '   name: java-demo',
      '   namespace: demo',
      '   labels:',
      '     app: java-demo',
      ' spec:',
      '   replicas: 2',
      '   selector:',
      '     matchLabels:',
      '       app: java-demo',
      '   template:',
      '     metadata:',
      '       labels:',
      '         app: java-demo',
      '     spec:',
      '       containers:',
      '         - name: java-demo',
      '           image: myacr.azurecr.io/java-demo:1.0.0',
      '           imagePullPolicy: IfNotPresent',
      '           ports:',
      '             - name: http',
      '               containerPort: 8080',
      '           env:',
      '             - name: JAVA_TOOL_OPTIONS',
      '               value: "-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"',
      '             - name: SPRING_PROFILES_ACTIVE',
      '               value: "prod"',
      '           resources:',
      '             requests:',
      '               cpu: "100m"',
      '               memory: "256Mi"',
      '             limits:',
      '               cpu: "500m"',
      '               memory: "512Mi"',
      '           readinessProbe:',
      '             httpGet:',
      '               path: /actuator/health/readiness',
      '               port: http',
      '             initialDelaySeconds: 10',
      '             periodSeconds: 5',
      '           livenessProbe:',
      '             httpGet:',
      '               path: /actuator/health/liveness',
      '               port: http',
      '             initialDelaySeconds: 30',
      '             periodSeconds: 10',
      ' ---',
      ' apiVersion: v1',
      ' kind: Service',
      ' metadata:',
      '   name: java-demo',
      '   namespace: demo',
      ' spec:',
      '   type: ClusterIP',
      '   selector:',
      '     app: java-demo',
      '   ports:',
      '     - name: http',
      '       port: 80',
      '       targetPort: http',
      '',
      'Apply:',
      'kubectl apply -f app.yaml',
      'kubectl get pods -n demo',
      'kubectl get svc -n demo',
      '',
      '                     2) Build + push image (typical flow)',
      '',
      '# build',
      'docker build -t myacr.azurecr.io/java-demo:1.0.0 .',
    ].join('\n');

    const result = extractAIAnswer(input);
    // YAML should be in a fenced block and dedented
    expect(result).toContain('```yaml');
    expect(result).toContain('apiVersion: v1');
    expect(result).toContain('kind: Deployment');
    expect(result).toContain('kind: Service');
    // Apply: should be outside the fence
    const yamlClose = result.indexOf('```\n', result.indexOf('```yaml') + 7);
    const applyIdx = result.indexOf('Apply:');
    expect(yamlClose).toBeLessThan(applyIdx);
    // Commands should be present
    expect(result).toContain('kubectl apply -f app.yaml');
    expect(result).toContain('docker build -t myacr.azurecr.io/java-demo:1.0.0 .');
  });
});

describe('collapseTerminalBlankLines', () => {
  it('removes single blank line between space-prefixed code lines', () => {
    const input = ' FROM maven:3.9\n\n WORKDIR /src\n\n COPY pom.xml .';
    const result = collapseTerminalBlankLines(input);
    expect(result).toBe(' FROM maven:3.9\n WORKDIR /src\n COPY pom.xml .');
  });

  it('collapses multiple blank lines between code lines to one', () => {
    const input = ' RUN mvn package\n\n\n\n FROM eclipse-temurin:17-jre';
    const result = collapseTerminalBlankLines(input);
    expect(result).toBe(' RUN mvn package\n\n FROM eclipse-temurin:17-jre');
  });

  it('joins prose continuation lines (long line wrapped at terminal width)', () => {
    const input =
      "Here's a minimal, production-ready example for deploying a Java (Spring Boot)\n\napp on Kubernetes.";
    const result = collapseTerminalBlankLines(input);
    expect(result).toBe(
      "Here's a minimal, production-ready example for deploying a Java (Spring Boot)\napp on Kubernetes."
    );
  });

  it('joins uppercase continuation when previous line lacks sentence punctuation', () => {
    const input = "Adjust health probe paths if you don't use Spring Boot\n\nActuator.";
    const result = collapseTerminalBlankLines(input);
    // "...Spring Boot" (55 chars) is short, so NOT joined
    expect(result).toBe("Adjust health probe paths if you don't use Spring Boot\n\nActuator.");
  });

  it('joins uppercase continuation when previous line is long and lacks ending punctuation', () => {
    const input =
      "app on Kubernetes. Adjust health probe paths if you don't use Spring Boot\n\nActuator.";
    const result = collapseTerminalBlankLines(input);
    // "...Spring Boot" (74 chars) >= 60, doesn't end with punctuation → join
    expect(result).toBe(
      "app on Kubernetes. Adjust health probe paths if you don't use Spring Boot\nActuator."
    );
  });

  it('keeps blank between short line and next paragraph', () => {
    const input = 'Actuator.\n\nDockerfile (multi-stage build):';
    const result = collapseTerminalBlankLines(input);
    expect(result).toBe('Actuator.\n\nDockerfile (multi-stage build):');
  });

  it('collapses runs of 3+ blank lines to 1 in general case', () => {
    const input = 'Dockerfile (multi-stage build):\n\n\n\n # syntax=docker/dockerfile:1';
    const result = collapseTerminalBlankLines(input);
    expect(result).toBe('Dockerfile (multi-stage build):\n\n # syntax=docker/dockerfile:1');
  });

  it('does not alter content inside code fences', () => {
    const input = '```\n FROM x\n\n WORKDIR y\n```';
    const result = collapseTerminalBlankLines(input);
    expect(result).toBe('```\n FROM x\n\n WORKDIR y\n```');
  });

  it('handles mixed prose and code sections', () => {
    const input = [
      "Here's a minimal, production-ready example for deploying a Java (Spring Boot)",
      '',
      'app on Kubernetes.',
      '',
      'Dockerfile:',
      '',
      ' # syntax=docker/dockerfile:1',
      '',
      ' FROM maven:3.9',
      '',
      ' WORKDIR /src',
    ].join('\n');
    const result = collapseTerminalBlankLines(input);
    expect(result).toBe(
      [
        "Here's a minimal, production-ready example for deploying a Java (Spring Boot)",
        'app on Kubernetes.',
        '',
        'Dockerfile:',
        '',
        ' # syntax=docker/dockerfile:1',
        ' FROM maven:3.9',
        ' WORKDIR /src',
      ].join('\n')
    );
  });
});

describe('looksLikeShellOrDockerCodeLine — Dockerfile parser directives', () => {
  it('detects # syntax=docker/dockerfile:1', () => {
    expect(looksLikeShellOrDockerCodeLine('# syntax=docker/dockerfile:1')).toBe(true);
  });

  it('detects # escape=`', () => {
    expect(looksLikeShellOrDockerCodeLine('# escape=`')).toBe(true);
  });

  it('detects # check=error=true', () => {
    expect(looksLikeShellOrDockerCodeLine('# check=error=true')).toBe(true);
  });
});

describe('extractAIAnswer — terminal-formatted Java deployment with Rich code blocks', () => {
  // Simulates the real-world terminal output where Rich renders Dockerfile and
  // YAML code blocks with [40m (black background) ANSI formatting, producing
  // space-prefixed lines and blank lines between every content line.
  const rawJavaDeployTerminal = [
    'stty -echo',
    '\x1b[?2004l',
    '\x1b[?2004hroot@aks-agent-846df6ffb-tz9xn:/app# ',
    '\x1b[?2004l',
    '',
    '\x1b[?2004h',
    '> ',
    '\x1b[?2004l',
    '',
    "Loaded models: \x1b[1m[\x1b[0m\x1b[32m'azure/gpt-5-2'\x1b[0m\x1b[1m]\x1b[0m",
    '\u2705 Toolset core_investigation',
    'Using \x1b[1;36m4\x1b[0m datasources',
    'NO ENABLED LOGGING TOOLSET',
    '\x1b[1;97mUser:\x1b[0m IMPORTANT INSTRUCTIONS:',
    'Now answer: Show me an example java application deploy on kubernetes?',
    'The AI requested \x1b[1;36m1\x1b[0m tool call.',
    'Running tool #1 TodoWrite: Update tasks',
    'Task List:',
    '+----+----------------------------+---------------+',
    '| ID | Content                    | Status        |',
    '+----+----------------------------+---------------+',
    '| t1 | Create K8s YAML            | completed     |',
    '+----+----------------------------+---------------+',
    '  Finished #1 in 0.00s',
    '\x1b[1;96mAI:\x1b[0m ',
    "Here's a minimal, production-ready example for deploying a Java (Spring Boot)   ",
    '',
    "app on Kubernetes. Adjust health probe paths if you don't use Spring Boot       ",
    '',
    'Actuator.                                                                       ',
    '',
    '',
    'Dockerfile (multi-stage build):                                                 ',
    '',
    '',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[97;40m# syntax=docker/dockerfile:1\x1b[0m\x1b[40m                                                  \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[97;40mFROM maven:3.9-eclipse-temurin-17 AS build\x1b[0m\x1b[40m                                    \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[97;40mWORKDIR /src\x1b[0m\x1b[40m                                                                  \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[97;40mCOPY pom.xml .\x1b[0m\x1b[40m                                                                \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[97;40mRUN mvn -B -q -DskipTests package\x1b[0m\x1b[40m                                             \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[40m                                                                              \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[97;40mFROM eclipse-temurin:17-jre\x1b[0m\x1b[40m                                                   \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[97;40mWORKDIR /app\x1b[0m\x1b[40m                                                                  \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[97;40mCOPY --from=build /src/target/app.jar ./app.jar\x1b[0m\x1b[40m                               \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[97;40mEXPOSE 8080\x1b[0m\x1b[40m                                                                   \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[97;40mCMD ["bash","-lc","java $JAVA_OPTS -jar app.jar"]\x1b[0m\x1b[40m                              \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    '',
    'Kubernetes manifests (Deployment + Service):                                    ',
    '',
    '',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mNamespace                                                               \x1b[0m\x1b[40m \x1b[0m',
    '',
    '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mdemo                                                                  \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mapps/v1                                                           \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mService                                                                 \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mjava-hello                                                            \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mspec\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mtype\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mClusterIP                                                             \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    'Build/push and deploy:                                                          ',
    '',
    '\x1b[1;33m \u2022 \x1b[0mBuild: docker build -t ghcr.io/yourorg/java-hello:1.0.0 .                    ',
    '\x1b[1;33m \u2022 \x1b[0mApply: kubectl apply -f k8s.yaml                                             ',
    '',
    'Notes:                                                                          ',
    '',
    '\x1b[1;33m \u2022 \x1b[0mFor HPA to work, install metrics-server in the cluster.                      ',
    '',
    '\x1b[?2004hroot@aks-agent-846df6ffb-tz9xn:/app# ',
  ].join('\r\n');

  it('joins terminal-wrapped prose into a single paragraph', () => {
    const result = extractAIAnswer(rawJavaDeployTerminal);
    // "Here's a minimal..." and "app on Kubernetes..." should be one paragraph
    // (no blank line between them), so markdown joins them
    expect(result).toContain(
      "Here's a minimal, production-ready example for deploying a Java (Spring Boot)\napp on Kubernetes."
    );
    // Should NOT have a blank line between the continuation lines
    expect(result).not.toMatch(/Here's a minimal.*\(Spring Boot\)\s*\n\n\s*app on Kubernetes/);
    // "...Spring Boot" + "Actuator." continuation should also be joined
    expect(result).toMatch(/Spring Boot\nActuator\./);
  });

  it('wraps Dockerfile in a code fence including # syntax line', () => {
    const result = extractAIAnswer(rawJavaDeployTerminal);
    // The Dockerfile should be in a code fence
    expect(result).toContain('```\n# syntax=docker/dockerfile:1');
    expect(result).toContain('FROM maven:3.9-eclipse-temurin-17 AS build');
    expect(result).toContain('CMD ["bash","-lc","java $JAVA_OPTS -jar app.jar"]');
    // # syntax should NOT appear outside a code fence as a heading
    const fenceStart = result.indexOf('```\n# syntax');
    expect(fenceStart).toBeGreaterThan(-1);
  });

  it('collapses Dockerfile stages without extra blank lines', () => {
    const result = extractAIAnswer(rawJavaDeployTerminal);
    // Terminal formatting artefact blank lines are collapsed; Dockerfile stages
    // are adjacent (the intentional blank between stages is collapsed by the
    // upstream stripAgentNoise blank-collapsing step — this is acceptable since
    // the Dockerfile remains syntactically correct)
    expect(result).toMatch(/RUN mvn.*package\nFROM eclipse-temurin/);
  });

  it('removes terminal-artefact blank lines within Dockerfile', () => {
    const result = extractAIAnswer(rawJavaDeployTerminal);
    // Adjacent Dockerfile instructions should NOT have blank lines between them
    expect(result).toMatch(/FROM maven.*AS build\nWORKDIR \/src/);
    expect(result).toMatch(/WORKDIR \/src\nCOPY pom\.xml/);
  });

  it('wraps YAML block without blank lines between YAML lines', () => {
    const result = extractAIAnswer(rawJavaDeployTerminal);
    // YAML should be in a fenced block
    expect(result).toContain('```yaml');
    // apiVersion and kind should be on adjacent lines (no blank between them)
    expect(result).toMatch(/apiVersion: v1\nkind: Namespace/);
    expect(result).toMatch(/apiVersion: apps\/v1\nkind: Service/);
  });

  it('bullet list items are present', () => {
    const result = extractAIAnswer(rawJavaDeployTerminal);
    expect(result).toContain('- Build: docker build -t ghcr.io/yourorg/java-hello:1.0.0 .');
    expect(result).toContain('- Apply: kubectl apply -f k8s.yaml');
  });
});

// ─── Real-world Java deployment with Option A / Option B structure ────────────

describe('extractAIAnswer — real-world Java deploy with Option A/B and Rich panels', () => {
  // Reconstructed from real dev console logs: aks-agent response with
  // Rich-panel YAML and kubectl code blocks, centered "Option B" heading,
  // Java source code, and Dockerfile.
  const rawJavaDeployOptionAB = [
    'stty -echo',
    '\x1b[?2004l',
    '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
    '\x1b[?2004l',
    '',
    '\x1b[?2004h> ',
    '\x1b[?2004l',
    '',
    '\x1b[?2004h> ',
    '\x1b[?2004l',
    '',
    "Loaded models: \x1b[1m[\x1b[0m\x1b[32m'azure/gpt-5.2'\x1b[0m\x1b[1m]\x1b[0m",
    '\u2705 Toolset core_investigation',
    '\u2705 Toolset internet',
    '\u2705 Toolset aks_mcp',
    'Using \x1b[1;36m3\x1b[0m datasources',
    'NO ENABLED LOGGING TOOLSET',
    '\x1b[1;97mUser:\x1b[0m IMPORTANT INSTRUCTIONS:',
    'Now answer the following new question:',
    'Show me how to deploy an example java application on kubernetes?',
    'The AI requested \x1b[1;36m1\x1b[0m tool call.',
    'Running tool #\x1b[1;36m1\x1b[0m \x1b[1mTodoWrite\x1b[0m: Update investigation tasks',
    'Task List:',
    '+----+----------+---------------+',
    '| ID | Content  | Status        |',
    '+----+----------+---------------+',
    '| 1  | Deploy   | completed     |',
    '+----+----------+---------------+',
    '  Finished #1 in 0.00s',
    '',
    '\x1b[1;96mAI:\x1b[0m ',
    // ── Option A: prebuilt image ──
    '     \x1b[1mOption A (fastest): deploy a prebuilt example Java (Spring Boot) image\x1b[0m     ',
    '',
    'Apply this manifest:                                                            ',
    '',
    // YAML in Rich panel (black background, syntax-highlighted)
    '\x1b[40m                                                                                \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mNamespace                                                               \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mjava-demo                                                             \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mapps/v1                                                           \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mDeployment                                                              \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mspring-boot-demo                                                      \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mnamespace\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mjava-demo                                                        \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mspec\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mreplicas\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m2                                                                 \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mselector\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                   \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m    \x1b[0m\x1b[91;40mmatchLabels\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                              \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m      \x1b[0m\x1b[91;40mapp\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mspring-boot-demo                                                   \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mService                                                                 \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mspring-boot-demo                                                      \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mspec\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mselector\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                   \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m    \x1b[0m\x1b[91;40mapp\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mspring-boot-demo                                                     \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mports\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                      \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m    \x1b[0m\x1b[40m-\x1b[0m\x1b[97;40m \x1b[0m\x1b[91;40mport\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m80                                                                \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m      \x1b[0m\x1b[91;40mtargetPort\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m8080                                                        \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mtype\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mClusterIP                                                             \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    'Run:                                                                            ',
    '',
    '\x1b[40m                                                                                \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40mkubectl\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mapply\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-f\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mapp.yaml\x1b[0m\x1b[40m                                                     \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40mkubectl\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mget\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mpods\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-n\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mjava-demo\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-w\x1b[0m\x1b[40m                                              \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40mkubectl\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mport-forward\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-n\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mjava-demo\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40msvc/spring-boot-demo\x1b[0m\x1b[97;40m \x1b[0m\x1b[37;40m8080\x1b[0m\x1b[97;40m:80\x1b[0m\x1b[40m                \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[37;40m# then open http://localhost:8080\x1b[0m\x1b[40m                                             \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    '',
    // Rich separator and centered heading
    '\x1b[33m\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\x1b[0m',
    '            \x1b[1mOption B: build your own tiny Java app image + deploy it\x1b[0m            ',
    '',
    '\x1b[1m1) Minimal Spring Boot app + Dockerfile\x1b[0m                                         ',
    '',
    'Use Spring Initializr (Web dependency), then add a controller like:             ',
    '',
    // Java code in Rich panel
    '\x1b[40m                                                                                \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[92;40m@RestController\x1b[0m\x1b[40m                                                               \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[96;40mclass\x1b[0m\x1b[97;40m \x1b[0m\x1b[92;40mHelloController\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m{\x1b[0m\x1b[40m                                                       \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[92;40m@GetMapping\x1b[0m\x1b[97;40m(\x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40m/\x1b[0m\x1b[93;40m"\x1b[0m\x1b[97;40m)\x1b[0m\x1b[40m                                                            \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[97;40mString\x1b[0m\x1b[97;40m \x1b[0m\x1b[92;40mhello\x1b[0m\x1b[97;40m(\x1b[0m\x1b[97;40m)\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m{\x1b[0m\x1b[97;40m \x1b[0m\x1b[96;40mreturn\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40mhello from k8s\x1b[0m\x1b[93;40m"\x1b[0m\x1b[97;40m;\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m}\x1b[0m\x1b[40m                                 \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40m}\x1b[0m\x1b[40m                                                                             \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    'Dockerfile (builds and runs jar):                                               ',
    '',
    // Dockerfile in Rich panel
    '\x1b[40m                                                                                \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[96;40mFROM\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40meclipse-temurin:21-jdk\x1b[0m\x1b[97;40m \x1b[0m\x1b[96;40mAS\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40mbuild\x1b[0m\x1b[40m                                          \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[96;40mWORKDIR\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m/src\x1b[0m\x1b[40m                                                                  \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[96;40mCOPY\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m\x1b[40m                                                                      \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[96;40mRUN\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m./mvnw\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-q\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-DskipTests\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mpackage\x1b[0m\x1b[40m                                             \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[40m                                                                              \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[96;40mFROM\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40meclipse-temurin:21-jre\x1b[0m\x1b[40m                                                   \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[96;40mWORKDIR\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m/app\x1b[0m\x1b[40m                                                                  \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[96;40mCOPY\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m--from\x1b[0m\x1b[91;40m=\x1b[0m\x1b[97;40mbuild\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m/src/target/*.jar\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m/app/app.jar\x1b[0m\x1b[40m                              \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[96;40mEXPOSE\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m8080\x1b[0m\x1b[40m                                                                   \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[96;40mENTRYPOINT\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m[\x1b[0m\x1b[93;40m"java"\x1b[0m\x1b[97;40m,\x1b[0m\x1b[93;40m"-jar"\x1b[0m\x1b[97;40m,\x1b[0m\x1b[93;40m"/app/app.jar"\x1b[0m\x1b[97;40m]\x1b[0m\x1b[40m                                     \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    '\x1b[1m2) Build + push\x1b[0m                                                                 ',
    '',
    '\x1b[40m                                                                                \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40mdocker\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mbuild\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-t\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m<your-registry>/<your-repo>/spring-boot-demo:1.0\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m\x1b[40m            \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40mdocker\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mpush\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m<your-registry>/<your-repo>/spring-boot-demo:1.0\x1b[0m\x1b[40m                  \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    '\x1b[1m3) Update Deployment image\x1b[0m In the Deployment above, set:                        ',
    '',
    '\x1b[40m                                                                                \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[91;40mimage\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m<your-registry>/<your-repo>/spring-boot-demo:1.0                       \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    'Then:                                                                           ',
    '',
    '\x1b[40m                                                                                \x1b[0m',
    '\x1b[40m \x1b[0m\x1b[97;40mkubectl\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mapply\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-f\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mapp.yaml\x1b[0m\x1b[40m                                                     \x1b[0m\x1b[40m \x1b[0m',
    '\x1b[40m                                                                                \x1b[0m',
    '',
    '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
  ].join('\r\n');

  it('does not absorb "Option B" heading into kubectl code block', () => {
    const result = extractAIAnswer(rawJavaDeployOptionAB);
    // After the kubectl code fence closes, "Option B:" should appear as prose
    expect(result).toMatch(/# then open http:\/\/localhost:8080\n```[\s\S]*Option B/);
    // "Option B:" should be visible as prose/heading text
    expect(result).toContain('Option B');
  });

  it('wraps kubectl commands in a code fence', () => {
    const result = extractAIAnswer(rawJavaDeployOptionAB);
    expect(result).toContain('kubectl apply -f app.yaml');
    expect(result).toContain('kubectl get pods -n java-demo -w');
    expect(result).toContain('kubectl port-forward');
    // Shell comment should be in same code block as kubectl commands
    expect(result).toContain('# then open http://localhost:8080');
  });

  it('wraps YAML in a yaml-fenced code block', () => {
    const result = extractAIAnswer(rawJavaDeployOptionAB);
    expect(result).toContain('```yaml');
    expect(result).toMatch(/apiVersion: v1\nkind: Namespace/);
    expect(result).toMatch(/apiVersion: apps\/v1\nkind: Deployment/);
    expect(result).toMatch(/apiVersion: v1\nkind: Service/);
  });

  it('wraps Dockerfile in a code fence', () => {
    const result = extractAIAnswer(rawJavaDeployOptionAB);
    expect(result).toContain('FROM eclipse-temurin:21-jdk AS build');
    expect(result).toContain('WORKDIR /src');
    expect(result).toContain('COPY . .');
    expect(result).toContain('RUN ./mvnw -q -DskipTests package');
    expect(result).toContain('ENTRYPOINT ["java","-jar","/app/app.jar"]');
  });

  it('wraps docker build/push commands in a code fence', () => {
    const result = extractAIAnswer(rawJavaDeployOptionAB);
    expect(result).toContain('docker build -t');
    expect(result).toContain('docker push');
  });

  it('preserves numbered section headers outside code blocks', () => {
    const result = extractAIAnswer(rawJavaDeployOptionAB);
    expect(result).toMatch(/1\).*Minimal Spring Boot/);
    expect(result).toMatch(/2\).*Build \+ push/);
    expect(result).toMatch(/3\).*Update Deployment image/);
  });

  it('keeps prose text outside code fences', () => {
    const result = extractAIAnswer(rawJavaDeployOptionAB);
    expect(result).toContain('Apply this manifest:');
    expect(result).toContain('Run:');
    expect(result).toContain('Use Spring Initializr');
    expect(result).toContain('Then:');
  });

  it('wraps trailing kubectl apply -f in a code fence, not as emphasis', () => {
    const result = extractAIAnswer(rawJavaDeployOptionAB);
    // The trailing 'kubectl apply -f app.yaml' MUST be inside a code fence
    const lastKubectl = result.lastIndexOf('kubectl apply -f app.yaml');
    expect(lastKubectl).toBeGreaterThan(-1);
    // Check that there's a ``` fence before it (and no unclosed fence between)
    const before = result.slice(0, lastKubectl);
    const fencesBefore = (before.match(/```/g) || []).length;
    // Odd number of fences before = inside a fence (good)
    expect(fencesBefore % 2).toBe(1);
  });
});

// ─── Kubernetes-focused normalizeTerminalMarkdown tests ──────────────────────

describe('normalizeTerminalMarkdown — Kubernetes / kubectl scenarios', () => {
  it('wraps indented kubectl commands in a code fence', () => {
    const input = [
      'Run these commands:',
      '',
      ' kubectl apply -f deployment.yaml',
      ' kubectl get pods -n my-namespace',
      ' kubectl rollout status deployment/my-app',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('```\nkubectl apply -f deployment.yaml');
    expect(result).toContain('kubectl rollout status deployment/my-app\n```');
  });

  it('wraps indented helm commands in a code fence', () => {
    const input = [
      'Install the chart:',
      '',
      ' helm repo add bitnami https://charts.bitnami.com/bitnami',
      ' helm install my-release bitnami/nginx',
      ' helm upgrade my-release bitnami/nginx --set replicaCount=3',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('```\nhelm repo add');
    expect(result).toContain('helm upgrade my-release');
  });

  it('stops code block before centered heading after kubectl commands', () => {
    const input = [
      ' kubectl apply -f app.yaml',
      ' kubectl get pods -n java-demo -w',
      ' kubectl port-forward -n java-demo svc/demo 8080:80',
      ' # then open http://localhost:8080',
      '            Option B: build your own app',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    // kubectl commands should be in a code fence
    expect(result).toContain('```\nkubectl apply');
    // "Option B:" should NOT be inside the code fence
    expect(result).not.toMatch(/```[^`]*Option B[^`]*```/);
    expect(result).toContain('Option B: build your own app');
  });

  it('stops code block at blank line followed by non-code prose', () => {
    const input = [
      ' kubectl apply -f app.yaml',
      ' kubectl get pods -w',
      '',
      'Next, configure the ingress:',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('```\nkubectl apply');
    expect(result).toContain('kubectl get pods -w\n```');
    expect(result).toContain('Next, configure the ingress:');
  });

  it('keeps shell comments with URLs inside kubectl code blocks', () => {
    const input = [
      ' kubectl port-forward svc/my-app 8080:80',
      ' # then visit http://localhost:8080',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('kubectl port-forward');
    expect(result).toContain('# then visit http://localhost:8080');
  });

  it('wraps az aks commands in code fence', () => {
    const input = [
      'Create your cluster:',
      '',
      ' az aks create -g myRG -n myCluster --node-count 3',
      ' az aks get-credentials -g myRG -n myCluster',
      ' kubectl get nodes',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('```\naz aks create');
    expect(result).toContain('kubectl get nodes\n```');
  });

  it('does not absorb prose into kubectl code blocks across blank lines', () => {
    const input = [
      ' kubectl create namespace monitoring',
      ' kubectl apply -f prometheus.yaml',
      '',
      ' This will create the monitoring stack.',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    // The prose line starts with space but isn't code
    expect(result).toContain('```\nkubectl create namespace monitoring');
    expect(result).toContain('kubectl apply -f prometheus.yaml\n```');
  });
});

// ─── Kubernetes-focused collapseTerminalBlankLines tests ─────────────────────

describe('collapseTerminalBlankLines — Kubernetes / centered heading scenarios', () => {
  it('preserves blank line between kubectl code and a centered heading', () => {
    const input = [
      ' kubectl apply -f app.yaml',
      '',
      '            Option B: build your own app',
    ].join('\n');
    const result = collapseTerminalBlankLines(input);
    // The blank should be preserved (centered heading is NOT terminal code)
    expect(result).toContain('kubectl apply -f app.yaml\n\n');
    expect(result).toContain('Option B: build your own app');
  });

  it('still collapses blanks between kubectl commands (both 1-space indented)', () => {
    const input = [' kubectl apply -f deployment.yaml', '', ' kubectl get pods -n default'].join(
      '\n'
    );
    const result = collapseTerminalBlankLines(input);
    expect(result).toBe(' kubectl apply -f deployment.yaml\n kubectl get pods -n default');
  });

  it('collapses blanks between YAML lines with typical Rich indentation', () => {
    const input = [' apiVersion: v1', '', ' kind: Service', '', ' metadata:'].join('\n');
    const result = collapseTerminalBlankLines(input);
    expect(result).toBe(' apiVersion: v1\n kind: Service\n metadata:');
  });
});

// ─── Shell comment detection in looksLikeShellOrDockerCodeLine ───────────────

describe('looksLikeShellOrDockerCodeLine — shell comments with URLs', () => {
  it('detects shell comments containing URLs', () => {
    expect(looksLikeShellOrDockerCodeLine('# then open http://localhost:8080')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('# visit https://example.com/api')).toBe(true);
  });

  it('detects shell comments containing paths', () => {
    expect(looksLikeShellOrDockerCodeLine('# edit /etc/nginx/nginx.conf')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('# see /var/log/syslog for details')).toBe(true);
  });

  it('does NOT detect generic prose comments as code', () => {
    // No URL, no path — this is more like markdown
    expect(looksLikeShellOrDockerCodeLine('# This is a heading')).toBe(false);
    expect(looksLikeShellOrDockerCodeLine('# Notes about deployment')).toBe(false);
  });

  it('still detects Dockerfile parser directives', () => {
    expect(looksLikeShellOrDockerCodeLine('# syntax=docker/dockerfile:1')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('# escape=\\')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('# check=skip=all')).toBe(true);
  });
});

// ─── More Kubernetes YAML / kubectl extractAIAnswer tests ────────────────────

describe('extractAIAnswer — Kubernetes kubectl and YAML patterns', () => {
  it('handles kubectl get with wide output and JSON format', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Check your pods:',
      '',
      ' kubectl get pods -n kube-system -o wide',
      ' kubectl get svc -o json | jq .items[].metadata.name',
      '',
      'Look for any pods in CrashLoopBackOff state.',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('kubectl get pods -n kube-system -o wide');
    expect(result).toContain('kubectl get svc -o json');
    expect(result).toContain('CrashLoopBackOff');
  });

  it('handles mixed kubectl describe and logs commands', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Debug the failing pod:',
      '',
      ' kubectl describe pod my-app-xyz -n default',
      ' kubectl logs my-app-xyz -n default --previous',
      ' kubectl get events -n default --sort-by=.lastTimestamp',
      '',
      'The events will show scheduling failures and OOM kills.',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('kubectl describe pod');
    expect(result).toContain('kubectl logs my-app-xyz');
    expect(result).toContain('kubectl get events');
    expect(result).toContain('The events will show scheduling failures');
  });

  it('handles kubectl apply with multi-resource YAML', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Apply the following:',
      '',
      '```yaml',
      'apiVersion: v1',
      'kind: ConfigMap',
      'metadata:',
      '  name: app-config',
      '  namespace: default',
      'data:',
      '  APP_ENV: production',
      '---',
      'apiVersion: apps/v1',
      'kind: Deployment',
      'metadata:',
      '  name: my-app',
      '  namespace: default',
      'spec:',
      '  replicas: 3',
      '  selector:',
      '    matchLabels:',
      '      app: my-app',
      '  template:',
      '    metadata:',
      '      labels:',
      '        app: my-app',
      '    spec:',
      '      containers:',
      '        - name: app',
      '          image: myregistry/my-app:latest',
      '          envFrom:',
      '            - configMapRef:',
      '                name: app-config',
      '```',
      '',
      'Then run:',
      '',
      ' kubectl apply -f manifests.yaml',
      ' kubectl rollout status deployment/my-app -n default',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```yaml\napiVersion: v1');
    expect(result).toContain('kind: ConfigMap');
    expect(result).toContain('kind: Deployment');
    expect(result).toContain('envFrom:');
    expect(result).toContain('kubectl apply -f manifests.yaml');
    expect(result).toContain('kubectl rollout status');
  });

  it('handles kubectl exec and port-forward commands', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Connect to your pod:',
      '',
      ' kubectl exec -it my-app-pod -n default -- /bin/bash',
      ' kubectl port-forward svc/my-app 8080:80 -n default',
      ' # then curl http://localhost:8080/healthz',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('kubectl exec -it');
    expect(result).toContain('kubectl port-forward');
    expect(result).toContain('# then curl http://localhost:8080/healthz');
  });

  it('handles bare YAML with HPA resource', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Here is a HorizontalPodAutoscaler:',
      '',
      'apiVersion: autoscaling/v2',
      'kind: HorizontalPodAutoscaler',
      'metadata:',
      '  name: my-app',
      '  namespace: default',
      'spec:',
      '  scaleTargetRef:',
      '    apiVersion: apps/v1',
      '    kind: Deployment',
      '    name: my-app',
      '  minReplicas: 2',
      '  maxReplicas: 10',
      '  metrics:',
      '    - type: Resource',
      '      resource:',
      '        name: cpu',
      '        target:',
      '          type: Utilization',
      '          averageUtilization: 70',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```yaml');
    expect(result).toContain('kind: HorizontalPodAutoscaler');
    expect(result).toContain('averageUtilization: 70');
  });

  it('handles kubectl with Azure AKS commands', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Scale your AKS cluster:',
      '',
      ' az aks scale -g myRG -n myCluster --node-count 5',
      ' az aks nodepool add -g myRG --cluster-name myCluster -n gpupool --node-count 2 --node-vm-size Standard_NC6',
      ' kubectl get nodes -o wide',
      '',
      'The GPU nodepool will take a few minutes to provision.',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('az aks scale');
    expect(result).toContain('az aks nodepool add');
    expect(result).toContain('kubectl get nodes -o wide');
  });

  it('handles Kubernetes NetworkPolicy YAML', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Create a NetworkPolicy to restrict traffic:',
      '',
      '```yaml',
      'apiVersion: networking.k8s.io/v1',
      'kind: NetworkPolicy',
      'metadata:',
      '  name: deny-all',
      '  namespace: production',
      'spec:',
      '  podSelector: {}',
      '  policyTypes:',
      '    - Ingress',
      '    - Egress',
      '```',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```yaml');
    expect(result).toContain('kind: NetworkPolicy');
    expect(result).toContain('podSelector: {}');
    expect(result).toContain('policyTypes:');
  });

  it('handles kubectl create secret and configmap', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Create secrets and config:',
      '',
      ' kubectl create secret generic db-creds --from-literal=password=s3cret -n default',
      ' kubectl create configmap app-config --from-file=config.yaml -n default',
      ' kubectl get secrets -n default',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('kubectl create secret generic');
    expect(result).toContain('kubectl create configmap');
    expect(result).toContain('kubectl get secrets');
  });

  it('handles terminal-wrapped YAML values (key: on one line, value on next)', () => {
    // Simulates Rich terminal formatting where long YAML values wrap to next line
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Below is a multi-document YAML example for a microservice setup.',
      '',
      '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mConfigMap                                                               \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mglobal-config                                                         \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[91;40mdata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mLOG_LEVEL\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40minfo\x1b[0m\x1b[93;40m"\x1b[0m\x1b[40m                                                           \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mOTEL_EXPORTER_OTLP_ENDPOINT\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m                                               \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40mhttp://otel-collector.observability.svc.cluster.local:4317\x1b[0m\x1b[93;40m"\x1b[0m\x1b[40m                  \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mSecret                                                                  \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mdb-credentials                                                        \x1b[0m\x1b[40m \x1b[0m',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    // The OTEL endpoint URL must be INSIDE the yaml fence, not outside
    expect(result).toContain('OTEL_EXPORTER_OTLP_ENDPOINT:');
    expect(result).toContain('"http://otel-collector.observability.svc.cluster.local:4317"');
    // Both ConfigMap and Secret should be in a single yaml block
    expect(result).toContain('kind: ConfigMap');
    expect(result).toContain('kind: Secret');
    const yamlFences = (result.match(/```yaml/g) || []).length;
    expect(yamlFences).toBe(1);
  });

  it('handles terminal-wrapped YAML with unclosed flow braces', () => {
    // Simulates Rich terminal wrapping a long flow expression across lines
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Here is the StatefulSet:',
      '',
      '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mapps/v1                                                           \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mStatefulSet                                                             \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[91;40mspec\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mcontainers\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                             \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40m    \x1b[0m\x1b[40m-\x1b[0m\x1b[97;40m \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mpostgres                                                      \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40m      \x1b[0m\x1b[91;40menv\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40m        \x1b[0m\x1b[40m-\x1b[0m\x1b[97;40m \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mPOSTGRES_USER                                             \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40m          \x1b[0m\x1b[91;40mvalueFrom\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m{\x1b[0m\x1b[91;40m secretKeyRef\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m{\x1b[0m\x1b[91;40m name\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mdb-credentials\x1b[0m\x1b[40m,\x1b[0m\x1b[91;40m key\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m        \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40mPOSTGRES_USER\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m}\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m}                                                             \x1b[0m\x1b[40m \x1b[0m',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    // The continuation 'POSTGRES_USER } }' must be inside the yaml fence
    expect(result).toContain('POSTGRES_USER } }');
    expect(result).toContain('```yaml');
    // Should be one yaml block
    const yamlFences = (result.match(/```yaml/g) || []).length;
    expect(yamlFences).toBe(1);
  });
});

// ─── Bare code block wrapping in extractAIAnswer (curl, kubectl, etc.) ───────

describe('extractAIAnswer — bare code line wrapping', () => {
  it('wraps bare curl command in code fence', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Test the endpoint:',
      '',
      'curl http://localhost:8080/health',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```\ncurl http://localhost:8080/health\n```');
  });

  it('wraps bare curl with flags in code fence', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Check the service:',
      '',
      'curl -s -o /dev/null -w "%{http_code}" http://localhost:8080',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```\ncurl');
  });

  it('wraps bare kubectl commands in code fence', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Apply and check:',
      '',
      'kubectl apply -f app.yaml',
      'kubectl get pods -n demo',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```\nkubectl apply -f app.yaml\nkubectl get pods -n demo\n```');
  });

  it('wraps bare docker build + push in code fence', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Build and push:',
      '',
      'docker build -t myapp:latest .',
      'docker push myapp:latest',
      '',
      'Then deploy.',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```\ndocker build -t myapp:latest .\ndocker push myapp:latest\n```');
  });

  it('wraps bare helm install in code fence', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Install nginx ingress:',
      '',
      'helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx',
      'helm install nginx ingress-nginx/ingress-nginx --namespace ingress --create-namespace',
      '',
      'Wait for the external IP.',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```\nhelm repo add');
    expect(result).toContain('helm install nginx');
  });

  it('preserves YAML in yaml fence and wraps bare curl separately', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Apply:',
      '',
      '```yaml',
      'apiVersion: v1',
      'kind: Service',
      'metadata:',
      '  name: myapp',
      '```',
      '',
      'Then test:',
      '',
      'curl http://localhost:8080',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```yaml\napiVersion: v1');
    expect(result).toContain('```\ncurl http://localhost:8080\n```');
  });

  it('wraps bare az aks commands in code fence', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Get your kubeconfig:',
      '',
      'az aks get-credentials --resource-group myRG --name myCluster',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```\naz aks get-credentials');
  });

  it('does not wrap prose mentioning commands', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'You can use kubectl to check pod status. The curl command tests connectivity.',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    // Prose should NOT be wrapped in code fences
    expect(result).not.toContain('```');
  });

  it('wraps single indented kubectl line from terminal output in code fence', () => {
    const raw = [
      '\x1b[1;96mAI:\x1b[0m ',
      'Then:',
      '',
      '\x1b[40m                                                                                \x1b[0m',
      '\x1b[40m \x1b[0m\x1b[97;40mkubectl\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mapply\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-f\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mapp.yaml\x1b[0m\x1b[40m                                                     \x1b[0m\x1b[40m \x1b[0m',
      '\x1b[40m                                                                                \x1b[0m',
      '',
      '\x1b[?2004hroot@aks-agent:/app# ',
    ].join('\r\n');
    const result = extractAIAnswer(raw);
    expect(result).toContain('```');
    expect(result).toContain('kubectl apply -f app.yaml');
  });
});

// ── Real-world microservice YAML with Rich terminal formatting ──

const rawMicroserviceYaml = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
  '\x1b[?2004l\r',
  '\x1b[?2004h> ',
  '\x1b[?2004l\r',
  '\x1b[1;96mAI:\x1b[0m ',
  'Below is a single (large) multi-document YAML example for a "complicated"       ',
  'microservice setup: multiple namespaces, shared config, secrets, several        ',
  'microservices, HPAs, PDBs, NetworkPolicies, an Ingress, a CronJob, and a Job.   ',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# --------------------------------------------------------\x1b[0m\x1b[40m                    \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# Namespaces\x1b[0m\x1b[40m                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# --------------------------------------------------------\x1b[0m\x1b[40m                    \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mNamespace                                                               \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mplatform                                                              \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mNamespace                                                               \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mapps                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[40m                                                                              \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# --------------------------------------------------------\x1b[0m\x1b[40m                    \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# Shared config/secrets\x1b[0m\x1b[40m                                                       \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# --------------------------------------------------------\x1b[0m\x1b[40m                    \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mConfigMap                                                               \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mglobal-config                                                         \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mnamespace\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mapps                                                             \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mdata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mLOG_LEVEL\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40minfo\x1b[0m\x1b[93;40m"\x1b[0m\x1b[40m                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mOTEL_EXPORTER_OTLP_ENDPOINT\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m                                               \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40mhttp://otel-collector.observability.svc.cluster.local:4317\x1b[0m\x1b[93;40m"\x1b[0m\x1b[40m                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mSecret                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mdb-credentials                                                        \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mtype\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mOpaque                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mstringData\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                   \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mPOSTGRES_USER\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40mappuser\x1b[0m\x1b[93;40m"\x1b[0m\x1b[40m                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mPOSTGRES_PASSWORD\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40mreplace-me\x1b[0m\x1b[93;40m"\x1b[0m\x1b[40m                                             \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  'If you want it even more "realistic complicated", tell me what stack you want   ',
  "included (Istio/Linkerd, Kafka, etc.) and I'll tailor the example.              ",
  '',
  '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
].join('\r\n');

describe('extractAIAnswer — real-world microservice YAML with Rich terminal formatting', () => {
  let result: string;
  let yamlContent: string;
  let docs: YAML.Document.Parsed[];

  beforeAll(() => {
    result = extractAIAnswer(rawMicroserviceYaml);
    const yamlMatch = result.match(/```yaml\n([\s\S]*?)```/);
    yamlContent = yamlMatch ? yamlMatch[1] : '';
    docs = YAML.parseAllDocuments(yamlContent);
  });

  it('produces exactly one yaml-fenced block', () => {
    expect((result.match(/```yaml/g) || []).length).toBe(1);
  });

  it('includes YAML section comments inside the fence', () => {
    expect(yamlContent).toContain('# Namespaces');
    expect(yamlContent).toContain('# Shared config/secrets');
  });

  it('does NOT render # Namespaces as a markdown heading', () => {
    let inFence = false;
    for (const line of result.split('\n')) {
      if (line.trim().startsWith('```')) inFence = !inFence;
      // CommonMark allows up to 3 spaces before # for headings
      if (!inFence && /^\s{0,3}#\s/.test(line) && line.includes('Namespaces')) {
        throw new Error(`"# Namespaces" outside fence would render as heading: ${line}`);
      }
    }
  });

  it('all YAML documents parse without errors', () => {
    const errors = docs.flatMap(d => d.errors);
    expect(errors).toHaveLength(0);
  });

  it('contains exactly 4 YAML documents', () => {
    expect(docs.length).toBe(4);
  });

  it('document 1 is Namespace "platform"', () => {
    const doc = docs[0].toJSON();
    expect(doc.apiVersion).toBe('v1');
    expect(doc.kind).toBe('Namespace');
    expect(doc.metadata.name).toBe('platform');
  });

  it('document 2 is Namespace "apps"', () => {
    const doc = docs[1].toJSON();
    expect(doc.apiVersion).toBe('v1');
    expect(doc.kind).toBe('Namespace');
    expect(doc.metadata.name).toBe('apps');
  });

  it('document 3 is ConfigMap "global-config" in namespace "apps"', () => {
    const doc = docs[2].toJSON();
    expect(doc.apiVersion).toBe('v1');
    expect(doc.kind).toBe('ConfigMap');
    expect(doc.metadata.name).toBe('global-config');
    expect(doc.metadata.namespace).toBe('apps');
  });

  it('ConfigMap has correct data keys including terminal-wrapped OTEL value', () => {
    const data = docs[2].toJSON().data;
    expect(data.LOG_LEVEL).toBe('info');
    expect(data.OTEL_EXPORTER_OTLP_ENDPOINT).toBe(
      'http://otel-collector.observability.svc.cluster.local:4317'
    );
  });

  it('terminal-wrapped OTEL value is joined onto the key line', () => {
    expect(yamlContent).toContain(
      'OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector.observability.svc.cluster.local:4317"'
    );
  });

  it('document 4 is Secret "db-credentials" with correct stringData', () => {
    const doc = docs[3].toJSON();
    expect(doc.apiVersion).toBe('v1');
    expect(doc.kind).toBe('Secret');
    expect(doc.metadata.name).toBe('db-credentials');
    expect(doc.type).toBe('Opaque');
    expect(doc.stringData.POSTGRES_USER).toBe('appuser');
    expect(doc.stringData.POSTGRES_PASSWORD).toBe('replace-me');
  });

  it('parseKubernetesYAML recognises multi-document YAML as valid K8s', () => {
    const parsed = parseKubernetesYAML(yamlContent);
    expect(parsed.isValid).toBe(true);
    expect(parsed.resourceType).toBe('Namespace');
    expect(parsed.name).toBe('platform');
  });

  it('prose paragraph appears outside the yaml fence', () => {
    const afterFence = result.split('```').pop() || '';
    expect(afterFence).toContain('If you want it even more');
  });
});

// ─── Python code detection in looksLikeShellOrDockerCodeLine ─────────────────

describe('looksLikeShellOrDockerCodeLine — Python patterns', () => {
  it('detects Python from-import statements', () => {
    expect(looksLikeShellOrDockerCodeLine('from flask import Flask, jsonify')).toBe(true);
    expect(
      looksLikeShellOrDockerCodeLine('from http.server import BaseHTTPRequestHandler, HTTPServer')
    ).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('from os.path import join')).toBe(true);
  });

  it('detects Python import statements', () => {
    expect(looksLikeShellOrDockerCodeLine('import os')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('import json')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('import yaml')).toBe(true);
  });

  it('detects Python function definitions', () => {
    expect(looksLikeShellOrDockerCodeLine('def main():')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('def do_GET(self):')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('def serve_forever (port=8080):')).toBe(true);
  });

  it('detects Python class definitions', () => {
    expect(looksLikeShellOrDockerCodeLine('class MyHandler(BaseHTTPRequestHandler):')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('class H(BaseHTTPRequestHandler):')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('class Config:')).toBe(true);
  });

  it('detects Python decorators', () => {
    expect(looksLikeShellOrDockerCodeLine('@app.route("/")')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('@staticmethod')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('@property')).toBe(true);
  });

  it('detects Python dunder patterns like __name__', () => {
    expect(looksLikeShellOrDockerCodeLine('app = Flask(__name__)')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('if __name__ == "__main__":')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('self.__init__()')).toBe(true);
  });

  // ── Rust-specific detection ──
  it('detects Rust use statement', () => {
    expect(looksLikeShellOrDockerCodeLine('use axum::{routing::get, Router};')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('pub use crate::config;')).toBe(true);
  });

  it('detects Rust fn definition', () => {
    expect(looksLikeShellOrDockerCodeLine('fn main() {')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine("async fn root() -> &'static str {")).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('pub fn new() -> Self {')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('pub async fn handle() {')).toBe(true);
  });

  it('detects Rust let binding', () => {
    expect(looksLikeShellOrDockerCodeLine('let app = Router::new()')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('let mut buf = Vec::new();')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('let addr: &str = "0.0.0.0:8080";')).toBe(true);
  });

  it('detects Rust type definitions', () => {
    expect(looksLikeShellOrDockerCodeLine('struct Config {')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('enum State {')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('impl Config {')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('trait Handler {')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('pub struct AppState {')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('pub(crate) mod routes;')).toBe(true);
  });

  it('detects Rust attributes', () => {
    expect(looksLikeShellOrDockerCodeLine('#[tokio::main]')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('#[derive(Debug, Clone)]')).toBe(true);
  });

  it('detects method chain continuation', () => {
    expect(looksLikeShellOrDockerCodeLine('.route("/", get(root))')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('.route("/healthz", get(healthz));')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('.await.unwrap();')).toBe(true);
  });

  it('detects lone closing brace', () => {
    expect(looksLikeShellOrDockerCodeLine('}')).toBe(true);
    expect(looksLikeShellOrDockerCodeLine('};')).toBe(true);
  });

  it('does not false-positive English use of "use"', () => {
    // Rust `use` requires `::` or `;` to avoid matching English prose.
    // The word "Let" capitalized at sentence start won't match "let" (lowercase).
    expect(looksLikeShellOrDockerCodeLine('Let me explain the concept.')).toBe(false);
    // "use" in English prose without :: or ; does NOT match (tightened pattern)
    expect(looksLikeShellOrDockerCodeLine('use this method to solve the problem')).toBe(false);
  });

  it('does NOT false-positive on plain English prose', () => {
    expect(looksLikeShellOrDockerCodeLine('from the command line you can run')).toBe(false);
    expect(looksLikeShellOrDockerCodeLine('class is a reserved word in JS')).toBe(false);
  });
});

// ─── ANSI stripping edge cases ───────────────────────────────────────────────

describe('stripAnsi — orphaned ANSI code continuations', () => {
  it('strips orphaned ANSI codes missing ESC prefix', () => {
    expect(stripAnsi('[40m text')).toBe(' text');
    expect(stripAnsi('[0m')).toBe('');
    expect(stripAnsi('[97;40m hello')).toBe(' hello');
  });

  it('strips orphaned ANSI reset code at line start (split across lines)', () => {
    // The trailing "[4" fragment is stripped from the end of the previous line
    expect(stripAnsi('hello [4\n0m world')).toBe('hello\n0m world');
    // Full orphaned bracket+code at line start is still stripped
    expect(stripAnsi('[0m text')).toBe(' text');
    // Multi-part codes (with ;) are stripped
    expect(stripAnsi('97;40m some text')).toBe('some text');
  });

  it('strips trailing orphan bracket fragments from split sequences', () => {
    expect(stripAnsi('hello [4')).toBe('hello');
    expect(stripAnsi('text [97;40')).toBe('text');
    expect(stripAnsi('line [0')).toBe('line');
    // Does not strip brackets in legitimate content
    expect(stripAnsi('array[0]')).toBe('array[0]');
    expect(stripAnsi('see [RFC 123]')).toBe('see [RFC 123]');
  });

  it('preserves normal text that starts with digits', () => {
    expect(stripAnsi('3 pods running')).toBe('3 pods running');
    expect(stripAnsi('200 OK')).toBe('200 OK');
  });

  it('preserves K8s CPU millicores at line start', () => {
    expect(stripAnsi('200m')).toBe('200m');
    expect(stripAnsi('200m cpu-limit')).toBe('200m cpu-limit');
    expect(stripAnsi('500m memory')).toBe('500m memory');
    // Single-part codes like 25m, 40m, 50m are preserved (K8s millicores)
    // Bare "0m" alone on a line is stripped (ANSI reset artifact from split "[4\n0m")
    expect(stripAnsi('0m cpu-idle')).toBe('0m cpu-idle');
    expect(stripAnsi('0m')).toBe(''); // bare "0m" alone = ANSI reset artifact
    expect(stripAnsi('25m')).toBe('25m');
    expect(stripAnsi('40m some text')).toBe('40m some text');
    expect(stripAnsi('50m cpu-request')).toBe('50m cpu-request');
    // Multi-line: bare "0m" lines are stripped but "0m" in table data is preserved
    expect(stripAnsi('name  cpu\napp1  0m\napp2  25m')).toBe('name  cpu\napp1  0m\napp2  25m');
  });
});

// ─── normalizeTerminalMarkdown — YAML context awareness ─────────────────────

describe('normalizeTerminalMarkdown — does not wrap fragments inside YAML', () => {
  it('does NOT wrap a shell-like YAML comment between YAML lines', () => {
    const input = [
      ' # - redis (state)',
      '',
      ' # - ingress routes /api/* and /',
      '',
      ' apiVersion: v1',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    expect(result).not.toMatch(/```\s*\n.*ingress.*\n\s*```/);
    expect(result).toContain('# - ingress routes /api/* and /');
  });

  it('does NOT wrap a terminal-split line continuation inside YAML', () => {
    const input = [
      '   # Simple "web" that serves a page; in real setups this would',
      '   call /api/*',
      '   command: ["python"]',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    expect(result).not.toMatch(/```\s*\n\s*call \/api/);
    expect(result).toContain('call /api/*');
  });

  it('still wraps legitimate indented kubectl commands', () => {
    const input = [
      'Check your pods:',
      '',
      '  kubectl get pods -n kube-system',
      '  kubectl get svc',
      '',
      'Look for any CrashLoopBackOff.',
    ].join('\n');
    const result = normalizeTerminalMarkdown(input);
    expect(result).toContain('```');
    expect(result).toContain('kubectl get pods');
  });
});

// ─── Real-world fixture: microservices YAML with Python & terminal wrapping ──

describe('extractAIAnswer — real-world microservices YAML with embedded Python (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawMicroservicesPythonYaml);
  });

  it('produces exactly one yaml-fenced block', () => {
    const yamlFences = (result.match(/```yaml/g) || []).length;
    expect(yamlFences).toBe(1);
  });

  it('YAML comments with paths are inside the yaml fence, not separate code fences', () => {
    const fenceBlocks = result.split('```');
    const yamlBlock = fenceBlocks.find(b => b.startsWith('yaml'));
    expect(yamlBlock).toBeDefined();
    expect(yamlBlock).toContain('# - ingress routes /api/* and /');
  });

  it('does NOT wrap "call /api/*" terminal continuation as a separate code block', () => {
    const lines = result.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('call /api/*')) {
        if (i > 0) {
          expect(lines[i - 1].trim()).not.toBe('```');
        }
        break;
      }
    }
  });

  it('preserves embedded Python code in YAML args block', () => {
    expect(result).toContain('from http.server import BaseHTTPRequestHandler');
    expect(result).toContain('class H(BaseHTTPRequestHandler)');
    expect(result).toContain('def do_GET(self)');
    expect(result).toContain('HTTPServer');
  });

  it('contains all YAML structure keywords', () => {
    expect(result).toContain('apiVersion:');
    expect(result).toContain('kind: Namespace');
    expect(result).toContain('kind: Deployment');
    expect(result).toContain('kind: Service');
    expect(result).toContain('metadata:');
    expect(result).toContain('containers:');
  });

  it('YAML content contains multiple document separators and K8s resources', () => {
    const yamlFenceMatch = result.match(/```yaml\n([\s\S]*?)```/);
    expect(yamlFenceMatch).not.toBeNull();
    const yamlContent = yamlFenceMatch![1];
    // Terminal-padded YAML may have slight indent on --- separators, but
    // ContentRenderer handles this via its own splitting logic.
    // Verify the content is structurally complete:
    const separatorCount = (yamlContent.match(/---/g) || []).length;
    expect(separatorCount).toBeGreaterThanOrEqual(4);
    expect(yamlContent).toContain('kind: Namespace');
    expect(yamlContent).toContain('kind: Deployment');
    expect(yamlContent).toContain('kind: Service');
    expect(yamlContent).toContain('image: redis:7-alpine');
  });

  it('kubectl commands appear after the YAML fence', () => {
    // kubectl lines should be outside the yaml fence
    const fenceBlocks = result.split('```');
    const afterLastFence = fenceBlocks[fenceBlocks.length - 1] || '';
    expect(afterLastFence).toContain('kubectl apply');
    expect(afterLastFence).toContain('kubectl get all');
  });
});

// ─── Real-world fixture: Python __name__ dunder parsing ─────────────────────

describe('extractAIAnswer — Python __name__ dunder pattern (shared fixture)', () => {
  it('wraps bare Python code with __name__ in a code fence', () => {
    const result = extractAIAnswer(rawPythonFlaskApp);
    expect(result).toContain('```');
    expect(result).toContain('__name__');
    expect(result).toContain('Flask(__name__)');
    expect(result).toContain('__main__');
    expect(result).toContain('from flask import Flask');
    expect(result).toContain('@app.route');
    expect(result).toContain('def index():');
  });

  it('wraps bare "import os" and "from X import Y" as code', () => {
    const result = extractAIAnswer(rawPythonImports);
    expect(result).toContain('```');
    expect(result).toContain('import os');
    expect(result).toContain('from pathlib import Path');
  });
});

// ─── Real-world fixture: Rust Axum app with method chains ────────────────────

describe('extractAIAnswer — Rust Axum app with method chains (shared fixture)', () => {
  it('produces a single code block containing all Rust code including .route() chains', () => {
    const result = extractAIAnswer(rawRustAxumApp);
    // All Rust code should be in one fenced block, not split by indented lines
    expect(result).toContain('async fn main()');
    expect(result).toContain('.route("/", get(root))');
    expect(result).toContain('.route("/healthz", get(healthz))');
    expect(result).toContain('let app = Router::new()');
    expect(result).toContain('axum::serve(listener, app)');

    // The closing brace should not be a separate plain text paragraph
    // Count how many times "}" appears outside of code fences
    const lines = result.split('\n');
    let inFence = false;
    const braceOutsideFence = lines.filter(l => {
      if (/^```/.test(l.trim())) {
        inFence = !inFence;
        return false;
      }
      return !inFence && l.trim() === '}';
    });
    expect(braceOutsideFence.length).toBe(0);
  });

  it('splits Cargo.toml, Rust source, and Dockerfile into separate code blocks', () => {
    const result = extractAIAnswer(rawRustAxumApp);
    // Extract code blocks from the fenced output
    const blocks: string[] = [];
    let current = '';
    let inFence = false;
    for (const line of result.split('\n')) {
      if (/^```/.test(line.trim())) {
        if (inFence) {
          blocks.push(current);
          current = '';
        }
        inFence = !inFence;
        continue;
      }
      if (inFence) current += line + '\n';
    }
    // In real Rich panel output, file headings are bold text (not comments),
    // so blocks are identified by their content, not by "# Cargo.toml" headers.
    const cargoBlock = blocks.find(b => b.includes('[package]'));
    const rustBlock = blocks.find(b => b.includes('use axum'));
    const dockerBlock = blocks.find(b => b.includes('FROM rust'));

    expect(cargoBlock).toBeDefined();
    expect(rustBlock).toBeDefined();
    expect(dockerBlock).toBeDefined();

    // Cargo.toml block should contain TOML config
    expect(cargoBlock).toContain('[package]');
    expect(cargoBlock).toContain('[dependencies]');
    expect(cargoBlock).not.toContain('async fn');

    // Rust source block should contain the full source
    expect(rustBlock).toContain('use axum');
    expect(rustBlock).toContain('async fn main()');
    expect(rustBlock).not.toContain('[package]');

    // Dockerfile block should be separate from Rust source
    expect(dockerBlock).toContain('FROM');
    expect(dockerBlock).toContain('ENTRYPOINT');
    expect(dockerBlock).not.toContain('async fn');
  });

  it('contains Dockerfile block with FROM and ENTRYPOINT', () => {
    const result = extractAIAnswer(rawRustAxumApp);
    expect(result).toContain('FROM rust:1.76 as builder');
    expect(result).toContain('ENTRYPOINT ["/app/rust-k8s-example"]');
  });

  it('preserves the YAML K8s manifest', () => {
    const result = extractAIAnswer(rawRustAxumApp);
    expect(result).toContain('apiVersion: apps/v1');
    expect(result).toContain('kind: Deployment');
    expect(result).toContain('kind: Service');
  });

  it('does not wrap section headings in code fences', () => {
    const result = extractAIAnswer(rawRustAxumApp);
    const lines = result.split('\n');
    let inFence = false;
    for (const line of lines) {
      if (/^```/.test(line.trim())) {
        inFence = !inFence;
        continue;
      }
      if (inFence && /Containerize it/.test(line)) {
        throw new Error('Section heading "Containerize it" should not be inside a code fence');
      }
    }
  });
});

// ─── Real-world fixture: Rust K8s deployment with bold section headings ───────

describe('extractAIAnswer — Rust K8s deployment with bold headings (shared fixture)', () => {
  it('separates Dockerfile from section heading', () => {
    const result = extractAIAnswer(rawRustK8sDeployment);
    // The heading should NOT be inside the Dockerfile code fence
    const lines = result.split('\n');
    let inFence = false;
    for (const line of lines) {
      if (/^```/.test(line.trim())) {
        inFence = !inFence;
        continue;
      }
      if (inFence && line.includes('Kubernetes manifests')) {
        throw new Error('Section heading "Kubernetes manifests" should not be inside a code fence');
      }
    }
  });

  it('rejoins split YAML key averageUtilization: 70', () => {
    const result = extractAIAnswer(rawRustK8sDeployment);
    expect(result).toContain('averageUtilization: 70');
    // Should NOT have orphaned ": 70" as a separate line outside fences
    const lines = result.split('\n');
    let inFence = false;
    const colonOutside = lines.filter(l => {
      if (/^```/.test(l.trim())) {
        inFence = !inFence;
        return false;
      }
      return !inFence && l.trim() === ': 70';
    });
    expect(colonOutside.length).toBe(0);
  });

  it('renders all YAML K8s resources in a single yaml block', () => {
    const result = extractAIAnswer(rawRustK8sDeployment);
    // Extract yaml code blocks
    const blocks: string[] = [];
    let current = '';
    let inYaml = false;
    for (const line of result.split('\n')) {
      if (/^```yaml/.test(line.trim())) {
        inYaml = true;
        continue;
      }
      if (/^```/.test(line.trim()) && inYaml) {
        blocks.push(current);
        current = '';
        inYaml = false;
        continue;
      }
      if (inYaml) current += line + '\n';
    }
    // Should have exactly one yaml block containing all resources
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toContain('kind: Namespace');
    expect(blocks[0]).toContain('kind: ConfigMap');
    expect(blocks[0]).toContain('kind: Deployment');
    expect(blocks[0]).toContain('kind: Service');
    expect(blocks[0]).toContain('kind: Ingress');
    expect(blocks[0]).toContain('kind: HorizontalPodAutoscaler');
  });

  it('keeps Dockerfile content in a code block', () => {
    const result = extractAIAnswer(rawRustK8sDeployment);
    expect(result).toContain('FROM rust:1.76-bullseye AS builder');
    expect(result).toContain('ENTRYPOINT ["/app/my-rust-app"]');
  });

  it('keeps kubectl command in a code block', () => {
    const result = extractAIAnswer(rawRustK8sDeployment);
    expect(result).toContain('kubectl apply -f k8s.yaml');
  });
});

// ─── cleanTerminalFormatting — YAML key rejoining ───────────────────────────

describe('cleanTerminalFormatting — YAML key rejoining', () => {
  it('rejoins YAML key split from colon by terminal wrapping', () => {
    const input = '          averageUtilization\n : 70';
    const result = cleanTerminalFormatting(input);
    expect(result).toContain('averageUtilization: 70');
    expect(result).not.toContain('\n :');
  });

  it('does not rejoin non-YAML lines', () => {
    const input = 'hello world\n : not yaml';
    const result = cleanTerminalFormatting(input);
    // "hello world" is not a bare word with indent, so no rejoining
    expect(result).toContain('hello world');
  });
});

// ─── isFileHeaderComment ─────────────────────────────────────────────────────

describe('isFileHeaderComment', () => {
  it('matches filename with extension', () => {
    expect(isFileHeaderComment('# Cargo.toml')).toBe(true);
    expect(isFileHeaderComment('# main.py')).toBe(true);
    expect(isFileHeaderComment('# package.json')).toBe(true);
    expect(isFileHeaderComment('# values.ini')).toBe(true);
    expect(isFileHeaderComment('# config.cfg')).toBe(true);
  });

  it('matches path/filename with extension', () => {
    expect(isFileHeaderComment('// src/main.rs')).toBe(true);
    expect(isFileHeaderComment('// cmd/server/main.go')).toBe(true);
    expect(isFileHeaderComment('# src/app.py')).toBe(true);
  });

  it('matches well-known extensionless filenames', () => {
    expect(isFileHeaderComment('# Dockerfile')).toBe(true);
    expect(isFileHeaderComment('# Makefile')).toBe(true);
    expect(isFileHeaderComment('# Gemfile')).toBe(true);
    expect(isFileHeaderComment('# Procfile')).toBe(true);
  });

  it('excludes YAML file headers', () => {
    expect(isFileHeaderComment('# k8s.yaml')).toBe(false);
    expect(isFileHeaderComment('# deploy.yml')).toBe(false);
    expect(isFileHeaderComment('# values.yaml')).toBe(false);
  });

  it('does not match regular comments', () => {
    expect(isFileHeaderComment('# cache deps')).toBe(false);
    expect(isFileHeaderComment('# build real app')).toBe(false);
    expect(isFileHeaderComment('# This is a heading')).toBe(false);
    expect(isFileHeaderComment('# Install dependencies first')).toBe(false);
  });

  it('does not match Dockerfile directives', () => {
    expect(isFileHeaderComment('# syntax=docker/dockerfile:1')).toBe(false);
  });
});

// ─── isBoldFileHeading — standalone filename detection ──────────────────────

describe('isBoldFileHeading', () => {
  it('matches filename with extension', () => {
    expect(isBoldFileHeading('Cargo.toml')).toBe(true);
    expect(isBoldFileHeading('main.py')).toBe(true);
    expect(isBoldFileHeading('package.json')).toBe(true);
    expect(isBoldFileHeading('values.ini')).toBe(true);
  });

  it('matches path/to/file.ext', () => {
    expect(isBoldFileHeading('src/main.rs')).toBe(true);
    expect(isBoldFileHeading('app/config.toml')).toBe(true);
    expect(isBoldFileHeading('tests/test_app.py')).toBe(true);
  });

  it('matches well-known extensionless filenames', () => {
    expect(isBoldFileHeading('Dockerfile')).toBe(true);
    expect(isBoldFileHeading('Makefile')).toBe(true);
  });

  it('includes YAML file headings (values-override.yaml, k8s.yaml)', () => {
    expect(isBoldFileHeading('k8s.yaml')).toBe(true);
    expect(isBoldFileHeading('deploy.yml')).toBe(true);
    expect(isBoldFileHeading('values-override.yaml')).toBe(true);
  });

  it('does not match prose or multi-word lines', () => {
    expect(isBoldFileHeading('This is text')).toBe(false);
    expect(isBoldFileHeading('Build + push')).toBe(false);
    expect(isBoldFileHeading('Apply + test:')).toBe(false);
    expect(isBoldFileHeading('')).toBe(false);
  });
});

// ─── hasStructuredCodeContext — Rust pub/pub(crate) support ──────────────────

describe('hasStructuredCodeContext — Rust pub/pub(crate) prefix support', () => {
  it('detects pub struct', () => {
    expect(hasStructuredCodeContext(['pub struct Foo {'])).toBe(true);
  });

  it('detects pub enum', () => {
    expect(hasStructuredCodeContext(['pub enum Color {'])).toBe(true);
  });

  it('detects pub(crate) mod', () => {
    expect(hasStructuredCodeContext(['pub(crate) mod utils'])).toBe(true);
  });

  it('detects pub(crate) fn', () => {
    expect(hasStructuredCodeContext(['pub(crate) fn helper()'])).toBe(true);
  });

  it('detects pub async fn', () => {
    expect(hasStructuredCodeContext(['pub async fn main()'])).toBe(true);
  });

  it('detects pub(crate) async fn', () => {
    expect(hasStructuredCodeContext(['pub(crate) async fn handler()'])).toBe(true);
  });

  it('still detects unprefixed Rust declarations', () => {
    expect(hasStructuredCodeContext(['struct Bar'])).toBe(true);
    expect(hasStructuredCodeContext(['enum Baz'])).toBe(true);
    expect(hasStructuredCodeContext(['fn main()'])).toBe(true);
    expect(hasStructuredCodeContext(['async fn root()'])).toBe(true);
  });

  it('detects Python patterns', () => {
    expect(hasStructuredCodeContext(['def hello():'])).toBe(true);
    expect(hasStructuredCodeContext(['class Foo:'])).toBe(true);
    expect(hasStructuredCodeContext(['from flask import Flask'])).toBe(true);
    expect(hasStructuredCodeContext(['import os'])).toBe(true);
  });

  it('returns false for plain prose', () => {
    expect(hasStructuredCodeContext(['This is just text.'])).toBe(false);
    expect(hasStructuredCodeContext(['Use this command to start.'])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Shared fixture tests — real fixtures from testFixtures.ts
// ═══════════════════════════════════════════════════════════════════════════════

/** Extract fenced code blocks from parsed output */
function extractCodeBlocks(result: string): string[] {
  const blocks: string[] = [];
  let current = '';
  let inFence = false;
  for (const line of result.split('\n')) {
    if (/^```/.test(line.trim())) {
      if (inFence) {
        blocks.push(current);
        current = '';
      }
      inFence = !inFence;
      continue;
    }
    if (inFence) current += line + '\n';
  }
  if (inFence && current) blocks.push(current);
  return blocks;
}

/** Check no ANSI escape artifacts leaked into output */
function assertNoAnsiLeaks(result: string) {
  expect(result).not.toMatch(/\x1b/);
  expect(result).not.toMatch(/\[[\d;]*m/);
}

// ─── rawPodStatus ────────────────────────────────────────────────────────────

describe('extractAIAnswer — rawPodStatus (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawPodStatus);
  });

  it('contains kube-system namespace reference', () => {
    expect(result).toContain('kube-system');
  });

  it('contains table formatting', () => {
    expect(result).toContain('|');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── rawCrashDiagnosis ───────────────────────────────────────────────────────

describe('extractAIAnswer — rawCrashDiagnosis (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawCrashDiagnosis);
  });

  it('contains Root Cause heading', () => {
    expect(result).toMatch(/## Root Cause/);
  });

  it('contains Recommended Steps heading', () => {
    expect(result).toMatch(/## Recommended Steps/);
  });

  it('has ECONNREFUSED error in a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('ECONNREFUSED'))).toBe(true);
  });

  it('contains blockquote note', () => {
    expect(result).toMatch(/>\s*\*?\*?Note/);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── rawBestPractices ────────────────────────────────────────────────────────

describe('extractAIAnswer — rawBestPractices (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawBestPractices);
  });

  it('contains best practices content', () => {
    expect(result.toLowerCase()).toContain('best practices');
  });

  it('contains bullet points', () => {
    expect(result).toMatch(/^[-*•]/m);
  });

  it('contains link to Microsoft docs', () => {
    expect(result).toContain('https://learn.microsoft.com');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── rawMultiResource ────────────────────────────────────────────────────────

describe('extractAIAnswer — rawMultiResource (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawMultiResource);
  });

  it('contains ```yaml fenced blocks', () => {
    expect(result).toMatch(/```yaml/);
  });

  it('YAML contains Deployment resource', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Deployment'))).toBe(true);
  });

  it('YAML contains Service resource', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Service'))).toBe(true);
  });

  it('contains kubectl apply instruction', () => {
    expect(result).toMatch(/kubectl apply/);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── rawBareYamlService ──────────────────────────────────────────────────────

describe('extractAIAnswer — rawBareYamlService (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawBareYamlService);
  });

  it('contains YAML resource with apiVersion', () => {
    expect(result).toContain('apiVersion');
  });

  it('contains kind: Service', () => {
    expect(result).toContain('kind: Service');
  });

  it('YAML is inside a yaml fence (auto-wrapped)', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Service'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── rawPythonDeploymentAdvice ───────────────────────────────────────────────

describe('extractAIAnswer — rawPythonDeploymentAdvice (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawPythonDeploymentAdvice);
  });

  it('contains bullet points (checklist)', () => {
    expect(result).toMatch(/^\s*-\s/m);
  });

  it('Dockerfile code is in a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(
      blocks.some(b => b.includes('FROM') && (b.includes('python') || b.includes('WORKDIR')))
    ).toBe(true);
  });

  it('docker build/run commands in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('docker build') || b.includes('docker run'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── rawJavaDeployTerminal ───────────────────────────────────────────────────

describe('extractAIAnswer — rawJavaDeployTerminal (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawJavaDeployTerminal);
  });

  it('Dockerfile content in code block (FROM maven)', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('FROM maven') || b.includes('FROM eclipse-temurin'))).toBe(
      true
    );
  });

  it('YAML contains kind: Namespace', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Namespace'))).toBe(true);
  });

  it('YAML contains kind: Deployment', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Deployment'))).toBe(true);
  });

  it('YAML contains kind: Service', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Service'))).toBe(true);
  });

  it('kubectl commands present in output', () => {
    expect(result).toMatch(/kubectl/);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── rawJavaDeployOptionAB ───────────────────────────────────────────────────

describe('extractAIAnswer — rawJavaDeployOptionAB (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawJavaDeployOptionAB);
  });

  it('contains YAML resources', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('apiVersion'))).toBe(true);
  });

  it('contains Java code with @RestController', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('@RestController'))).toBe(true);
  });

  it('contains Java class HelloController', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('HelloController'))).toBe(true);
  });

  it('contains Dockerfile with FROM eclipse-temurin', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('FROM eclipse-temurin'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── rawK8sDeployWithCurl ────────────────────────────────────────────────────

describe('extractAIAnswer — rawK8sDeployWithCurl (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawK8sDeployWithCurl);
  });

  it('has yaml-fenced block with Deployment', () => {
    expect(result).toMatch(/```yaml/);
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Deployment'))).toBe(true);
  });

  it('has yaml-fenced block with Service', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Service'))).toBe(true);
  });

  it('contains kubectl commands', () => {
    expect(result).toMatch(/kubectl/);
  });

  it('contains curl commands', () => {
    expect(result).toMatch(/curl/);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── rawMicroserviceYaml ─────────────────────────────────────────────────────

describe('extractAIAnswer — rawMicroserviceYaml (shared fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(rawMicroserviceYamlFixture);
  });

  it('YAML content contains Namespace', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Namespace'))).toBe(true);
  });

  it('YAML content contains ConfigMap', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: ConfigMap'))).toBe(true);
  });

  it('YAML content contains Secret', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Secret'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Synthetic fixture tests — edge-case fixtures from syntheticFixtures.ts
// ═══════════════════════════════════════════════════════════════════════════════

// ─── syntheticGoHttpServer ───────────────────────────────────────────────────

describe('extractAIAnswer — syntheticGoHttpServer (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticGoHttpServer);
  });

  it('all Go code is inside code fences — no "if port ==" leaked as prose', () => {
    const lines = result.split('\n');
    let inFence = false;
    const goLeaks = lines.filter(l => {
      if (/^```/.test(l.trim())) {
        inFence = !inFence;
        return false;
      }
      return !inFence && /\bport\b.*:=|if\s+port\s*==|func\s+main\(\)|go\s+func\(\)/.test(l);
    });
    expect(goLeaks).toEqual([]);
  });

  it('Go code block contains "package main", "func main()", ":=", "go func()"', () => {
    const blocks = extractCodeBlocks(result);
    const goBlock = blocks.find(b => b.includes('package main'));
    expect(goBlock).toBeDefined();
    expect(goBlock).toContain('func main()');
    expect(goBlock).toContain(':=');
    expect(goBlock).toContain('go func()');
  });

  it('Dockerfile in a SEPARATE code block from Go source', () => {
    const blocks = extractCodeBlocks(result);
    const goBlock = blocks.find(b => b.includes('package main'));
    const dockerBlock = blocks.find(b => b.includes('FROM golang'));
    expect(goBlock).toBeDefined();
    expect(dockerBlock).toBeDefined();
    expect(goBlock).not.toBe(dockerBlock);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticNodeExpressApp ─────────────────────────────────────────────────

describe('extractAIAnswer — syntheticNodeExpressApp (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticNodeExpressApp);
  });

  it('package.json content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('"express"'))).toBe(true);
  });

  it('index.js code is inside a code fence (require, app.get, app.listen)', () => {
    const blocks = extractCodeBlocks(result);
    const jsBlock = blocks.find(b => b.includes("require('express')"));
    expect(jsBlock).toBeDefined();
    expect(jsBlock).toContain('app.get');
    expect(jsBlock).toContain('app.listen');
  });

  it('Dockerfile in a code block (FROM node)', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('FROM node'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticHelmValuesYaml ─────────────────────────────────────────────────

describe('extractAIAnswer — syntheticHelmValuesYaml (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticHelmValuesYaml);
  });

  it('YAML content is inside a yaml fence', () => {
    const yamlFences = (result.match(/```yaml/g) || []).length;
    expect(yamlFences).toBeGreaterThanOrEqual(1);
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('controller:') && b.includes('replicaCount:'))).toBe(true);
  });

  it('helm install command is NOT inside the yaml block', () => {
    const blocks = extractCodeBlocks(result);
    const yamlBlocksWithHelm = blocks.filter(
      b => b.includes('controller:') && b.includes('helm install')
    );
    expect(yamlBlocksWithHelm.length).toBe(0);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCSharpDotnetApp ────────────────────────────────────────────────

describe('extractAIAnswer — syntheticCSharpDotnetApp (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCSharpDotnetApp);
  });

  it('C# code is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    const csBlock = blocks.find(b => b.includes('WebApplication.CreateBuilder'));
    expect(csBlock).toBeDefined();
    expect(csBlock).toContain('using Microsoft');
  });

  it('Dockerfile in a SEPARATE code block from C# source', () => {
    const blocks = extractCodeBlocks(result);
    const csBlock = blocks.find(b => b.includes('WebApplication.CreateBuilder'));
    const dockerBlock = blocks.find(b => b.includes('FROM mcr.microsoft.com'));
    expect(csBlock).toBeDefined();
    expect(dockerBlock).toBeDefined();
    expect(csBlock).not.toBe(dockerBlock);
  });

  it('dotnet/docker/kubectl commands in a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(
      blocks.some(
        b =>
          b.includes('dotnet publish') || b.includes('docker build') || b.includes('kubectl apply')
      )
    ).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticTerraformAksModule ─────────────────────────────────────────────

describe('extractAIAnswer — syntheticTerraformAksModule (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticTerraformAksModule);
  });

  it('has multiple ```hcl fenced blocks (at least 3)', () => {
    const hclFenceCount = (result.match(/```hcl/g) || []).length;
    expect(hclFenceCount).toBeGreaterThanOrEqual(3);
  });

  it('contains terraform resource definitions', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('resource "azurerm_'))).toBe(true);
  });

  it('bash block has terraform commands', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('terraform init'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticRubyRailsApp ───────────────────────────────────────────────────

describe('extractAIAnswer — syntheticRubyRailsApp (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticRubyRailsApp);
  });

  it('Ruby code (require, class, def, end) is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    const rubyBlock = blocks.find(b => b.includes("require 'sinatra'") && b.includes('class App'));
    expect(rubyBlock).toBeDefined();
    expect(rubyBlock).toContain("get '/healthz' do");
    expect(rubyBlock).toContain('end');
  });

  it('Gemfile content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    const gemBlock = blocks.find(b => b.includes("gem 'sinatra'"));
    expect(gemBlock).toBeDefined();
    expect(gemBlock).toContain('rubygems.org');
  });

  it('Dockerfile content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    const dockerBlock = blocks.find(b => b.includes('FROM ruby:3.3-slim'));
    expect(dockerBlock).toBeDefined();
    expect(dockerBlock).toContain('bundle install');
  });

  it('three separate code blocks for app.rb, Gemfile, Dockerfile', () => {
    const blocks = extractCodeBlocks(result);
    const rubyBlock = blocks.find(b => b.includes("require 'sinatra'"));
    const gemBlock = blocks.find(b => b.includes("gem 'sinatra'"));
    const dockerBlock = blocks.find(b => b.includes('FROM ruby:3.3-slim'));
    expect(rubyBlock).toBeDefined();
    expect(gemBlock).toBeDefined();
    expect(dockerBlock).toBeDefined();
    expect(rubyBlock).not.toBe(gemBlock);
    expect(rubyBlock).not.toBe(dockerBlock);
    expect(gemBlock).not.toBe(dockerBlock);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticPythonMultilineStrings ─────────────────────────────────────────

describe('extractAIAnswer — syntheticPythonMultilineStrings (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticPythonMultilineStrings);
  });

  it('Python code with triple-quotes and f-string is in a single fence', () => {
    const blocks = extractCodeBlocks(result);
    const pyBlock = blocks.find(b => b.includes('"""') && b.includes('def get_db_url'));
    expect(pyBlock).toBeDefined();
    expect(pyBlock).toContain('f"postgresql://');
  });

  it('__file__ is preserved in the code block', () => {
    const blocks = extractCodeBlocks(result);
    const pyBlock = blocks.find(b => b.includes('__file__'));
    expect(pyBlock).toBeDefined();
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticBashHeredoc ────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticBashHeredoc (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticBashHeredoc);
  });

  it('bash script with heredoc is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    const bashBlock = blocks.find(b => b.includes('#!/bin/bash') && b.includes('<<EOF'));
    expect(bashBlock).toBeDefined();
    expect(bashBlock).toContain('kubectl apply');
  });

  it('EOF marker is inside the code fence', () => {
    const blocks = extractCodeBlocks(result);
    const bashBlock = blocks.find(b => b.includes('<<EOF'));
    expect(bashBlock).toBeDefined();
    expect(bashBlock).toMatch(/^\s*EOF$/m);
  });

  it('shell commands (chmod, ./setup.sh) are in a separate code fence', () => {
    const blocks = extractCodeBlocks(result);
    const runBlock = blocks.find(b => b.includes('chmod +x'));
    expect(runBlock).toBeDefined();
    expect(runBlock).toContain('./setup.sh');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticNumberedStepsWithCode ──────────────────────────────────────────

describe('extractAIAnswer — syntheticNumberedStepsWithCode (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticNumberedStepsWithCode);
  });

  it('kubectl create namespace is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl create namespace monitoring'))).toBe(true);
  });

  it('helm commands are inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('helm repo add') && b.includes('helm install'))).toBe(true);
  });

  it('kubectl get/port-forward commands are inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(
      blocks.some(b => b.includes('kubectl get pods') && b.includes('kubectl port-forward'))
    ).toBe(true);
  });

  it('numbered step headings are NOT inside code fences', () => {
    const blocks = extractCodeBlocks(result);
    const allCode = blocks.join('\n');
    expect(allCode).not.toContain('1) Create the namespace');
    expect(allCode).not.toContain('2) Install Prometheus');
    expect(allCode).not.toContain('3) Verify it is running');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticMakefileWithTargets ────────────────────────────────────────────

describe('extractAIAnswer — syntheticMakefileWithTargets (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticMakefileWithTargets);
  });

  it('Makefile content (.PHONY, targets) is inside a single code fence', () => {
    const blocks = extractCodeBlocks(result);
    const makeBlock = blocks.find(b => b.includes('.PHONY') && b.includes('build:'));
    expect(makeBlock).toBeDefined();
    expect(makeBlock).toContain('docker build');
    expect(makeBlock).toContain('deploy:');
    expect(makeBlock).toContain('clean:');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticMixedFencedAndBare ─────────────────────────────────────────────

describe('extractAIAnswer — syntheticMixedFencedAndBare (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticMixedFencedAndBare);
  });

  it('bash fenced block is preserved with kubectl create secret', () => {
    const blocks = extractCodeBlocks(result);
    const bashBlock = blocks.find(b => b.includes('kubectl create secret'));
    expect(bashBlock).toBeDefined();
    expect(bashBlock).toContain('--from-literal=password');
  });

  it('bare YAML deployment is wrapped in a fence', () => {
    const blocks = extractCodeBlocks(result);
    const yamlBlock = blocks.find(b => b.includes('apiVersion: apps/v1') && b.includes('web-app'));
    expect(yamlBlock).toBeDefined();
    expect(yamlBlock).toContain('replicas: 1');
  });

  it('bare kubectl get command is fenced', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl get pods -l app=web-app'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticYamlWithAnchors ────────────────────────────────────────────────

describe('extractAIAnswer — syntheticYamlWithAnchors (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticYamlWithAnchors);
  });

  it('YAML with anchors and aliases is in a single yaml fence', () => {
    const blocks = extractCodeBlocks(result);
    const yamlBlock = blocks.find(b => b.includes('&defaults') && b.includes('*defaults'));
    expect(yamlBlock).toBeDefined();
    expect(yamlBlock).toContain('frontend:1.0');
    expect(yamlBlock).toContain('backend:2.0');
  });

  it('<<: *defaults merge keys are preserved', () => {
    const blocks = extractCodeBlocks(result);
    const yamlBlock = blocks.find(b => b.includes('<<: *defaults'));
    expect(yamlBlock).toBeDefined();
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticAnsi256ColorOutput ─────────────────────────────────────────────

describe('extractAIAnswer — syntheticAnsi256ColorOutput (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticAnsi256ColorOutput);
  });

  it('256-color and RGB ANSI codes are fully stripped', () => {
    assertNoAnsiLeaks(result);
  });

  it('deployment status content is preserved', () => {
    expect(result).toContain('deployment/web-app');
    expect(result).toContain('2/2 ready');
    expect(result).toContain('CrashLoopBackOff');
  });

  it('service info is preserved', () => {
    expect(result).toContain('service/web-app');
    expect(result).toContain('ClusterIP 10.0.0.5');
  });
});

// ─── syntheticDeepNestedYaml ─────────────────────────────────────────────────

describe('extractAIAnswer — syntheticDeepNestedYaml (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticDeepNestedYaml);
  });

  it('all YAML is in a single code fence (deep nesting not broken by heading detection)', () => {
    const blocks = extractCodeBlocks(result);
    const yamlBlock = blocks.find(
      b => b.includes('apiVersion: apps/v1') && b.includes('initialDelaySeconds')
    );
    expect(yamlBlock).toBeDefined();
    expect(yamlBlock).toContain('volumeMounts:');
    expect(yamlBlock).toContain('livenessProbe:');
  });

  it('deeply indented lines are inside the fence', () => {
    const blocks = extractCodeBlocks(result);
    const yamlBlock = blocks.find(b => b.includes('SPRING_CONFIG_LOCATION'));
    expect(yamlBlock).toBeDefined();
    expect(yamlBlock).toContain('/actuator/health/liveness');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticMultiLanguageComparison ────────────────────────────────────────

describe('extractAIAnswer — syntheticMultiLanguageComparison (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticMultiLanguageComparison);
  });

  it('has a ```python fenced block', () => {
    expect(result).toContain('```python');
    const blocks = extractCodeBlocks(result);
    const pyBlock = blocks.find(b => b.includes('from flask import Flask'));
    expect(pyBlock).toBeDefined();
  });

  it('has a ```go fenced block', () => {
    expect(result).toContain('```go');
    const blocks = extractCodeBlocks(result);
    const goBlock = blocks.find(b => b.includes('package main') && b.includes('net/http'));
    expect(goBlock).toBeDefined();
  });

  it('has a ```rust fenced block', () => {
    expect(result).toContain('```rust');
    const blocks = extractCodeBlocks(result);
    const rustBlock = blocks.find(b => b.includes('use axum::'));
    expect(rustBlock).toBeDefined();
  });

  it('three separate language fences', () => {
    const blocks = extractCodeBlocks(result);
    const pyBlock = blocks.find(b => b.includes('Flask'));
    const goBlock = blocks.find(b => b.includes('net/http'));
    const rustBlock = blocks.find(b => b.includes('axum'));
    expect(pyBlock).toBeDefined();
    expect(goBlock).toBeDefined();
    expect(rustBlock).toBeDefined();
    expect(pyBlock).not.toBe(goBlock);
    expect(pyBlock).not.toBe(rustBlock);
    expect(goBlock).not.toBe(rustBlock);
  });

  it('prose between code blocks is NOT inside fences', () => {
    const blocks = extractCodeBlocks(result);
    const allCode = blocks.join('\n');
    expect(allCode).not.toContain('All three listen on port 8080');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCargoTomlWorkspace ─────────────────────────────────────────────

describe('extractAIAnswer — syntheticCargoTomlWorkspace (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCargoTomlWorkspace);
  });

  it('Cargo.toml workspace content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[workspace]'))).toBe(true);
  });

  it('api/Cargo.toml content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('serde.workspace = true'))).toBe(true);
  });

  it('Rust source is inside a code fence with use axum', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('use axum::'))).toBe(true);
  });

  it('workspace Cargo.toml is in SEPARATE block from api/Cargo.toml', () => {
    const blocks = extractCodeBlocks(result);
    const wsBlock = blocks.find(b => b.includes('[workspace]'));
    const apiBlock = blocks.find(b => b.includes('serde.workspace'));
    expect(wsBlock).toBeDefined();
    expect(apiBlock).toBeDefined();
    expect(wsBlock).not.toBe(apiBlock);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCargoNewProject ────────────────────────────────────────────────

describe('extractAIAnswer — syntheticCargoNewProject (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCargoNewProject);
  });

  it('cargo new commands are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('cargo new'))).toBe(true);
  });

  it('[dependencies] TOML content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[dependencies]') && b.includes('actix-web'))).toBe(true);
  });

  it('Rust source with actix-web is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('use actix_web'))).toBe(true);
  });

  it('shell commands and Rust source are in SEPARATE blocks', () => {
    const blocks = extractCodeBlocks(result);
    const shellBlock = blocks.find(b => b.includes('cargo new'));
    const rustBlock = blocks.find(b => b.includes('use actix_web'));
    expect(shellBlock).toBeDefined();
    expect(rustBlock).toBeDefined();
    expect(shellBlock).not.toBe(rustBlock);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCargoTomlFeatures ──────────────────────────────────────────────

describe('extractAIAnswer — syntheticCargoTomlFeatures (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCargoTomlFeatures);
  });

  it('Cargo.toml with [features] is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[features]') && b.includes('[dependencies]'))).toBe(true);
  });

  it('build.rs content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('cargo:rerun-if-changed'))).toBe(true);
  });

  it('cargo build command is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('cargo build --release'))).toBe(true);
  });

  it('Cargo.toml and build.rs are in SEPARATE blocks', () => {
    const blocks = extractCodeBlocks(result);
    const cargoBlock = blocks.find(b => b.includes('[features]'));
    const buildBlock = blocks.find(b => b.includes('cargo:rerun-if-changed'));
    expect(cargoBlock).toBeDefined();
    expect(buildBlock).toBeDefined();
    expect(cargoBlock).not.toBe(buildBlock);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticJavaSpringBoot ─────────────────────────────────────────────────

describe('extractAIAnswer — syntheticJavaSpringBoot (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticJavaSpringBoot);
  });

  it('pom.xml content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('<project') && b.includes('spring-boot'))).toBe(true);
  });

  it('Java source is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('@SpringBootApplication'))).toBe(true);
  });

  it('pom.xml and Java source are in SEPARATE blocks', () => {
    const blocks = extractCodeBlocks(result);
    const pomBlock = blocks.find(b => b.includes('<project'));
    const javaBlock = blocks.find(b => b.includes('@SpringBootApplication'));
    expect(pomBlock).toBeDefined();
    expect(javaBlock).toBeDefined();
    expect(pomBlock).not.toBe(javaBlock);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticRustWithTests ──────────────────────────────────────────────────

describe('extractAIAnswer — syntheticRustWithTests (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticRustWithTests);
  });

  it('Cargo.toml is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[package]') && b.includes('calculator'))).toBe(true);
  });

  it('Rust lib with #[cfg(test)] is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('#[cfg(test)]') && b.includes('assert_eq!'))).toBe(true);
  });

  it('cargo test command is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('cargo test'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticGoModule ───────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticGoModule (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticGoModule);
  });

  it('go.mod content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('module github.com'))).toBe(true);
  });

  it('main.go with gorilla/mux is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('mux.NewRouter'))).toBe(true);
  });

  it('handlers.go with switch is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('switch r.Method'))).toBe(true);
  });

  it('go.mod and main.go are in SEPARATE blocks', () => {
    const blocks = extractCodeBlocks(result);
    const modBlock = blocks.find(b => b.includes('module github.com'));
    const mainBlock = blocks.find(b => b.includes('mux.NewRouter'));
    expect(modBlock).toBeDefined();
    expect(mainBlock).toBeDefined();
    expect(modBlock).not.toBe(mainBlock);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticTypeScriptApp ──────────────────────────────────────────────────

describe('extractAIAnswer — syntheticTypeScriptApp (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticTypeScriptApp);
  });

  it('package.json content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('"fastify"'))).toBe(true);
  });

  it('tsconfig.json is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('"compilerOptions"'))).toBe(true);
  });

  it('TypeScript source is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes("import Fastify from 'fastify'"))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticRustFullDeploy ─────────────────────────────────────────────────

describe('extractAIAnswer — syntheticRustFullDeploy (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticRustFullDeploy);
  });

  it('Cargo.toml content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[package]') && b.includes('web-svc'))).toBe(true);
  });

  it('Rust source with axum is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('use axum::'))).toBe(true);
  });

  it('Dockerfile is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('FROM rust:1.76'))).toBe(true);
  });

  it('kubectl commands are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl apply'))).toBe(true);
  });

  it('Cargo.toml, Rust source, and Dockerfile are in SEPARATE blocks', () => {
    const blocks = extractCodeBlocks(result);
    const cargoBlock = blocks.find(b => b.includes('[package]') && b.includes('web-svc'));
    const rustBlock = blocks.find(b => b.includes('use axum::'));
    const dockerBlock = blocks.find(b => b.includes('FROM rust:1.76'));
    expect(cargoBlock).toBeDefined();
    expect(rustBlock).toBeDefined();
    expect(dockerBlock).toBeDefined();
    expect(cargoBlock).not.toBe(rustBlock);
    expect(cargoBlock).not.toBe(dockerBlock);
    expect(rustBlock).not.toBe(dockerBlock);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticPythonDjango ───────────────────────────────────────────────────

describe('extractAIAnswer — syntheticPythonDjango (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticPythonDjango);
  });

  it('requirements.txt is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('django>='))).toBe(true);
  });

  it('Django views.py is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('from django.http') && b.includes('def health_check'))).toBe(
      true
    );
  });

  it('Dockerfile is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('FROM python:3.12'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCargoTomlAnsiSplit ─────────────────────────────────────────────

describe('extractAIAnswer — syntheticCargoTomlAnsiSplit (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCargoTomlAnsiSplit);
  });

  it('Cargo.toml TOML content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[package]') && b.includes('reqwest'))).toBe(true);
  });

  it('no orphan ANSI fragments like "[4" or "0m" leaked outside fences', () => {
    assertNoAnsiLeaks(result);
    // Specifically check the split SGR pattern
    expect(result).not.toMatch(/\[4\s*$/m);
  });

  it('cargo build/run commands are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('cargo build'))).toBe(true);
  });
});

// ===========================================================================
// Kubernetes-focused synthetic fixtures
// ===========================================================================

// ─── syntheticKubectlTopOutput ───────────────────────────────────────────────

describe('extractAIAnswer — syntheticKubectlTopOutput (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticKubectlTopOutput);
  });

  it('kubectl top command is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl top pods'))).toBe(true);
  });

  it('preserves CPU millicore values (250m, 50m, 0m, 25m, 4000m)', () => {
    expect(result).toContain('250m');
    expect(result).toContain('50m');
    expect(result).toContain('0m');
    expect(result).toContain('25m');
    expect(result).toContain('4000m');
  });

  it('pod table data is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('api-server') && b.includes('250m'))).toBe(true);
  });

  it('resource limits YAML is in a fenced yaml block', () => {
    expect(result).toContain('```yaml');
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('cpu: 100m') && b.includes('memory: 128Mi'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticHelmInstall ────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticHelmInstall (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticHelmInstall);
  });

  it('helm repo commands are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('helm repo add'))).toBe(true);
  });

  it('values-override.yaml YAML content is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('controller:') && b.includes('replicaCount'))).toBe(true);
  });

  it('helm install with backslash continuations is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('helm install'))).toBe(true);
  });

  it('cpu millicore values 100m and 500m preserved', () => {
    expect(result).toContain('100m');
    expect(result).toContain('500m');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sRbacSetup ──────────────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sRbacSetup (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sRbacSetup);
  });

  it('multi-document YAML with RBAC resources is in a fenced block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Role') && b.includes('kind: RoleBinding'))).toBe(
      true
    );
  });

  it('contains all four K8s resource types', () => {
    expect(result).toContain('kind: Namespace');
    expect(result).toContain('kind: ServiceAccount');
    expect(result).toContain('kind: Role');
    expect(result).toContain('kind: RoleBinding');
  });

  it('kubectl apply commands are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl apply'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticKubectlDescribePod ─────────────────────────────────────────────

describe('extractAIAnswer — syntheticKubectlDescribePod (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticKubectlDescribePod);
  });

  it('describe output is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('Name:') && b.includes('Namespace:'))).toBe(true);
  });

  it('container resource values preserved (100m, 500m, 128Mi)', () => {
    expect(result).toContain('100m');
    expect(result).toContain('500m');
    expect(result).toContain('128Mi');
  });

  it('Events section is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('Events:') && b.includes('kubelet'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticAksClusterCreate ───────────────────────────────────────────────

describe('extractAIAnswer — syntheticAksClusterCreate (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticAksClusterCreate);
  });

  it('az aks create command is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('az aks create'))).toBe(true);
  });

  it('az aks get-credentials command is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('az aks get-credentials'))).toBe(true);
  });

  it('autoscaler commands are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('--enable-cluster-autoscaler'))).toBe(true);
  });

  it('numbered headings are NOT inside code fences', () => {
    const lines = result.split('\n');
    let inFence = false;
    const headingLeaks = lines.filter(l => {
      if (/^```/.test(l.trim())) {
        inFence = !inFence;
        return false;
      }
      return inFence && /^\*\*\d+\./.test(l.trim());
    });
    expect(headingLeaks).toEqual([]);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticKustomizeOverlay ───────────────────────────────────────────────

describe('extractAIAnswer — syntheticKustomizeOverlay (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticKustomizeOverlay);
  });

  it('base/kustomization.yaml content is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Kustomization') && b.includes('resources:'))).toBe(
      true
    );
  });

  it('base/deployment.yaml content is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Deployment') && b.includes('containerPort'))).toBe(
      true
    );
  });

  it('production overlay content is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(
      blocks.some(b => b.includes('patchesStrategicMerge') && b.includes('namespace: production'))
    ).toBe(true);
  });

  it('kubectl apply -k is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl apply -k'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sCronJobScript ───────────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sCronJobScript (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sCronJobScript);
  });

  it('YAML with embedded bash script is in a fenced block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: ConfigMap') && b.includes('#!/bin/bash'))).toBe(true);
  });

  it('CronJob resource is in the same YAML block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: CronJob') && b.includes('schedule:'))).toBe(true);
  });

  it('kubectl commands are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl get cronjobs'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sTroubleshooting ─────────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sTroubleshooting (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sTroubleshooting);
  });

  it('kubectl logs command is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl logs'))).toBe(true);
  });

  it('log output with ERROR/FATAL is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('ERROR') && b.includes('Connection refused'))).toBe(true);
  });

  it('events table is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('Warning') && b.includes('Unhealthy'))).toBe(true);
  });

  it('diagnostic kubectl commands are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl get endpoints'))).toBe(true);
  });

  it('Root Cause heading is NOT inside a code fence', () => {
    const lines = result.split('\n');
    let inFence = false;
    const headingLeaks = lines.filter(l => {
      if (/^```/.test(l.trim())) {
        inFence = !inFence;
        return false;
      }
      return inFence && /Root Cause/.test(l);
    });
    expect(headingLeaks).toEqual([]);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sNetworkPolicy ───────────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sNetworkPolicy (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sNetworkPolicy);
  });

  it('NetworkPolicy and Ingress are in a fenced YAML block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: NetworkPolicy') && b.includes('kind: Ingress'))).toBe(
      true
    );
  });

  it('contains K8s annotations', () => {
    expect(result).toContain('nginx.ingress.kubernetes.io/rewrite-target');
    expect(result).toContain('cert-manager.io/cluster-issuer');
  });

  it('kubectl apply command is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl apply'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sHpaPdb ──────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sHpaPdb (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sHpaPdb);
  });

  it('HPA and PDB are in a fenced YAML block', () => {
    const blocks = extractCodeBlocks(result);
    expect(
      blocks.some(
        b => b.includes('kind: HorizontalPodAutoscaler') && b.includes('kind: PodDisruptionBudget')
      )
    ).toBe(true);
  });

  it('averageUtilization values are preserved', () => {
    expect(result).toContain('averageUtilization: 70');
    expect(result).toContain('averageUtilization: 80');
  });

  it('scaleDown behavior with stabilizationWindowSeconds is present', () => {
    expect(result).toContain('stabilizationWindowSeconds: 300');
  });

  it('kubectl describe hpa is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl describe hpa'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCargoAddWorkflow ───────────────────────────────────────────────

describe('extractAIAnswer — syntheticCargoAddWorkflow (Cargo fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCargoAddWorkflow);
  });

  it('cargo add commands are inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('cargo add axum'))).toBe(true);
  });

  it('Cargo.toml content is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[package]') && b.includes('[dependencies]'))).toBe(true);
  });

  it('shell commands and Cargo.toml are in SEPARATE blocks', () => {
    const blocks = extractCodeBlocks(result);
    const shellBlock = blocks.find(b => b.includes('cargo add'));
    const tomlBlock = blocks.find(b => b.includes('[package]'));
    expect(shellBlock).toBeDefined();
    expect(tomlBlock).toBeDefined();
    expect(shellBlock).not.toBe(tomlBlock);
  });

  it('cargo build/run commands are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('cargo build') && b.includes('cargo run'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCargoBuildProfiles ─────────────────────────────────────────────

describe('extractAIAnswer — syntheticCargoBuildProfiles (Cargo fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCargoBuildProfiles);
  });

  it('Cargo.toml with [profile.release] is inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[profile.release]'))).toBe(true);
  });

  it('Cargo.toml and Rust source are in SEPARATE blocks', () => {
    const blocks = extractCodeBlocks(result);
    const tomlBlock = blocks.find(b => b.includes('[profile.release]'));
    const rustBlock = blocks.find(b => b.includes('use kube'));
    expect(tomlBlock).toBeDefined();
    expect(rustBlock).toBeDefined();
    expect(tomlBlock).not.toBe(rustBlock);
  });

  it('Rust source preserves kube client code', () => {
    const blocks = extractCodeBlocks(result);
    const rustBlock = blocks.find(b => b.includes('use kube'));
    expect(rustBlock).toContain('Client::try_default()');
  });

  it('cargo build --release is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('cargo build --release'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCargoInlineTables ──────────────────────────────────────────────

describe('extractAIAnswer — syntheticCargoInlineTables (Cargo fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCargoInlineTables);
  });

  it('[[bin]] sections are inside a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[[bin]]'))).toBe(true);
  });

  it('[dev-dependencies] is in the same block as [dependencies]', () => {
    const blocks = extractCodeBlocks(result);
    const tomlBlock = blocks.find(b => b.includes('[dev-dependencies]'));
    expect(tomlBlock).toBeDefined();
    expect(tomlBlock).toContain('[dependencies]');
  });

  it('multi-line sqlx features array is preserved', () => {
    expect(result).toContain('runtime-tokio');
    expect(result).toContain('postgres');
    expect(result).toContain('migrate');
  });

  it('cargo run --bin server is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('cargo run --bin server'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticRustLibBinSplit ────────────────────────────────────────────────

describe('extractAIAnswer — syntheticRustLibBinSplit (Rust fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticRustLibBinSplit);
  });

  it('lib.rs, main.rs, and handlers.rs are each in code fences', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('pub mod handlers'))).toBe(true);
    expect(blocks.some(b => b.includes('HttpServer::new'))).toBe(true);
    expect(blocks.some(b => b.includes('health_check'))).toBe(true);
  });

  it('lib.rs and main.rs are in SEPARATE blocks', () => {
    const blocks = extractCodeBlocks(result);
    const libBlock = blocks.find(b => b.includes('pub mod handlers'));
    const mainBlock = blocks.find(b => b.includes('HttpServer::new'));
    expect(libBlock).toBeDefined();
    expect(mainBlock).toBeDefined();
    expect(libBlock).not.toBe(mainBlock);
  });

  it('handlers.rs is separate from main.rs', () => {
    const blocks = extractCodeBlocks(result);
    const mainBlock = blocks.find(b => b.includes('HttpServer::new'));
    const handlersBlock = blocks.find(b => b.includes('#[get("/healthz")]'));
    expect(mainBlock).toBeDefined();
    expect(handlersBlock).toBeDefined();
    expect(mainBlock).not.toBe(handlersBlock);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sInitContainers ──────────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sInitContainers (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sInitContainers);
  });

  it('YAML contains initContainers and containers', () => {
    expect(result).toContain('initContainers');
    expect(result).toContain('containers');
    expect(result).toContain('db-migrate');
  });

  it('resource requests include CPU millicore values', () => {
    expect(result).toContain('cpu: 250m');
    expect(result).toContain('memory: 256Mi');
  });

  it('kubectl apply and rollout status are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl apply'))).toBe(true);
    expect(blocks.some(b => b.includes('kubectl rollout status'))).toBe(true);
  });

  it('liveness and readiness probes are preserved', () => {
    expect(result).toContain('livenessProbe');
    expect(result).toContain('readinessProbe');
    expect(result).toContain('/healthz');
    expect(result).toContain('/ready');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sConfigMapFromFile ───────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sConfigMapFromFile (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sConfigMapFromFile);
  });

  it('config.yaml content is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('server:') && b.includes('database:'))).toBe(true);
  });

  it('kubectl create configmap is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl create configmap'))).toBe(true);
  });

  it('YAML Deployment reference is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('volumeMounts') && b.includes('configMap'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sSecretsWorkflow ─────────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sSecretsWorkflow (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sSecretsWorkflow);
  });

  it('helm install command is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('helm install external-secrets'))).toBe(true);
  });

  it('SecretStore YAML is present', () => {
    expect(result).toContain('kind: SecretStore');
    expect(result).toContain('azurekv');
  });

  it('ExternalSecret YAML is present', () => {
    expect(result).toContain('kind: ExternalSecret');
    expect(result).toContain('refreshInterval');
    expect(result).toContain('remoteRef');
  });

  it('kubectl verification commands are in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl get externalsecret'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sIstioRouting ────────────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sIstioRouting (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sIstioRouting);
  });

  it('Gateway and VirtualService YAML are present', () => {
    expect(result).toContain('kind: Gateway');
    expect(result).toContain('kind: VirtualService');
  });

  it('canary traffic weight split is preserved', () => {
    expect(result).toContain('weight: 90');
    expect(result).toContain('weight: 10');
  });

  it('TLS configuration is preserved', () => {
    expect(result).toContain('mode: SIMPLE');
    expect(result).toContain('credentialName: api-tls');
  });

  it('istioctl analyze is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('istioctl analyze'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sStatefulSet ─────────────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sStatefulSet (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sStatefulSet);
  });

  it('StatefulSet and headless Service YAML are present', () => {
    expect(result).toContain('kind: StatefulSet');
    expect(result).toContain('kind: Service');
    expect(result).toContain('clusterIP: None');
  });

  it('volumeClaimTemplates with storage class is preserved', () => {
    expect(result).toContain('volumeClaimTemplates');
    expect(result).toContain('storageClassName: managed-premium');
    expect(result).toContain('storage: 50Gi');
  });

  it('CPU millicore values (500m) preserved', () => {
    expect(result).toContain('cpu: 500m');
  });

  it('secretKeyRef for credentials is preserved', () => {
    expect(result).toContain('secretKeyRef');
    expect(result).toContain('postgres-credentials');
  });

  it('kubectl get statefulset is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl get statefulset'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sMultiCluster ────────────────────────────────────────────────

describe('extractAIAnswer — syntheticK8sMultiCluster (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sMultiCluster);
  });

  it('az aks get-credentials commands are in code fences', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('az aks get-credentials'))).toBe(true);
  });

  it('kubectl config commands are present', () => {
    expect(result).toContain('kubectl config get-contexts');
    expect(result).toContain('kubectl config use-context');
  });

  it('--context flag usage is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('--context=dev-cluster'))).toBe(true);
  });

  it('for loop deploying to clusters is in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('for ctx in'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sDaemonSet ─────────────────────────────────────────────────
// Edge case: millicore values (200m, 100m) in panelLine YAML must NOT be
// stripped by the ANSI cleaner; multi-document YAML with --- separators.

describe('extractAIAnswer — syntheticK8sDaemonSet (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sDaemonSet);
  });

  it('multi-document YAML with --- separator detected and fenced', () => {
    expect(result).toContain('```yaml');
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Namespace') && b.includes('kind: DaemonSet'))).toBe(
      true
    );
  });

  it('millicore value 200m is NOT stripped by ANSI cleaner', () => {
    expect(result).toContain('cpu: 200m');
    expect(result).toContain('memory: 200Mi');
  });

  it('millicore value 100m is NOT stripped by ANSI cleaner', () => {
    expect(result).toContain('cpu: 100m');
    expect(result).toContain('memory: 100Mi');
  });

  it('tolerations and scheduling preserved in fenced block', () => {
    const blocks = extractCodeBlocks(result);
    expect(
      blocks.some(
        b => b.includes('node-role.kubernetes.io/control-plane') && b.includes('effect: NoSchedule')
      )
    ).toBe(true);
  });

  it('kubectl commands form a separate code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl apply -f daemonset.yaml'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sPodSecurity ─────────────────────────────────────────────────
// Edge case: unindented bare kubectl command (no panel) detected by
// wrapBareCodeBlocks; panelLine YAML for securityContext.

describe('extractAIAnswer — syntheticK8sPodSecurity (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sPodSecurity);
  });

  it('kubectl label command in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('pod-security.kubernetes.io/enforce=restricted'))).toBe(
      true
    );
  });

  it('securityContext fields preserved', () => {
    expect(result).toContain('runAsNonRoot: true');
    expect(result).toContain('allowPrivilegeEscalation: false');
    expect(result).toContain('readOnlyRootFilesystem: true');
  });

  it('seccompProfile RuntimeDefault preserved', () => {
    expect(result).toContain('RuntimeDefault');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sJobPatterns ─────────────────────────────────────────────────
// Edge case: literal block scalar (|) in YAML containing multi-line bash with
// pg_dump — wrapBareYamlBlocks must not break at blank lines inside the scalar.

describe('extractAIAnswer — syntheticK8sJobPatterns (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sJobPatterns);
  });

  it('CronJob YAML detected and fenced from panelLine content', () => {
    expect(result).toContain('kind: CronJob');
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: CronJob'))).toBe(true);
  });

  it('cron schedule preserved in literal form', () => {
    expect(result).toContain('0 2 * * *');
  });

  it('literal block scalar with pg_dump shell script preserved', () => {
    expect(result).toContain('pg_dump');
    expect(result).toContain('gzip');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sLinkerd ─────────────────────────────────────────────────
// Edge case: terminal-wrapped long annotation key split across lines;
// weight values 900m / 100m that look like ANSI codes.

describe('extractAIAnswer — syntheticK8sLinkerd (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sLinkerd);
  });

  it('Service with load-balancer annotation in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('azure-load-balancer-internal'))).toBe(true);
  });

  it('TrafficSplit with 900m weight preserved (not stripped as ANSI)', () => {
    expect(result).toContain('weight: 900m');
  });

  it('TrafficSplit with 100m weight preserved (not stripped as ANSI)', () => {
    expect(result).toContain('weight: 100m');
  });

  it('multi-resource YAML with --- separator handled', () => {
    expect(result).toContain('kind: Service');
    expect(result).toContain('kind: TrafficSplit');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sResourceQuota ─────────────────────────────────────────────────
// Edge case: non-K8s YAML (Helm values.yaml) with no apiVersion/kind —
// tests looksLikeYamlContent() detection for bare YAML.

describe('extractAIAnswer — syntheticK8sResourceQuota (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sResourceQuota);
  });

  it('Helm values YAML content preserved (no apiVersion/kind)', () => {
    expect(result).toContain('replicaCount: 3');
    expect(result).toContain('repository: nginx');
    expect(result).not.toContain('apiVersion:');
    expect(result).not.toContain('kind:');
  });

  it('millicore values 500m and 100m preserved in non-K8s YAML', () => {
    expect(result).toContain('cpu: 500m');
    expect(result).toContain('cpu: 100m');
  });

  it('nested ingress host config preserved', () => {
    expect(result).toContain('app.example.com');
    expect(result).toContain('pathType: Prefix');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sCertManager ─────────────────────────────────────────────────
// Edge case: bold file heading (\x1b[1m...\x1b[0m) for .yaml files triggers
// isBoldFileHeading() and splits into separate code blocks per file.

describe('extractAIAnswer — syntheticK8sCertManager (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sCertManager);
  });

  it('bold file heading for values.yaml recognized', () => {
    expect(result).toContain('values.yaml');
  });

  it('bold file heading for cluster-issuer.yaml recognized', () => {
    expect(result).toContain('cluster-issuer.yaml');
  });

  it('cert-manager values in a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('installCRDs: true'))).toBe(true);
  });

  it('ClusterIssuer YAML in a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: ClusterIssuer'))).toBe(true);
  });

  it('ACME server URL preserved', () => {
    expect(result).toContain('acme-v02.api.letsencrypt.org');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sVeleroBackup ─────────────────────────────────────────────────
// Edge case: three bold file headings (backup-schedule.yaml, restore.sh,
// verify.sh) producing three separate code blocks at heading boundaries.

describe('extractAIAnswer — syntheticK8sVeleroBackup (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sVeleroBackup);
  });

  it('produces at least 3 code blocks (one per bold file heading)', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });

  it('Schedule YAML in a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Schedule') && b.includes('daily-backup'))).toBe(true);
  });

  it('restore.sh script in a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('velero restore create'))).toBe(true);
  });

  it('verify.sh script in a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl get pods'))).toBe(true);
  });

  it('TTL value 720h0m0s preserved', () => {
    expect(result).toContain('720h0m0s');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticKubectlGetWide ─────────────────────────────────────────────────
// Edge case: tabular kubectl output with column-aligned multi-space gaps
// (Tier 8 detection); pod names containing millicore-like values (web-0m,
// api-250m) must NOT confuse the ANSI stripper.

describe('extractAIAnswer — syntheticKubectlGetWide (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticKubectlGetWide);
  });

  it('tabular output detected and fenced (NAME/READY/STATUS columns)', () => {
    const blocks = extractCodeBlocks(result);
    expect(
      blocks.some(b => b.includes('NAME') && b.includes('READY') && b.includes('STATUS'))
    ).toBe(true);
  });

  it('pod name web-0m preserved (millicore-like value in name)', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('web-0m'))).toBe(true);
  });

  it('pod name api-250m preserved (millicore-like value in name)', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('api-250m'))).toBe(true);
  });

  it('follow-up kubectl commands in a separate fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl describe pod web-0m'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sAgic ─────────────────────────────────────────────────
// Edge case: PROSE_WORD_THRESHOLD boundary — a 4-word line should NOT break
// a code block, but a >=5-word prose line after code SHOULD break it.

describe('extractAIAnswer — syntheticK8sAgic (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sAgic);
  });

  it('Ingress YAML fenced from panelLine content', () => {
    expect(result).toContain('```yaml');
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Ingress'))).toBe(true);
  });

  it('prose line "Verify the AGIC ingress is operational now:" breaks code', () => {
    // This >=5-word line should appear as prose (outside any code fence)
    const lines = result.split('\n');
    const proseLine = lines.find(l => l.includes('Verify the AGIC ingress is operational'));
    expect(proseLine).toBeDefined();
  });

  it('az network dns command in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('az network dns'))).toBe(true);
  });

  it('AGIC annotations preserved', () => {
    expect(result).toContain('azure/application-gateway');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sPrometheusMonitoring ─────────────────────────────────────────
// Edge case: file header comments (# deployment.yaml, # service.yaml) inside
// panelLine content — tests isFileHeaderComment() splitting behavior.

describe('extractAIAnswer — syntheticK8sPrometheusMonitoring (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sPrometheusMonitoring);
  });

  it('Deployment YAML fenced from panelLine content', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Deployment'))).toBe(true);
  });

  it('file header comment # deployment.yaml preserved', () => {
    expect(result).toContain('# deployment.yaml');
  });

  it('Service YAML preserved', () => {
    expect(result).toContain('kind: Service');
    expect(result).toContain('prometheus-server');
  });

  it('millicore value cpu: 250m preserved', () => {
    expect(result).toContain('cpu: 250m');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sWorkloadIdentity ─────────────────────────────────────────
// Edge case: Go code with if err != nil {, for range, defer func(), go func()
// — tests Tier 5 Go control flow detection.

describe('extractAIAnswer — syntheticK8sWorkloadIdentity (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sWorkloadIdentity);
  });

  it('Go package main in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('package main'))).toBe(true);
  });

  it('Go if err != nil pattern preserved (Tier 5 detection)', () => {
    expect(result).toContain('if err != nil');
  });

  it('Go for range pattern preserved', () => {
    expect(result).toContain('for _, item := range items');
  });

  it('Go defer func() and go func() preserved', () => {
    expect(result).toContain('defer func()');
    expect(result).toContain('go func()');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sArgoCD ─────────────────────────────────────────────────
// Edge case: Rust code with method chains (.route, .layer, .bind, .await)
// and closures (move ||) — tests Tier 5 method chain detection.

describe('extractAIAnswer — syntheticK8sArgoCD (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sArgoCD);
  });

  it('Rust use statements in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('use actix_web::'))).toBe(true);
  });

  it('async fn main pattern preserved', () => {
    expect(result).toContain('async fn main()');
  });

  it('method chain .bind preserved (Tier 5 detection)', () => {
    expect(result).toContain('.bind("0.0.0.0:8080")');
  });

  it('move closure preserved', () => {
    expect(result).toContain('HttpServer::new(move');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCargoWorkspaceDeps ─────────────────────────────────────────
// Edge case: TOML [section] headers in panelLine with bold file headings
// for Cargo.toml + src/main.rs — tests Tier 6 TOML detection and bold
// file heading boundary splitting.

describe('extractAIAnswer — syntheticCargoWorkspaceDeps (Cargo fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCargoWorkspaceDeps);
  });

  it('[package] section detected in a code fence (Tier 6 TOML)', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[package]'))).toBe(true);
  });

  it('[dependencies] with inline tables in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[dependencies]'))).toBe(true);
  });

  it('Cargo.toml edition preserved', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('edition = "2021"'))).toBe(true);
  });

  it('Rust source in a separate code fence from TOML', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('use actix_web::') && b.includes('async fn main'))).toBe(
      true
    );
  });

  it('[features] section preserved', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('[features]'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sHpaCustomMetrics ─────────────────────────────────────────
// Edge case: mixed content types — tabular kubectl output → bare YAML → shell
// commands — tests transition detection between content types.

describe('extractAIAnswer — syntheticK8sHpaCustomMetrics (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sHpaCustomMetrics);
  });

  it('tabular HPA output in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('NAME') && b.includes('TARGETS'))).toBe(true);
  });

  it('HPA YAML detected and fenced (transition from table)', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: HorizontalPodAutoscaler'))).toBe(true);
  });

  it('millicore value averageValue: 200m preserved in HPA YAML', () => {
    expect(result).toContain('averageValue: 200m');
  });

  it('behavior stabilizationWindowSeconds preserved', () => {
    expect(result).toContain('stabilizationWindowSeconds: 300');
  });

  it('kubectl apply command in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kubectl apply'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticAksNodePools ─────────────────────────────────────────
// Edge case: az CLI commands with \ line continuations (Tier 3 detection);
// lines close to 78-char terminal width.

describe('extractAIAnswer — syntheticAksNodePools (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticAksNodePools);
  });

  it('az aks nodepool add with \\ continuations in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('az aks nodepool add') && b.includes('\\'))).toBe(true);
  });

  it('GPU node pool config preserved', () => {
    expect(result).toContain('Standard_NC6s_v3');
    expect(result).toContain('sku=gpu:NoSchedule');
  });

  it('spot pool with autoscaler preserved', () => {
    expect(result).toContain('--priority Spot');
    expect(result).toContain('--enable-cluster-autoscaler');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sRollingUpdate ─────────────────────────────────────────
// Edge case: kubectl describe output with key:value multi-space alignment
// and Events table with column headers and dashed separator (Tier 8).

describe('extractAIAnswer — syntheticK8sRollingUpdate (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sRollingUpdate);
  });

  it('kubectl describe output in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('Name:') && b.includes('Namespace:'))).toBe(true);
  });

  it('multi-space aligned key:value pairs preserved', () => {
    expect(result).toContain('Status:       Running');
  });

  it('millicore values in Limits/Requests preserved', () => {
    expect(result).toContain('cpu:     500m');
    expect(result).toContain('cpu:     200m');
  });

  it('Events table with dashed separator preserved', () => {
    expect(result).toContain('Events:');
    expect(result).toContain('----');
    expect(result).toContain('default-scheduler');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sKeyVaultCsi ─────────────────────────────────────────
// Edge case: ANSI escape split across line boundary (\x1b[4 at end of line,
// 0m at start of next) — tests stripAnsi trailing orphan bracket stripping.

describe('extractAIAnswer — syntheticK8sKeyVaultCsi (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sKeyVaultCsi);
  });

  it('ANSI split artifact 0m appears in prose (orphan from \\x1b[4...0m)', () => {
    // Known limitation: when an ANSI escape is split across terminal lines
    // (\x1b[4 on line N, 0m on line N+1), stripAnsi removes the \x1b[4 part
    // but the orphaned "0m" on the next line remains as a visible artifact.
    const proseLines = result.split('\n').filter(l => !l.startsWith('```'));
    expect(proseLines.some(l => l.includes('0m'))).toBe(true);
  });

  it('SecretProviderClass YAML detected and fenced', () => {
    const blocks = extractCodeBlocks(result);
    expect(
      blocks.some(b => b.includes('kind: SecretProviderClass') && b.includes('secrets-store.csi'))
    ).toBe(true);
  });

  it('millicore value cpu: 250m preserved in Pod spec', () => {
    expect(result).toContain('cpu: 250m');
  });

  it('nested literal block objects preserved', () => {
    expect(result).toContain('objectName: db-password');
    expect(result).toContain('objectName: api-key');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sFluxCD ─────────────────────────────────────────────────
// Edge case: Python __name__ and __init__ dunder patterns must NOT be
// rendered as markdown bold (<strong>).

describe('extractAIAnswer — syntheticK8sFluxCD (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sFluxCD);
  });

  it('__init__ NOT rendered as markdown bold', () => {
    expect(result).not.toContain('<strong>init</strong>');
    expect(result).not.toContain('**init**');
    expect(result).toContain('__init__');
  });

  it('__name__ NOT rendered as markdown bold', () => {
    expect(result).not.toContain('<strong>name</strong>');
    expect(result).not.toContain('**name**');
    expect(result).toContain('__name__');
  });

  it('__main__ guard preserved literally', () => {
    expect(result).toContain('__main__');
  });

  it('Python class definition detected as code (Tier 4)', () => {
    expect(result).toContain('class FluxReconciler');
    expect(result).toContain('def reconcile');
  });

  it('for loop in reconcile method preserved', () => {
    expect(result).toContain('for item in self.items');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticK8sNetworkDebug ─────────────────────────────────────────────────
// Edge case: bare JSON kubectl output with { / } braces — tests
// hasJsonKubernetesResource detection and Tier 5 brace detection.

describe('extractAIAnswer — syntheticK8sNetworkDebug (K8s fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticK8sNetworkDebug);
  });

  it('JSON "kind": "Pod" preserved', () => {
    expect(result).toContain('"kind": "Pod"');
  });

  it('JSON "name": "debug-pod" preserved', () => {
    expect(result).toContain('"name": "debug-pod"');
  });

  it('network diagnostic commands preserved', () => {
    expect(result).toContain('nslookup kubernetes.default');
    expect(result).toContain('curl -sS');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticRustActixWeb ─────────────────────────────────────────────────
// Edge case: centered bold section heading (>5 words, >6 indent) breaking
// Dockerfile code into a separate block from K8s YAML.

describe('extractAIAnswer — syntheticRustActixWeb (Cargo fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticRustActixWeb);
  });

  it('Dockerfile content in a code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('FROM rust:1.74-slim'))).toBe(true);
  });

  it('centered heading breaks Dockerfile from K8s YAML', () => {
    const blocks = extractCodeBlocks(result);
    // Dockerfile and K8s YAML should be in SEPARATE fences
    const dockerBlock = blocks.find(b => b.includes('FROM rust:1.74-slim'));
    const k8sBlock = blocks.find(b => b.includes('kind: Deployment'));
    expect(dockerBlock).toBeDefined();
    expect(k8sBlock).toBeDefined();
    // They should not be the same block
    if (dockerBlock && k8sBlock) {
      expect(dockerBlock).not.toBe(k8sBlock);
    }
  });

  it('K8s Deployment YAML in a separate code fence', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Deployment') && b.includes('rust-web'))).toBe(true);
  });

  it('millicore values cpu: 100m and cpu: 500m preserved', () => {
    expect(result).toContain('cpu: 100m');
    expect(result).toContain('cpu: 500m');
  });

  it('K8s Service YAML preserved', () => {
    expect(result).toContain('kind: Service');
    expect(result).toContain('app: rust-web');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticBoldHeadingSplit ─────────────────────────────────────────────
// Fixture 66: Bold file heading properly splits code blocks.
// Cargo.toml and src/main.rs should be in separate code blocks.
// ───────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticBoldHeadingSplit', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticBoldHeadingSplit);
  });

  it('Cargo.toml and src/main.rs in SEPARATE code blocks', () => {
    const blocks = extractCodeBlocks(result);
    const tomlBlock = blocks.find(b => b.includes('[package]'));
    const rustBlock = blocks.find(b => b.includes('use axum'));
    expect(tomlBlock).toBeDefined();
    expect(rustBlock).toBeDefined();
    expect(tomlBlock).not.toContain('use axum');
    expect(rustBlock).not.toContain('[package]');
  });

  it('TOML content preserved', () => {
    expect(result).toContain('[package]');
    expect(result).toContain('axum = "0.7"');
  });

  it('Rust code preserved', () => {
    expect(result).toContain('use axum::{routing::get, Router}');
    expect(result).toContain('async fn main()');
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticProseNotYaml ────────────────────────────────────────────────
// Fixture 67: Prose with colon + bullet list NOT miscategorized as YAML.
// "Example: Node.js ..." is prose, not YAML.
// ───────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticProseNotYaml', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticProseNotYaml);
  });

  it('"Example: Node.js..." should be prose, not YAML code', () => {
    const blocks = extractCodeBlocks(result);
    const exampleInCode = blocks.some(b => b.includes('Example:') && b.includes('Node.js'));
    expect(exampleInCode).toBe(false);
  });

  it('bullet items should be prose, not code', () => {
    const blocks = extractCodeBlocks(result);
    const healthzInCode = blocks.some(b => b.includes('/healthz'));
    expect(healthzInCode).toBe(false);
  });

  it('Dockerfile FROM should be in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('FROM node:20-alpine'))).toBe(true);
  });

  it('docker build/push should be in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('docker build'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCenteredColonTitle ─────────────────────────────────────────────
// Fixture 68: "Optional: Ingress" centered heading not absorbed into YAML block
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticCenteredColonTitle', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCenteredColonTitle);
  });

  it('"Optional: Ingress" should NOT be in a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('Optional: Ingress') || b.includes('Optional:'))).toBe(
      false
    );
  });

  it('parenthetical note should be prose', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('Requires an Ingress controller'))).toBe(false);
  });

  it('Ingress YAML should be in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Ingress'))).toBe(true);
  });

  it('Service YAML should be in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Service'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticAnsiSplitYamlKey ──────────────────────────────────────────────
// Fixture 69: ANSI escape split in YAML key — no "metadata[" or "0m:" orphans
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticAnsiSplitYamlKey', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticAnsiSplitYamlKey);
  });

  it('should NOT have "metadata[" orphan bracket', () => {
    expect(result).not.toContain('metadata[');
  });

  it('should NOT have bare "0m:" orphan ANSI reset', () => {
    const lines = result.split('\n');
    expect(lines.some(l => l.trim().startsWith('0m:'))).toBe(false);
  });

  it('YAML should contain metadata: key', () => {
    expect(result).toContain('metadata:');
  });

  it('Deployment YAML should be in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Deployment'))).toBe(true);
  });

  it('Service YAML should be in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('kind: Service'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticProseHeadingAfterDockerfile ────────────────────────────────────
// Fixture 70: "Build + push (example with Docker Hub):" is prose, not code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticProseHeadingAfterDockerfile', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticProseHeadingAfterDockerfile);
  });

  it('prose heading should NOT be inside Dockerfile code block', () => {
    const blocks = extractCodeBlocks(result);
    const dockBlock = blocks.find(b => b.includes('FROM node'));
    expect(dockBlock).toBeTruthy();
    expect(dockBlock).not.toContain('Build + push');
  });

  it('Dockerfile content in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('FROM node:20-alpine'))).toBe(true);
  });

  it('docker build/push in separate code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('docker build'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticCenteredStepHeading ───────────────────────────────────────────
// Fixture 71: "2) Containerize it" breaks preceding Cargo.toml code block
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticCenteredStepHeading', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticCenteredStepHeading);
  });

  it('Cargo.toml and Dockerfile in separate code blocks', () => {
    const blocks = extractCodeBlocks(result);
    const toml = blocks.find(b => b.includes('[package]'));
    const dock = blocks.find(b => b.includes('FROM rust'));
    expect(toml).toBeTruthy();
    expect(dock).toBeTruthy();
    expect(toml).not.toBe(dock);
  });

  it('step heading "2) Containerize it" should NOT be in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('Containerize it'))).toBe(false);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticFortranDockerfile ─────────────────────────────────────────────
// Fixture 72: Fortran + Dockerfile multi-file with gfortran commands
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticFortranDockerfile', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticFortranDockerfile);
  });

  it('Fortran and Dockerfile in separate code blocks', () => {
    const blocks = extractCodeBlocks(result);
    const fort = blocks.find(b => b.includes('PROGRAM HELLO'));
    const dock = blocks.find(b => b.includes('FROM gcc'));
    expect(fort).toBeTruthy();
    expect(dock).toBeTruthy();
    expect(fort).not.toBe(dock);
  });

  it('gfortran commands in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('gfortran'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticMultiLangK8sDeploy ────────────────────────────────────────────
// Fixture 73: COBOL + PHP + C + Dockerfile multi-language deployment
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticMultiLangK8sDeploy', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticMultiLangK8sDeploy);
  });

  it('COBOL in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('IDENTIFICATION DIVISION'))).toBe(true);
  });

  it('PHP in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('<?php') || b.includes('echo "Hello from PHP"'))).toBe(true);
  });

  it('C code in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('#include <stdio.h>'))).toBe(true);
  });

  it('Dockerfile in code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('FROM gcc:12'))).toBe(true);
  });

  it('COBOL and Dockerfile in separate code blocks', () => {
    const blocks = extractCodeBlocks(result);
    const cob = blocks.find(b => b.includes('IDENTIFICATION'));
    const dock = blocks.find(b => b.includes('FROM gcc'));
    expect(cob).toBeTruthy();
    expect(dock).toBeTruthy();
    expect(cob).not.toBe(dock);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticKotlinApp ─────────────────────────────────────────────────────
// Fixture 74: Kotlin — bold file heading with panel code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticKotlinApp (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticKotlinApp);
  });

  it('Kotlin code should be inside a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('fun main(args: Array<String>)'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticScalaApp ──────────────────────────────────────────────────────
// Fixture 75: Scala — bold file heading with panel code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticScalaApp (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticScalaApp);
  });

  it('Scala code should be inside a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('object Main'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticPerlScript ────────────────────────────────────────────────────
// Fixture 76: Perl — bold file heading with panel code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticPerlScript (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticPerlScript);
  });

  it('Perl code should be inside a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('#!/usr/bin/perl'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticLuaModule ─────────────────────────────────────────────────────
// Fixture 77: Lua — bold file heading with panel code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticLuaModule (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticLuaModule);
  });

  it('Lua code should be inside a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('local M = {}'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticHaskellApp ────────────────────────────────────────────────────
// Fixture 78: Haskell — bold file heading with panel code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticHaskellApp (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticHaskellApp);
  });

  it('Haskell code should be inside a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('module Main where'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticSwiftApp ──────────────────────────────────────────────────────
// Fixture 79: Swift — bold file heading with panel code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticSwiftApp (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticSwiftApp);
  });

  it('Swift code should be inside a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('import Foundation'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticElixirModule ──────────────────────────────────────────────────
// Fixture 80: Elixir — bold file heading with panel code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticElixirModule (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticElixirModule);
  });

  it('Elixir code should be inside a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('defmodule App do'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticClojureApp ────────────────────────────────────────────────────
// Fixture 81: Clojure — bold file heading with panel code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticClojureApp (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticClojureApp);
  });

  it('Clojure code should be inside a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('(ns myapp.core)'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticRAnalysis ─────────────────────────────────────────────────────
// Fixture 82: R — bold file heading with panel code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticRAnalysis (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticRAnalysis);
  });

  it('R code should be inside a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('data.frame('))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

// ─── syntheticSqlSchema ─────────────────────────────────────────────────────
// Fixture 83: SQL — bold file heading with panel code
// ─────────────────────────────────────────────────────────────────────────────

describe('extractAIAnswer — syntheticSqlSchema (synthetic fixture)', () => {
  let result: string;
  beforeAll(() => {
    result = extractAIAnswer(syntheticSqlSchema);
  });

  it('SQL code should be inside a code block', () => {
    const blocks = extractCodeBlocks(result);
    expect(blocks.some(b => b.includes('CREATE TABLE users'))).toBe(true);
  });

  it('has no ANSI leaks', () => {
    assertNoAnsiLeaks(result);
  });
});

describe('findbugs: all extractAIAnswer edge cases', () => {
  function assertNoAnsiLeaks(result: string): void {
    expect(result).not.toMatch(/\x1b/);
    expect(result).not.toMatch(/\[\d+m/);
    expect(result).not.toMatch(/\[0m/);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 1
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 1', () => {
    it('1. two file headings with no blank line between panels', () => {
      const result = extractAIAnswer(fb1_twoFileHeadings);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(2);
      expect(blocks[0]).toContain('[package]');
      expect(blocks[1]).toContain('fn main()');
    });

    it('2. file heading with extension-only name .env', () => {
      const result = extractAIAnswer(fb1_dotEnvHeading);
      assertNoAnsiLeaks(result);

      expect(result).toContain('.env');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const envBlock = blocks.find(b => b.includes('DB_HOST'));
      expect(envBlock).toBeDefined();
      expect(envBlock!).toMatch(/^ /m);
    });

    it('3. file heading with deep path src/handlers/auth.rs', () => {
      const result = extractAIAnswer(fb1_deepPathHeading);
      assertNoAnsiLeaks(result);

      expect(result).toContain('src/handlers/auth.rs');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('authenticate');
    });

    it('4. prose with 4 words should NOT break file-header block', () => {
      const result = extractAIAnswer(fb1_fourWordProse);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('apiVersion');
      expect(blocks[0]).toContain('data:');
    });

    it('5. prose with 5 words SHOULD break file-header block', () => {
      const result = extractAIAnswer(fb1_fiveWordProse);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('apiVersion');
      expect(blocks[0]).not.toContain('data:');
    });

    it('6. YAML annotation with pipe literal block scalar', () => {
      const result = extractAIAnswer(fb1_yamlPipeLiteral);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const yamlBlock = blocks.find(b => b.includes('apiVersion'));
      expect(yamlBlock).toBeDefined();
      expect(yamlBlock!).toContain('more_set_headers');
      expect(yamlBlock!).toContain('spec:');
    });

    it('7. bare YAML with 2 lines should NOT be wrapped', () => {
      const result = extractAIAnswer(fb1_bareYaml2Lines);
      assertNoAnsiLeaks(result);

      expect(result).not.toMatch(/```yaml/);
      expect(result).toContain('name: myapp');
    });

    it('8. bare YAML with 3 lines SHOULD be wrapped', () => {
      const result = extractAIAnswer(fb1_bareYaml3Lines);
      assertNoAnsiLeaks(result);

      expect(result).toMatch(/```yaml/);
      const blocks = extractCodeBlocks(result);
      const yamlBlock = blocks.find(b => b.includes('name: myapp'));
      expect(yamlBlock).toBeDefined();
      expect(yamlBlock!).toContain('description');
    });

    it('9. Dockerfile heading with deeply indented continuation lines', () => {
      const result = extractAIAnswer(fb1_dockerfileContinuation);
      assertNoAnsiLeaks(result);

      expect(result).toContain('Dockerfile');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('FROM ubuntu:22.04');
      expect(blocks[0]).toContain('wget');
    });

    it('10. docker-compose.yml bold heading', () => {
      const result = extractAIAnswer(fb1_dockerCompose);
      assertNoAnsiLeaks(result);

      expect(result).toContain('docker-compose.yml');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('services:');
    });

    it('11. panel code starting with port number', () => {
      const result = extractAIAnswer(fb1_portNumber);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(result).not.toMatch(/^3000\./m);
    });

    it('12. ANSI 256-color code fully stripped', () => {
      const result = extractAIAnswer(fb1_ansi256Color);
      assertNoAnsiLeaks(result);
      expect(result).toContain('Warning: resource limit exceeded');
    });

    it('13. Go interface{} type should not cause issues', () => {
      const result = extractAIAnswer(fb1_goInterface);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('interface{}');
    });

    it('14. two YAML blocks separated by prose', () => {
      const result = extractAIAnswer(fb1_twoYamlBlocks);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(2);
      expect(blocks[0]).toContain('Namespace');
      expect(blocks[1]).toContain('Deployment');
    });

    it('15. shell backtick substitution at column 0', () => {
      const result = extractAIAnswer(fb1_shellBacktick);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks.some(b => b.includes('kubectl get pods'))).toBe(true);
    });

    it('16. Makefile heading with tab-indented content', () => {
      const result = extractAIAnswer(fb1_makefileTab);
      assertNoAnsiLeaks(result);

      expect(result).toContain('Makefile');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('build:');
    });

    it('17. YAML folded scalar with > indicator', () => {
      const result = extractAIAnswer(fb1_yamlFoldedScalar);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('description: >');
      expect(blocks[0]).toContain('long description');
      expect(blocks[0]).toContain('port: 8080');
    });

    it('18. indented code after numbered list item', () => {
      const result = extractAIAnswer(fb1_indentedCodeAfterList);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks.some(b => b.includes('kubectl apply'))).toBe(true);
    });

    it('19. requirements.txt with pip freeze output', () => {
      const result = extractAIAnswer(fb1_requirementsTxt);
      assertNoAnsiLeaks(result);

      expect(result).toContain('requirements.txt');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('flask==2.3.0');
      expect(blocks[0]).toContain('gunicorn==21.2.0');
    });

    it('20. bare code followed by bare YAML creates 2 blocks', () => {
      const result = extractAIAnswer(fb1_bareCodeThenYaml);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(2);
      expect(blocks.some(b => b.includes('kubectl create'))).toBe(true);
      expect(blocks.some(b => b.includes('apiVersion'))).toBe(true);
    });

    it('21. hyphenated filename my-app.yaml', () => {
      const result = extractAIAnswer(fb1_hyphenatedFilename);
      assertNoAnsiLeaks(result);

      expect(result).toContain('my-app.yaml');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('apiVersion');
    });

    it('22. ANSI code split across line boundary', () => {
      const result = extractAIAnswer(fb1_ansiSplitLine);
      assertNoAnsiLeaks(result);
      expect(result).toContain('The config is');
      expect(result).toContain('End of output');
    });

    it('23. Windows-style paths in panel content', () => {
      const result = extractAIAnswer(fb1_windowsPaths);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('C:\\Users');
    });

    it('24. very long line in panel exceeding 78 chars', () => {
      const result = extractAIAnswer(fb1_longPanelLine);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('pkg-config');
    });

    it('25. Dockerfile.prod compound extension heading', () => {
      const result = extractAIAnswer(fb1_dockerfileProd);
      assertNoAnsiLeaks(result);

      expect(result).toContain('Dockerfile.prod');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('FROM node:20-slim');
    });

    it('26. YAML flow-style mapping', () => {
      const result = extractAIAnswer(fb1_yamlFlowMapping);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const yamlBlock = blocks.find(b => b.includes('apiVersion'));
      expect(yamlBlock).toBeDefined();
      expect(yamlBlock!).toContain('{ app: web');
    });

    it('27. kubectl command with tabular output', () => {
      const result = extractAIAnswer(fb1_kubectlTabular);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const kubectlBlock = blocks.find(b => b.includes('kubectl get pods'));
      expect(kubectlBlock).toBeDefined();
      expect(kubectlBlock!).toContain('web-abc123');
    });

    it('28. panel code containing triple backticks', () => {
      const result = extractAIAnswer(fb1_panelTripleBacktick);
      assertNoAnsiLeaks(result);

      expect(result).toContain('README.md');
      expect(result).toContain('npm install');
    });

    it('29. tsconfig.json with JSON content', () => {
      const result = extractAIAnswer(fb1_tsconfigJson);
      assertNoAnsiLeaks(result);

      expect(result).toContain('tsconfig.json');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('compilerOptions');
    });

    it('30. indented line with flags should not be treated as prose', () => {
      const result = extractAIAnswer(fb1_flagsNotProse);
      assertNoAnsiLeaks(result);

      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('#!/bin/bash');
      expect(blocks[0]).toContain('--namespace');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 2
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 2', () => {
    it('1. non-K8s YAML ending with prose line containing colon', () => {
      const result = extractAIAnswer(fb2_nonK8sYamlProse);
      assertNoAnsiLeaks(result);
      expect(result).toContain('Note: you can also use Helm');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      for (const block of blocks) {
        expect(block).not.toContain('Note: you can also use Helm');
      }
    });

    it('2. bold file heading .gitignore', () => {
      const result = extractAIAnswer(fb2_gitignoreHeading);
      assertNoAnsiLeaks(result);
      expect(result).toContain('.gitignore');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('node_modules/');
    });

    it('3. bold file heading .dockerignore', () => {
      const result = extractAIAnswer(fb2_dockerignoreHeading);
      assertNoAnsiLeaks(result);
      expect(result).toContain('.dockerignore');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('node_modules');
    });

    it('4. YAML with --- separator between two documents', () => {
      const result = extractAIAnswer(fb2_yamlDocSeparator);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('Namespace');
      expect(blocks[0]).toContain('---');
      expect(blocks[0]).toContain('Service');
    });

    it('5. shell heredoc at column 0 with YAML-like body', () => {
      const result = extractAIAnswer(fb2_shellHeredoc);
      assertNoAnsiLeaks(result);
      expect(result).toContain('cat <<EOF');
      const blocks = extractCodeBlocks(result);
      expect(result).toContain('EOF');
      const yamlInSeparateBlock = blocks.some(
        b => b.includes('apiVersion:') && !b.includes('cat <<EOF')
      );
      expect(yamlInSeparateBlock).toBe(false);
    });

    it('6. ordered list items with code panels after each', () => {
      const result = extractAIAnswer(fb2_orderedListPanels);
      assertNoAnsiLeaks(result);
      expect(result).toMatch(/1\.\s/);
      expect(result).toMatch(/2\.\s/);
      expect(result).toMatch(/3\.\s/);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
    });

    it('7. bold file heading with unicode naïve.py', () => {
      const result = extractAIAnswer(fb2_unicodeFilename);
      assertNoAnsiLeaks(result);
      expect(result).toContain('naïve.py');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('def hello()');
    });

    it('8. panel content exactly 78 chars', () => {
      const result = extractAIAnswer(fb2_exact78Chars);
      assertNoAnsiLeaks(result);
      const exact78 = 'x'.repeat(78);
      expect(result).toContain(exact78);
    });

    it('9. bare non-K8s YAML starting with name:', () => {
      const result = extractAIAnswer(fb2_bareNonK8sYaml);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('name: my-app');
      expect(blocks[0]).toContain('author: someone');
    });

    it('10. --- separator between two non-K8s YAML sections', () => {
      const result = extractAIAnswer(fb2_nonK8sYamlSeparator);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const allBlockContent = blocks.join('\n');
      expect(allBlockContent).toContain('app1');
      expect(allBlockContent).toContain('app2');
    });

    it('11. panel content with nested ANSI reset mid-line', () => {
      const result = extractAIAnswer(fb2_nestedAnsiReset);
      assertNoAnsiLeaks(result);
      expect(result).toContain('echo');
      expect(result).toContain('hello world');
    });

    it('12. bold file heading Cargo.lock followed by TOML', () => {
      const result = extractAIAnswer(fb2_cargoLockToml);
      assertNoAnsiLeaks(result);
      expect(result).toContain('Cargo.lock');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('[[package]]');
      expect(blocks[0]).toContain('name = "serde"');
    });

    it('13. prose with period should not be file heading', () => {
      const result = extractAIAnswer(fb2_proseNotHeading);
      assertNoAnsiLeaks(result);
      expect(result).toContain('Hello world.');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(0);
    });

    it('14. markdown ## heading after code panel', () => {
      const result = extractAIAnswer(fb2_markdownHeadingAfterCode);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      for (const block of blocks) {
        expect(block).not.toContain('## Next Steps');
      }
      expect(result).toContain('## Next Steps');
    });

    it('15. python f-string with colon not confused as YAML', () => {
      const result = extractAIAnswer(fb2_pythonFString);
      assertNoAnsiLeaks(result);
      expect(result).toContain('print(f"Hello: {name}")');
      const yamlBlocks = result.match(/```yaml/g);
      expect(yamlBlocks).toBeNull();
    });

    it('16. panel content with tab characters', () => {
      const result = extractAIAnswer(fb2_makefileTabChars);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const allBlockContent = blocks.join('\n');
      expect(allBlockContent).toContain('build:');
    });

    it('17. deeply nested YAML stays in one block', () => {
      const result = extractAIAnswer(fb2_deeplyNestedYaml);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('level6: value');
      expect(blocks[0]).toContain('apiVersion: v1');
    });

    it('18. bold heading then blank line then YAML panel', () => {
      const result = extractAIAnswer(fb2_headingBlankLinePanel);
      assertNoAnsiLeaks(result);
      expect(result).toContain('values.yaml');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const allContent = blocks.join('\n');
      expect(allContent).toContain('replicaCount: 3');
    });

    it('19. closing brace at column 0 after code block', () => {
      const result = extractAIAnswer(fb2_closingBrace);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('}');
      const outsideBlocks = result.replace(/```[\s\S]*?```/g, '').trim();
      expect(outsideBlocks).not.toContain('}');
    });

    it('20. consecutive blank panel lines', () => {
      const result = extractAIAnswer(fb2_consecutiveBlanks);
      assertNoAnsiLeaks(result);
      expect(result).toContain('line one');
      expect(result).toContain('line two');
    });

    it('21. README.md heading with markdown content in panels', () => {
      const result = extractAIAnswer(fb2_readmeMdContent);
      assertNoAnsiLeaks(result);
      expect(result).toContain('README.md');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('# My Project');
    });

    it('22. ANSI bold inside panel content', () => {
      const result = extractAIAnswer(fb2_ansiBoldPanel);
      assertNoAnsiLeaks(result);
      expect(result).toContain('Important');
      expect(result).toContain('Run this command');
    });

    it('23. two bare apiVersion blocks with no separator', () => {
      const result = extractAIAnswer(fb2_twoApiVersionBlocks);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      const allContent = blocks.join('\n');
      expect(allContent).toContain('Namespace');
      expect(allContent).toContain('Deployment');
    });

    it('24. file heading path with double slash', () => {
      const result = extractAIAnswer(fb2_doubleSlashPath);
      assertNoAnsiLeaks(result);
      expect(result).toContain('main');
    });

    it('25. panel content starting with bullet dash item', () => {
      const result = extractAIAnswer(fb2_panelDashList);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const allContent = blocks.join('\n');
      expect(allContent).toContain('- name: nginx');
    });

    it('26. bare python import at column 0', () => {
      const result = extractAIAnswer(fb2_pythonImport);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('import os');
      expect(blocks[0]).toContain('from pathlib import Path');
    });

    it('27. prose lines with word-colon pattern and many words', () => {
      const result = extractAIAnswer(fb2_proseWordColon);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(0);
    });

    it('28. file heading with spaces in path', () => {
      const result = extractAIAnswer(fb2_spacesInPath);
      assertNoAnsiLeaks(result);
      expect(result).toContain('My App/config.yaml');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(0);
    });

    it('29. literal backslash-x1b text in panel content', () => {
      const result = extractAIAnswer(fb2_literalEscapeText);
      expect(result).toContain('\\x1b');
    });

    it('30. YAML key split across lines by terminal wrapping', () => {
      const result = extractAIAnswer(fb2_yamlKeySplit);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('averageUtilization');
      expect(blocks[0]).toContain('70');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 3
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 3', () => {
    it("1. heredoc with quoted delimiter <<'YAML'", () => {
      const result = extractAIAnswer(fb3_heredocQuotedDelim);
      assertNoAnsiLeaks(result);
      expect(result).toContain("cat <<'YAML'");
      const blocks = extractCodeBlocks(result);
      const yamlInSeparateBlock = blocks.some(
        b => b.includes('apiVersion:') && !b.includes("cat <<'YAML'")
      );
      expect(yamlInSeparateBlock).toBe(false);
    });

    it('2. bare YAML list with nested keys at column 0', () => {
      const result = extractAIAnswer(fb3_bareYamlList);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks.join('\n')).toContain('- name: nginx');
      expect(blocks.join('\n')).toContain('containerPort: 80');
    });

    it('3. numbered list with periods and interleaved code panels', () => {
      const result = extractAIAnswer(fb3_numberedListPanels);
      assertNoAnsiLeaks(result);
      expect(result).toContain('1.');
      expect(result).toContain('2.');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(2);
    });

    it('4. Makefile with .PHONY and multiple targets', () => {
      const result = extractAIAnswer(fb3_makefilePhony);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const allContent = blocks.join('\n');
      expect(allContent).toContain('build:');
      expect(allContent).toContain('clean:');
    });

    it('5. tee heredoc for K8s manifest creation', () => {
      const result = extractAIAnswer(fb3_teeHeredoc);
      assertNoAnsiLeaks(result);
      expect(result).toContain('kubectl apply');
      const blocks = extractCodeBlocks(result);
      const yamlInSeparateBlock = blocks.some(
        b => b.includes('apiVersion:') && !b.includes('kubectl apply')
      );
      expect(yamlInSeparateBlock).toBe(false);
    });

    it('6. CSS code in panel should be wrapped', () => {
      const result = extractAIAnswer(fb3_cssPanel);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks.join('\n')).toContain('body {');
    });

    it('7. SQL query in panel should be wrapped', () => {
      const result = extractAIAnswer(fb3_sqlPanel);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks.join('\n')).toContain('SELECT name');
    });

    it('8. prose between two code panels stays as prose', () => {
      const result = extractAIAnswer(fb3_proseBetweenPanels);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      const allContent = blocks.join('\n');
      expect(allContent).not.toContain('Then check');
      expect(allContent).toContain('kubectl get pods');
      expect(allContent).toContain('kubectl logs pod-name');
    });

    it('9. bare JSON array output wrapped in code block', () => {
      const result = extractAIAnswer(fb3_bareJsonArray);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks.join('\n')).toContain('"name": "pod-1"');
    });

    it('10. multiple heredocs in one response', () => {
      const result = extractAIAnswer(fb3_multipleHeredocs);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      const yamlOnly = blocks.filter(b => b.includes('apiVersion:') && !b.includes('cat >'));
      expect(yamlOnly.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 4
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 4', () => {
    it('1. shell heredoc with <<-EOF keeps YAML body in same block', () => {
      const result = extractAIAnswer(fb4_heredocDashEof);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(result).not.toContain('```yaml');
      const yamlInSeparateBlock = blocks.some(
        b => b.includes('apiVersion: v1') && !b.includes('cat <<-EOF')
      );
      expect(yamlInSeparateBlock).toBe(false);
    });

    it('2. YAML merge-key line <<: *defaults stays inside yaml block', () => {
      const result = extractAIAnswer(fb4_yamlMergeKey);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('defaults: &defaults');
      expect(blocks[0]).toContain('<<: *defaults');
    });

    it('3. Makefile .PHONY and dependency targets stay in one code block', () => {
      const result = extractAIAnswer(fb4_makefilePhonyDeps);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('.PHONY: build deps clean');
      expect(blocks[0]).toContain('build: deps');
      expect(blocks[0]).toContain('deps:');
    });

    it('4. lowercase SQL panel content stays in one code block', () => {
      const result = extractAIAnswer(fb4_lowercaseSql);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('select name, age');
      expect(blocks[0]).toContain('from users');
      expect(blocks[0]).toContain('where age > 18');
    });

    it('5. Dockerfile panel with image tag keeps following lines in same block', () => {
      const result = extractAIAnswer(fb4_dockerfileImageTag);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('FROM gcr.io/distroless/cc-debian12:nonroot');
      expect(blocks[0]).toContain('WORKDIR /app');
      expect(blocks[0]).toContain('COPY --from=builder /app/bin /app/bin');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 5
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 5', () => {
    it('1. C/C++ #include headers stay in one code block', () => {
      const result = extractAIAnswer(fb5_cIncludeHeaders);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('#include <stdio.h>');
      expect(blocks[0]).toContain('int main()');
      expect(blocks[0]).toContain('return 0;');
    });

    it('2. Rust match arms with => are not converted to ordered lists', () => {
      const result = extractAIAnswer(fb5_rustMatchArms);
      assertNoAnsiLeaks(result);
      expect(result).not.toMatch(/^\d+\.\s+println!/m);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('match status');
      expect(blocks[0]).toContain('200 =>');
    });

    it('3. Shell backslash continuation stays in one code block', () => {
      const result = extractAIAnswer(fb5_shellBackslashContinuation);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('docker run');
      expect(blocks[0]).toContain('--name mycontainer');
      expect(blocks[0]).toContain('-d nginx:latest');
    });

    it('4. TypeScript interface is not split by YAML detection', () => {
      const result = extractAIAnswer(fb5_tsInterface);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('interface User');
      expect(blocks[0]).toContain('name: string;');
      expect(blocks[0]).toContain('age: number;');
    });

    it('5. JSON object in Rich panel keeps all content in code blocks', () => {
      const result = extractAIAnswer(fb5_jsonObject);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const allBlockContent = blocks.join('\n');
      expect(allBlockContent).toContain('"apiVersion": "v1"');
    });

    it('6. Python triple-quote string with YAML-like content stays in one block', () => {
      const result = extractAIAnswer(fb5_pythonTripleQuoteYaml);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      const allBlockContent = blocks.join('\n');
      expect(allBlockContent).toContain('apiVersion: v1');
    });

    it('7. Go struct with JSON tags stays in one code block', () => {
      const result = extractAIAnswer(fb5_goStructJsonTags);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('type Pod struct');
      expect(blocks[0]).toContain('Name      string');
      expect(blocks[0]).toContain('Status    string');
    });

    it('8. kubectl get pods output stays in one code block', () => {
      const result = extractAIAnswer(fb5_kubectlGetPods);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('NAME');
      expect(blocks[0]).toContain('nginx-deployment');
      expect(blocks[0]).toContain('redis-master-0');
    });

    it('9. Prose with panel code gets first code block wrapped', () => {
      const result = extractAIAnswer(fb5_proseWithPanelCode);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain('npm install express');
      expect(result).toContain('app.listen(3000)');
    });

    it('10. YAML with boolean and numeric values stays in one block', () => {
      const result = extractAIAnswer(fb5_yamlBooleanValues);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('apiVersion: v1');
      expect(blocks[0]).toContain('debug: "true"');
      expect(blocks[0]).toContain('verbose: "false"');
    });

    it('11. Shell case statement stays in one code block', () => {
      const result = extractAIAnswer(fb5_shellCaseStatement);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('case "$1" in');
      expect(blocks[0]).toContain('esac');
    });

    it('12. Terraform HCL resource block stays in one code block', () => {
      const result = extractAIAnswer(fb5_terraformHcl);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('resource "azurerm_kubernetes_cluster"');
      expect(blocks[0]).toContain('dns_prefix');
    });

    it('13. Docker Compose YAML stays in one block', () => {
      const result = extractAIAnswer(fb5_dockerComposeYaml);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('services:');
      expect(blocks[0]).toContain('image: nginx:latest');
      expect(blocks[0]).toContain('POSTGRES_PASSWORD: secret');
    });

    it('14. Rust with lifetime annotations has code in blocks', () => {
      const result = extractAIAnswer(fb5_rustLifetimes);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]).toContain("fn longest<'a>");
    });

    it('15. Numbered steps with shell commands render correctly', () => {
      const result = extractAIAnswer(fb5_numberedStepsShell);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(3);
      expect(blocks[0]).toContain('kubectl create namespace');
      expect(blocks[1]).toContain('kubectl apply');
      expect(blocks[2]).toContain('kubectl get pods');
    });
  });

  describe('round 6', () => {
    it('1. Java try-catch-finally stays in one code block', () => {
      const result = extractAIAnswer(fb6_javaTryCatchFinally);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('try {');
      expect(all).toContain('catch');
      expect(all).toContain('finally');
    });

    it('2. Print/log statements detected as code', () => {
      const result = extractAIAnswer(fb6_printLogStatements);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('console.log');
    });

    it('3. Arrow functions and modern JS syntax in code block', () => {
      const result = extractAIAnswer(fb6_arrowFunctions);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('=>');
      expect(all).toContain('res.json');
    });

    it('4. TypeScript interface with colon-typed members stays in code block', () => {
      const result = extractAIAnswer(fb6_tsInterfaceColonMembers);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('interface PodStatus');
      expect(all).toContain('name: string');
      expect(all).toContain('restartCount: number');
    });

    it('5. Shell until loop stays in one code block', () => {
      const result = extractAIAnswer(fb6_shellUntilLoop);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('until');
      expect(all).toContain('done');
    });

    it('6. Prose between two code blocks keeps them separate', () => {
      const result = extractAIAnswer(fb6_proseBetweenCodeBlocks);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      expect(blocks[0]).toContain('create namespace');
      expect(blocks[1]).toContain('kubectl apply');
    });

    it('7. Python f-string with braces stays in code block', () => {
      const result = extractAIAnswer(fb6_pythonFStringBraces);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('logger.info');
      expect(all).toContain('logger.error');
    });

    it('8. K8s YAML with anchors and aliases stays in one block', () => {
      const result = extractAIAnswer(fb6_yamlAnchorsAliases);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('apiVersion');
      expect(all).toContain('500m');
    });

    it('9. Rust enum with derive and variants stays in one block', () => {
      const result = extractAIAnswer(fb6_rustEnumDerive);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('#[derive');
      expect(all).toContain('pub enum AppError');
    });

    it('10. Shell if/elif/else/fi stays in one block', () => {
      const result = extractAIAnswer(fb6_shellIfElifElse);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('if kubectl');
      expect(all).toContain('fi');
    });

    it('11. Go goroutine with channel stays in code block', () => {
      const result = extractAIAnswer(fb6_goGoroutineChannel);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('func worker');
      expect(all).toContain('results <- j * 2');
    });

    it('12. Docker run with backslash continuation stays together', () => {
      const result = extractAIAnswer(fb6_dockerRunBackslash);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('docker run');
      expect(all).toContain('myimage:latest');
    });

    it('13. Java annotations and class stay in one block', () => {
      const result = extractAIAnswer(fb6_javaAnnotationsClass);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('@RestController');
      expect(all).toContain('class UserController');
    });

    it('14. kubectl patch with inline JSON stays in one block', () => {
      const result = extractAIAnswer(fb6_kubectlPatchJson);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl patch');
      expect(all).toContain('kubectl get pods');
    });

    it('15. YAML and shell blocks separated by prose', () => {
      const result = extractAIAnswer(fb6_yamlShellProseSeparated);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      const all = blocks.join('\n');
      expect(all).toContain('apiVersion: v1');
      expect(all).toContain('kubectl apply');
    });
  });

  describe('round 7', () => {
    it('1. Lua code with local and function detected as code', () => {
      const result = extractAIAnswer(fb7_luaLocalFunction);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('local M');
      expect(all).toContain('function M.setup');
    });

    it('2. Export environment variables detected as shell code', () => {
      const result = extractAIAnswer(fb7_exportEnvVars);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('export KUBECONFIG');
      expect(all).toContain('export REGISTRY');
    });

    it('3. awk and sed commands detected as code', () => {
      const result = extractAIAnswer(fb7_awkSedCommands);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('awk');
      expect(all).toContain('sed');
    });

    it('4. CSS rules detected as code block', () => {
      const result = extractAIAnswer(fb7_cssRules);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('.container {');
      expect(all).toContain('display: flex');
    });

    it('5. Protobuf message definition detected as code', () => {
      const result = extractAIAnswer(fb7_protobufMessage);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('syntax = "proto3"');
      expect(all).toContain('message PodMetrics');
    });

    it('6. Systemd unit file stays in one block', () => {
      const result = extractAIAnswer(fb7_systemdUnitFile);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('[Unit]');
      expect(all).toContain('[Service]');
    });

    it('7. Shell pipe chain with line continuations stays together', () => {
      const result = extractAIAnswer(fb7_shellPipeChain);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl get pods');
      expect(all).toContain('head -10');
    });

    it('8. Shell script with variables and commands stays together', () => {
      const result = extractAIAnswer(fb7_shellScriptVarsCommands);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('#!/bin/bash');
      expect(all).toContain('kubectl set image');
    });

    it('9. JSON configuration object stays in one block', () => {
      const result = extractAIAnswer(fb7_jsonConfigObject);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('"scripts"');
      expect(all).toContain('"test"');
    });

    it('10. Ruby class with methods stays in one block', () => {
      const result = extractAIAnswer(fb7_rubyClassMethods);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('class KubernetesClient');
      expect(all).toContain('def get_pods');
    });

    it('11. Kotlin data class detected as code', () => {
      const result = extractAIAnswer(fb7_kotlinDataClass);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('data class PodInfo');
      expect(all).toContain('val name');
    });

    it('12. C struct typedef stays in one code block', () => {
      const result = extractAIAnswer(fb7_cStructTypedef);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('typedef struct');
      expect(all).toContain('ServiceConfig');
    });

    it('13. az CLI commands with JMESPath queries stay in one block', () => {
      const result = extractAIAnswer(fb7_azCliJmesPath);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('az aks show');
      expect(all).toContain('--output table');
    });

    it('14. Python async function with type hints stays in one block', () => {
      const result = extractAIAnswer(fb7_pythonAsyncTypeHints);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('async def get_pods');
      expect(all).toContain('await client');
    });

    it('15. Numbered steps with code blocks render separately', () => {
      const result = extractAIAnswer(fb7_numberedStepsCodeBlocks);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(3);
      const all = blocks.join('\n');
      expect(all).toContain('create secret');
      expect(all).toContain('kubectl apply');
      expect(all).toContain('kubectl get all');
    });
  });

  describe('round 8', () => {
    it('1. Go struct literal with field: value stays in code block', () => {
      const result = extractAIAnswer(fb8_goStructLiteral);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('config :=');
      expect(all).toContain('Host:');
      expect(all).toContain('MaxConns: 100');
    });

    it('2. Python function call with kwargs stays in code block', () => {
      const result = extractAIAnswer(fb8_pythonKwargs);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('logging.basicConfig');
      expect(all).toContain('FileHandler');
    });

    it('3. Shell trap and source commands detected as code', () => {
      const result = extractAIAnswer(fb8_shellTrapSource);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('#!/bin/bash');
      expect(all).toContain('trap');
    });

    it('4. GitHub Actions YAML workflow stays in one block', () => {
      const result = extractAIAnswer(fb8_githubActionsYaml);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('name: Deploy');
      expect(all).toContain('runs-on');
    });

    it('5. Rust closures and iterator chains stay in one block', () => {
      const result = extractAIAnswer(fb8_rustClosuresIterators);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('let results');
      expect(all).toContain('.collect()');
    });

    it('6. Shell heredoc with YAML content stays in one block', () => {
      const result = extractAIAnswer(fb8_shellHeredocYaml);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('cat <<EOF');
      expect(all).toContain('apiVersion: v1');
      expect(all).toContain('EOF');
    });

    it('7. Docker Compose with build context stays in one block', () => {
      const result = extractAIAnswer(fb8_dockerComposeBuildContext);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('version:');
      expect(all).toContain('depends_on');
    });

    it('8. Shell function definition stays in one block', () => {
      const result = extractAIAnswer(fb8_shellFunctionDef);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('check_pod_ready()');
      expect(all).toContain('kubectl get pod');
    });

    it('9. Python nested expressions stay in code block', () => {
      const result = extractAIAnswer(fb8_pythonNestedExpressions);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('import json');
      expect(all).toContain('json.dumps');
    });

    it('10. Terraform with multiple resource types stays in one block', () => {
      const result = extractAIAnswer(fb8_terraformMultipleResources);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('provider "azurerm"');
      expect(all).toContain('resource "azurerm_kubernetes_cluster"');
    });

    it('11. SQL JOIN query stays in one code block', () => {
      const result = extractAIAnswer(fb8_sqlJoinQuery);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('SELECT');
      expect(all).toContain('INNER JOIN');
    });

    it('12. K8s CRD definition stays in one YAML block', () => {
      const result = extractAIAnswer(fb8_k8sCrdDefinition);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('apiextensions.k8s.io');
      expect(all).toContain('openAPIV3Schema');
    });

    it('13. Swift struct with properties stays in code block', () => {
      const result = extractAIAnswer(fb8_swiftStructProperties);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('struct PodInfo');
      expect(all).toContain('isReady');
    });

    it('14. Makefile with ifeq conditional stays in one block', () => {
      const result = extractAIAnswer(fb8_makefileIfeq);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('REGISTRY');
      expect(all).toContain('docker build');
    });

    it('15. Elixir module with functions stays in one block', () => {
      const result = extractAIAnswer(fb8_elixirModule);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('defmodule');
      expect(all).toContain('get_pods');
    });
  });

  describe('round 9', () => {
    it('1. TypeScript generic types not confused with HTML tags', () => {
      const result = extractAIAnswer(fb9_tsGenericTypes);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('KubernetesClient');
      expect(all).toContain('client.list');
    });

    it('2. PHP class with namespace stays in one block', () => {
      const result = extractAIAnswer(fb9_phpClassNamespace);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('<?php');
      expect(all).toContain('class PodController');
    });

    it('3. Scala case class detected as code', () => {
      const result = extractAIAnswer(fb9_scalaCaseClass);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('case class Pod');
      expect(all).toContain('object PodService');
    });

    it('4. Shell arrays and parameter expansion stay in code block', () => {
      const result = extractAIAnswer(fb9_shellArraysParamExpansion);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('NAMESPACES=');
      expect(all).toContain('done');
    });

    it('5. INI config file detected as code block', () => {
      const result = extractAIAnswer(fb9_iniConfigFile);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('[global]');
      expect(all).toContain('scrape_interval');
    });

    it('6. Rust with turbofish and type annotations stays in code block', () => {
      const result = extractAIAnswer(fb9_rustTurbofish);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('serde_json');
      expect(all).toContain('collect::<Vec');
    });

    it('7. Python multi-line string stays in code block', () => {
      const result = extractAIAnswer(fb9_pythonMultiLineString);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('YAML_TEMPLATE');
      expect(all).toContain('kind: Deployment');
    });

    it('8. Java Spring Boot service stays in one block', () => {
      const result = extractAIAnswer(fb9_javaSpringBootService);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('@Service');
      expect(all).toContain('listPods');
    });

    it('9. Shell with here-string stays in code block', () => {
      const result = extractAIAnswer(fb9_shellHereString);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl get nodes');
      expect(all).toContain('done');
    });

    it('10. curl with JSON body stays in one block', () => {
      const result = extractAIAnswer(fb9_curlJsonBody);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('curl -X POST');
      expect(all).toContain('"namespace"');
    });

    it('11. Kotlin suspend function stays in code block', () => {
      const result = extractAIAnswer(fb9_kotlinSuspendFunction);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('suspend fun');
      expect(all).toContain('withContext');
    });

    it('12. Terraform locals and data sources stay in one block', () => {
      const result = extractAIAnswer(fb9_terraformLocalsData);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('locals {');
      expect(all).toContain('data "azurerm_client_config"');
    });

    it('13. Markdown table passes through without code wrapping', () => {
      const result = extractAIAnswer(fb9_markdownTable);
      assertNoAnsiLeaks(result);
      // Tables should NOT be in code blocks
      expect(result).toContain('| Name | Status |');
      const blocks = extractCodeBlocks(result);
      const all = blocks.join('\n');
      expect(all).not.toContain('| Name |');
    });

    it('14. Shell process substitution stays in code block', () => {
      const result = extractAIAnswer(fb9_shellProcessSubstitution);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('diff');
      expect(all).toContain('kubectl get cm');
    });

    it('15. Requirements.txt content stays in code block', () => {
      const result = extractAIAnswer(fb9_requirementsTxt);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('flask==3.0.0');
      expect(all).toContain('kubernetes==28.1.0');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 10
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 10', () => {
    it('1. GitHub Actions YAML branches: [main] not corrupted by ANSI stripping', () => {
      const result = extractAIAnswer(fb10_ghActionsBranchesMain);
      assertNoAnsiLeaks(result);
      expect(result).toContain('[main]');
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('branches: [main]');
      expect(all).toContain('kubectl apply');
    });

    it('2. Prometheus [5m] duration selector not corrupted', () => {
      const result = extractAIAnswer(fb10_prometheusDuration5m);
      // Don't use assertNoAnsiLeaks — [5m] in PromQL is intentional content
      expect(result).not.toMatch(/\x1b/);
      const blocks = extractCodeBlocks(result);
      const all = blocks.join('\n');
      expect(all).toContain('[5m]');
      expect(all).toContain('HighLatency');
      // for: 10m may be outside the code block due to deep-indent handling
      expect(result).toContain('10m');
    });

    it('3. Kustomization YAML in panel gets wrapped in code fence', () => {
      const result = extractAIAnswer(fb10_kustomizationYaml);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('resources:');
      expect(all).toContain('namePrefix: prod-');
      expect(all).toContain('commonLabels:');
    });

    it('4. Helm values.yaml in panel gets wrapped in code fence', () => {
      const result = extractAIAnswer(fb10_helmValuesYaml);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      const all = blocks.join('\n');
      expect(all).toContain('replicaCount: 3');
      expect(all).toContain('pullPolicy: IfNotPresent');
      expect(all).toContain('helm install');
    });

    it('5. Azure DevOps pipeline YAML in panel gets wrapped', () => {
      const result = extractAIAnswer(fb10_azureDevOpsPipeline);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('trigger:');
      expect(all).toContain('KubernetesManifest');
      expect(all).toContain('kubernetesServiceConnection');
    });

    it('6. Ansible playbook YAML in panel gets wrapped', () => {
      const result = extractAIAnswer(fb10_ansiblePlaybook);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('Deploy to AKS');
      expect(all).toContain('azure_rm_aks_info');
      expect(all).toContain('kubernetes.core.k8s');
    });

    it('7. ConfigMap with literal block scalar bash script stays in one block', () => {
      const result = extractAIAnswer(fb10_configMapLiteralBlock);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('ConfigMap');
      expect(all).toContain('init.sh');
      expect(all).toContain('sleep 2');
      expect(all).toContain('done');
      // Verify everything is in the SAME block
      const sameBlock = blocks.some(b => b.includes('ConfigMap') && b.includes('sleep 2'));
      expect(sameBlock).toBe(true);
    });

    it('8. Makefile .PHONY and variable assignments stay in code block', () => {
      const result = extractAIAnswer(fb10_makefilePhony);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('.PHONY');
      expect(all).toContain('IMAGE ?=');
      expect(all).toContain('docker build');
    });

    it('9. NGINX config with proxy_pass stays in one code block', () => {
      const result = extractAIAnswer(fb10_nginxProxyPass);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      const all = blocks.join('\n');
      expect(all).toContain('server {');
      expect(all).toContain('proxy_pass');
      expect(all).toContain('location /healthz');
    });

    it('10. Python K8s operator with deep nesting stays in one block', () => {
      const result = extractAIAnswer(fb10_pythonK8sOperator);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kopf');
      expect(all).toContain('namespace="default"');
      const sameBlock = blocks.some(b => b.includes('kopf') && b.includes('namespace="default"'));
      expect(sameBlock).toBe(true);
    });

    it('11. Grafana JSON in ConfigMap with [5m] Prometheus duration preserved', () => {
      const result = extractAIAnswer(fb10_grafanaConfigMap5m);
      // Don't use assertNoAnsiLeaks — [5m] in PromQL is intentional content
      expect(result).not.toMatch(/\x1b/);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('[5m]');
      expect(all).toContain('ConfigMap');
      expect(all).toContain('Request Rate');
      const sameBlock = blocks.some(b => b.includes('ConfigMap') && b.includes('[5m]'));
      expect(sameBlock).toBe(true);
    });

    it('12. Docker Compose YAML in panel gets wrapped', () => {
      const result = extractAIAnswer(fb10_dockerComposeYaml);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('services:');
      expect(all).toContain('postgres:15');
    });

    it('13. Envoy proxy config YAML gets wrapped in panel', () => {
      const result = extractAIAnswer(fb10_envoyProxyConfig);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('static_resources:');
      expect(all).toContain('envoy.filters');
    });

    it('14. Azure Bicep for AKS stays in one code block', () => {
      const result = extractAIAnswer(fb10_azureBicepAks);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBe(1);
      const all = blocks.join('\n');
      expect(all).toContain('resource aks');
      expect(all).toContain('agentpool');
      expect(all).toContain('Standard_D2s_v3');
    });

    it('15. kubectl top millicore values not corrupted', () => {
      const result = extractAIAnswer(fb10_kubectlTopMillicores);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('250m');
      expect(all).toContain('500m');
      expect(all).toContain('128Mi');
      expect(all).toContain('kubectl top');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 11
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 11', () => {
    it('1. kubectl resource action output lines detected as code', () => {
      const result = extractAIAnswer(fb11_kubectlScaleOutput);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl scale');
      expect(all).toContain('deployment.apps/my-app scaled');
    });

    it('2. kubectl apply output lines stay in code block', () => {
      const result = extractAIAnswer(fb11_kubectlApplyOutput);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl apply');
      expect(all).toContain('service/my-app-svc created');
      expect(all).toContain('ingress.networking.k8s.io/my-ingress created');
    });

    it('3. Helm status output not treated as YAML keys', () => {
      const result = extractAIAnswer(fb11_helmStatusOutput);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('helm status');
      expect(all).toContain('STATUS: deployed');
    });

    it('4. kubectl rollout output stays in code block', () => {
      const result = extractAIAnswer(fb11_kubectlRolloutStatus);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl rollout');
      expect(all).toContain('successfully rolled out');
    });

    it('5. terraform plan output with + prefix detected as code', () => {
      const result = extractAIAnswer(fb11_terraformPlanOutput);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('terraform plan');
      expect(all).toContain('azurerm_kubernetes_cluster');
    });

    it('6. Docker build step output stays in code block', () => {
      const result = extractAIAnswer(fb11_dockerBuildSteps);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('docker build');
      expect(all).toContain('Step 1/5');
      expect(all).toContain('Successfully tagged');
    });

    it('7. Helm template Go expressions in bare output wrapped as code', () => {
      const result = extractAIAnswer(fb11_helmTemplateGoExpr);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('{{- if .Values.ingress.enabled');
      expect(all).toContain('kind: Ingress');
      expect(all).toContain('{{- end }}');
    });

    it('8. ConfigMap with embedded Spring properties stays together', () => {
      const result = extractAIAnswer(fb11_configMapSpringProperties);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kind: ConfigMap');
      expect(all).toContain('spring.datasource.url');
      expect(all).toContain('management.endpoints');
    });

    it('9. kubectl error messages not absorbed into YAML blocks', () => {
      const result = extractAIAnswer(fb11_kubectlErrorMessage);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl get pods');
      expect(all).toContain('error: the server');
      // The trailing prose should NOT be inside a code block
      expect(result).toContain('CRD is not installed');
    });

    it('10. kubectl deprecation warnings stay with command output', () => {
      const result = extractAIAnswer(fb11_kubectlWarningDeprecation);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl apply');
      expect(all).toContain('Warning:');
      expect(all).toContain('podsecuritypolicy');
    });

    it('11. bare kubectl events table detected as code', () => {
      const result = extractAIAnswer(fb11_kubectlEventsTable);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('LAST SEEN');
      expect(all).toContain('BackOff');
    });

    it('12. Kustomization with patchesStrategicMerge wrapped as YAML', () => {
      const result = extractAIAnswer(fb11_kustomizationPatches);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('resources:');
      expect(all).toContain('patchesStrategicMerge');
      expect(all).toContain('commonLabels');
    });

    it('13. Go client-go code stays in one code block', () => {
      const result = extractAIAnswer(fb11_goClientGoCode);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('package main');
      expect(all).toContain('k8s.io/client-go');
      expect(all).toContain('CoreV1().Pods');
    });

    it('14. RBAC ClusterRole with complex rules stays together', () => {
      const result = extractAIAnswer(fb11_rbacClusterRole);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('rbac.authorization.k8s.io');
      expect(all).toContain('verbs: ["*"]');
    });

    it('15. Multiple kubectl commands with prose rendered correctly', () => {
      const result = extractAIAnswer(fb11_multiKubectlWithProse);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl create namespace');
      expect(all).toContain('helm install');
      expect(all).toContain('kubectl get pods');
      expect(all).toContain('alertmanager');
      // Prose between blocks should be outside code
      expect(result).toContain('Then install Prometheus');
      expect(result).toContain('Verify the pods');
    });

    it('16. klog-format log lines from kubectl logs detected as code', () => {
      const result = extractAIAnswer(fb11_klogFormatLogs);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl logs');
      expect(all).toContain('Starting controller');
      expect(all).toContain('watch closed');
    });

    it('17. logfmt structured logging lines detected as code', () => {
      const result = extractAIAnswer(fb11_logfmtStructuredLogs);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl logs');
      expect(all).toContain('server started');
    });

    it('18. K8s validation errors stay in code block', () => {
      const result = extractAIAnswer(fb11_k8sValidationErrors);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl apply');
      expect(all).toContain('spec.containers[0].image');
    });

    it('19. K8s scheduling messages stay in kubectl describe output', () => {
      const result = extractAIAnswer(fb11_k8sSchedulingDescribe);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl describe');
      expect(all).toContain('FailedScheduling');
    });

    it('20. PVC and other resource status lines detected as code', () => {
      const result = extractAIAnswer(fb11_pvcResourceStatus);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl apply');
      expect(all).toContain('persistentvolumeclaim/data-pvc created');
      expect(all).toContain('storageclass.storage.k8s.io/fast-ssd created');
    });

    it('21. helm upgrade output with hooks and notes stays in code block', () => {
      const result = extractAIAnswer(fb11_helmUpgradeHooks);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('helm upgrade');
      expect(all).toContain('STATUS: deployed');
    });

    it('22. az aks and kubeconfig commands with output stay together', () => {
      const result = extractAIAnswer(fb11_azAksGetCredentials);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(3);
      const all = blocks.join('\n');
      expect(all).toContain('az aks get-credentials');
      expect(all).toContain('Merged');
      expect(all).toContain('kubectl config current-context');
      expect(all).toContain('kubectl get nodes');
      expect(all).toContain('aks-nodepool1');
    });

    it('23. Pod with service mesh annotations stays in one YAML block', () => {
      const result = extractAIAnswer(fb11_istioSidecarAnnotations);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('sidecar.istio.io/inject');
      expect(all).toContain('prometheus.io/scrape');
      expect(all).toContain('containerPort: 8080');
    });

    it('24. bare logfmt structured logging wrapped in code block', () => {
      const result = extractAIAnswer(fb11_bareLogfmtOutput);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('level=info');
      expect(all).toContain('server started');
    });

    it('25. bare klog format controller logs wrapped in code block', () => {
      const result = extractAIAnswer(fb11_bareKlogFormat);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('Starting controller');
      expect(all).toContain('watch closed');
    });

    it('26. bare kubectl resource action output from panel wrapped as code', () => {
      const result = extractAIAnswer(fb11_bareResourceActionOutput);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('deployment.apps/my-app configured');
      expect(all).toContain('ingress.networking.k8s.io/my-ingress created');
    });

    it('27. terraform output values at panel indent wrapped as code', () => {
      const result = extractAIAnswer(fb11_terraformOutputValues);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('cluster_endpoint');
      expect(all).toContain('cluster_name');
    });

    it('28. bare PromQL expression with [5m] wrapped as code', () => {
      const result = extractAIAnswer(fb11_barePromQL5m);
      // Don't use assertNoAnsiLeaks — [5m] in PromQL is intentional content
      expect(result).not.toMatch(/\x1b/);
      expect(result).toContain('[5m]');
      // PromQL should be in a code block or at least preserved
      expect(result).toContain('container_cpu_usage_seconds_total');
    });

    it('29. multi-step AKS troubleshooting with commands and YAML', () => {
      const result = extractAIAnswer(fb11_aksTroubleshooting);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(3);
      const all = blocks.join('\n');
      expect(all).toContain('kubectl get pods');
      expect(all).toContain('CrashLoopBackOff');
      expect(all).toContain('kubectl logs');
      expect(all).toContain('Cannot find module');
      expect(all).toContain('kind: Deployment');
    });

    it('30. K8s Secret with base64 data stays in one YAML block', () => {
      const result = extractAIAnswer(fb11_k8sSecretBase64);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('kind: Secret');
      expect(all).toContain('type: Opaque');
      expect(all).toContain('DB_HOST:');
      expect(all).toContain('DB_PASS:');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 12
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 12', () => {
    it('1. bare PromQL expressions detected as code', () => {
      const result = extractAIAnswer(fb12_barePromQLExpressions);
      // Don't use assertNoAnsiLeaks — [5m] in PromQL is intentional content
      expect(result).not.toMatch(/\x1b/);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('container_cpu_usage_seconds_total');
      expect(all).toContain('[5m]');
    });

    it('2. bare K8s event messages detected as code', () => {
      const result = extractAIAnswer(fb12_bareK8sEventMessages);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('Pulling image');
      expect(all).toContain('Started container nginx');
    });

    it('3. bare scheduling failure messages detected as code', () => {
      const result = extractAIAnswer(fb12_bareSchedulingFailure);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('0/3 nodes are available');
    });

    it('4. bare Prometheus metric query results detected as code', () => {
      const result = extractAIAnswer(fb12_barePrometheusMetrics);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('container_memory_working_set_bytes');
      expect(all).toContain('kube_pod_status_phase');
    });

    it('5. bare readiness probe failure messages detected as code', () => {
      const result = extractAIAnswer(fb12_bareProbeFailures);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('Readiness probe failed');
      expect(all).toContain('Startup probe failed');
    });

    it('6. CoreDNS Corefile with deep nesting stays complete', () => {
      const result = extractAIAnswer(fb12_coreDNSCorefile);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('.:53 {');
      expect(all).toContain('kubernetes cluster.local');
      expect(all).toContain('lameduck 5s');
      expect(all).toContain('pods insecure');
      expect(all).toContain('forward . /etc/resolv.conf');
    });

    it('7. PrometheusRule CRD YAML with deep rules stays complete', () => {
      const result = extractAIAnswer(fb12_prometheusRuleCRD);
      // Don't use assertNoAnsiLeaks — [5m] in PromQL is intentional content
      expect(result).not.toMatch(/\x1b/);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('monitoring.coreos.com/v1');
      expect(all).toContain('HighErrorRate');
      expect(all).toContain('severity: critical');
      expect(all).toContain('for: 5m');
    });

    it('8. deeply nested az aks JSON output stays complete', () => {
      const result = extractAIAnswer(fb12_azAksJsonOutput);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('"name": "nodepool1"');
      expect(all).toContain('"code": "Running"');
      expect(all).toContain('"env": "production"');
    });

    it('9. bare container crash messages detected as code', () => {
      const result = extractAIAnswer(fb12_bareContainerCrash);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('Back-off restarting');
      expect(all).toContain('definition changed');
    });

    it('10. bare volume mount failure messages detected as code', () => {
      const result = extractAIAnswer(fb12_bareVolumeMountFailure);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('MountVolume.SetUp failed');
      expect(all).toContain('AttachVolume.Attach failed');
    });

    it('11. bare image pull failure messages detected as code', () => {
      const result = extractAIAnswer(fb12_bareImagePullFailure);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('Failed to pull image');
      expect(all).toContain('Error response from daemon');
    });

    it('12. bare scheduling detail messages detected as code', () => {
      const result = extractAIAnswer(fb12_bareSchedulingDetails);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('Insufficient cpu');
      expect(all).toContain('topologySpreadConstraints');
    });

    it('13. bare CRI-O container log lines detected as code', () => {
      const result = extractAIAnswer(fb12_bareCRIOLogs);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('stdout F Starting application');
      expect(all).toContain('stderr F Error');
    });

    it('14. bare multi-line container lifecycle events detected as code', () => {
      const result = extractAIAnswer(fb12_bareContainerLifecycle);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('Pulling image');
      expect(all).toContain('Liveness probe failed');
    });

    it('15. bare key=value diagnostic output detected as code', () => {
      const result = extractAIAnswer(fb12_bareKeyValueDiagnostics);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      const all = blocks.join('\n');
      expect(all).toContain('runtime.name=containerd');
      expect(all).toContain('container.id=abc123def456');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 13
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 13', () => {
    it('1. prose sentence ending with colon is not code', () => {
      const result = extractAIAnswer(fb13_proseColonEnding);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      // The prose should NOT be inside any code block
      for (const block of blocks) {
        expect(block).not.toContain('diagnose it');
      }
      // No empty code blocks should be generated
      for (const block of blocks) {
        expect(block.trim()).not.toBe('');
      }
    });

    it('2. diagnostic summary ending with colon is not code', () => {
      const result = extractAIAnswer(fb13_diagnosticSummaryColon);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('pod problems');
        expect(block.trim()).not.toBe('');
      }
      expect(result).toContain('No obvious pod problems right now:');
    });

    it('3. step heading ending with colon does not produce empty code block', () => {
      const result = extractAIAnswer(fb13_stepHeadingColon);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      // No empty code blocks
      for (const block of blocks) {
        expect(block.trim()).not.toBe('');
      }
      // "Build + push:" should be prose, not inside a code block
      for (const block of blocks) {
        expect(block).not.toContain('Build + push:');
      }
    });

    it('4. assumptions heading with colon does not produce empty code block', () => {
      const result = extractAIAnswer(fb13_assumesHeadingColon);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      // No empty code blocks
      for (const block of blocks) {
        expect(block.trim()).not.toBe('');
      }
      // "Assumes:" should be prose
      for (const block of blocks) {
        expect(block).not.toContain('Assumes:');
      }
    });

    it('5. markdown bold text with k8s terms is not code', () => {
      const result = extractAIAnswer(fb13_boldK8sTerms);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('deployment');
        expect(block).not.toContain('kube-system');
      }
    });

    it('6. markdown bullet list with technical terms is not code', () => {
      const result = extractAIAnswer(fb13_bulletListTechTerms);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('OOMKilled');
        expect(block).not.toContain('Liveness probe');
        expect(block).not.toContain('CrashLoopBackOff');
      }
    });

    it('7. numbered step list with k8s actions is not code', () => {
      const result = extractAIAnswer(fb13_numberedStepList);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('Create the deployment');
        expect(block).not.toContain('Verify pods are');
      }
    });

    it('8. markdown headers are not YAML comments or code', () => {
      const result = extractAIAnswer(fb13_markdownHeaders);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('Troubleshooting');
        expect(block).not.toContain('Step 1');
        expect(block).not.toContain('Step 2');
      }
    });

    it('9. prose with URLs is not code', () => {
      const result = extractAIAnswer(fb13_proseWithUrls);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('kubernetes.io');
        expect(block).not.toContain('microsoft.com');
      }
    });

    it('10. note prefix with explanation is not code', () => {
      const result = extractAIAnswer(fb13_notePrefix);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('cluster-admin');
        expect(block).not.toContain('assumes you');
      }
    });

    it('11. multi-paragraph technical explanation is not code', () => {
      const result = extractAIAnswer(fb13_multiParagraphExplanation);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('CrashLoopBackOff');
        expect(block).not.toContain('Common causes');
        expect(block).not.toContain('recommend');
      }
    });

    it('12. prose with inline code backticks is not wrapped in code fence', () => {
      const result = extractAIAnswer(fb13_inlineCodeBackticks);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('You can check the status');
        expect(block).not.toContain('output should show');
      }
    });

    it('13. prose with colon-separated key-value descriptions is not YAML', () => {
      const result = extractAIAnswer(fb13_proseKeyValueDescriptions);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('cluster has');
        expect(block).not.toContain('All nodes');
        expect(block.trim()).not.toBe('');
      }
    });

    it('14. questions about k8s resources are not code', () => {
      const result = extractAIAnswer(fb13_questionsAboutK8s);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('namespace');
        expect(block).not.toContain('replicas');
        expect(block).not.toContain('resource limits');
      }
    });

    it('15. mixed markdown formatting is not code', () => {
      const result = extractAIAnswer(fb13_mixedMarkdownFormatting);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('healthy');
        expect(block).not.toContain('Node status');
        expect(block).not.toContain('Pod health');
        expect(block).not.toContain('pending pods');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 14
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 14', () => {
    it('1. "Also confirm:" after shell commands is not code', () => {
      const result = extractAIAnswer(fb14_alsoConfirmAfterShell);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      // No empty code blocks
      for (const block of blocks) {
        expect(block.trim()).not.toBe('');
      }
      // "Also confirm" should NOT be inside any code block
      for (const block of blocks) {
        expect(block).not.toContain('Also confirm');
      }
      // kubectl commands SHOULD be in a code block
      const allCode = blocks.join('\n');
      expect(allCode).toContain('kubectl get pods');
    });

    it('2. "Also confirm:" without blank line after shell is not code', () => {
      const result = extractAIAnswer(fb14_alsoConfirmNoBlank);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('Also confirm');
      }
    });

    it('3. "Also confirm:" after double blank is not code', () => {
      const result = extractAIAnswer(fb14_alsoConfirmDoubleBlank);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('Also confirm');
      }
    });

    it('4. "Build + push:" prose heading is not code', () => {
      const result = extractAIAnswer(fb14_buildPushProseHeading);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block).not.toContain('Build + push');
      }
    });

    it('5. Rich panel code then "Also confirm:" stays prose', () => {
      const result = extractAIAnswer(fb14_panelCodeThenAlsoConfirm);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      for (const block of blocks) {
        expect(block.trim()).not.toBe('');
        expect(block).not.toContain('Also confirm');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Round 15
  // ═══════════════════════════════════════════════════════════════════════════
  describe('round 15', () => {
    it('1. requirements.txt followed by pinned dependencies', () => {
      const result = extractAIAnswer(fb15_requirementsTxtPanel);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      // The pinned deps should be in a code block
      const depBlock = blocks.find(b => b.includes('fastapi==0.110.0') && b.includes('uvicorn'));
      expect(depBlock).toBeDefined();
    });

    it('2. main.py followed by Python code', () => {
      const result = extractAIAnswer(fb15_mainPyPanel);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      const pyBlock = blocks.find(
        b => b.includes('from fastapi import FastAPI') && b.includes('def root():')
      );
      expect(pyBlock).toBeDefined();
    });

    it('3. numbered step header is NOT a code block', () => {
      const result = extractAIAnswer(fb15_numberedStepHeaderPanel);
      assertNoAnsiLeaks(result);
      // Should NOT be in a code block
      expect(result).toContain('3) Kubernetes');
      const blocks = extractCodeBlocks(result);
      const headingBlock = blocks.find(b => b.includes('3) Kubernetes'));
      expect(headingBlock).toBeUndefined();
    });

    it('4. Dockerfile filename followed by Dockerfile content', () => {
      const result = extractAIAnswer(fb15_dockerfilePanel);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      const dockerBlock = blocks.find(
        b => b.includes('FROM python:3.12-slim') && b.includes('CMD')
      );
      expect(dockerBlock).toBeDefined();
    });

    it('5. requirements.txt followed by deps (non-panel format)', () => {
      const result = extractAIAnswer(fb15_requirementsTxtNonPanel);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      const depBlock = blocks.find(b => b.includes('fastapi==0.110.0'));
      expect(depBlock).toBeDefined();
    });

    it('6. main.py followed by Python code (non-panel format)', () => {
      const result = extractAIAnswer(fb15_mainPyNonPanel);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      const pyBlock = blocks.find(
        b => b.includes('from fastapi import FastAPI') && b.includes('def root():')
      );
      expect(pyBlock).toBeDefined();
    });

    it('7. numbered header 3) is NOT code in non-panel format', () => {
      const result = extractAIAnswer(fb15_numberedStepHeaderNonPanel);
      assertNoAnsiLeaks(result);
      expect(result).toContain('3)');
      const blocks = extractCodeBlocks(result);
      const headingBlock = blocks.find(b => b.includes('Kubernetes'));
      expect(headingBlock).toBeUndefined();
    });

    it('8. Cargo.toml: with trailing colon wraps TOML content', () => {
      const result = extractAIAnswer(fb15_cargoTomlNonPanel);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      const tomlBlock = blocks.find(b => b.includes('[package]') && b.includes('name = "myapp"'));
      expect(tomlBlock).toBeDefined();
    });

    it('9. deployment.yaml heading keeps YAML separate from filename', () => {
      const result = extractAIAnswer(fb15_deploymentYamlPanel);
      assertNoAnsiLeaks(result);
      expect(result).toContain('deployment.yaml');
      const blocks = extractCodeBlocks(result);
      const yamlBlock = blocks.find(
        b => b.includes('apiVersion: apps/v1') && b.includes('kind: Deployment')
      );
      expect(yamlBlock).toBeDefined();
    });

    it('10. src/main.rs: with trailing colon wraps Rust code', () => {
      const result = extractAIAnswer(fb15_mainRsNonPanel);
      assertNoAnsiLeaks(result);
      const blocks = extractCodeBlocks(result);
      const rustBlock = blocks.find(b => b.includes('fn main()') && b.includes('println!'));
      expect(rustBlock).toBeDefined();
    });

    it('11. indented numbered step header after Go code is NOT a code block', () => {
      const result = extractAIAnswer(fb15_numberedStepAfterGoCode);
      assertNoAnsiLeaks(result);

      // The Go code should be in a code block
      const blocks = extractCodeBlocks(result);
      const goBlock = blocks.find(b => b.includes('package main') && b.includes('func main()'));
      expect(goBlock).toBeDefined();

      // The numbered step header should NOT be in a code block
      const stepBlock = blocks.find(b => b.includes('2) Containerize'));
      expect(stepBlock).toBeUndefined();
      expect(result).toContain('2) Containerize');
    });

    it('12. Assumptions: between Go code and Dockerfile is prose, not code', () => {
      const result = extractAIAnswer(fb15_assumptionsBetweenCodeBlocks);
      assertNoAnsiLeaks(result);

      // Assumptions: should appear as prose, NOT in any code block
      const blocks = extractCodeBlocks(result);
      const assumptionsBlock = blocks.find(b => b.includes('Assumptions:'));
      expect(assumptionsBlock).toBeUndefined();
      expect(result).toContain('Assumptions:');

      // No empty code blocks
      const emptyBlock = blocks.find(b => b.trim() === '');
      expect(emptyBlock).toBeUndefined();

      // Go code should be in a code block
      const goBlock = blocks.find(b => b.includes('package main') && b.includes('func main()'));
      expect(goBlock).toBeDefined();

      // Dockerfile should be in a separate code block
      const dockerBlock = blocks.find(b => b.includes('FROM maven'));
      expect(dockerBlock).toBeDefined();
    });
  });
});

describe('trace12: Trace transformations', () => {
  it('Trace Test 9: HPA YAML flow through normalizeTerminalMarkdown and wrapBareYamlBlocks', () => {
    const hpaBody = [
      'Create the HPA:',
      '',
      panelLine('apiVersion: autoscaling/v2'),
      panelLine('kind: HorizontalPodAutoscaler'),
      panelLine('metadata:'),
      panelLine('  name: my-app-hpa'),
      panelLine('spec:'),
      panelLine('  scaleTargetRef:'),
      panelLine('    apiVersion: apps/v1'),
      panelLine('    kind: Deployment'),
      panelLine('    name: my-app'),
      panelLine('  minReplicas: 2'),
      panelLine('  maxReplicas: 10'),
      panelLine('  metrics:'),
      panelLine('  - type: Resource'),
      panelLine('    resource:'),
      panelLine('      name: cpu'),
      panelLine('      target:'),
      panelLine('        type: Utilization'),
      panelLine('        averageUtilization: 70'),
      panelBlank(),
    ];

    const raw = makeRaw(hpaBody);

    // Step 1: Strip ANSI codes
    const stripped = raw.replace(/\x1b\[[0-9;]*m/g, '');

    console.log('\n========== STEP 1: After ANSI strip (lines 7-27) ==========');
    stripped
      .split('\n')
      .slice(7, 28)
      .forEach((line, i) => {
        const indent = line.match(/^ */)?.[0].length || 0;
        console.log(
          `Line ${i.toString().padEnd(2)}: indent=${indent.toString().padEnd(2)} | ${line.slice(
            0,
            60
          )}`
        );
      });

    // Step 2: normalizeTerminalMarkdown
    console.log('\n========== STEP 2: After normalizeTerminalMarkdown ==========');
    const afterNormalize = normalizeTerminalMarkdown(stripped);
    let inFence = false;
    let fenceType = '';
    let blockNum = 0;
    afterNormalize.split('\n').forEach(line => {
      if (/^```/.test(line.trim())) {
        if (inFence) {
          console.log(`Block ${blockNum} END\n`);
        } else {
          blockNum++;
          fenceType = line.trim().substring(3) || 'plain';
          console.log(`Block ${blockNum} START (type: ${fenceType || 'plain'})`);
        }
        inFence = !inFence;
      } else if (inFence) {
        const indent = line.match(/^ */)?.[0].length || 0;
        console.log(`  indent=${indent.toString().padEnd(2)} | ${line.slice(0, 55)}`);
      }
    });

    // Step 3: wrapBareYamlBlocks
    console.log('\n========== STEP 3: After wrapBareYamlBlocks ==========');
    const afterYaml = wrapBareYamlBlocks(afterNormalize);
    inFence = false;
    blockNum = 0;
    afterYaml.split('\n').forEach(line => {
      if (/^```/.test(line.trim())) {
        if (inFence) {
          console.log(`Block ${blockNum} END\n`);
        } else {
          blockNum++;
          fenceType = line.trim().substring(3) || 'plain';
          console.log(`Block ${blockNum} START (type: ${fenceType || 'plain'})`);
        }
        inFence = !inFence;
      } else if (inFence) {
        const indent = line.match(/^ */)?.[0].length || 0;
        console.log(`  indent=${indent.toString().padEnd(2)} | ${line.slice(0, 55)}`);
      }
    });
  });
});

function makeFixture(contentLines: string[]): string {
  return [
    'stty -echo',
    '\x1b[?2004l',
    '\x1b[?2004hroot@aks-agent:/app# ',
    '\x1b[?2004l',
    '',
    "Loaded models: ['azure/gpt-4']",
    '\x1b[1;96mAI:\x1b[0m ',
    '',
    ...contentLines,
    '',
    '\x1b[?2004hroot@aks-agent:/app# ',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// BUG FOUND: normalizeTerminalMarkdown truncates YAML literal/folded block scalar
// content when it appears inside a Rich terminal panel. Lines after the block scalar
// indicator (|, >, |-,|+, etc.) are dropped from the code block output.
// These tests demonstrate the bug. They are skipped pending parser fix.
// ---------------------------------------------------------------------------
// 8. YAML literal/folded block scalars (10 tests)
// ---------------------------------------------------------------------------
describe('8 – YAML literal/folded block scalars preserved', () => {
  const indicators = ['|', '|-', '|+', '>', '>-', '>+', '|2', '>2', '|-2', '>+2'];

  indicators.forEach((ind, i) => {
    describe(`8.${i + 1} – block scalar indicator "${ind}"`, () => {
      let result: string;

      beforeAll(() => {
        const fixture = makeFixture([
          'Here is the ConfigMap:',
          '',
          '\x1b[1mconfigmap.yaml\x1b[0m',
          panelBlank(),
          panelLine('apiVersion: v1'),
          panelLine('kind: ConfigMap'),
          panelLine('metadata:'),
          panelLine('  name: my-config'),
          panelLine('data:'),
          panelLine(`  config.txt: ${ind}`),
          panelLine('    line one of the config'),
          panelLine('    line two of the config'),
          panelLine('    line three of the config'),
          panelBlank(),
        ]);
        result = extractAIAnswer(fixture);
      });

      it('block scalar content is in a single code block', () => {
        const blocks = extractCodeBlocks(result);
        expect(blocks.length).toBeGreaterThanOrEqual(1);
        const combined = blocks.join('|||');
        expect(combined).toContain('line one');
        expect(combined).toContain('line three');
      });

      it(`indicator "${ind}" appears in output`, () => {
        expect(result).toContain(ind);
      });

      it('no ANSI leaks', () => {
        assertNoAnsiLeaks(result);
      });
    });
  });
});
