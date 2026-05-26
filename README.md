# 3D Building Configurator

A lightweight, interactive 3D web tool built with Three.js designed for modular building customization (sheds, cabins, and garages). The application provides real-time adjustments for building dimensions, floor shapes, and roof structures with clean architectural line tracking.

🔗 **Live Demo:** [https://blaisesa.github.io/Modular-Steel-Homes/](https://blaisesa.github.io/Modular-Steel-Homes/ )

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
* **Drag & Drop Workflow:** Modernized placement system allowing users to select from a library of premade components and drag them directly onto wall surfaces.
* **Premade Asset Library:** Includes standard, large, and small window presets, as well as standard and double door configurations.
* **True Double Doors:** Double door assets are rendered as two distinct door leaves with a central meeting stile, rather than a single wide panel.
* **Precise ID-Based Selection Matrix:** Enhanced 3D selection support via `THREE.Raycaster`. The engine now utilizes recursive parent traversal and unique `apertureId` mapping, ensuring that the exact component clicked is selected.
* **Polished Transform HUD:** Contextual floating widgets with clear labels and refined UI cues for real-time deletion, lateral movement, and proportional resizing.
* **Collision Guardrails:** Runtime checks to prevent out-of-bounds placement or overlapping component footprints with a `+ 0.02m` buffer.

### 4. Exterior & Visual Styling
* **New Exterior Category:** Introduced a dedicated customization category for building exteriors.
* **Texture Support:** Support for various exterior finishes including Modern Charcoal, Natural Cedar, Red Brick, and Industrial Steel.
* **Architectural Clarity:** Optimized edge highlights (`#666666`) provide improved visual depth and structural definition.

### 5. Viewport, UI, & Camera Kinematics
* **Unified Pointer System:** Modernized interaction model using `pointerdown`, `pointermove`, and `pointerup` for seamless cross-device compatibility (touch and mouse).
* **Cinematic Controls:** Smooth `lerp` interpolation for orbit and zoom, with smart camera framing for structural focus.

---

## Roadmap: Future Enhancements

With the core interaction framework stabilized, the development focus is now centered on **advanced customization and output generation**.

### 1. Component Framework Expansion
* **MEP Integration:** Asset placement for electrical (sockets, switches) and lighting fixtures.
* **Advanced Glazing:** Support for bifold doors, sliding windows, and custom facade glass.

### 2. Customization & Visual Styling
* **Per-Wall Material Isolation:** Support for distinct cladding types on individual panels.
* **Material Library Expansion:** Integration of high-fidelity PBR textures and a custom color-picker palette.

### 3. Output Generation & Analytics
* **Real-Time Cost Calculator:** Real-time calculation of material costs based on dimensions and added features.
* **2D Plan Generator:** Flattening of wall assemblies into downloadable 2D blueprints.
