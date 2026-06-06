import { getHeadlampLink } from './headlampLink';
import { Link } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link as MuiLink } from '@mui/material';
import React from 'react';
import { Link as RouterLink, useHistory } from 'react-router-dom';
import ContentRendererBase from '@headlamp-k8s/ai-ui/components/chat/ContentRenderer';
import type { ContentRendererProps as BaseProps } from '@headlamp-k8s/ai-ui/components/chat/ContentRenderer';

/**
 * Headlamp link renderer for markdown content.
 *
 * Resolves Kubernetes resource links via headlamp-plugin's `Link` component
 * and uses `react-router-dom` for internal navigation. Falls back to
 * external links for non-headlamp URLs.
 */
const HeadlampLinkRenderer = React.memo(({ href, children, ...props }: any) => {
  const history = useHistory();

  // Check if it's a resource details link
  const headlampLinkDetails = getHeadlampLink(href);
  if (headlampLinkDetails.isHeadlampLink) {
    const { kubeObject } = headlampLinkDetails;
    if (kubeObject) {
      return <Link kubeObject={kubeObject} />;
    }
    // In case it's a Headlamp processed link but no kube object
    if (headlampLinkDetails.url) {
      return (
        <MuiLink
          to={headlampLinkDetails.url}
          component={RouterLink}
          onClick={(e: any) => {
            e.preventDefault();
            history.push(headlampLinkDetails.url);
          }}
        >
          {children}
        </MuiLink>
      );
    }

    // The link is not supported in Headlamp so likely the LLM made it up
    return <em>{children}</em>;
  }

  return (
    <MuiLink href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </MuiLink>
  );
});
HeadlampLinkRenderer.displayName = 'HeadlampLinkRenderer';

type ContentRendererProps = Omit<BaseProps, 'LinkRendererSlot'>;

/**
 * ContentRenderer with headlamp-plugin link resolution.
 *
 * Thin wrapper around the framework-agnostic ContentRenderer from ai-ui
 * that injects the HeadlampLinkRenderer for Kubernetes resource links.
 */
const ContentRenderer: React.FC<ContentRendererProps> = React.memo(
  (props) => (
    <ContentRendererBase {...props} LinkRendererSlot={HeadlampLinkRenderer} />
  ),
  (prevProps, nextProps) => {
    return (
      prevProps.content === nextProps.content &&
      prevProps.onYamlDetected === nextProps.onYamlDetected &&
      prevProps.onRetryTool === nextProps.onRetryTool
    );
  }
);

ContentRenderer.displayName = 'ContentRenderer';

export default ContentRenderer;
