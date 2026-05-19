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
* **Consolidated Roof Generation Engine (`createRoof`):** Unified roof creation logic into a single, highly flexible function that handles extrusion, rotation, translation, and specific alignment matrices for all supported configurations.
* **L-Shape Scope Reduction:** Programmatically disables the "Apex" roof selection option when the L-shape configuration is active. The application handles this by dynamically updating UI visibility via `updateRoofOptionsVisibility()`, forcing a graceful fallback to a single directional sloped (pent) structure if an incompatible layout is chosen.
* **Apex Roof (Rectangle Only):** Dynamically places structurally accurate dual sloped roof plates calculated cleanly using trigonometric angles, built-in ridge alignments, and customized edge overhang variables (`roofOverhang`).
* **Pent Roof:** Single sloped roof structures tracking calculated slope rises (`slopeHeight`) from back-to-front. Includes automatic roof translation adjustments to snap perfectly to structural boundaries.
* **Toggle System:** Clean visual toggles between exposed frameworks (roofless) and fully clad models.

### 3. Viewport & Camera Kinematics
* **Cinematic Camera Controls:** Multi-axis perspective camera bounding box calculations featuring interactive orbit dragging and smooth interpolating transitions (`lerpSpeed = 0.08`).
* **Smart Framing (`fitCamera`):** Computes building diagonal metrics on change, ensuring the structure remains dynamically focused and perfectly framed inside the viewport container on scaling.
* **Preset Target Views:** Instant viewport re-snapping options for Front, Right, Back, Left, Top, and Isometric viewing orientations.

---

## Next Steps & Product Roadmap

The development trajectory is focused on moving from a solid wireframe shell to a hyper-customizable component builder. The upcoming features are categorized by functional engineering goals:

### 2. Component Framework (Doors, Windows, Utilities)
* **Aperture Engine:** Implement sub-shape cutting paths to seamlessly puncture doors and windows into specific wall meshes while maintaining clean outer edge outlines.
* **Component Placement & Scaling:** Enable real-time configuration for the physical dimensions (width, height) and precise placement (X, Y positional coordinates on the wall surface) for doors and windows.
* **MEP Integration (Electrical & Mechanical):** Add a localized asset placement layer to mount electrical utilities directly onto internal surfaces, including wall sockets, light switches, lighting fixtures, and AC units.

### 3. Customization & Visual Styling
* **Per-Wall Material Isolation:** Decouple global building attributes to allow distinct configurations, window arrangements, or component layouts unique to individual panels.
* **Texture & Material Library:** Integrate UV mapping variations and material selections to switch between real-world visual styles across walls, doors, windows, and electrical hardware (e.g., wood cladding, siding types, metal finishes, colors).

### 4. Output Generation & Analytics
* **Real-Time Cost Calculator:** Write a structural metrics compiler that tracks total volume, panel surface areas, material configurations, and added assets to generate live pricing evaluations.
* **2D Build Plan Generator:** Create an exporter that flattens individual wall assemblies into dimensioned 2D blueprints or schematic construction diagrams for each face of the structure.