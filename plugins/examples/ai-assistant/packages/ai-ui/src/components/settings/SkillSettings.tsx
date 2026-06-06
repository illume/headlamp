/**
 * Settings UI for configuring AI skill sources.
 *
 * Supports filesystem paths and GitHub repository sources, with automatic
 * detection of well-known skill directories (`.github/skills`,
 * `.github/instructions`, `.claude/skills`, `skills/`). Each source can be
 * toggled on/off and edited. Detection status is shown for well-known paths.
 *
 * Framework-agnostic: uses slot props for Dialog and SectionWrapper so it
 * works with headlamp-plugin components or plain MUI fallbacks.
 */

import { Icon } from '@iconify/react';
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { DefaultDialog, DefaultSectionWrapper } from '../defaults/DefaultSlots';
import type { ConfigStore } from './MCPSettings';
import SkillSourceEditorDialog from './SkillSourceEditorDialog';

/** Well-known directories that may contain skills in a project. */
export const WELL_KNOWN_SKILL_DIRS = [
  {
    /** Relative path within a project directory. */
    path: '.github/skills',
    /** Human-readable label shown in the UI. */
    label: 'GitHub Copilot Skills',
    /** Tool associated with this directory. */
    tool: 'GitHub Copilot',
  },
  {
    path: '.github/instructions',
    label: 'GitHub Copilot Instructions',
    tool: 'GitHub Copilot',
  },
  {
    path: '.claude/skills',
    label: 'Claude Code Skills',
    tool: 'Claude',
  },
  {
    path: 'skills',
    label: 'Generic Skills',
    tool: 'Generic',
  },
] as const;

/** Well-known GitHub repositories that contain skill files. */
export const WELL_KNOWN_SKILL_REPOS: readonly WellKnownRepoEntry[] = [
  {
    url: 'https://github.com/kubeshark/kubeshark',
    label: 'Kubeshark',
    description: 'Network traffic analysis for Kubernetes',
    path: 'skills',
    ref: 'main',
  },
  {
    url: 'https://github.com/helmfile/helmfile',
    label: 'Helmfile',
    description: 'Declarative Helm chart deployment',
    path: 'skills',
    ref: 'main',
  },
  {
    url: 'https://github.com/openshift/lightspeed-service',
    label: 'OpenShift Lightspeed',
    description: 'Kubernetes/OpenShift troubleshooting skills',
    path: 'skills',
    ref: 'main',
  },
] as const;

/** A well-known GitHub repository that contains skill files. */
export interface WellKnownRepoEntry {
  /** HTTPS URL of the GitHub repository. */
  url: string;
  /** Human-readable label for the repository. */
  label: string;
  /** Short description of what skills the repo provides. */
  description: string;
  /** Subdirectory within the repo containing skills. */
  path?: string;
  /** Git ref (branch/tag/SHA) to use. */
  ref?: string;
}

/** Configuration for a single skill source. */
export interface SkillSourceEntry {
  /** Type of source: local filesystem or Git repository. */
  type: 'local' | 'git';
  /** Filesystem path or Git URL. */
  url: string;
  /** Git ref (branch, tag, or SHA). Only for git sources. */
  ref?: string;
  /** Optional subdirectory within the source. */
  path?: string;
  /** Whether this source is active. */
  enabled: boolean;
  /** SHA-256 integrity hash for remote sources. */
  sha256?: string;
}

/** Persisted skills configuration. */
export interface SkillsConfig {
  /** Configured skill sources. */
  sources: SkillSourceEntry[];
  /** Names of individually disabled skills. */
  disabledSkills: string[];
  /** Maximum content size per skill in bytes. */
  maxSkillSizeBytes: number;
  /** Maximum total skill content in bytes. */
  maxTotalSkillSizeBytes: number;
}

/** Detection status of a well-known skill directory. */
export interface WellKnownPathStatus {
  /** Relative path within the project. */
  path: string;
  /** Human-readable label. */
  label: string;
  /** Associated tool name. */
  tool: string;
  /** Whether the path was found on the filesystem. */
  detected: boolean;
  /** Whether the user has enabled this path as a source. */
  enabled: boolean;
}

/** Props for the SkillSettings component. */
export interface SkillSettingsProps {
  /** Plugin config store for reading/writing settings. */
  configStore: ConfigStore;
  /**
   * Async function that checks whether a filesystem path exists.
   * Receives an absolute path and returns true if it exists.
   * When not provided, all well-known paths show as "unknown" status.
   */
  checkPathExists?: (path: string) => Promise<boolean>;
  /**
   * Base project directory used to resolve well-known skill paths.
   * Well-known paths are resolved relative to this directory.
   */
  projectRoot?: string;
  /** Optional wrapper component for layout (e.g. SectionBox). */
  SectionWrapper?: React.ComponentType<{ title: string; children: React.ReactNode }>;
  /** Component used to render dialog shells. Falls back to MUI Dialog. */
  DialogSlot?: React.ElementType;
  /** Callback when skills configuration changes. */
  onConfigChange?: (config: SkillsConfig) => void;
}

/** Default skills configuration. */
const DEFAULT_SKILLS_CONFIG: SkillsConfig = {
  sources: [],
  disabledSkills: [],
  maxSkillSizeBytes: 50 * 1024,
  maxTotalSkillSizeBytes: 200 * 1024,
};

/**
 * Reads skills configuration from raw plugin data.
 *
 * @param data - Raw plugin data store object.
 * @returns Stored skills config or defaults.
 */
function getSkillsConfig(data: any): SkillsConfig {
  if (!data?.skills) {
    return { ...DEFAULT_SKILLS_CONFIG };
  }
  const stored = data.skills;
  return {
    sources: Array.isArray(stored.sources) ? stored.sources : [],
    disabledSkills: Array.isArray(stored.disabledSkills) ? stored.disabledSkills : [],
    maxSkillSizeBytes:
      typeof stored.maxSkillSizeBytes === 'number'
        ? stored.maxSkillSizeBytes
        : DEFAULT_SKILLS_CONFIG.maxSkillSizeBytes,
    maxTotalSkillSizeBytes:
      typeof stored.maxTotalSkillSizeBytes === 'number'
        ? stored.maxTotalSkillSizeBytes
        : DEFAULT_SKILLS_CONFIG.maxTotalSkillSizeBytes,
  };
}

/**
 * Settings UI for configuring AI skill sources.
 *
 * Shows well-known skill paths with auto-detection, custom filesystem
 * sources, and GitHub repository sources. Each source can be toggled,
 * edited, or removed.
 */
export function SkillSettings({
  configStore,
  checkPathExists,
  projectRoot,
  SectionWrapper = DefaultSectionWrapper,
  DialogSlot = DefaultDialog,
  onConfigChange,
}: SkillSettingsProps) {
  const [config, setConfig] = useState<SkillsConfig>(() => {
    const data = configStore.get();
    return getSkillsConfig(data);
  });
  const [pendingConfig, setPendingConfig] = useState<SkillsConfig | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [wellKnownStatuses, setWellKnownStatuses] = useState<WellKnownPathStatus[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SkillSourceEntry | undefined>(undefined);

  const displayConfig = pendingConfig || config;

  // Load config from store on mount
  useEffect(() => {
    const data = configStore.get();
    const loaded = getSkillsConfig(data);
    setConfig(loaded);
    setPendingConfig(loaded);
  }, [configStore]);

  // Detect well-known paths
  useEffect(() => {
    detectWellKnownPaths();
  }, [checkPathExists, projectRoot, displayConfig.sources]);

  const detectWellKnownPaths = useCallback(async () => {
    const statuses: WellKnownPathStatus[] = await Promise.all(
      WELL_KNOWN_SKILL_DIRS.map(async dir => {
        const fullPath = projectRoot ? `${projectRoot}/${dir.path}` : dir.path;
        let detected = false;
        if (checkPathExists) {
          try {
            detected = await checkPathExists(fullPath);
          } catch {
            detected = false;
          }
        }
        const isEnabled = displayConfig.sources.some(
          s => s.type === 'local' && (s.url === fullPath || s.url === dir.path) && s.enabled
        );
        return {
          path: dir.path,
          label: dir.label,
          tool: dir.tool,
          detected,
          enabled: isEnabled,
        };
      })
    );
    setWellKnownStatuses(statuses);
  }, [checkPathExists, projectRoot, displayConfig.sources]);

  const updatePendingConfig = useCallback(
    (newConfig: SkillsConfig) => {
      setPendingConfig(newConfig);
      setHasUnsavedChanges(true);
    },
    [setPendingConfig, setHasUnsavedChanges]
  );

  const handleSaveChanges = useCallback(() => {
    if (!pendingConfig) return;
    const currentData = configStore.get() || {};
    configStore.update({
      ...currentData,
      skills: {
        sources: pendingConfig.sources,
        disabledSkills: pendingConfig.disabledSkills,
        maxSkillSizeBytes: pendingConfig.maxSkillSizeBytes,
        maxTotalSkillSizeBytes: pendingConfig.maxTotalSkillSizeBytes,
      },
    });
    const updated = configStore.get();
    const savedConfig = getSkillsConfig(updated);
    setConfig(savedConfig);
    setPendingConfig(savedConfig);
    setHasUnsavedChanges(false);
    onConfigChange?.(savedConfig);
  }, [pendingConfig, configStore, onConfigChange]);

  const handleDiscardChanges = useCallback(() => {
    setPendingConfig(config);
    setHasUnsavedChanges(false);
  }, [config]);

  const handleToggleWellKnownPath = useCallback(
    (dirPath: string) => {
      const fullPath = projectRoot ? `${projectRoot}/${dirPath}` : dirPath;
      const existingIndex = displayConfig.sources.findIndex(
        s => s.type === 'local' && (s.url === fullPath || s.url === dirPath)
      );

      let newSources: SkillSourceEntry[];
      if (existingIndex >= 0) {
        // Toggle existing source
        newSources = displayConfig.sources.map((s, i) =>
          i === existingIndex ? { ...s, enabled: !s.enabled } : s
        );
      } else {
        // Add new source (enabled by default)
        newSources = [
          ...displayConfig.sources,
          { type: 'local' as const, url: fullPath, enabled: true },
        ];
      }
      updatePendingConfig({ ...displayConfig, sources: newSources });
    },
    [displayConfig, projectRoot, updatePendingConfig]
  );

  const handleToggleWellKnownRepo = useCallback(
    (repo: WellKnownRepoEntry) => {
      const existingIndex = displayConfig.sources.findIndex(
        s => s.type === 'git' && s.url === repo.url
      );

      let newSources: SkillSourceEntry[];
      if (existingIndex >= 0) {
        newSources = displayConfig.sources.map((s, i) =>
          i === existingIndex ? { ...s, enabled: !s.enabled } : s
        );
      } else {
        // Add new source (disabled by default when first added from suggestions)
        newSources = [
          ...displayConfig.sources,
          {
            type: 'git' as const,
            url: repo.url,
            ref: repo.ref || 'main',
            path: repo.path,
            enabled: true,
          },
        ];
      }
      updatePendingConfig({ ...displayConfig, sources: newSources });
    },
    [displayConfig, updatePendingConfig]
  );

  const handleToggleSource = useCallback(
    (index: number) => {
      const newSources = displayConfig.sources.map((s, i) =>
        i === index ? { ...s, enabled: !s.enabled } : s
      );
      updatePendingConfig({ ...displayConfig, sources: newSources });
    },
    [displayConfig, updatePendingConfig]
  );

  const handleDeleteSource = useCallback(
    (index: number) => {
      const newSources = displayConfig.sources.filter((_, i) => i !== index);
      updatePendingConfig({ ...displayConfig, sources: newSources });
    },
    [displayConfig, updatePendingConfig]
  );

  const handleOpenEditor = useCallback(
    (source?: SkillSourceEntry) => {
      setEditingSource(source);
      setEditorOpen(true);
    },
    [setEditingSource, setEditorOpen]
  );

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingSource(undefined);
  }, [setEditorOpen, setEditingSource]);

  const handleSaveSource = useCallback(
    (source: SkillSourceEntry) => {
      let newSources: SkillSourceEntry[];
      if (editingSource) {
        // Find the source being edited by matching all identifying fields
        newSources = displayConfig.sources.map(s =>
          s.type === editingSource.type && s.url === editingSource.url ? source : s
        );
      } else {
        // Check for duplicates
        const exists = displayConfig.sources.some(
          s => s.type === source.type && s.url === source.url
        );
        if (exists) {
          return; // Don't add duplicates
        }
        newSources = [...displayConfig.sources, source];
      }
      updatePendingConfig({ ...displayConfig, sources: newSources });
      handleCloseEditor();
    },
    [editingSource, displayConfig, updatePendingConfig, handleCloseEditor]
  );

  // Separate sources by type for display
  const localSources = displayConfig.sources
    .map((s, i) => ({ ...s, originalIndex: i }))
    .filter(s => s.type === 'local');
  const gitSources = displayConfig.sources
    .map((s, i) => ({ ...s, originalIndex: i }))
    .filter(s => s.type === 'git');

  // Identify which local sources are well-known
  const wellKnownPaths = new Set(
    WELL_KNOWN_SKILL_DIRS.map(d => (projectRoot ? `${projectRoot}/${d.path}` : d.path))
  );
  const wellKnownRelativePaths = new Set(WELL_KNOWN_SKILL_DIRS.map(d => d.path));
  const customLocalSources = localSources.filter(
    s => !wellKnownPaths.has(s.url) && !wellKnownRelativePaths.has(s.url)
  );

  // Identify which git sources are well-known repos
  const wellKnownRepoUrls = new Set(WELL_KNOWN_SKILL_REPOS.map(r => r.url));
  const customGitSources = gitSources.filter(s => !wellKnownRepoUrls.has(s.url));

  return (
    <SectionWrapper title="Skills">
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Skills are markdown files that provide domain-specific knowledge to the AI assistant.
          Configure filesystem paths and GitHub repositories to load skills from.
        </Typography>
      </Box>

      {/* Well-Known Paths Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          Detected Skill Directories
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Well-known skill directories from Claude, GitHub Copilot, and other tools. Detected
          directories can be enabled to load skills from.
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Directory</TableCell>
                <TableCell>Tool</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Enabled</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {wellKnownStatuses.map(status => (
                <TableRow key={status.path}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {status.label}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
                        {status.path}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={status.tool} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    {checkPathExists ? (
                      status.detected ? (
                        <Tooltip title="Directory found">
                          <Chip
                            icon={<Icon icon="mdi:check-circle" />}
                            label="Detected"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Directory not found">
                          <Chip
                            icon={<Icon icon="mdi:close-circle" />}
                            label="Not found"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        </Tooltip>
                      )
                    ) : (
                      <Tooltip title="Path detection unavailable">
                        <Chip
                          icon={<Icon icon="mdi:help-circle" />}
                          label="Unknown"
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={status.enabled}
                      onChange={() => handleToggleWellKnownPath(status.path)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Suggested GitHub Repositories */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          Suggested Skill Repositories
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Well-known open-source repositories containing Kubernetes skill files. Enable a repository
          to download its skills via GitHub zip archive.
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Repository</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Enabled</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {WELL_KNOWN_SKILL_REPOS.map(repo => {
                const isEnabled = displayConfig.sources.some(
                  s => s.type === 'git' && s.url === repo.url && s.enabled
                );
                return (
                  <TableRow key={repo.url}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {repo.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {repo.url}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {repo.description}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={isEnabled}
                        onChange={() => handleToggleWellKnownRepo(repo)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Custom Filesystem Sources */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Filesystem Sources
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleOpenEditor({ type: 'local', url: '', enabled: true })}
            startIcon={<Icon icon="mdi:folder-plus" />}
          >
            Add Path
          </Button>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Custom filesystem directories to scan for skill files.
        </Typography>
        {customLocalSources.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Path</TableCell>
                  <TableCell align="center">Enabled</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customLocalSources.map(source => (
                  <TableRow key={source.originalIndex}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {source.url}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={source.enabled}
                        onChange={() => handleToggleSource(source.originalIndex)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEditor(source)}>
                          <Icon icon="mdi:pencil" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteSource(source.originalIndex)}
                          color="error"
                        >
                          <Icon icon="mdi:delete" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              No custom filesystem sources configured.
            </Typography>
          </Paper>
        )}
      </Box>

      {/* GitHub Repository Sources */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Custom GitHub Repository Sources
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleOpenEditor({ type: 'git', url: '', enabled: true })}
            startIcon={<Icon icon="mdi:github" />}
          >
            Add Repository
          </Button>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Additional GitHub repositories to download skills from via zip archive.
        </Typography>
        {customGitSources.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Repository</TableCell>
                  <TableCell>Ref</TableCell>
                  <TableCell>Path</TableCell>
                  <TableCell align="center">Enabled</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customGitSources.map(source => (
                  <TableRow key={source.originalIndex}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {source.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {source.ref || 'main'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {source.path || '/'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={source.enabled}
                        onChange={() => handleToggleSource(source.originalIndex)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEditor(source)}>
                          <Icon icon="mdi:pencil" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteSource(source.originalIndex)}
                          color="error"
                        >
                          <Icon icon="mdi:delete" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              No custom GitHub repository sources configured.
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Summary / Unsaved Changes */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="textSecondary">
          {displayConfig.sources.length} source(s) configured,{' '}
          {displayConfig.sources.filter(s => s.enabled).length} enabled.
          {hasUnsavedChanges && (
            <Typography component="span" color="warning.main" sx={{ ml: 1 }}>
              (Unsaved changes)
            </Typography>
          )}
        </Typography>
        {hasUnsavedChanges && (
          <Box display="flex" alignItems="center" gap={1}>
            <Button
              variant="outlined"
              onClick={handleDiscardChanges}
              startIcon={<Icon icon="mdi:cancel" />}
              size="small"
            >
              Discard
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveChanges}
              startIcon={<Icon icon="mdi:content-save" />}
              color="primary"
              size="small"
            >
              Save Changes
            </Button>
          </Box>
        )}
      </Box>

      {/* Source Editor Dialog */}
      <SkillSourceEditorDialog
        open={editorOpen}
        onClose={handleCloseEditor}
        source={editingSource}
        onSave={handleSaveSource}
        existingUrls={displayConfig.sources.map(s => s.url)}
        DialogSlot={DialogSlot}
      />
    </SectionWrapper>
  );
}
