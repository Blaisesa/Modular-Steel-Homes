// ui.js
import { state } from './state.js';
import { updateBuilding, applyWallVisibility, getWallDimensions, isValidAperture } from './geometry.js';

export function syncUI(forceRefresh = false) {
    // Cache DOM lookups (rebuild on demand)
    if (forceRefresh || !syncUI._cache) {
        const cache = { wallButtons: {}, roofButton: null };
        document.querySelectorAll('[onclick]').forEach(el => {
            const attr = el.getAttribute('onclick') || '';
            const wallMatch = attr.match(/toggleWall\(\s*['"]([^'"]+)['"]/);
            if (wallMatch) {
                cache.wallButtons[wallMatch[1]] = el;
                return;
            }
            if (/toggleRoof\(/.test(attr)) {
                cache.roofButton = el;
            }
        });
        syncUI._cache = cache;
    }

    // Apply current state to cached buttons so UI matches model
    const cache = syncUI._cache || { wallButtons: {}, roofButton: null };
    Object.keys(cache.wallButtons).forEach(wallName => {
        const btn = cache.wallButtons[wallName];
        if (!btn) return;
        const visible = !!state.wallVisibility[wallName];
        btn.classList.toggle('active', visible);
    });
    // Roof button is a single toggle, so handle separately
    if (cache.roofButton) {
        cache.roofButton.classList.toggle('active', !!state.showRoof);
        cache.roofButton.innerHTML = state.showRoof ? "🏠" : "🏚️";
    }
    // Measurements-toggle button is also a single toggle, so handle separately
    const measBtn = document.getElementById('measure-toggle') || document.querySelector('[onclick*="toggleMeasurements"]');
    if (measBtn) measBtn.classList.toggle('active', !!state.showMeasurements);
    
    return syncUI._cache;
}

export function setupUI() {
    // Bind all global functions
    window.toggleLibraryCategory = function(header) {
        const category = header.parentElement;
        if (category) category.classList.toggle('expanded');
    };

    window.toggleMeasurements = function(e) {
        const evt = e || window.event;
        state.showMeasurements = !state.showMeasurements;
        if (evt && evt.currentTarget) evt.currentTarget.classList.toggle("active");
        updateBuilding();
    };

    window.updateApertureProp = function(prop, value) {
        if (!state.selectedApertureData) return;
        let val = parseFloat(value);
        if (isNaN(val)) return;

        let candidate = JSON.parse(JSON.stringify(state.selectedApertureData));
        candidate[prop] = val;

        if (candidate.type === 'door' && prop === 'h') candidate.y = val / 2;

        const wallDim = getWallDimensions(candidate.wallId);
        const m = 0.02; const halfW = candidate.w / 2; const halfH = candidate.h / 2;

        if (prop === 'w') candidate.w = Math.min(candidate.w, wallDim.width - m * 2);
        else if (prop === 'h') {
            candidate.h = Math.min(candidate.h, wallDim.height - m * 2);
            if (candidate.type === 'door') candidate.y = candidate.h / 2;
        } else if (prop === 'x') {
            candidate.x = Math.max(-wallDim.width / 2 + halfW + m, Math.min(wallDim.width / 2 - halfW - m, candidate.x));
        } else if (prop === 'y') {
            if (candidate.type !== 'door') candidate.y = Math.max(halfH + m, Math.min(wallDim.height - halfH - m, candidate.y));
        }

        if (isValidAperture(candidate)) {
            const index = state.apertures.findIndex(a => a.id === candidate.id);
            if (index !== -1) {
                state.apertures[index] = candidate;
                state.selectedApertureData = candidate;
                showPropertiesPanel(candidate); 
                updateBuilding();
            }
        } else {
            showConstraintAlert(`Invalid dimension or position overlap.`, 'error');
            showPropertiesPanel(state.selectedApertureData); 
        }
    };

    window.deleteSelectedAperture = function() {
        if (!state.selectedApertureData) return;
        window.removeAperture(state.selectedApertureData.id);
        deselectAperture();
    };

    window.removeAperture = function(id) {
        state.apertures = state.apertures.filter(a => a.id !== id);
        updateQuickStats();
        updateBuilding();
    };

    window.toggleWall = function(wallName, e) {
        const evt = e || window.event;
        state.wallVisibility[wallName] = !state.wallVisibility[wallName];
        applyWallVisibility();
        if (evt && evt.currentTarget) evt.currentTarget.classList.toggle('active');
    };

    window.toggleRoof = function (e) {
        const evt = e || window.event;
        state.showRoof = !state.showRoof;
        if (evt && evt.currentTarget) {
            evt.currentTarget.classList.toggle("active");
            evt.currentTarget.innerHTML = state.showRoof ? "🏠" : "🏚️";
        }
        updateBuilding();
    };

    window.handleZoomSlider = function(val) {
        state.targetRadius = parseFloat(val);
        state.radius = state.targetRadius;
    };

    window.updateDim = function(prop, val) {
        let newVal = parseFloat(val);
        let oldW = state.W, oldD = state.D;

        if (prop === "W") state.W = newVal;
        if (prop === "D") state.D = newVal;

        let isValid = true;
        const m = 0.02; const pad = 0.02; const minWindowW = 0.3; 
        const wallGroups = {};
        
        state.apertures.forEach(ap => {
            if (!wallGroups[ap.wallId]) wallGroups[ap.wallId] = [];
            wallGroups[ap.wallId].push(ap);
        });

        for (const wallId in wallGroups) {
            let aps = wallGroups[wallId];
            const wallDim = getWallDimensions(wallId); 
            let minRequiredWidth = (m * 2) + (aps.length > 1 ? (aps.length - 1) * pad : 0);
            aps.forEach(ap => minRequiredWidth += (ap.type === 'door' ? ap.w : minWindowW));
            if (wallDim.width < minRequiredWidth) { isValid = false; break; }
        }

        if (!isValid) {
            state.W = oldW; state.D = oldD;
            const inputElement = document.getElementById(`${prop.toLowerCase()}-slider`) || document.getElementById(`input-${prop.toLowerCase()}`);
            if (inputElement) inputElement.value = (prop === 'W' ? state.W : state.D);
            showConstraintAlert(`Cannot shrink further. Remove or resize doors first.`, 'error');
            return; 
        }

        const label = document.getElementById(`val-${prop.toLowerCase()}`);
        if (label) label.innerText = newVal;
        
        updateBuilding();
        updateQuickStats(); 
        fitCamera();
    };

    window.setRoof = function(type, e) {
        const evt = e || window.event;
        state.currentRoofType = type;
        resetApertures();
        document.querySelectorAll("#roof-options .style-option").forEach(o => o.classList.remove("active"));
        if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");
        updateBuilding();
    };

    window.setShape = function(type, e) {
        const evt = e || window.event;
        state.currentShapeType = type;
        resetApertures();
        document.querySelectorAll(".sidebar-nav .nav-section:first-child .style-option").forEach(o => o.classList.remove("active"));
        if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");
        window.updateRoofOptionsVisibility();
        updateBuilding();
        fitCamera();
    };

    window.updateRoofOptionsVisibility = function() {
        const apexOption = document.querySelector('#roof-options .style-option[onclick*="apex"]');
        if (apexOption) {
            if (state.currentShapeType === "l-shape") {
                apexOption.style.display = "none";
                if (state.currentRoofType === "apex") {
                    state.currentRoofType = "pent";
                    document.querySelectorAll("#roof-options .style-option").forEach(o => o.classList.remove("active"));
                    const pentOption = document.querySelector('#roof-options .style-option[onclick*="pent"]');
                    if (pentOption) pentOption.classList.add("active");
                }
            } else apexOption.style.display = "";
        }
    };

    window.toggleSidebar = function() {
        document.getElementById("sidebar").classList.toggle("open");
        document.getElementById("sidebar-overlay").classList.toggle("active");
        document.getElementById("menu-toggle").classList.toggle("open");
        setTimeout(() => window.dispatchEvent(new Event("resize")), 400);
    };

    window.toggleSection = function(header) {
        const section = header.parentElement;
        const wasActive = section.classList.contains("active");
        document.querySelectorAll(".nav-section").forEach(s => s.classList.remove("active"));
        if (!wasActive) section.classList.add("active");
    };

    window.toggleFreeRoam = function() {
        state.isFreeRoam = !state.isFreeRoam;
        const btn = document.getElementById("roam-toggle");
        if(btn) {
            btn.innerHTML = state.isFreeRoam ? "🔓" : "🔒";
            btn.style.background = state.isFreeRoam ? "var(--accent-color)" : "rgba(255, 255, 255, 0.9)";
            btn.style.color = state.isFreeRoam ? "white" : "var(--text-dark)";
        }
    };

    window.rotateTo = function(view, e) {
        const evt = e || window.event;
        document.querySelectorAll(".view-controls button").forEach(btn => btn.classList.remove("active"));
        if (evt && evt.currentTarget && evt.currentTarget.id !== "roam-toggle" && evt.currentTarget.id !== "roof-toggle") {
            evt.currentTarget.classList.add("active");
        }
        const views = {
            front: [0, 0], right: [Math.PI / 2, 0], back: [Math.PI, 0],
            left: [-Math.PI / 2, 0], top: [0, 1.5], iso: [-Math.PI / 4, 0.25],
        };
        if (views[view]) [state.targetAngle, state.targetVerticalAngle] = views[view];
        syncUI();
    };

    window.setExterior = function(type, e) {
        const evt = e || window.event;
        state.currentExteriorTexture = type;
        document.querySelectorAll("#exterior-options .style-option").forEach(o => o.classList.remove("active"));
        if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");
        updateBuilding();
    };

    updateQuickStats();
}

export function showPropertiesPanel(data) {
    const panel = document.getElementById('properties-panel');
    if (!panel) return;

    document.getElementById('prop-panel-title').innerText = data.type.toUpperCase() + ' PROPERTIES';
    document.getElementById('prop-w').value = data.w.toFixed(2);
    document.getElementById('prop-h').value = data.h.toFixed(2);
    document.getElementById('prop-x').value = data.x.toFixed(2);
    
    const yGroup = document.getElementById('prop-group-y');
    if (data.type === 'door') {
        yGroup.style.display = 'none';
    } else {
        yGroup.style.display = 'flex';
        document.getElementById('prop-y').value = data.y.toFixed(2);
    }
    panel.classList.remove('hidden');
}

export function showConstraintAlert(message, type = 'error') {
    let overlay = document.getElementById('canvas-overlay');
    if (!overlay) return;
    
    let alert = document.getElementById('constraint-alert');
    if (!alert) {
        alert = document.createElement('div');
        alert.id = 'constraint-alert';
        alert.className = 'constraint-alert';
        overlay.appendChild(alert);
    }
    
    alert.style.background = type === 'success' ? 'linear-gradient(135deg, #51cf66 0%, #37b24d 100%)' : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)';
    alert.innerHTML = `<span class="constraint-alert-icon">${type === 'success' ? '✓' : '⚠️'}</span><span>${message}</span>`;
    alert.classList.add('visible');
    
    if (alert.dataset.timeoutId) clearTimeout(parseInt(alert.dataset.timeoutId));
    alert.dataset.timeoutId = setTimeout(() => alert.classList.remove('visible'), 2500);
}

export function updateQuickStats() {
    let area = 0;
    if (state.currentShapeType === "rectangle") area = state.W * state.D;
    else area = (state.W/2 * state.D) + (state.W/2 * state.D/2);
    
    const areaLabel = document.getElementById('stat-area');
    if (areaLabel) areaLabel.innerText = area.toFixed(1) + ' m²';
}

function resetApertures() {
    state.apertures = [];
    state.apertureComponents = {};
    state.selectedApertureData = null;
    hidePropertiesPanel();
    updateQuickStats();
    updateBuilding();
}

export function selectAperture(data) {
    state.selectedApertureData = data;
    showPropertiesPanel(data);
    updateBuilding(); 

    const views = {
        front: [0, 0.1], back: [Math.PI, 0.1], left: [-Math.PI / 2, 0.1], 
        right: [Math.PI / 2, 0.1], innerBack: [0, 0.1], innerLeft: [Math.PI / 2, 0.1]
    };

    if (views[data.wallId]) {
        state.targetAngle = views[data.wallId][0];
        state.targetVerticalAngle = views[data.wallId][1];
        const maxDim = Math.max(data.w, data.h);
        state.targetRadius = Math.max(7.5, maxDim * 3.5);
    }
}

export function deselectAperture() {
    state.selectedApertureData = null;
    hidePropertiesPanel();
    updateBuilding(); 
    fitCamera(); 
}

function hidePropertiesPanel() {
    const panel = document.getElementById('properties-panel');
    if (panel) panel.classList.add('hidden');
}

export function fitCamera() {
    const diagonal = Math.sqrt(state.W * state.W + state.D * state.D);
    state.targetRadius = Math.max(diagonal * 1.5, state.H * 3);
    state.targetRadius = Math.max(5, Math.min(25, state.targetRadius));
}