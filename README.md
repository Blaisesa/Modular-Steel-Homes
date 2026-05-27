# 3D Building Configurator: An Architectural Ecosystem

An interactive, multi-application 3D architectural suite built with Three.js designed for high-fidelity modular structural design and micro-component mechanics customization. This lightweight, interactive 3D web tool allows for real-time adjustments of building dimensions, floor shapes, and roof structures with clean architectural line tracking.

🔗 **Live Demo:** [https://blaisesa.github.io/Modular-Steel-Homes/](https://blaisesa.github.io/Modular-Steel-Homes/)

---

## 🏗️ Architecture & Deployment Model
> ⚠️ **Architecture Notice:** The project is currently transitioning from a standalone GitHub Pages tool into a single-roof Strapi deployment. The 3D engine features listed below are active, while the multi-route server configuration (`/units`, `/windows`) and backend database integration are currently being implemented in Phase 4 of the roadmap. The live demo is hosted on GitHub Pages, but the production version will be deployed on a dynamic Node.js hosting platform (Render or Railway) to support the integrated Strapi backend and PostgreSQL database.

To maintain zero server layout complexity, eliminate cross-origin resource sharing (CORS) challenges, and minimize commercial operational costs, the site leverages an **All-in-One Single-Roof Monolithic Headless Deployment**:

```text
                  [ Monolithic Web Host (Render / Railway / VPS) ]
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
         [ Static Frontend Routing ]               [ Dynamic Strapi API Engine ]
           Served via /public folder                     Port: 1337 / Native Admin
                     │                                         │
     ┌───────────────┼───────────────┐                         ▼
     ▼               ▼               ▼                [ Product Database ]
[ / ] Landing   [ /units ] 3D   [ /windows ] 3D       PostgreSQL Schema Map
Page Hub        Shell Engine    Mechanics Engine
```

The Web Core: Powered by a lightweight Strapi Headless CMS running on a dynamic Node.js runtime environment.

The Static Pipeline: The complete marketing landing platform and both Three.js canvas environments reside inside Strapi's custom `/public` asset router. The server compiles and presents the full front-end platform directly under a unified domain footprint.

## Current State: Detailed Features & Mechanics

The project features a responsive 3D viewport with fully integrated global state controls and a modular mesh compilation pipeline. Recent architectural overhauls resolved geometric rendering bugs, unified roof generation pipelines, and introduced advanced spatial constraints.

### 1. Geometry & Wall Systems
*   **4-Panel Solid Wall System (Rectangle):** Re-engineered from a single hollow extrusion to a 4-panel solid modular layout (Left, Right, Front, Back panels). Left and Right panels are compiled natively as 5-sided shapes (polygons) matching the explicit roof slope profile. This completely eliminates twisted faces across the inner/outer wall thickness and removes horizontal seam lines.
*   **6-Panel Solid Wall System (L-Shape):** Supports compound footprint shapes with synchronized outer boundaries and precise wall snapping. Side panel heights are calculated dynamically via linear interpolation based on their precise Z-axis positions to ensure perfect alignment with the roof gradient.
*   **Permanent Floor System:** Custom shape-matching baseline grids offset slightly on the Y-axis (`0.01`) to prevent Z-fighting against the ambient environment grid.

### 2. Roof Engineering & Consolidation
*   **Consolidated Roof Generation Engine:** Unified logic for all configurations, including dynamic slope calculation for Pent roofs and trigonometric plate placement for Apex roofs.
*   **Scope Constraints:** Programmatic UI updates that disable incompatible features (e.g., Apex roofs on L-shaped footprints).

### 3. Integrated Aperture Engine (Windows & Doors)
*   **Drag & Drop Workflow:** Modernized placement system allowing users to select from a library of premade components and drag them directly onto wall surfaces.
*   **Premade Asset Library:** Includes standard, large, and small window presets, as well as standard and double door configurations.
*   **True Double Doors:** Double door assets are rendered as two distinct door leaves with a central meeting stile, rather than a single wide panel.
*   **Precise ID-Based Selection Matrix:** Enhanced 3D selection support via `THREE.Raycaster`. The engine now utilizes recursive parent traversal and unique `apertureId` mapping, ensuring that the exact component clicked is selected.
*   **Dynamic 1D Spatial Packing (Aperture Clamping):** Implemented a spatial resolution algorithm that prevents apertures from overlapping or intersecting when a wall's dimensions are decreased. The engine isolates window elements and proportionally shrinks their widths down to an absolute minimum threshold (`0.3m`) while locking physical door dimensions in place. Elements are automatically slid sideways along a sorted left-to-right axis to maintain geometric integrity.
*   **Dimensional Pre-Validation Guards:** Added validation logic inside the global dimensional update cycle (`updateDim`). If a user attempts to shrink a wall below the cumulative width required by its placed doors, edge margins, and minimum window widths, the layout mutation is rejected, parameters gracefully revert, and a non-breaking `showConstraintAlert` notification is dispatched.
*   **Collision Guardrails:** Runtime checks to prevent out-of-bounds placement or overlapping component footprints with a physical `+ 0.02m` edge-to-edge separation buffer.

### 4. Exterior & Visual Styling
*   **Dedicated Customization Category:** Isolated control framework for updating external finishes globally.
*   **Texture & Cladding Support:** Interactive application of distinct architectural finishes, including Modern Charcoal, Natural Cedar, Red Brick, and Industrial Steel.
*   **Architectural Clarity:** Optimized edge highlights (`#666666`) provide improved visual depth, accentuating wall seam breaks and structural definitions.

### 5. Viewport, UI, & Camera Kinematics
*   **Contextual Focus Viewport Mode:** Selecting an individual aperture triggers an isolated editing viewport state. Global exterior dimensions are dynamically hidden, and local relative dimensions (Width and Height) are projected directly onto the active component's frame using text sprites that track camera rotation.
*   **Cinematic Controls:** Smooth `lerp` interpolation for orbit and zoom. When focusing on a specific aperture, the camera automatically glides to face the target wall at an optimized, mathematically padded radius to prevent viewport clipping on large elements.
*   **Unified Pointer System:** Modernized interaction model using `pointerdown`, `pointermove`, and `pointerup` for seamless cross-device compatibility (touch and mouse).

## Planned Roadmap: Backend Integration & Commercialization

## 🔒 Security & Lead Capture Infrastructure
> This is not yet implemented as the project is still in the early stages of backend integration, but the architecture is being designed to support secure lead capture and quote generation without exposing sensitive data or creating vulnerabilities.

While the configurator does not process financial transactions, it acts as an enterprise lead-generation tool. The architecture is hardened to protect Personally Identifiable Information (PII) such as client contact details and structural blueprints.

### Relational Data Mapping:

Quotes will be captured via two distinct relational schemas: Leads (Contact Data) and SavedDesigns (JSON coordinate payloads).

A unified API post links the user's explicit 3D configuration layout directly to their CRM profile.

### API Hardening (RBAC):

Strapi's Role-Based Access Control completely restricts public internet traffic. Unauthenticated users are granted strictly Create-only permissions for quotes. Read, Update, and Delete endpoints are entirely blocked from the frontend to prevent data scraping.

### Data Integrity & Spam Mitigation:

Incoming payloads are sanitized via the internal ORM to prevent SQL injection.

`strapi-middleware-rate-limit` is actively deployed to restrict the volume of API calls per IP, preventing automated lead-generation spam or denial-of-service attacks.

Total SSL (HTTPS) enforcement ensures in-transit payload encryption.

## 🚀 Roadmap: Modernized Feature Progression

The architecture is shifting away from floating viewport overlays and toward standard professional CAD/BIM interaction paradigms (Direct Manipulation + Fixed Properties Management).

### Phase 1: Contextual Control Panel & UI Consolidation
*   Decommission the floating viewport HUD pills completely.
*   Establish a fixed, responsive properties panel in the bottom-right corner of the application viewport.
*   Bind panel inputs dynamically to the active aperture, exposing precise numerical overrides for width, height, and offsets alongside a secure, dedicated element destruction hook (Delete action).

### Phase 2: Native Click-and-Drag Spatial Manipulation
*   Upgrade pointer raycasting loops to support direct translation.
*   Allow users to select, hold, and slide windows/doors fluidly across their bound wall planes without requiring intermediary tool selections.

### Phase 3: Interactive 3D Resizing Gizmos
*   Engineer visual 3D scale gizmos (directional handles/arrows) that attach to the right and top outer frames of an active aperture mesh.
*   Map pointer translations directly to width and height adjustments via directional vector drag computations.

### Phase 4: Architectural Code Refactoring & Component Variants
*   Deconstruct `main.js` into an organized multi-file ES6 module architecture.
*   Introduce expanded architectural window/door styles (e.g., single/double hung sash, casement, horizontal sliding, bifold systems) mapped to custom geometry generation pipelines.

### Phase 5: Analytics & Commercial Integration
*   **Real-Time Cost Calculator:** Live material bills (linear meters of wall paneling, roof square footage, component itemization) bound to a dynamic pricing matrix.
*   **2D Plan Blueprint Generator:** Orthographic flattening of individual wall components and footprints into structural schematic exports. This will allow users to download or print precise 2D layouts for construction reference or client presentations.
