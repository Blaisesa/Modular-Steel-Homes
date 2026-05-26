let scene, camera, renderer, building;
let currentAngle = -Math.PI / 4, targetAngle = -Math.PI / 4;
let currentVerticalAngle = 0.25, targetVerticalAngle = 0.25;
let radius = 12, targetRadius = 12;
let isFreeRoam = false, isDragging = false;
let previousX = 0, previousY = 0;

const lerpSpeed = 0.08;
let W = 6, H = 2.8, D = 4;
let currentShapeType = "rectangle";
let currentRoofType = "pent";
let showRoof = true;
let currentExteriorTexture = "default";

const TEXTURES = {
    default: { color: 0x303030, name: "Modern Charcoal" },
    timber: { color: 0x8b4513, name: "Natural Cedar" },
    brick: { color: 0xa52a2a, name: "Red Brick" },
    metal: { color: 0x708090, name: "Industrial Steel" }
};
const roofOverhang = 0.2, slopeHeight = 0.45, peakHeight = 1.1;
const wallThickness = 0.15, roofThickness = 0.15, roofGap = 0;

let walls = { front: null, back: null, left: null, right: null, innerBack: null, innerLeft: null };
let wallVisibility = { front: true, back: true, left: true, right: true, innerBack: true, innerLeft: true };

const wallNormals = {
    front: new THREE.Vector3(0, 0, 1), back: new THREE.Vector3(0, 0, -1),
    left: new THREE.Vector3(-1, 0, 0), right: new THREE.Vector3(1, 0, 0),
    innerBack: new THREE.Vector3(0, 0, 1), innerLeft: new THREE.Vector3(1, 0, 0)
};

let apertures = [];
let apertureComponents = {};

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedApertureData = null;
let isDraggingAperture = false;
let resizeMode = null; 
let dragPlane = new THREE.Plane();
let dragStartPos = new THREE.Vector3();
let dragStartAperture = null;

// Placement Mode Variables
let isPlacingNewAperture = false;
let placementConfig = null;
let ghostMesh = null;
let currentHoveredWall = null;

const APERTURE_PRESETS = {
    window: {
        standard: { w: 1.2, h: 1.5, y: 1.4 },
        large: { w: 2.0, h: 1.8, y: 1.5 },
        small: { w: 0.8, h: 1.0, y: 1.3 }
    },
    door: {
        standard: { w: 0.9, h: 2.1 },
        double: { w: 1.8, h: 2.1 }
    }
};

window.toggleLibraryCategory = function(header) {
    const category = header.parentElement;
    if (category) category.classList.toggle('expanded');
};

// NEW DRAG & DROP PLACEMENT LOGIC
window.enterPlacementMode = function(type, preset) {
    deselectAperture();
    const config = APERTURE_PRESETS[type][preset];
    placementConfig = { type, ...config };
    isPlacingNewAperture = true;
    
    document.getElementById('placement-ui').classList.remove('hidden');
    document.body.classList.add('placing-aperture');

    if (window.innerWidth <= 768) {
        window.toggleSidebar(); // Auto-close sidebar on mobile to view canvas
    }
    
    createGhostMesh();
};

window.exitPlacementMode = function() {
    isPlacingNewAperture = false;
    placementConfig = null;
    currentHoveredWall = null;
    document.getElementById('placement-ui').classList.add('hidden');
    document.body.classList.remove('placing-aperture');
    
    if (ghostMesh) {
        scene.remove(ghostMesh);
        ghostMesh.geometry.dispose();
        ghostMesh.material.dispose();
        ghostMesh = null;
    }
};

function createGhostMesh() {
    if (ghostMesh) scene.remove(ghostMesh);
    
    const geo = new THREE.BoxGeometry(placementConfig.w, placementConfig.h, wallThickness * 2);
    const mat = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true, 
        opacity: 0.5,
        depthWrite: false
    });
    ghostMesh = new THREE.Mesh(geo, mat);
    ghostMesh.visible = false; 
    scene.add(ghostMesh);
}

function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'bold 24px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#666666'; 
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true, 
        opacity: 0.9, 
        depthTest: false 
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2.5, 0.625, 1); 
    return sprite;
}

function createDimensionLine(start, end, offsetDir, offsetDist, text) {
    const group = new THREE.Group();
    const offset = offsetDir.clone().normalize().multiplyScalar(offsetDist);
    const p1 = start.clone().add(offset);
    const p2 = end.clone().add(offset);
    
    const material = new THREE.LineBasicMaterial({ 
        color: 0x888888, 
        transparent: true, 
        opacity: 0.5 
    });
    
    const points = [p1, p2];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(geometry, material));
    
    const tickSize = 0.15;
    const tickDir = offsetDir.clone().normalize();
    
    const p1a = p1.clone().add(tickDir.clone().multiplyScalar(tickSize));
    const p1b = p1.clone().sub(tickDir.clone().multiplyScalar(tickSize));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1a, p1b]), material));
    
    const p2a = p2.clone().add(tickDir.clone().multiplyScalar(tickSize));
    const p2b = p2.clone().sub(tickDir.clone().multiplyScalar(tickSize));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p2a, p2b]), material));

    const sprite = createTextSprite(text);
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    sprite.position.copy(midPoint);
    sprite.position.y += 0.2; 
    group.add(sprite);
    
    return group;
}

function addMeasurements(group) {
    const dOffset = 0.45;
    const yHeight = 0.05;

    let p1 = new THREE.Vector3(-W/2, yHeight, D/2);
    let p2 = new THREE.Vector3(W/2, yHeight, D/2);
    group.add(createDimensionLine(p1, p2, new THREE.Vector3(0,0,1), dOffset, W.toFixed(1) + 'm'));
    
    p1 = new THREE.Vector3(W/2, yHeight, D/2);
    p2 = new THREE.Vector3(W/2, yHeight, -D/2);
    group.add(createDimensionLine(p1, p2, new THREE.Vector3(1,0,0), dOffset, D.toFixed(1) + 'm'));
    
    p1 = new THREE.Vector3(W/2, yHeight, -D/2);
    p2 = new THREE.Vector3(-W/2, yHeight, -D/2);
    group.add(createDimensionLine(p1, p2, new THREE.Vector3(0,0,-1), dOffset, W.toFixed(1) + 'm'));

    p1 = new THREE.Vector3(-W/2, yHeight, -D/2);
    p2 = new THREE.Vector3(-W/2, yHeight, D/2);
    group.add(createDimensionLine(p1, p2, new THREE.Vector3(-1,0,0), dOffset, D.toFixed(1) + 'm'));
    
    let totalHeight = H + roofOverhang;
    if (currentRoofType === "pent") {
        totalHeight = H + slopeHeight;
    } else if (currentRoofType === "apex") {
        totalHeight = H + peakHeight;
    }

    p1 = new THREE.Vector3(-W/2, yHeight, -D/2);
    p2 = new THREE.Vector3(-W/2, yHeight + totalHeight, -D/2);
    group.add(createDimensionLine(p1, p2, new THREE.Vector3(-1,0,0), dOffset, totalHeight.toFixed(1) + 'm'));

}

let showMeasurements = true;

window.toggleMeasurements = function(e) {
    const evt = e || window.event;
    showMeasurements = !showMeasurements;
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.toggle("active");
    }
    updateBuilding();
};


// POINTER EVENTS & CANVAS INTERACTION
function setupCanvasInteraction(container) {
    // Touch/Pointer Native
    container.style.touchAction = 'none'; 
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
}

function updateMousePosition(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function getWallMeshes() {
    return Object.keys(walls).map(k => walls[k]).filter(m => m && m.visible);
}

function onPointerDown(event) {
    updateMousePosition(event);
    raycaster.setFromCamera(mouse, camera);

    if (isPlacingNewAperture) {
        if (currentHoveredWall && ghostMesh && ghostMesh.visible && ghostMesh.material.color.getHex() === 0x00ff00) {
            const dropConfig = {
                id: Date.now(),
                type: placementConfig.type,
                wallId: currentHoveredWall.userData.wallId,
                w: placementConfig.w,
                h: placementConfig.h,
                x: ghostMesh.userData.localX,
                y: ghostMesh.userData.localY
            };
            apertures.push(dropConfig);
            updateApertureList();
            updateQuickStats();
            updateBuilding();
            exitPlacementMode();
            showConstraintAlert(`✓ Added successfully!`, 'success');
        }
        return;
    }

    if (selectedApertureData && (isDraggingAperture || resizeMode)) {
        const normal = wallNormals[selectedApertureData.wallId];
        const wallMesh = walls[selectedApertureData.wallId];
        const wallWorldPos = new THREE.Vector3();
        wallMesh.getWorldPosition(wallWorldPos);
        
        dragPlane.setFromNormalAndCoplanarPoint(normal, wallWorldPos);
        raycaster.ray.intersectPlane(dragPlane, dragStartPos);
        dragStartAperture = JSON.parse(JSON.stringify(selectedApertureData));
        
        if (event.pointerType !== 'mouse') event.preventDefault(); // Stop orbit on touch drag
        return;
    }

    // Try selecting an aperture
    const allApertureMeshes = [];
    Object.values(apertureComponents).forEach(compArray => {
        compArray.forEach(group => {
            group.children.forEach(child => { if (child.isMesh) allApertureMeshes.push(child); });
        });
    });

    const intersects = raycaster.intersectObjects(allApertureMeshes, true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && !obj.userData.apertureId && obj.parent) {
            obj = obj.parent;
        }

        if (obj && obj.userData.apertureId) {
            const apertureData = apertures.find(a => a.id === obj.userData.apertureId);
            if (apertureData) {
                if (isFreeRoam) {
                    window.toggleFreeRoam();
                    const viewMap = { front: 'front', innerBack: 'front', back: 'back', left: 'left', right: 'right', innerLeft: 'right' };
                    window.rotateTo(viewMap[apertureData.wallId]);
                }
                selectAperture(apertureData);
                return;
            }
        }
    } else {
        deselectAperture();
    }

    // Regular orbit drag init
    if (isFreeRoam && !selectedApertureData && !isPlacingNewAperture) {
        isDragging = true;
        previousX = event.clientX;
        previousY = event.clientY;
    }
}

function onPointerMove(event) {
    if (isPlacingNewAperture) {
        updateMousePosition(event);
        raycaster.setFromCamera(mouse, camera);
        const wallIntersects = raycaster.intersectObjects(getWallMeshes(), false);
        
        if (wallIntersects.length > 0) {
            const hit = wallIntersects[0];
            const hitWallMesh = hit.object;
            const wallId = hitWallMesh.userData.wallId;
            currentHoveredWall = hitWallMesh;
            
            const localHit = hitWallMesh.worldToLocal(hit.point.clone());
            const wallDim = getWallDimensions(wallId);
            const EDGE_PAD = 0.02; // Prevents hanging perfectly on edges
            const halfW = placementConfig.w / 2;
            const halfH = placementConfig.h / 2;

            // Clamp ghost mesh positioning to wall bounds so it doesn't float off
            let clampedX = Math.max(-wallDim.width / 2 + halfW + EDGE_PAD, Math.min(wallDim.width / 2 - halfW - EDGE_PAD, localHit.x));
            let clampedY = placementConfig.type === 'door' ? halfH : Math.max(halfH + EDGE_PAD, Math.min(wallDim.height - halfH - EDGE_PAD, localHit.y));
            
            const candidate = {
                id: 'temp', wallId: wallId, type: placementConfig.type,
                w: placementConfig.w, h: placementConfig.h,
                x: clampedX, y: clampedY
            };

            const isValid = isValidAperture(candidate);
            ghostMesh.material.color.setHex(isValid ? 0x00ff00 : 0xff0000);
            ghostMesh.position.copy(hitWallMesh.position);
            ghostMesh.rotation.copy(hitWallMesh.rotation);
            ghostMesh.translateX(clampedX);
            ghostMesh.translateY(clampedY);
            ghostMesh.translateZ(wallThickness / 2);
            ghostMesh.visible = true;
            ghostMesh.userData = { localX: clampedX, localY: clampedY };
        } else {
            ghostMesh.visible = false;
            currentHoveredWall = null;
        }
        return;
    }

    if (selectedApertureData && (isDraggingAperture || resizeMode) && dragStartAperture) {
        updateMousePosition(event);
        raycaster.setFromCamera(mouse, camera);
        let currentPt = new THREE.Vector3();
        
        if (raycaster.ray.intersectPlane(dragPlane, currentPt)) {
            let delta = currentPt.clone().sub(dragStartPos);
            let localDeltaX = 0, localDeltaY = delta.y; 
            const wid = selectedApertureData.wallId;
            if (wid === 'front' || wid === 'innerBack') localDeltaX = delta.x;
            if (wid === 'back') localDeltaX = delta.x; 
            if (wid === 'left') localDeltaX = delta.z; 
            if (wid === 'right' || wid === 'innerLeft') localDeltaX = delta.z;

            let candidate = JSON.parse(JSON.stringify(dragStartAperture));
            const wallDim = getWallDimensions(candidate.wallId);
            const EDGE_PAD = 0.02; // Hard bounds limit
            
            if (isDraggingAperture) {
                candidate.x += localDeltaX;
                candidate.y += localDeltaY;
                
                const halfW = candidate.w / 2;
                const halfH = candidate.h / 2;
                
                // Clamp translation to edges
                candidate.x = Math.max(-wallDim.width / 2 + halfW + EDGE_PAD, Math.min(wallDim.width / 2 - halfW - EDGE_PAD, candidate.x));
                if (candidate.type === 'door') {
                    candidate.y = halfH; 
                } else {
                    candidate.y = Math.max(halfH + EDGE_PAD, Math.min(wallDim.height - halfH - EDGE_PAD, candidate.y));
                }

            } else if (resizeMode === 'width') {
                let newW = dragStartAperture.w + localDeltaX;
                const maxWLeft = (candidate.x - (-wallDim.width / 2 + EDGE_PAD)) * 2;
                const maxWRight = (wallDim.width / 2 - EDGE_PAD - candidate.x) * 2;
                
                // Clamp scale to not exceed edges based on current center
                newW = Math.max(0.3, Math.min(newW, Math.min(maxWLeft, maxWRight)));
                candidate.w = newW;

            } else if (resizeMode === 'height') {
                let newH = dragStartAperture.h + localDeltaY;
                if (candidate.type === 'door') {
                    newH = Math.max(0.3, Math.min(newH, wallDim.height - EDGE_PAD));
                    candidate.h = newH;
                    candidate.y = candidate.h / 2;
                } else {
                    const maxHBottom = (candidate.y - EDGE_PAD) * 2;
                    const maxHTop = (wallDim.height - EDGE_PAD - candidate.y) * 2;
                    newH = Math.max(0.3, Math.min(newH, Math.min(maxHBottom, maxHTop)));
                    candidate.h = newH;
                }
            }

            if (isValidAperture(candidate)) {
                const index = apertures.findIndex(a => a.id === candidate.id);
                if (index !== -1) {
                    apertures[index] = candidate;
                    selectedApertureData = candidate;
                    updateBuilding();
                }
            }
        }
        return;
    }

    // Camera Orbit
    if (isDragging && isFreeRoam) {
        targetAngle += (event.clientX - previousX) * 0.005;
        targetVerticalAngle += (event.clientY - previousY) * 0.005;
        targetVerticalAngle = Math.max(-1.4, Math.min(1.4, targetVerticalAngle));
        previousX = event.clientX;
        previousY = event.clientY;
    }
}

function onPointerUp() {
    isDragging = false;
    if (isDraggingAperture || resizeMode) {
        isDraggingAperture = false;
        resizeMode = null;
        dragStartAperture = null;
        document.body.classList.remove('dragging-aperture', 'resizing-width', 'resizing-height');
        updateApertureList();
        updateQuickStats();
    }
}

// PILL HUD & NOTIFICATIONS
function showTransformHUD(data) {
    let overlay = document.getElementById('canvas-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'canvas-overlay';
        overlay.className = 'canvas-overlay';
        document.getElementById("builder-viewport").appendChild(overlay);
    }
    
    let hud = document.getElementById('transform-hud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'transform-hud';
        hud.className = 'hud-pill';
        overlay.appendChild(hud);
    }
    
    hud.innerHTML = `
        <div class="hud-label">${data.type.toUpperCase()}</div>
        <button class="hud-pill-btn" onclick="startMove()" title="Move">↔️</button>
        <button class="hud-pill-btn" onclick="startResize('width')" title="Resize Width">📏</button>
        <button class="hud-pill-btn" onclick="startResize('height')" title="Resize Height">📐</button>
        <div class="hud-pill-divider"></div>
        <button class="hud-pill-btn danger" onclick="deleteSelectedAperture()" title="Delete">🗑️</button>
        <button class="hud-pill-btn close" onclick="deselectAperture()" title="Close">✖️</button>
    `;
    hud.style.display = 'flex';
}

function hideTransformHUD() {
    const hud = document.getElementById('transform-hud');
    if (hud) hud.style.display = 'none';
    resizeMode = null;
    isDraggingAperture = false;
    document.body.classList.remove('dragging-aperture', 'resizing-width', 'resizing-height');
}

function updateTransformHUDPosition() {
    if (!selectedApertureData) return;
    
    let currentGroup = null;
    if (apertureComponents[selectedApertureData.wallId]) {
        currentGroup = apertureComponents[selectedApertureData.wallId].find(
            g => g.userData.apertureId === selectedApertureData.id
        );
    }
    if (!currentGroup) return;

    const pos = new THREE.Vector3();
    currentGroup.getWorldPosition(pos);
    pos.y += selectedApertureData.h / 2 + 0.5; 
    pos.project(camera);
    
    const container = document.getElementById("builder-viewport");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = (pos.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (pos.y * -0.5 + 0.5) * rect.height + rect.top;
    
    const hud = document.getElementById('transform-hud');
    if (hud && hud.style.display !== 'none') {
        hud.style.left = `${x}px`;
        hud.style.top = `${y}px`;
    }
}

function showConstraintAlert(message, type = 'error') {
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

// CORE DATA METHODS

function selectAperture(data) {
    selectedApertureData = data;
    showTransformHUD(data);
    updateBuilding();
}

function deselectAperture() {
    selectedApertureData = null;
    hideTransformHUD();
    updateBuilding();
}

window.deleteSelectedAperture = function() {
    if (!selectedApertureData) return;
    window.removeAperture(selectedApertureData.id);
    deselectAperture();
};

window.startMove = function() {
    if (!selectedApertureData) return;
    isDraggingAperture = true;
    resizeMode = null;
    document.body.classList.add('dragging-aperture');
};

window.startResize = function(mode) {
    if (!selectedApertureData) return;
    resizeMode = mode;
    isDraggingAperture = false;
    document.body.classList.add(mode === 'width' ? 'resizing-width' : 'resizing-height');
};

window.removeAperture = function(id) {
    apertures = apertures.filter(a => a.id !== id);
    updateApertureList();
    updateQuickStats();
    updateBuilding();
};

function resetApertures() {
    apertures = [];
    apertureComponents = {};
    selectedApertureData = null;
    hideTransformHUD();
    updateApertureList();
    updateQuickStats();
    updateBuilding();
}

function updateApertureList() {
    // Legacy list removal, now fully visual
}

function updateQuickStats() {
    let area = 0;
    if (currentShapeType === "rectangle") {
        area = W * D;
    } else {
        area = (W/2 * D) + (W/2 * D/2);
    }
    
    const areaLabel = document.getElementById('stat-area');
    if (areaLabel) {
        areaLabel.innerText = area.toFixed(1) + ' m²';
    }
}

function isValidAperture(candidate) {
    const wallDim = getWallDimensions(candidate.wallId);
    const halfW = candidate.w / 2;
    const halfH = candidate.h / 2;

    if (
        (candidate.x - halfW) < -wallDim.width / 2 || 
        (candidate.x + halfW) > wallDim.width / 2 || 
        (candidate.y - halfH) < (candidate.type === 'door' ? -0.01 : 0) || 
        (candidate.y + halfH) > wallDim.height
    ) return false;

    const pad = 0.02;
    for (let current of apertures) {
        if (current.id !== candidate.id && current.wallId === candidate.wallId) {
            const horiz = Math.abs(candidate.x - current.x) < ((candidate.w / 2) + (current.w / 2) + pad);
            const vert = Math.abs(candidate.y - current.y) < ((candidate.h / 2) + (current.h / 2) + pad);
            if (horiz && vert) return false;
        }
    }
    return true;
}

// MESH COMPILATION
function getWallDimensions(wallId) {
    let wallWidth = W, wallHeight = H;
    const t = wallThickness;

    if (currentShapeType === "rectangle") {
        if (wallId === "front" || wallId === "back") {
            wallWidth = W - 2 * t;
            if (wallId === "front" && currentRoofType === "pent") wallHeight = H + slopeHeight;
        } else if (wallId === "left" || wallId === "right") {
            wallWidth = D;
            wallHeight = H;
        }
    } else {
        if (wallId === "front") { wallWidth = W - 2 * t; wallHeight = currentRoofType === "pent" ? H + slopeHeight : H; }
        else if (wallId === "back") { wallWidth = W / 2 - 2 * t; wallHeight = H; }
        else if (wallId === "left") { wallWidth = D; wallHeight = H; }
        else if (wallId === "right") { wallWidth = D / 2; wallHeight = H; }
        else if (wallId === "innerBack") { wallWidth = W / 2 - t; wallHeight = H; }
        else if (wallId === "innerLeft") { wallWidth = D / 2 + t; wallHeight = H; }
    }
    return { width: wallWidth, height: wallHeight };
}

function createWallShapeWithHoles(wallId, baseShape) {
    const wallDim = getWallDimensions(wallId);
    const wallApertures = apertures.filter(a => a.wallId === wallId);
    wallApertures.forEach(aperture => {
        const hole = new THREE.Path();
        
        // Micro-margin to prevent Three.js triangulation failure when holes touch the shape edge.
        const m = 0.002; 
        
        let left = aperture.x - (aperture.w / 2) + m;
        let right = aperture.x + (aperture.w / 2) - m;
        let bottom = aperture.y - (aperture.h / 2);
        let top = aperture.y + (aperture.h / 2) - m;

        // Force the hole strictly inside the bounds of the 2D plane
        if (bottom < m) bottom = m;
        if (left < -wallDim.width / 2 + m) left = -wallDim.width / 2 + m;
        if (right > wallDim.width / 2 - m) right = wallDim.width / 2 - m;
        if (top > wallDim.height - m) top = wallDim.height - m;

        hole.moveTo(left, bottom);
        hole.lineTo(right, bottom);
        hole.lineTo(right, top);
        hole.lineTo(left, top);
        hole.lineTo(left, bottom);
        
        baseShape.holes.push(hole);
    });
    return baseShape;
}

function buildApertureComponents(wallId, wallMesh, buildingGroup) {
    const wallApertures = apertures.filter(a => a.wallId === wallId);
    wallApertures.forEach(aperture => {
        const group = new THREE.Group();
        group.userData.apertureId = aperture.id;
        group.userData.wallId = wallId;
        
        const isSelected = selectedApertureData && selectedApertureData.id === aperture.id;
        const frameColor = isSelected ? 0x007bff : 0x2c2c2c;
        const frameMaterial = new THREE.MeshLambertMaterial({ color: frameColor });
        const glassMaterial = new THREE.MeshLambertMaterial({ color: isSelected ? 0xcce5ff : 0x88ccff, transparent: true, opacity: 0.5 });
        const doorMaterial = new THREE.MeshLambertMaterial({ color: isSelected ? 0x007bff : 0x495057 });
        
        const frameDepth = wallThickness + 0.01; 
        const frameThickness = 0.05;
        
        if (aperture.type === 'window') {
            const topFrame = new THREE.Mesh(new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth), frameMaterial);
            topFrame.position.set(0, (aperture.h / 2) - (frameThickness / 2), 0); group.add(topFrame);
            
            const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth), frameMaterial);
            bottomFrame.position.set(0, (-aperture.h / 2) + (frameThickness / 2), 0); group.add(bottomFrame);
            
            const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, aperture.h - (frameThickness * 2), frameDepth), frameMaterial);
            leftFrame.position.set((-aperture.w / 2) + (frameThickness / 2), 0, 0); group.add(leftFrame);
            
            const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, aperture.h - (frameThickness * 2), frameDepth), frameMaterial);
            rightFrame.position.set((aperture.w / 2) - (frameThickness / 2), 0, 0); group.add(rightFrame);
            
            const glass = new THREE.Mesh(new THREE.BoxGeometry(aperture.w - frameThickness * 2, aperture.h - frameThickness * 2, frameDepth * 0.3), glassMaterial);
            group.add(glass);
        } else if (aperture.type === 'door') {
            const isDouble = aperture.w > 1.5; 
            if (isDouble) {
                const leafW = (aperture.w - (frameThickness * 3)) / 2;
                const doorL = new THREE.Mesh(new THREE.BoxGeometry(leafW, aperture.h - frameThickness, frameDepth * 0.7), doorMaterial);
                doorL.position.set(-leafW / 2 - frameThickness / 4, -frameThickness / 2, 0); group.add(doorL);
                
                const doorR = new THREE.Mesh(new THREE.BoxGeometry(leafW, aperture.h - frameThickness, frameDepth * 0.7), doorMaterial);
                doorR.position.set(leafW / 2 + frameThickness / 4, -frameThickness / 2, 0); group.add(doorR);

                const midFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness / 2, aperture.h - frameThickness, frameDepth), frameMaterial);
                midFrame.position.set(0, -frameThickness / 2, 0); group.add(midFrame);
            } else {
                const door = new THREE.Mesh(new THREE.BoxGeometry(aperture.w - (frameThickness * 2), aperture.h - frameThickness, frameDepth * 0.7), doorMaterial);
                door.position.set(0, -frameThickness / 2, 0); group.add(door);
            }
            
            const topFrame = new THREE.Mesh(new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth), frameMaterial);
            topFrame.position.set(0, (aperture.h / 2) - (frameThickness / 2), 0); group.add(topFrame);
            
            const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, aperture.h - frameThickness, frameDepth), frameMaterial);
            leftFrame.position.set((-aperture.w / 2) + (frameThickness / 2), -frameThickness / 2, 0); group.add(leftFrame);
            
            const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, aperture.h - frameThickness, frameDepth), frameMaterial);
            rightFrame.position.set((aperture.w / 2) - (frameThickness / 2), -frameThickness / 2, 0); group.add(rightFrame);
        }
        
        group.position.copy(wallMesh.position);
        group.rotation.copy(wallMesh.rotation);
        group.translateX(aperture.x);
        group.translateY(aperture.y);
        group.translateZ(wallThickness / 2);
        
        if (!apertureComponents[wallId]) apertureComponents[wallId] = [];
        apertureComponents[wallId].push(group);
        buildingGroup.add(group);
    });
}

function createSideWallGeometry(widthAlongZ, baseH, roofType, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-widthAlongZ / 2, 0); shape.lineTo(widthAlongZ / 2, 0);
    if (roofType === "apex") {
        shape.lineTo(widthAlongZ / 2, baseH); shape.lineTo(0, baseH + peakHeight); shape.lineTo(-widthAlongZ / 2, baseH);
    } else if (roofType === "pent") {
        shape.lineTo(widthAlongZ / 2, baseH + slopeHeight); shape.lineTo(-widthAlongZ / 2, baseH);
    } else {
        shape.lineTo(widthAlongZ / 2, baseH); shape.lineTo(-widthAlongZ / 2, baseH);
    }
    shape.closePath();
    if (wallId) createWallShapeWithHoles(wallId, shape);
    return new THREE.ExtrudeGeometry(shape, { steps: 1, depth: wallThickness, bevelEnabled: false });
}

function createRectWallGeometry(widthAlongX, heightY, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-widthAlongX / 2, 0); shape.lineTo(widthAlongX / 2, 0);
    shape.lineTo(widthAlongX / 2, heightY); shape.lineTo(-widthAlongX / 2, heightY); shape.closePath();
    if (wallId) createWallShapeWithHoles(wallId, shape);
    return new THREE.ExtrudeGeometry(shape, { steps: 1, depth: wallThickness, bevelEnabled: false });
}

function createPanelGeo(width, hLeft, hRight, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, hRight); shape.lineTo(-width / 2, hLeft); shape.closePath();
    if (wallId) createWallShapeWithHoles(wallId, shape);
    return new THREE.ExtrudeGeometry(shape, { steps: 1, depth: wallThickness, bevelEnabled: false });
}

function createRoof(roofType, shape, buildingGroup, roofMaterial, isLShape = false, centerX = 0, centerZ = 0) {
    if (roofType === "pent") {
        const roofGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: roofThickness, bevelEnabled: false });
        roofGeo.rotateX(-Math.PI / 2);
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        const angle = -Math.atan2(slopeHeight, D);
        if (isLShape) {
            roof.position.set(-centerX, H - 0.01, -centerZ);
            roof.geometry.translate(0, 0, -D / 2); roof.rotation.x = angle; roof.geometry.translate(0, 0, D / 2);
            roof.position.y += slopeHeight / 2 + roofGap;
        } else {
            roof.rotation.x = angle; roof.position.y = H + slopeHeight / 2 + roofGap;
        }
        buildingGroup.add(roof);
    } else if (roofType === "apex" && !isLShape) {

    const angle = Math.atan2(peakHeight, D / 2);

    const roofHalfWidth =
        (D / 2) / Math.cos(angle) + roofOverhang + 0.08;

    const roofPlateGeo = new THREE.BoxGeometry(
        W + roofOverhang * 2,
        roofThickness,
        roofHalfWidth
    );

    const overlap = -0.085;
    const zOffset = D / 4 - overlap;

    const roofY =
        H + peakHeight / 2;

    const roofL = new THREE.Mesh(roofPlateGeo, roofMaterial);
    roofL.position.set(0, roofY, zOffset);
    roofL.rotation.x = angle;
    buildingGroup.add(roofL);

    const roofR = new THREE.Mesh(roofPlateGeo, roofMaterial);
    roofR.position.set(0, roofY, -zOffset);
    roofR.rotation.x = -angle;
    buildingGroup.add(roofR);
} else {
        const roofGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: roofThickness, bevelEnabled: false });
        roofGeo.rotateX(-Math.PI / 2);
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        if (isLShape) roof.position.set(-centerX, H + roofGap, -centerZ);
        else roof.position.y = H + roofGap;
        buildingGroup.add(roof);
    }
}

// NEW FUNCTION: Force all apertures to respect new wall boundaries and prevent overlaps
function clampAllApertures() {
    const m = 0.02; // Edge margin to prevent Earcut crashes
    const minWindowW = 0.3; // Minimum window width before we stop shrinking
    const pad = 0.02; // Gap between apertures to prevent overlaps

    // Group apertures by wall so we only resolve collisions on the same plane
    const wallGroups = {};
    apertures.forEach(ap => {
        if (!wallGroups[ap.wallId]) wallGroups[ap.wallId] = [];
        wallGroups[ap.wallId].push(ap);
    });

    for (const wallId in wallGroups) {
        let aps = wallGroups[wallId];
        const wallDim = getWallDimensions(wallId);

        // 1. Initial size clamp (Heights and Y positions)
        aps.forEach(ap => {
            if (ap.h > wallDim.height - m * 2) {
                ap.h = Math.max(0.3, wallDim.height - m * 2);
                if (ap.type === 'door') ap.y = ap.h / 2;
            }
            const halfH = ap.h / 2;
            if (ap.type === 'door') {
                ap.y = halfH;
            } else {
                ap.y = Math.max(halfH + m, Math.min(wallDim.height - halfH - m, ap.y));
            }
        });

        // 2. Sort left-to-right by X position for spatial packing
        aps.sort((a, b) => a.x - b.x);

        // 3. If cumulative width is too large, shrink WINDOWS only
        let totalRequiredW = aps.reduce((sum, ap) => sum + ap.w, 0) + (aps.length + 1) * pad;
        if (totalRequiredW > wallDim.width) {
            let deficit = totalRequiredW - wallDim.width;
            let shrinkableWindows = aps.filter(ap => ap.type === 'window' && ap.w > minWindowW);
            
            // Iteratively shrink windows until they fit or hit their absolute minimum size
            while (deficit > 0.01 && shrinkableWindows.length > 0) {
                let share = deficit / shrinkableWindows.length;
                for (let i = 0; i < shrinkableWindows.length; i++) {
                    let ap = shrinkableWindows[i];
                    let newW = Math.max(minWindowW, ap.w - share);
                    let saved = ap.w - newW;
                    ap.w = newW;
                    deficit -= saved; // Deduct the saved width from our deficit
                }
                // Re-evaluate which windows can still be shrunk for the next pass
                shrinkableWindows = aps.filter(ap => ap.type === 'window' && ap.w > minWindowW);
            }
        }

        // 4. Pack left-to-right (Push overlaps safely to the right)
        let currentX = -wallDim.width / 2 + m;
        for (let i = 0; i < aps.length; i++) {
            let ap = aps[i];
            let halfW = ap.w / 2;
            if (ap.x - halfW < currentX) {
                ap.x = currentX + halfW;
            }
            currentX = ap.x + halfW + pad;
        }

        // 5. Pack right-to-left (If L-to-R pushed them off the right edge, push back)
        let currentRightX = wallDim.width / 2 - m;
        for (let i = aps.length - 1; i >= 0; i--) {
            let ap = aps[i];
            let halfW = ap.w / 2;
            if (ap.x + halfW > currentRightX) {
                ap.x = currentRightX - halfW;
            }
            currentRightX = ap.x - halfW - pad;
        }
    }
}

function updateBuilding() {
    clampAllApertures(); // Run the boundary sweep BEFORE generating geometry

    if (building) {
        scene.remove(building);
        building.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
    }

    walls = { front: null, back: null, left: null, right: null, innerBack: null, innerLeft: null };
    apertureComponents = {};

    const buildingGroup = new THREE.Group();
    const exteriorColor = TEXTURES[currentExteriorTexture]?.color || 0x333333;
    const wallMaterial = new THREE.MeshLambertMaterial({ color: exteriorColor, side: THREE.DoubleSide });
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide });
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 1 }); 

    const t = wallThickness;

    if (currentShapeType === "rectangle") {
        const frontW = W - 2 * t;
        let leftGeo, rightGeo, frontGeo, backGeo;

        if (currentRoofType === "apex") {
            leftGeo = createSideWallGeometry(D, H, "apex", "left");
            rightGeo = createSideWallGeometry(D, H, "apex", "right");
            frontGeo = createRectWallGeometry(frontW, H, "front");
            backGeo = createRectWallGeometry(frontW, H, "back");
        } else if (currentRoofType === "pent") {
            leftGeo = createSideWallGeometry(D, H, "pent", "left");
            rightGeo = createSideWallGeometry(D, H, "pent", "right");
            frontGeo = createRectWallGeometry(frontW, H + slopeHeight, "front");
            backGeo = createRectWallGeometry(frontW, H, "back");
        } else {
            leftGeo = createSideWallGeometry(D, H, "flat", "left");
            rightGeo = createSideWallGeometry(D, H, "flat", "right");
            frontGeo = createRectWallGeometry(frontW, H, "front");
            backGeo = createRectWallGeometry(frontW, H, "back");
        }

        walls.left = addMeshWithEdges(leftGeo, wallMaterial, edgeMaterial, buildingGroup, "left");
        walls.left.rotation.y = -Math.PI / 2; walls.left.position.set(-W / 2 + t, 0, 0);
        buildApertureComponents("left", walls.left, buildingGroup);

        walls.right = addMeshWithEdges(rightGeo, wallMaterial, edgeMaterial, buildingGroup, "right");
        walls.right.rotation.y = -Math.PI / 2; walls.right.position.set(W / 2, 0, 0);
        buildApertureComponents("right", walls.right, buildingGroup);

        walls.front = addMeshWithEdges(frontGeo, wallMaterial, edgeMaterial, buildingGroup, "front");
        walls.front.position.set(0, 0, D / 2 - t);
        buildApertureComponents("front", walls.front, buildingGroup);

        walls.back = addMeshWithEdges(backGeo, wallMaterial, edgeMaterial, buildingGroup, "back");
        walls.back.position.set(0, 0, -D / 2);
        buildApertureComponents("back", walls.back, buildingGroup);

        const floorGeo = new THREE.PlaneGeometry(W, D);
        floorGeo.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(floorGeo, floorMaterial);
        floor.position.y = 0.01; buildingGroup.add(floor);

        if (showRoof) {
            const roofShape = new THREE.Shape(); const o = roofOverhang;
            roofShape.moveTo(-W / 2 - o, -D / 2 - o); roofShape.lineTo(W / 2 + o, -D / 2 - o);
            roofShape.lineTo(W / 2 + o, D / 2 + o); roofShape.lineTo(-W / 2 - o, D / 2 + o); roofShape.closePath();
            createRoof(currentRoofType, roofShape, buildingGroup, roofMaterial, false);
        }
    } else {
        const effectiveRoofType = currentRoofType === "apex" ? "pent" : currentRoofType;
        const getZHeight = (z) => { if (effectiveRoofType !== "pent") return H; return H + slopeHeight * ((z + D / 2) / D); };

        const leftGeo = createPanelGeo(D, getZHeight(-D / 2), getZHeight(D / 2), "left");
        const frontGeo = createPanelGeo(W - 2 * t, getZHeight(D / 2 - t), getZHeight(D / 2 - t), "front");
        const rightGeo = createPanelGeo(D / 2, getZHeight(0), getZHeight(D / 2), "right");
        const innerBackGeo = createPanelGeo(W / 2 - t, getZHeight(0), getZHeight(0), "innerBack");
        const innerLeftGeo = createPanelGeo(D / 2 + t, getZHeight(-D / 2), getZHeight(0), "innerLeft");
        const backGeo = createPanelGeo(W / 2 - 2 * t, getZHeight(-D / 2), getZHeight(-D / 2), "back");

        walls.left = addMeshWithEdges(leftGeo, wallMaterial, edgeMaterial, buildingGroup, "left");
        walls.left.rotation.y = -Math.PI / 2; walls.left.position.set(-W / 2 + t, 0, 0);
        buildApertureComponents("left", walls.left, buildingGroup);

        walls.front = addMeshWithEdges(frontGeo, wallMaterial, edgeMaterial, buildingGroup, "front");
        walls.front.position.set(0, 0, D / 2 - t);
        buildApertureComponents("front", walls.front, buildingGroup);

        walls.right = addMeshWithEdges(rightGeo, wallMaterial, edgeMaterial, buildingGroup, "right");
        walls.right.rotation.y = -Math.PI / 2; walls.right.position.set(W / 2, 0, D / 4);
        buildApertureComponents("right", walls.right, buildingGroup);

        walls.innerBack = addMeshWithEdges(innerBackGeo, wallMaterial, edgeMaterial, buildingGroup, "innerBack");
        walls.innerBack.position.set(W / 4 - t / 2, 0, 0);
        buildApertureComponents("innerBack", walls.innerBack, buildingGroup);

        walls.innerLeft = addMeshWithEdges(innerLeftGeo, wallMaterial, edgeMaterial, buildingGroup, "innerLeft");
        walls.innerLeft.rotation.y = -Math.PI / 2; walls.innerLeft.position.set(0, 0, -D / 4 + t / 2);
        buildApertureComponents("innerLeft", walls.innerLeft, buildingGroup);

        walls.back = addMeshWithEdges(backGeo, wallMaterial, edgeMaterial, buildingGroup, "back");
        walls.back.position.set(-W / 4, 0, -D / 2);
        buildApertureComponents("back", walls.back, buildingGroup);

        const floorShape = new THREE.Shape();
        floorShape.moveTo(-W / 2, D / 2); floorShape.lineTo(0, D / 2); floorShape.lineTo(0, 0);
        floorShape.lineTo(W / 2, 0); floorShape.lineTo(W / 2, -D / 2); floorShape.lineTo(-W / 2, -D / 2); floorShape.closePath();
        const floorGeo = new THREE.ShapeGeometry(floorShape); floorGeo.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(floorGeo, floorMaterial); floor.position.y = 0.01; buildingGroup.add(floor);

        if (showRoof) {
            const roofShape = new THREE.Shape(); const o = roofOverhang;
            roofShape.moveTo(-W / 2 - o, D / 2 + o); roofShape.lineTo(o, D / 2 + o); roofShape.lineTo(o, o);
            roofShape.lineTo(W / 2 + o, o); roofShape.lineTo(W / 2 + o, -D / 2 - o); roofShape.lineTo(-W / 2 - o, -D / 2 - o); roofShape.closePath();
            createRoof(effectiveRoofType, roofShape, buildingGroup, roofMaterial, true, 0, 0);
        }
    }

    applyWallVisibility();
    building = buildingGroup;
    if (showMeasurements) {
                addMeasurements(buildingGroup);
            }
    scene.add(building);
}

function addMeshWithEdges(geo, mat, edgeMat, group, wallId) {
    const mesh = new THREE.Mesh(geo, mat);
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, edgeMat);
    mesh.userData = { edgeLine: line, wallId: wallId }; 
    mesh.add(line);
    group.add(mesh);
    return mesh;
}

function applyWallVisibility() {
    Object.keys(walls).forEach(wallName => {
        if (walls[wallName]) {
            const visible = wallVisibility[wallName];
            walls[wallName].visible = visible;
            if (walls[wallName].userData.edgeLine) walls[wallName].userData.edgeLine.visible = visible;
            if (apertureComponents[wallName]) apertureComponents[wallName].forEach(comp => comp.visible = visible);
        }
    });
}

// GLOBALS & INITIALIZATION

window.toggleWall = function (wallName, e) {
    const evt = e || window.event;
    wallVisibility[wallName] = !wallVisibility[wallName];
    applyWallVisibility();
    if (evt && evt.currentTarget) evt.currentTarget.classList.toggle('active');
};

function fitCamera() {
    const diagonal = Math.sqrt(W * W + D * D);
    targetRadius = Math.max(diagonal * 1.5, H * 3);
    targetRadius = Math.max(5, Math.min(25, targetRadius));
}

window.toggleRoof = function (e) {
    const evt = e || window.event;
    showRoof = !showRoof;
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.toggle("active");
        evt.currentTarget.innerHTML = showRoof ? "🏠" : "🏚️";
    }
    updateBuilding();
};

window.handleZoomSlider = function (val) {
    targetRadius = parseFloat(val);
    radius = targetRadius;
};

window.updateDim = function (prop, val) {
    let newVal = parseFloat(val);
    let oldW = W, oldD = D;

    // 1. Temporarily apply the new dimension to test it
    if (prop === "W") W = newVal;
    if (prop === "D") D = newVal;

    // 2. Validate if the new dimensions can support the existing apertures
    let isValid = true;
    const m = 0.02; // Edge margin
    const pad = 0.02; // Padding between apertures
    const minWindowW = 0.3; // Minimum window width

    // Group apertures by wall
    const wallGroups = {};
    apertures.forEach(ap => {
        if (!wallGroups[ap.wallId]) wallGroups[ap.wallId] = [];
        wallGroups[ap.wallId].push(ap);
    });

    // Check every wall to see if it violates the physical limits
    for (const wallId in wallGroups) {
        let aps = wallGroups[wallId];
        const wallDim = getWallDimensions(wallId); // Uses the newly applied W/D

        // Calculate absolute minimum required physical width for this wall
        let minRequiredWidth = (m * 2) + (aps.length > 1 ? (aps.length - 1) * pad : 0);
        aps.forEach(ap => {
            minRequiredWidth += (ap.type === 'door' ? ap.w : minWindowW);
        });

        if (wallDim.width < minRequiredWidth) {
            isValid = false;
            break; // Stop checking, we found a violation
        }
    }

    // 3. If invalid, revert the dimension and alert the user
    if (!isValid) {
        W = oldW;
        D = oldD;
        
        // Ensure the input/slider visually reverts to the valid value
        const inputElement = document.getElementById(`${prop.toLowerCase()}-slider`) || document.getElementById(`input-${prop.toLowerCase()}`);
        if (inputElement) inputElement.value = (prop === 'W' ? W : D);
        
        showConstraintAlert(`Cannot shrink further. Remove or resize doors first.`, 'error');
        return; // Abort the rest of the update
    }

    // 4. If valid, proceed with the update as normal
    const label = document.getElementById(`val-${prop.toLowerCase()}`);
    if (label) label.innerText = newVal;
    
    updateBuilding();
    updateQuickStats(); 
    fitCamera();
};

window.setRoof = function (type, e) {
    const evt = e || window.event;
    currentRoofType = type;
    resetApertures();
    document.querySelectorAll("#roof-options .style-option").forEach(o => o.classList.remove("active"));
    if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");
    updateBuilding();
};

window.setShape = function (type, e) {
    const evt = e || window.event;
    currentShapeType = type;
    resetApertures();
    document.querySelectorAll(".sidebar-nav .nav-section:first-child .style-option").forEach(o => o.classList.remove("active"));
    if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");
    updateRoofOptionsVisibility();
    updateBuilding();
    fitCamera();
};

window.updateRoofOptionsVisibility = function () {
    const apexOption = document.querySelector('#roof-options .style-option[onclick*="apex"]');
    if (apexOption) {
        if (currentShapeType === "l-shape") {
            apexOption.style.display = "none";
            if (currentRoofType === "apex") {
                currentRoofType = "pent";
                document.querySelectorAll("#roof-options .style-option").forEach(o => o.classList.remove("active"));
                const pentOption = document.querySelector('#roof-options .style-option[onclick*="pent"]');
                if (pentOption) pentOption.classList.add("active");
            }
        } else apexOption.style.display = "";
    }
};

window.toggleSidebar = function () {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebar-overlay").classList.toggle("active");
    document.getElementById("menu-toggle").classList.toggle("open");
    setTimeout(() => window.dispatchEvent(new Event("resize")), 400);
};

window.toggleSection = function (header) {
    const section = header.parentElement;
    const wasActive = section.classList.contains("active");
    document.querySelectorAll(".nav-section").forEach(s => s.classList.remove("active"));
    if (!wasActive) section.classList.add("active");
};

window.toggleFreeRoam = function () {
    isFreeRoam = !isFreeRoam;
    const btn = document.getElementById("roam-toggle");
    if(btn) {
        btn.innerHTML = isFreeRoam ? "🔓" : "🔒";
        btn.style.background = isFreeRoam ? "var(--accent-color)" : "rgba(255, 255, 255, 0.9)";
        btn.style.color = isFreeRoam ? "white" : "var(--text-dark)";
    }
};

window.rotateTo = function (view, e) {
    const evt = e || window.event;
    document.querySelectorAll(".view-controls button").forEach(btn => btn.classList.remove("active"));
    if (evt && evt.currentTarget && evt.currentTarget.id !== "roam-toggle" && evt.currentTarget.id !== "roof-toggle") {
        evt.currentTarget.classList.add("active");
    }
    const views = {
        front: [0, 0], right: [Math.PI / 2, 0], back: [Math.PI, 0],
        left: [-Math.PI / 2, 0], top: [0, 1.5], iso: [-Math.PI / 4, 0.25],
    };
    if (views[view]) [targetAngle, targetVerticalAngle] = views[view];
};

window.setExterior = function(type, e) {
    const evt = e || window.event;
    currentExteriorTexture = type;
    document.querySelectorAll("#exterior-options .style-option").forEach(o => o.classList.remove("active"));
    if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");
    updateBuilding();
};

function animate() {
    requestAnimationFrame(animate);
    radius += (targetRadius - radius) * lerpSpeed;
    const slider = document.getElementById("zoom-slider");
    if (slider) slider.value = radius;
    currentAngle += (targetAngle - currentAngle) * lerpSpeed;
    currentVerticalAngle += (targetVerticalAngle - currentVerticalAngle) * lerpSpeed;
    
    camera.position.x = radius * Math.cos(currentVerticalAngle) * Math.sin(currentAngle);
    camera.position.z = radius * Math.cos(currentVerticalAngle) * Math.cos(currentAngle);
    camera.position.y = radius * Math.sin(currentVerticalAngle) + H / 2;
    camera.lookAt(0, H / 2, 0);
    
    updateTransformHUDPosition();
    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    const container = document.getElementById("builder-viewport");
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

function init() {
    const container = document.getElementById("builder-viewport");
    if (!container) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.DirectionalLight(0xffffff, 0.6);
    light.position.set(5, 10, 7);
    scene.add(light);

    const grid = new THREE.GridHelper(20, 20, 0xdddddd, 0xeeeeee);
    scene.add(grid);

    setupCanvasInteraction(container);
    updateQuickStats(); 
    updateBuilding();
    fitCamera();
    
    container.addEventListener("wheel", (e) => {
        e.preventDefault();
        targetRadius = Math.max(5, Math.min(25, targetRadius + (e.deltaY > 0 ? 0.5 : -0.5)));
    }, { passive: false });

    animate();
}

init();