# 3D Building Configurator

A lightweight, interactive 3D web tool built with Three.js designed for modular building customization (sheds, cabins, and garages). The application provides real-time adjustments for building dimensions, floor shapes, and roof structures with clean architectural line tracking.

---

## Current State

The project features a responsive 3D viewport with fully integrated global state controls and a modular mesh compilation pipeline. Recent architectural overhauls resolved major geometric rendering bugs and triangulation artifacts.

### 1. Geometry & Wall Systems
* **4-Panel Solid Wall System (Rectangle):** Re-engineered from a single hollow extrusion to a 4-panel solid modular layout (Left, Right, Front, Back panels). Left and Right panels are compiled natively as 5-sided shapes (polygons) matching the explicit roof slope profile. This completely eliminates twisted faces across the inner/outer wall thickness and removes horizontal seam lines.
* **L-Shape Structural Layout:** Supports compound footprint shapes with synchronized counter-clockwise outer boundaries and clockwise inner paths to guarantee perfect polygon triangulation hole-cutting.
* **Permanent Floor System:** Custom shape-matching baseline grids offset slightly on the Y-axis (`0.01`) to prevent Z-fighting against the ambient environment grid.

### 2. Roof Engineering
* **Apex Roof:** Dynamically places structurally accurate dual sloped roof plates calculated cleanly using trigonometric angles, built-in ridge alignments, and customized edge overhang variables (`roofOverhang`).
* **Pent Roof:** Single sloped roof structures tracking calculated slope rises (`slopeHeight`) from back-to-front.
* **Toggle System:** Clean visual toggles between exposed frameworks (roofless) and fully clad models.

### 3. Viewport & Camera Kinematics
* **Cinematic Camera Controls:** Multi-axis perspective camera bounding box calculations featuring interactive orbit dragging and smooth interpolating transitions (`lerpSpeed = 0.08`).
* **Smart Framing (`fitCamera`):** Computes building diagonal metrics on change, ensuring the structure remains dynamically focused and perfectly framed inside the viewport container on scaling.
* **Preset Target Views:** Instant viewport re-snapping options for Front, Right, Back, Left, Top, and Isometric viewing orientations.

---

## Next Steps & Product Roadmap

The development trajectory is focused on moving from a solid wireframe shell to a hyper-customizable component builder. The upcoming features are categorized by functional engineering goals:

### 1. Architectural Adjustments & Visibility Mechanics
* **L-Shape Scope Reduction:** Remove the apex roof option entirely from the L-shape configuration, scaling its logic back to strictly support a single directional sloped (pent) roof structure.
* **Smart Viewpoint Occlusion (Partial Wall Hiding):** Implement an automated panel visibility handler driven by the camera's orientation. For example, if the user snaps to or orbits around the front view, the front wall panel dynamically hides so the interior can be edited without geometry clipping.

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