---
name: write-unit-tests
description: Writing unit and integration tests for the tldraw SDK. Use when creating new tests, adding test coverage, or fixing failing tests in packages/editor or packages/tldraw. Covers Vitest patterns, TestEditor usage, and test file organization.
---

# Writing tests

Unit and integration tests use Vitest. Tests run from workspace directories, not the repo root.

## Test file locations

**Unit tests** - alongside source files:

```
packages/editor/src/lib/primitives/Vec.ts
packages/editor/src/lib/primitives/Vec.test.ts  # Same directory
```

**Integration tests** - in `src/test/` directory:

```
packages/tldraw/src/test/SelectTool.test.ts
packages/tldraw/src/test/commands/createShape.test.ts
```

## Which workspace to test in

- **packages/editor**: Core primitives, geometry, managers, base editor functionality
- **packages/tldraw**: Anything needing default shapes/tools (most integration tests)

```bash
cd packages/tldraw && yarn test run
cd packages/tldraw && yarn test run --grep "SelectTool"
```

## TestEditor vs Editor

Use `TestEditor` for integration tests (includes default shapes/tools):

```typescript
import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
})

afterEach(() => {
	editor?.dispose()
})
```

## Common TestEditor methods

```typescript
// Pointer simulation
editor.pointerDown(x, y, options?)
editor.pointerMove(x, y, options?)
editor.pointerUp(x, y, options?)
editor.click(x, y, shapeId?)
editor.doubleClick(x, y, shapeId?)

// State assertions
editor.expectToBeIn('select.idle')
editor.expectShapeToMatch({ id, x, y, props: { ... } })
```

## Running tests

```bash
cd packages/tldraw && yarn test run
cd packages/editor && yarn test run --grep "Vec"
```
