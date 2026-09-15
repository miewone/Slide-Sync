# Development and verification

## Development

Use the Node.js version in the root `.node-version` file. Run the commands below from the project root.

```sh
npm ci
npm run dev
```

## Production

```sh
npm run build
npm run preview
```

Deploy the complete `dist/` directory to a static host. It is generated output; edit `src/` and `public/` instead. `vite preview` is for local build verification. For a subdirectory deployment:

```sh
npm run build -- --base=/slides/
npm run preview -- --base=/slides/
```

The configured base applies to sample files and lazy vendor assets. Serve over HTTP, not `file://`.

## Design

- React components own the toolbar, slide scope list, status and selection results.
- Shared buttons, selects, checkboxes, number fields and inspector sections live in `src/components/ui.jsx`.
- An instance-scoped editor runtime owns preview descendants, pointer gestures and uncontrolled editor form fields. React does not reconcile the cached preview DOM.
- `EditorStore` provides immutable, field-level subscriptions via `useSyncExternalStore`. XML and DOM objects remain in the editor engine.
- `PreviewResources` defers the existing ZIP/chart/rendering dependencies until a file is opened, deduplicates requests and permits retry after network failure. ECharts loads only when slide, layout or master XML contains a chart reference; the late-bound adapter supports opening a chart deck after a chart-free deck.
- Vite splits editor and renderer modules, minifies application code and produces hashed assets. Existing minified classic vendor bundles are copied from `public/vendor/` and retain their license notices.
- Nearby slides render first and receive iframe documents; distant slides keep light shells and detached caches. Editing becomes available once all caches are ready, including those required for offscreen text fitting. Frames are retained after their first mount.
- Unchanged display rows and selection summaries retain their references. Drag overlays update only affected nearby slides, with guide-hit highlighting limited to the reference slide.
- Selection, movement, undo and guides reuse iframe documents and preview caches. ZIP encoding happens only on export. Drag updates are batched with `requestAnimationFrame`.
- Unmount cleans up scoped events, observers, active gestures and rendering hosts; outstanding async work cannot update a disposed editor.

## Verification

```sh
npm test
npm run build
npm run test:browser
```

The browser runner uses installed Chrome and Node's built-in WebSocket, with no added test dependency. Set `CHROME_BIN` if necessary. Local ports 5179, 4179 and 4189 must be available. It verifies development, production and `/slides/` deployment; sample loading; selection; move/undo; scope changes; guides; stable iframe documents; no extra ZIP encoding during edits; export/reimport coordinates; themed master/layout artwork; and unmount/remount during asynchronous loading. Screenshots are written to ignored `artifacts/`. The theme fixture is also available at `/tests/preview-theme.html` on the development server. Additional checks cover conditional chart loading and 30/60/120-slide decks, including offscreen movement, fitting and undo. Metrics are saved to `artifacts/optimization-metrics.json`; see [performance notes](performance.md).

Production CSP restricts scripts to local assets; preview iframe scripts remain disabled. Development uses Vite's normal HMR setup. Uploaded strings are escaped by React or the existing preview sanitization path.

This is not a complete PowerPoint rendering engine. Fonts, effects, custom geometry, SmartArt and unsupported media may differ. Grouped chart drawing remains a limitation of the existing vendor renderer; chart-reference detection still includes groups. Native PowerPoint comparison is unverified; the test machine lacks Korean fonts, limiting screenshot typography checks. Existing input limits remain 50 MiB compressed, 300 MiB declared decompressed, 120 slides and 25 undo operations.

The source bundle originally shipped as v5; historical behavior and validation notes are preserved in [legacy-v5.md](legacy-v5.md). Third-party notices are in `public/vendor/NOTICE.txt`; React runtime license files are also included there and copied into the distribution.


## Editing pipeline regression checks

The browser suite also covers cached package reads, position-only preview synchronization, held-arrow snapshot reuse, fresh text-fit state after undo, and static-media loading with poster/export preservation. See [editing optimization notes](editing-optimization.md). The vendored renderer has a small `staticPreview`/media-lifecycle patch; retain its tests when upgrading it.
