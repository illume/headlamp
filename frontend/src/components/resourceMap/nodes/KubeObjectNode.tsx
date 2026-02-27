/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Icon } from '@iconify/react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/system/colorManipulator';
import { Handle, NodeProps, Position } from '@xyflow/react';
import React, { memo, useEffect, useRef, useState } from 'react';
import { Activity } from '../../activity/Activity';
import { GraphNodeDetails } from '../details/GraphNodeDetails';
import { getMainNode } from '../graph/graphGrouping';
import { useGraphView, useNode } from '../GraphView';
import { KubeIcon } from '../kubeIcon/KubeIcon';
import { NodeGlance } from '../KubeObjectGlance/NodeGlance';
import { useBrowserZoom } from '../useDevicePixelRatio';
import { GroupNodeComponent } from './GroupNode';
import { getStatus } from './KubeObjectStatus';

const Container = styled('div')<{
  isExpanded: boolean;
  isFaded: boolean;
  isSelected: boolean;
  childrenCount: number;
}>(({ theme, isSelected, isExpanded, childrenCount }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: isExpanded ? 'auto' : '100%!important',
  minWidth: '100%',
  height: isExpanded ? 'auto' : '100%',
  minHeight: '100%',
  boxSizing: 'border-box',

  position: 'absolute',
  background: theme.palette.background.paper,
  borderRadius: '10px',
  border: '1px solid',

  borderColor: isSelected ? theme.palette.action.active : theme.palette.divider,

  padding: '10px',
  willChange: 'width, height, border-color, box-shadow',

  ':hover': {
    borderColor: isSelected ? undefined : alpha(theme.palette.action.active, 0.2),
    boxShadow: '4px 4px 6px rgba(0,0,0,0.06)',
  },

  '::before':
    childrenCount > 1
      ? {
          content: `''`,
          width: '100%',
          height: '100%',
          position: 'absolute',
          left: '5px',
          top: '5px',
          background: theme.palette.background.paper,
          border: '1px solid',
          borderColor: theme.palette.divider,
          borderRadius: '10px',
          zIndex: '-1',
        }
      : undefined,

  '::after':
    childrenCount > 2
      ? {
          content: `''`,
          width: '100%',
          height: '100%',
          position: 'absolute',
          left: '9px',
          top: '9px',
          background: theme.palette.background.paper,
          border: '1px solid',
          borderColor: theme.palette.divider,
          borderRadius: '10px',
          zIndex: '-2',
        }
      : undefined,
}));

const CircleBadge = styled('div')(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  margin: theme.spacing(-1),
  justifyContent: 'center',
  background: theme.palette.background.paper,
  boxShadow: '1px 1px 5px rgba(0,0,0,0.08)',
  transition: 'top 0.05s',
  transitionTimingFunction: 'linear',
  border: '1px solid #e1e1e1',
  borderColor: theme.palette.divider,
  color: theme.typography.caption.color,
}));

const TextContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  height: '48px',
});

const LabelContainer = styled('div')<{ isCollapsed?: boolean }>(({ isCollapsed }) => ({
  display: 'flex',
  flexDirection: isCollapsed ? 'column' : 'row',
  overflow: 'hidden',
  justifyContent: 'center',
  alignItems: isCollapsed ? undefined : 'center',
}));

const Subtitle = styled('div')({
  opacity: 0.8,
  fontSize: 14,
});

const Title = styled('div')({
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
});

const EXPAND_DELAY = 450;
/** Minimum px of space below the node before the glance flips to open upward. */
const GLANCE_FLIP_THRESHOLD = 300;
/** Maximum width of the glance card in pixels — must match the `maxWidth` sx value. */
const GLANCE_MAX_WIDTH = 350;
/** Visual gap between the node edge and the glance card. */
const GLANCE_GAP = 8;
/**
 * Browser zoom threshold above which the glance is suppressed when
 * `disableGlanceAtHighZoom` is set. Using `outerWidth/innerWidth` (browser
 * zoom ratio) rather than `devicePixelRatio` means this fires only when the
 * user has actually zoomed the browser — it is NOT triggered by a HiDPI/Retina
 * display at 100% zoom (where `devicePixelRatio` is already 2 but
 * `outerWidth/innerWidth` remains ~1). A threshold of 1.9 gives tolerance for
 * minor deviations due to browser chrome.
 */
const HIGH_ZOOM_THRESHOLD = 1.9;

export const KubeObjectNodeComponent = memo(({ id }: NodeProps) => {
  const node = useNode(id);
  const [isHovered, setHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  /**
   * Whether the glance card should open to the LEFT of the node.
   * Computed via getBoundingClientRect() when the node is hovered/focused —
   * flips left when there is not enough viewport space on the right.
   */
  const [glanceOnLeft, setGlanceOnLeft] = useState(false);
  /**
   * Whether the glance card should be anchored to the node's bottom edge so it
   * grows upward. Flips when there is not enough space below the node.
   */
  const [glanceFlipVertical, setGlanceFlipVertical] = useState(false);
  const theme = useTheme();
  const graph = useGraphView();
  const browserZoom = useBrowserZoom();

  // Suppress the glance when disableGlanceAtHighZoom is on and the browser
  // zoom level is ≥ ~150%.
  const glanceDisabled = graph.disableGlanceAtHighZoom && browserZoom >= HIGH_ZOOM_THRESHOLD;

  const mainNode = node?.nodes ? getMainNode(node.nodes) : undefined;
  const kubeObject = node?.kubeObject ?? mainNode?.kubeObject;

  const apiGroup =
    kubeObject?.jsonData?.apiVersion && kubeObject.jsonData.apiVersion.includes('/')
      ? kubeObject.jsonData.apiVersion.split('/')[0]
      : 'core';

  const isSelected = id === graph.nodeSelection;
  const isCollapsed = node?.nodes?.length ? node?.collapsed : true;

  let status = 'success';

  if (kubeObject) {
    status = getStatus(kubeObject) ?? 'success';
  }

  if (node?.nodes) {
    const errors =
      node?.nodes?.filter(it => it.kubeObject && getStatus(it.kubeObject) === 'error')?.length ?? 0;
    const warnings =
      node?.nodes?.filter(it => it.kubeObject && getStatus(it.kubeObject) === 'warning')?.length ??
      0;

    if (warnings) {
      status = 'warning';
    }
    if (errors) {
      status = 'error';
    }
  }

  useEffect(() => {
    if (!isHovered) {
      setIsExpanded(false);
      return;
    }

    const id = setTimeout(() => setIsExpanded(true), EXPAND_DELAY);
    return () => clearTimeout(id);
  }, [isHovered]);

  // When hover starts OR when the glance expands (after EXPAND_DELAY), compute
  // which side the glance should open on. Re-running on `isExpanded` ensures
  // the rect is fresh when the card actually appears.
  useEffect(() => {
    if (!isHovered || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Horizontal: open to the left when there is not enough space on the right.
    const spaceRight = window.innerWidth - rect.right;
    setGlanceOnLeft(spaceRight < GLANCE_MAX_WIDTH + GLANCE_GAP);

    // Vertical: flip to open upward when there is not enough space below.
    const hasSpaceBelow = window.innerHeight - rect.bottom >= GLANCE_FLIP_THRESHOLD;
    setGlanceFlipVertical(!hasSpaceBelow);
  }, [isHovered, isExpanded]);

  const icon = kubeObject ? (
    <KubeIcon width="42px" height="42px" kind={kubeObject.kind} apiGroup={apiGroup} />
  ) : (
    node?.icon ?? null
  );

  const openDetails = () => {
    graph.setNodeSelection(id);
    setHovered(false);

    if (!node || node?.nodes) return;

    const hasContent = node.detailsComponent || node.kubeObject;
    if (!hasContent) return;

    Activity.launch({
      id: node.id,
      location: 'split-right',
      temporary: true,
      cluster: node.kubeObject?.cluster,
      hideTitleInHeader: true,
      icon: node.kubeObject ? (
        <KubeIcon kind={node.kubeObject.kind} apiGroup={apiGroup} width="100%" height="100%" />
      ) : null,
      title: node.label ?? node.kubeObject?.metadata?.name,
      content: <GraphNodeDetails node={node} />,
    });
  };

  const label = node?.label ?? kubeObject?.metadata?.name;
  const subtitle = node?.subtitle ?? kubeObject?.kind;

  if (!node) {
    return null;
  }

  if (node?.nodes?.length && !node.collapsed) {
    return <GroupNodeComponent id={id} />;
  }

  return (
    <Container
      ref={containerRef}
      tabIndex={0}
      role="button"
      isFaded={false}
      childrenCount={node.nodes?.length ?? 0}
      isSelected={isSelected}
      isExpanded={false}
      onClick={openDetails}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          openDetails();
        }
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {isCollapsed && status !== 'success' && (
        <CircleBadge style={{ right: node.nodes?.length ? '36px' : undefined }}>
          <Icon
            color={theme.palette[status].main}
            icon={status === 'error' ? 'mdi:exclamation' : 'mdi:information'}
            width="22px"
            height="22px"
          />
        </CircleBadge>
      )}

      {node.collapsed && (node.nodes?.length ?? 0) > 0 && (
        <CircleBadge>{node.nodes?.length ?? 0}</CircleBadge>
      )}

      <TextContainer>
        {icon}
        <LabelContainer isCollapsed={isCollapsed}>
          <Subtitle>{subtitle}</Subtitle>
          <Title
            sx={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Title>
        </LabelContainer>
      </TextContainer>

      {/* Glance card: rendered as an absolutely-positioned child of the node
           so it automatically moves and scales with the ReactFlow viewport
           (panning, map zoom controls). Positioned to the right of the node
           by default; flips left when there is not enough space on the right,
           and flips upward when there is not enough space below.
           Guard: only render when node.kubeObject is set — NodeGlance returns
           null for group/custom nodes without a kubeObject, which would
           produce an empty card. */}
      {isExpanded &&
        !glanceDisabled &&
        !!node.kubeObject && (
          <Box
            sx={{
              position: 'absolute',
              ...(glanceOnLeft
                ? { right: `calc(100% + ${GLANCE_GAP}px)` }
                : { left: `calc(100% + ${GLANCE_GAP}px)` }),
              ...(glanceFlipVertical ? { bottom: 0 } : { top: 0 }),
              zIndex: 1500,
              maxWidth: `${GLANCE_MAX_WIDTH}px`,
              minWidth: '200px',
              background: theme.palette.background.paper,
              border: '1px solid',
              borderColor: isSelected ? theme.palette.action.active : theme.palette.divider,
              borderRadius: '10px',
              padding: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
          >
            <NodeGlance node={node} />
          </Box>
        )}
    </Container>
  );
});
