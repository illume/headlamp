# Accessibility Issues Tracking

This document tracks the remaining accessibility violations found by axe-storybook-testing that require design/UX review and component refactoring.

## Summary

- **Total Stories**: 462
- **Passing**: 423 (91.6%)
- **Failing**: 39 (8.4%)

## Issues by Category

### 1. Heading Order (7 issues)

Heading hierarchy violations where h6 elements appear without proper parent headings (h1-h5).

- [ ] **Settings/PluginSettings**: `frontend/src/components/App/PluginSettings/PluginSettings.stories.tsx` - Fix heading hierarchy - Add proper parent headings (h1-h5) before h6 elements for plugin names
- [ ] **Settings/PluginSettings**: `frontend/src/components/App/PluginSettings/PluginSettings.stories.tsx` - Fix heading hierarchy in DefaultSaveEnable story
- [ ] **Settings/PluginSettings**: `frontend/src/components/App/PluginSettings/PluginSettings.stories.tsx` - Fix heading hierarchy in ManyItems story
- [ ] **Settings/PluginSettings**: `frontend/src/components/App/PluginSettings/PluginSettings.stories.tsx` - Fix heading hierarchy in MoreItems story
- [ ] **Settings/PluginSettings**: `frontend/src/components/App/PluginSettings/PluginSettings.stories.tsx` - Fix heading hierarchy in EmptyHomepageItems story
- [ ] **Settings/PluginSettings**: `frontend/src/components/App/PluginSettings/PluginSettings.stories.tsx` - Fix heading hierarchy in MultipleLocations story  
- [ ] **Settings/PluginSettings**: `frontend/src/components/App/PluginSettings/PluginSettings.stories.tsx` - Fix heading hierarchy in MigrationScenario story
- [ ] **common/ReleaseNotes/ReleaseNotes**: `frontend/src/components/common/ReleaseNotes/ReleaseNotes.stories.tsx` - Fix h3 appearing without h1-h2 in Default story
- [ ] **common/ReleaseNotes/ReleaseNotesModal**: `frontend/src/components/common/ReleaseNotes/ReleaseNotesModal.stories.tsx` - Fix h3 appearing without h1-h2 in Show story

### 2. Color Contrast (12 issues)

Elements with insufficient color contrast ratios that don't meet WCAG 4.5:1 requirements.

- [ ] **TopBar**: `frontend/src/components/App/TopBar.tsx` - Fix color contrast for search hint "Press / to search" - Current: 4.05:1 (#7b7b83 on #fbfbfb), Required: 4.5:1 (affects 9 TopBar stories)
- [ ] **Settings/PluginSettings**: `frontend/src/components/App/PluginSettings/PluginSettings.tsx` - Fix color contrast for "User-installed" chip - Current: 3.85:1 (#ffffff on #0288d1), Required: 4.5:1 (affects MultipleLocations and MigrationScenario stories)
- [ ] **GlobalSearch**: `frontend/src/components/GlobalSearch/GlobalSearch.tsx` - Fix color contrast for search hint - Current: 4.13:1 (#7c7c84 on #ffffff), Required: 4.5:1

### 3. Empty Heading (11 issues)

DialogTitle components rendering empty h1 elements.

- [ ] **AuthToken**: `frontend/src/components/account/AuthToken.stories.tsx` - Fix empty DialogTitle h1 in ShowError story - Add accessible title or modify DialogTitle to not render h1 when empty
- [ ] **AuthToken**: `frontend/src/components/account/AuthToken.stories.tsx` - Fix empty DialogTitle h1 in ShowActions story
- [ ] **AuthChooser**: `frontend/src/components/account/AuthChooser.stories.tsx` - Fix empty DialogTitle h1 in BasicAuthChooser story
- [ ] **AuthChooser**: `frontend/src/components/account/AuthChooser.stories.tsx` - Fix empty DialogTitle h1 in Testing story
- [ ] **AuthChooser**: `frontend/src/components/account/AuthChooser.stories.tsx` - Fix empty DialogTitle h1 in HaveClusters story
- [ ] **AuthChooser**: `frontend/src/components/account/AuthChooser.stories.tsx` - Fix empty DialogTitle h1 in AuthTypeoidc story
- [ ] **AuthChooser**: `frontend/src/components/account/AuthChooser.stories.tsx` - Fix empty DialogTitle h1 in AnError story
- [ ] **cluster/Chooser**: `frontend/src/components/cluster/Chooser.stories.tsx` - Fix empty DialogTitle h1 in Normal story
- [ ] **cluster/Chooser**: `frontend/src/components/cluster/Chooser.stories.tsx` - Fix empty DialogTitle h1 in SingleCluster story
- [ ] **cluster/Chooser**: `frontend/src/components/cluster/Chooser.stories.tsx` - Fix empty DialogTitle h1 in ManyClusters story
- [ ] **cluster/Chooser**: `frontend/src/components/cluster/Chooser.stories.tsx` - Fix empty DialogTitle h1 in NoClusters story

**Note**: These require modifying the DialogTitle component (`frontend/src/components/common/Dialog.tsx`) to either not render h1 when children is empty or use a different heading level/element.

### 4. ARIA Dialog Name (1 issue)

- [ ] **TopBar/Version Dialog**: `frontend/src/components/App/VersionDialog.tsx` - Add aria-label attribute to Dialog component to provide accessible name

### 5. Landmark Unique (1 issue)

- [ ] **Activity**: `frontend/src/components/Activity/Activity.stories.tsx` - Add unique aria-label to complementary landmark to distinguish from other complementary landmarks

### 6. ARIA Required Children (2 issues)

- [ ] **cluster/ClusterChooserPopup**: `frontend/src/components/cluster/ClusterChooserPopup.tsx` - Fix menu role containing li[tabindex] children - Use proper menuitem roles or change from menu to list
- [ ] **cluster/ClusterChooserPopup**: `frontend/src/components/cluster/ClusterChooserPopup.tsx` - Fix menu role containing li[tabindex] children in Scrollbar story

### 7. List Item Structure (2 issues)

- [ ] **cluster/ClusterChooserPopup**: `frontend/src/components/cluster/ClusterChooserPopup.tsx` - Fix ListSubheader "Recent clusters" not contained in proper list parent - Parent has role="menu" instead of role="list"
- [ ] **cluster/ClusterChooserPopup**: `frontend/src/components/cluster/ClusterChooserPopup.tsx` - Fix ListSubheader in Scrollbar story

### 8. Scrollable Region Focusable (1 issue)

- [ ] **cluster/ClusterChooserPopup**: `frontend/src/components/cluster/ClusterChooserPopup.tsx` - Add tabIndex={0} to scrollable list or make content focusable in Scrollbar story

### 9. ARIA Allowed Role (1 issue)

- [ ] **DropZoneBox**: `frontend/src/components/common/DropZoneBox.tsx` - Remove role="button" from label element or change to appropriate element type in UploadFiles story

### 10. ARIA Progressbar Name (1 issue)

- [ ] **common/Loader**: `frontend/src/components/common/Loader.tsx` - Add aria-label to CircularProgress when title prop is empty in WithEmptyTitle story

### 11. ARIA Required Parent (1 issue)

- [ ] **Resource/RestartMultipleButton**: `frontend/src/components/common/Resource/RestartMultipleButton.stories.tsx` - Ensure MenuItem is wrapped in proper Menu/MenuBar parent in MenuButtonStyle story

### 12. ARIA Allowed Attributes (2 issues)

- [ ] **common/ShowHideLabel**: `frontend/src/components/common/ShowHideLabel.tsx` - Remove aria-expanded from label element or change to button/other interactive element in Basic story
- [ ] **common/ShowHideLabel**: `frontend/src/components/common/ShowHideLabel.tsx` - Remove aria-expanded from label element in Expanded story

## Testing

To run accessibility tests:

```bash
# From root directory
npm run frontend:test:a11y

# From frontend directory
cd frontend && npm run test:a11y
```

The tests are configured to pass even with these known baseline failures. New accessibility issues will cause CI to fail.

## Baseline Configuration

Known failures are tracked in `frontend/.axe-storybook-baseline.test-a11y.json`. This file is used by the test suite to allow known failures while catching new violations.
