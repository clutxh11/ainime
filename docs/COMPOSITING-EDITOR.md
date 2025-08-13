## Compositing Editor (MVP)

This document defines the MVP feature set and UX for our Compositing Editor. It aligns with the “up to 9:00” portion of the AE walkthrough transcript (before global effects/filters), and integrates with the existing shared editor shell in mode: `composite`.

### Goals

- Import and organize scene assets (layout/BG, animation cells as image sequences).
- Camera/canvas setup (size, fps, duration), basic transforms (pan/rotate/scale) applied to the cell+BG comp.
- Cell processing that mirrors the AE workflow:
  - Key (white→alpha) for non‑alpha drawings.
  - Shadow separation using magenta mask (keep/holdout), grow (dilate), blur, fill color, opacity.
  - Optional line smoothing (mild AA) pass.
- Timeline timing in frames (24 fps), with per‑clip holds to match timing sheets.
- Deterministic layer order (BG → cells → shadow → overlays).
- Export frame sequence (PNG) across a chosen range.

### Integration: existing editor shell

The Compositing Editor reuses `components/animation-editor.tsx` in `mode="composite"`:

- Left tool rail is hidden by default.
- Timeline grid at the bottom is kept (rows = tracks, frames = time).
- Right sidebar shows the Layers pane and a new “Cell FX” panel (see below).
- Back button returns to Project Details, preserving `projectId`/`chapterId` context.

### Project structure & storage

- DB: one `compositions` row per chapter. Editor state persists to `compositions.data` and versioned JSON snapshots in Storage.
- Storage bucket (configurable via `NEXT_PUBLIC_SCENE_BUCKET`, default `animation-assets`):

```
animation-assets/
  {projectName}-{projectId}/
    {chapterName}-{chapterId}/
      composition-{compositionId}/
        composition/scene-{ISO_TIMESTAMP}.json
        assets/
          frames/{trackId}/{clipIndex}/{ISO_TIMESTAMP}-{fileName}
```

### Canvas & comp settings

- Canvas size: width/height (default 1920×1080).
- FPS: default 24.
- Duration: in frames (driven by timeline content; extendable).
- Camera block (applied to the “cell+BG” group):
  - Position (pan), rotation (deg), scale (%), optional auto‑upscale to fill render frame.

### Asset ingest

1. Layout/BG image(s)
   - Drag/drop onto canvas; placed on the BG track.
   - Basic transforms (position/scale/rotate) to match the reference.
2. Cell drawings
   - Drag/drop image sequence (or batch of files) into a track.
   - Clip created with length = 1 frame; extend by dragging to create holds (step timing).
   - Multiple tracks permitted (e.g., character vs. effects).

### Cell FX panel (per‑clip)

Mirrors the AE steps, but simplified into real‑time filters:

- **White Key**: convert white background to alpha.
  - Threshold, softness.
- **Shadow Separation (Magenta)**:
  - Keep magenta on one layer, keep non‑magenta on another (internally we split the clip render into base + shadow pass).
  - **Grow (Dilate)**: px.
  - **Blur (Gaussian)**: px.
  - **Set Matte**: use base cell alpha as matte for the grown shadow pass.
  - **Shadow Fill**: color (default dark gray), **Opacity**: %.
- **Line Smooth (AA)**: low‑strength smoothing for aliased lines.

Notes

- For MVP, effects are CPU Canvas shaders; if perf requires, we’ll swap to WebGL.
- The panel is disabled for BG clips (white key doesn’t apply).

### Timeline & timing

- Resolution in frames at 24 fps.
- Clips can be dragged, trimmed, and lengthened to create holds.
- Row order = z‑order (top row renders above lower rows). Folder chevrons adjust per‑frame z‑order.
- Onion‑skin preview of previous frame for alignment (on/off; 30% opacity), drawn above background plates.

### Layer order

At render time per frame:

1. Background (BG track).
2. Cell base (after white key).
3. Shadow pass (grown, blurred, filled, matted).
4. Overlays / guides (optional).  
   Onion skin (if enabled) is composited on top at 30% opacity for visibility.

### Export

- Modal: export folder, file name scheme (frame folder name → `R{row}F{frame}`), format (PNG/JPG/WEBP).
- Options:
  - Export entire selected row (all its clips) or only current frame.
- Output naming: `R{row}F{frame}.{ext}`; downloaded or saved via FS Access API when supported.

### Persistence

- `Save` writes current comp document to `compositions.data` and optionally uploads a versioned JSON to Storage (manifest + `latest_key`).
- Asset drops upload to Storage under the composition’s `assets/` subfolder and are referenced by signed URLs in‑document.

### UI mapping

- Top bar: Back to Project, title, zoom, Settings, Export, Save.
- Right: Layers (rows/tracks, per‑frame folders) + Cell FX panel (when a cell clip is selected).
- Bottom: Timeline grid (rows, frames), transport controls.

### Out of scope (post‑9:00)

- Global gradient lighting & scene‑wide filters.
- Lens flares, hue/saturation look layers, complex LUTs.
- Final grading stack; export to video.

### Acceptance checklist (MVP)

- [ ] Import BG and align it.
- [ ] Import cell sequence, create clip, adjust holds to match timing sheet.
- [ ] White→alpha works with threshold/softness.
- [ ] Shadow separation produces a soft, dilated shadow with color/opacity.
- [ ] Onion skin shows previous frame above BG.
- [ ] Export PNG frames (single or entire row) with correct names.
- [ ] Save/Reload restores composition correctly.

### Developer notes

- Mode switch is driven by `sceneSettings.mode = 'composite'` in `app/page.tsx` – we reuse the shared editor.
- Storage bucket name is controlled by `NEXT_PUBLIC_SCENE_BUCKET` (default `animation-assets`).
- Composition existence toggles the Chapter button label on Project Details via a `compositions` table check.
