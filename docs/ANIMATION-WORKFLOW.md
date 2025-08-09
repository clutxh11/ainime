## Animation Production Flow and Project Details UX (Plan)

This document defines how the Project Details page and the drawing/animation editor work together. It replaces the previous mock workspace concept with a real, draw-first editor flow similar to Clip Studio Paint, tailored for sequences, shots, and animation.

### Goals

- **Chapter → Sequence → Shot** hierarchy drives navigation and status.
- **Shot is the smallest work unit**. All drawing/animation happens at the shot level in a unified editor.
- **Two editor modes** using the same canvas:
  - Animate mode: timeline with frames, layers, folders, and audio tracks.
  - Storyboard mode: panel templates and drawing, no animation timeline required.
- **One-click context handoff** from Project Details to Editor via URL query.

---

## Project Details Page

### Layout (as implemented today)

- Left: `Chapter Progress`
  - Volumes → Chapters
  - Each Chapter expands to `Sequences & Shots`
  - Each Sequence lists its Shots; each Shot shows stage/status chips and an `Open Editor` button
- Right: Team details, discussion, etc.

### Buttons and what they open

- Red `Open Editor` button inside a Chapter card:
  - Opens Editor in **Animate mode** scoped to the Chapter.
  - Starts at a "shot picker" overlay (last-opened shot preselected). Picking a shot drops you straight into that shot’s timeline.
- Per-shot `Open Editor` button in Sequences & Shots:
  - Opens Editor in **Animate mode** directly on that shot.
- Storyboarding entry points (two options to surface in UI):
  - `Open Storyboard` on a Sequence header → Editor in **Storyboard mode** scoped to the sequence.
  - Or a `Storyboard` button next to the red editor button at the chapter level that opens a sequence selector first.

### URL contract (routing)

```
/editor?projectId=...&chapterId=...&sequenceId=...&shotId=...&mode=animate
/editor?projectId=...&chapterId=...&sequenceId=...&mode=storyboard
```

- `mode` is either `animate` or `storyboard`.
- If `shotId` is omitted in animate mode, the Editor opens the shot picker.

---

## Editor (shared canvas shell)

The Editor is a full-screen, draw-first workspace. Think: center canvas, left tools, right properties/layers, bottom timeline, top transport/actions.

### Common UI Shell

- Top bar: breadcrumbs (Project / Chapter / Sequence / Shot), transport controls (play/loop/fps), save/version, submit for review.
- Left toolbar: brush, eraser, fill, selection, transform, text, shapes, onion-skin toggle, etc.
- Center: canvas with zoom/pan, onion skinning, safe areas/guides.
- Right panel: layers panel (supports folders), layer properties, shot metadata (assignee, due, duration, resolution), notes.
- Bottom: context strip differs per mode.

### Animate mode (shot-level)

- Bottom timeline (X-sheet style timeline supported):
  - Frame ruler with fps, range in/out, playback.
  - **Layers and Folders** (exposures per frame). Users can organize keys, breakdowns, inbetweens inside folders.
  - **Audio tracks**: one or more rows under the layers with waveform previews; per-track mute/solo; snap to frame.
- Features:
  - Keyframes: mark key frames; onion skin support; per-layer timing.
  - Inbetweening: assign frame ranges; optional per-user highlighting.
  - Cleanup & Coloring: separate layers/folders, palette support.
  - Compositing preview: simple layer blend modes and order; future: FX.
  - Versioning: save versions, compare, revert; status per stage (layout/key/inbetween/clean/comp).

### Storyboard mode (sequence-level)

- Bottom panel: **Storyboard panels** grid/strip (no frame timeline).
- Import a storyboard template (e.g., with panel fields). Draw directly on each panel using the same tools.
- Panels can be linked to shots. When linked, shots inherit initial timing or references from the panel.
- Notes and approvals per panel; export to PDF/contact sheet.

---

## Data Model (incremental)

Tables (Supabase/Postgres):

- `sequences(id, chapter_id, seq_code, order_index, created_at)`
- `shots(id, sequence_id, shot_code, order_index, duration_frames, fps, created_at)`
- `shot_pipeline_status(shot_id, stage, status, current_version_id, updated_at)`
- `shot_assets(id, shot_id, stage, version, storage_path, meta jsonb, created_by, created_at)`
- `shot_audio(id, shot_id, track_index, storage_path, start_frame, gain, muted, created_at)`
- `shot_notes(id, shot_id, author_id, body, created_at)`
- `approvals(id, shot_id, stage, approver_id, status, comment, created_at)`
- `storyboards(id, sequence_id, template_meta jsonb, created_at)`
- `storyboard_panels(id, storyboard_id, panel_index, linked_shot_id, image_path, notes, created_at)`

Storage (Supabase Storage):

```
projects/{projectId}/chapters/{chapterId}/shots/{shotId}/
  animate/
    v{n}/layers/... (per-layer raster/vector blobs)
    audio/track-{i}.wav
  thumbnails/...
storyboards/{projectId}/{sequenceId}/panel-{index}.png
```

Rollups:

- Shot stage statuses → aggregated to a single shot status.
- Sequence status = aggregate of child shot statuses.
- Chapter status = aggregate of child sequence statuses.

---

## Implementation Plan (phased)

1. Routing and shell

- Create `/editor` route and shared canvas shell with mode switch.
- Keep current Project Details page layout; update `Open Editor` buttons to use the new URL contract.

2. Animate mode MVP

- Canvas drawing (bitmap) + layers/folders UI.
- Timeline with frame exposures; basic playback; set fps and duration.
- Audio tracks: import file, waveform preview, per-track mute/solo, basic alignment.
- Save to Supabase Storage under the path spec; create `shot_assets` and `shot_audio` records.

3. Storyboard mode MVP

- Panel grid with drawing per panel; import template overlay.
- Save panel images; link panels to shots (optional).

4. Status + rollups

- `shot_pipeline_status` updates per stage; compute aggregates for sequences/chapters on read.

5. Quality-of-life

- Versioning per stage; compare overlay.
- Notes, approvals sidebar; assignees and due dates.

6. Cleanup

- Remove old `/animation-workspace` mock after `/editor` is functional.

---

## What will change now

- No immediate UI refactor beyond wiring `Open Editor` buttons to the new `/editor` with query params.
- We will not implement the drawing engine in this commit; this document aligns behavior first.
- After approval of this plan, we will scaffold the `/editor` route and shell and migrate buttons to it. Then iterate on Animate and Storyboard MVPs.
