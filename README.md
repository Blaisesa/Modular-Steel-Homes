# 3D Building Configurator: An Architectural Ecosystem

An interactive, multi-application 3D architectural suite built with plain HTML, CSS, and Three.js. Designed for high-fidelity modular structural design and micro-component mechanics customization, this lightweight web tool allows for real-time adjustments of building dimensions, floor shapes, and roof structures with clean architectural line tracking.

🔗 **Live Demo:** [https://blaisesa.github.io/Modular-Steel-Homes/](https://blaisesa.github.io/Modular-Steel-Homes/)

---

## 🏗️ Architecture & Deployment Model

This project is a **Standalone Static Client**. It operates entirely in the browser using Vanilla JavaScript and Three.js, requiring no build tools (like Webpack or Vite) for core functionality. 

**Future Roadmap (Backend Integration):** While currently hosted as a standalone static site (via GitHub Pages), this configurator is designed to act as the interactive front-end engine for a larger ecosystem. In Phase 2, this modular 3D builder will be integrated into a **Django / PostgreSQL** repository to handle:
* User authentication and secure session management.
* Persistent saving of structural JSON configuration payloads (`SavedDesigns`).
* Automated quotation and CRM lead capture.

## 📂 Codebase Architecture (ES6 Modules)

To maintain a scalable and highly readable codebase, the application logic is decoupled into native ES6 modules. This structure relies entirely on the browser's native module resolution (`<script type="module">`), removing the need for heavy bundlers like Webpack while keeping concerns strictly separated.

*   **`state.js` (The Brain):** Acts as the central store for all mutable global variables, configurations, arrays (like walls and apertures), and constants.
*   **`engine.js` (The Environment):** Wraps the core Three.js setup. It initializes the scene, camera, renderer, lighting, and handles the continuous animation render loop.
*   **`geometry.js` (The Builder):** Contains all mathematical generation logic. It handles the dynamic compilation of wall meshes, roof slopes, floor grids, and applies spatial clamping algorithms for apertures.
*   **`interaction.js` (The Hands):** Manages the 3D raycasting pipeline. It handles pointer events, viewport kinematics, object selection, and the drag-and-drop placement mode.
*   **`ui.js` (The Interface):** Manages the 2D DOM overlay. It synchronizes HTML inputs with the 3D state, handles contextual property panels, and outputs constraint validations.
*   **`main.js` (The Entry Point):** The primary controller that imports the decoupled modules, boots the Three.js engine, attaches event listeners, and triggers the initial render.

## Current State: Detailed Features & Mechanics

The project features a responsive 3D viewport with fully integrated global state controls and a modular mesh compilation pipeline. 

### 1. Geometry & Wall Systems
* **4-Panel & 6-Panel Solid Wall Systems:** Supports standard rectangular and compound L-shaped footprints. Walls are dynamically interpolated to match roof gradients, eliminating twisted faces and horizontal seam lines.
* **Permanent Floor System:** Custom shape-matching baseline grids offset slightly on the Y-axis to prevent Z-fighting against the ambient environment grid.

### 2. Roof Engineering & Consolidation
* **Dynamic Generation Engine:** Unified logic for all configurations, including dynamic slope calculation for Pent roofs and trigonometric plate placement for Apex roofs.
* **Scope Constraints:** Programmatic UI updates disable incompatible features (e.g., Apex roofs on L-shaped footprints).

### 3. Integrated Aperture Engine (Windows & Doors)
* **Drag & Drop Workflow:** A modern placement system allowing users to select from a library of premade components and drag them directly onto wall surfaces.
* **Precise Raycasting & Selection:** Enhanced 3D selection utilizing recursive parent traversal and unique `apertureId` mapping.
* **Dynamic Spatial Packing:** An algorithm that prevents apertures from overlapping. Elements automatically shrink to minimum thresholds and slide along the wall axis when global dimensions are reduced.
* **Pre-Validation Guards:** Layout mutations are rejected with non-breaking alerts if a user attempts to shrink a wall below the physical constraints of its current doors and windows.

### 4. Exterior & Visual Styling
* **Texture & Cladding Support:** Interactive application of distinct architectural finishes (Modern Charcoal, Natural Cedar, Red Brick, Industrial Steel).
* **Architectural Clarity:** Optimized edge highlights provide structural definition and depth.

### 5. Viewport, UI, & Camera Kinematics
* **Contextual Focus Mode:** Selecting an aperture triggers an isolated editing state, snapping the camera to the target wall and replacing global dimensions with local component constraints.
* **Unified Pointer System:** Modernized interaction model supporting seamless cross-device compatibility (touch and mouse) for smooth orbit and zoom interpolation.

---

## 🚀 Roadmap: Feature Progression

### Phase 1: Contextual Control Panel & UI Consolidation
* Transition from floating viewport HUD pills to a fixed, responsive properties panel for precise numerical overrides (Width, Height, Offsets).

### Phase 2: Native Spatial Manipulation
* Upgrade pointer raycasting loops to support direct translation—allowing fluid dragging of windows/doors across wall planes without intermediary tool selections.

### Phase 3: Analytics & Commercial Integration (Django)
* **Real-Time Cost Calculator:** Live material bills bound to a dynamic pricing matrix served from the Django backend.
* **2D Plan Blueprint Generator:** Orthographic flattening of individual wall components into structural schematic exports for client presentations.