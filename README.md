# 3D Building Configurator

A lightweight, interactive 3D web tool built with Three.js designed for modular building customization (sheds, cabins, and garages). The application provides real-time adjustments for building dimensions, floor shapes, and roof structures with clean architectural line tracking.

🔗 **Live Demo:** [https://blaisesa.github.io/Modular-Steel-Homes/](https://blaisesa.github.io/Modular-Steel-Homes/)

---

## Current State

The project features a responsive 3D viewport with fully integrated global state controls and a modular mesh compilation pipeline. Recent architectural overhauls resolved geometric rendering bugs, unified roof generation pipelines, and introduced context-aware UI constraints.

### 1. Geometry & Wall Systems
* **4-Panel Solid Wall System (Rectangle):** Re-engineered from a single hollow extrusion to a 4-panel solid modular layout (Left, Right, Front, Back panels). Left and Right panels are compiled natively as 5-sided shapes (polygons) matching the explicit roof slope profile. This completely eliminates twisted faces across the inner/outer wall thickness and removes horizontal seam lines.
* **6-Panel Solid Wall System (L-Shape):** Supports compound footprint shapes with synchronized outer boundaries and precise wall snapping. Side panel heights are calculated dynamically via linear interpolation based on their precise Z-axis positions to ensure perfect alignment with the roof gradient.
* **Permanent Floor System:** Custom shape-matching baseline grids offset slightly on the Y-axis (`0.01`) to prevent Z-fighting against the ambient environment grid.

### 2. Roof Engineering & Consolidation
* **Consolidated Roof Generation Engine:** Unified logic for all configurations, including dynamic slope calculation for Pent roofs and trigonometric plate placement for Apex roofs.
* **Scope Constraints:** Programmatic UI updates that disable incompatible features (e.g., Apex roofs on L-shaped footprints).

### 3. Integrated Aperture Engine (Windows & Doors)
* **Raycasting Selection Matrix:** Full 3D selection support via `THREE.Raycaster`. Users can now interact directly with meshes in the canvas.
* **Transform HUD:** Contextual floating widgets for real-time deletion, lateral movement, and proportional resizing.
* **Collision Guardrails:** Runtime checks to prevent out-of-bounds placement or overlapping component footprints with a `+ 0.02m` buffer.

### 4. Viewport, UI, & Camera Kinematics
* **Cinematic Controls:** Smooth `lerp` interpolation for orbit and zoom, with smart camera framing for structural focus.
* **Type-Aware Dynamic UI:** The configuration panel adapts to component types (e.g., hiding unnecessary sill height controls for floor-based doors).

---

## Roadmap: Prioritizing UI/UX Refinement

With the core interaction framework stabilized, the development focus is now centered on **UX fluidness and visual accessibility**.

### 1. UI/UX Refinement (Priority Focus)
* **Canvas Overlay Layer:** Transition the floating HUD from a generic DOM element to a high-fidelity, CSS-animated UI overlay that feels integrated into the viewport.
* **Intuitive Interaction Cues:** Implement visual hover-states for walls and apertures (e.g., highlighting borders or changing cursor icons) to provide immediate feedback on interactable zones.
* **Gestural Feedback:** Improve the "feel" of dragging by adding snapping-to-grid visual indicators and non-intrusive haptic/visual alerts when an aperture hits a structural constraint.
* **Streamlined Asset Library:** Organize the component inventory into clear, collapsable categories with high-quality icons, reducing the cognitive load for new users.

### 2. Component Framework Expansion
* **MEP Integration:** Asset placement for electrical (sockets, switches) and lighting fixtures.
* **Advanced Glazing:** Support for bifold doors, sliding windows, and custom facade glass.

### 3. Customization & Visual Styling
* **Per-Wall Material Isolation:** Support for distinct cladding types on individual panels.
* **Material Library:** Integration of PBR textures (siding, metal, wood) and a custom color-picker palette.

### 4. Output Generation & Analytics
* **Real-Time Cost Calculator:** Real-time calculation of material costs based on dimensions and added features.
* **2D Plan Generator:** Flattening of wall assemblies into downloadable 2D blueprints.