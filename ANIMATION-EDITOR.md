# 🎨 AI-Nime Animation Editor

A powerful, frame-by-frame animation editor built for manga-to-animation workflows.

## ✨ Core Features

### ✏️ Drawing & Tools

- **Canvas**: Main drawing area with zoom and pan support.
- **Drawing Tools**: Pencil tool for freehand drawing.
- **Lasso Tool**: Select and move parts of a drawing.

### 🍱 Layers & Timeline

- **Timeline Grid**: A grid with frames on the X-axis and layers (rows) on the Y-axis.
- **Layers**: Layers are organized into Frame Folders in the sidebar. Each folder corresponds to a row in the timeline.
- **Sidebar**: Manages layers and their properties. It's synchronized with the timeline grid.
- **Layer Management**:
  - Add/delete layers and frame folders.
  - Rename layers and folders.
  - Reorder layers and folders via drag-and-drop.
  - Control layer visibility (show/hide) and opacity.
- **Frame Management**:
  - Add/delete frames in the timeline.
  - Extend a drawing across multiple frames.

### 🖼️ Templates & Workflow

- **Image Templates**: Drag and drop images onto timeline cells to use as a reference for drawing.
- **Background Layer**: The initial background layer can be used for static backgrounds or deleted.
- **Frame-Based Rendering**: The canvas displays the content of the currently selected frame folder.

## 🎮 Controls & Shortcuts

- Basic mouse controls for drawing, selecting, and moving elements.
- Keyboard shortcuts for tools will be added in the future.

## 🎯 Current Implementation Plan

Here's what we are actively working on:

### Optimized Requirements:

1.  **Frame-Layer Synchronization**
    - When selecting a layer in the sidebar, the corresponding timeline grid cell should highlight.
    - This should work for both frame folders and individual layers within those folders.
    - Selection should be bidirectional (timeline → sidebar, sidebar → timeline).
2.  **Frame-Based Canvas System**

    - Each frame folder represents a distinct drawing frame on the canvas.
    - Switching between frame folders changes what's displayed on the canvas.
    - All layers within a frame folder are visible when that frame is active.
    - Layer opacity controls work within the active frame.

3.  **Layering System**
    - Frame folders and layers have a specific order that affects canvas rendering.
    - Lower items in the sidebar render underneath higher items on the canvas.
    - Need functionality to reorder frames and layers (move up/down).
4.  **Background Layer Integration**

    - Scene background layer should be treated like any other frame folder.
    - Deleting the background removes the white canvas background.
    - Template images can be added to frame cells for drawing reference.

5.  **Multi-Row Animation System**
    - Different rows can have overlapping time frames.
    - Template images in one row can serve as background for drawing in other rows.
    - Canvas shows the combined result of all active frames.

### Implementation Steps:

- **Step 1:** Fix frame-layer selection synchronization.
- **Step 2:** Implement frame-based canvas rendering system.
- **Step 3:** Add layer ordering functionality.
- **Step 4:** Integrate background layer with frame system.
- **Step 5:** Implement multi-row canvas composition.

---

**Happy Animating! 🎬✨**
