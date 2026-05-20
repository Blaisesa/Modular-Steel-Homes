let scene, camera, renderer, building;
let currentAngle = -Math.PI / 4,
    targetAngle = -Math.PI / 4;
let currentVerticalAngle = 0.25,
    targetVerticalAngle = 0.25;
let radius = 12,
    targetRadius = 12,
    isFreeRoam = false,
    isDragging = false;
let previousX = 0,
    previousY = 0;

/* Global Dimensions & States */
const lerpSpeed = 0.08;
let W = 6,
    H = 2.8,
    D = 4;
let currentShapeType = "rectangle";
let currentRoofType = "pent";
let showRoof = true;
const roofOverhang = 0.2;
const slopeHeight = 0.45;
const peakHeight = 0.8;
const wallThickness = 0.15;
const roofThickness = 0.15;
const roofGap = 0.02;

/* Wall References */
let walls = {
    front: null,
    back: null,
    left: null,
    right: null,
    innerBack: null,
    innerLeft: null
};

let wallVisibility = {
    front: true,
    back: true,
    left: true,
    right: true,
    innerBack: true,
    innerLeft: true
};

const wallNormals = {
    front: new THREE.Vector3(0, 0, 1),
    back: new THREE.Vector3(0, 0, -1),
    left: new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3(1, 0, 0),
    innerBack: new THREE.Vector3(0, 0, 1),
    innerLeft: new THREE.Vector3(1, 0, 0)
};

/* Aperture System */
let apertures = [];
let apertureComponents = {};

/* Raycasting & Selection */
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedApertureData = null;
let isDraggingAperture = false;
let resizeMode = null; 
let dragPlane = new THREE.Plane();
let dragStartPos = new THREE.Vector3();
let dragStartAperture = null;

function init() {
    const container = document.getElementById("builder-viewport");
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);

    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000,
    );
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 7);
    scene.add(light);

    const grid = new THREE.GridHelper(20, 20, 0xcccccc, 0xeeeeee);
    scene.add(grid);

    setupApertureUIListeners();
    setupCanvasInteraction(container);
    updateBuilding();
    fitCamera();
    setupInputs(container);
    animate();
}

/* Canvas Interaction Setup */
function setupCanvasInteraction(container) {
    container.addEventListener('click', onCanvasClick);
    container.addEventListener('mousemove', onCanvasMouseMove);
    container.addEventListener('mousedown', onCanvasMouseDown);
    container.addEventListener('mouseup', onCanvasMouseUp);
}

function onCanvasClick(event) {
    if (isDraggingAperture || resizeMode) return;

    updateMousePosition(event);
    raycaster.setFromCamera(mouse, camera);

    const allApertureMeshes = [];
    Object.values(apertureComponents).forEach(compArray => {
        compArray.forEach(group => {
            group.children.forEach(child => {
                if (child.isMesh) allApertureMeshes.push(child);
            });
        });
    });

    const intersects = raycaster.intersectObjects(allApertureMeshes, true);

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const apertureGroup = clickedMesh.parent;
        
        for (let wallId in apertureComponents) {
            const index = apertureComponents[wallId].indexOf(apertureGroup);
            if (index !== -1) {
                const apertureData = apertures.find(a => 
                    a.wallId === wallId && 
                    apertureComponents[wallId][index] === apertureGroup
                );
                
                if (apertureData) {
                    if (isFreeRoam) {
                        window.toggleFreeRoam();
                        const viewMap = {
                            front: 'front', innerBack: 'front',
                            back: 'back',
                            left: 'left',
                            right: 'right', innerLeft: 'right'
                        };
                        window.rotateTo(viewMap[apertureData.wallId]);
                    }
                    selectAperture(apertureData);
                    return;
                }
            }
        }
    } else {
        deselectAperture();
    }
}

function updateMousePosition(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

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

function showTransformHUD(data) {
    let hud = document.getElementById('transform-hud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'transform-hud';
        hud.className = 'transform-hud';
        hud.style.position = 'absolute';
        hud.style.transform = 'translate(-50%, -100%)';
        hud.style.background = 'white';
        hud.style.padding = '10px';
        hud.style.borderRadius = '8px';
        hud.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        hud.style.zIndex = '1000';
        hud.style.display = 'flex';
        hud.style.flexDirection = 'column';
        hud.style.gap = '5px';
        document.body.appendChild(hud);
    }
    
    hud.innerHTML = `
        <div style="font-weight:bold; text-align:center; margin-bottom:5px;">
            ${data.type === 'window' ? '🪟' : '🚪'} Selected
        </div>
        <button onclick="deleteSelectedAperture()">🗑️ Delete</button>
        <button onclick="startMove()">↔️ Move</button>
        <button onclick="startResize('width')">↔️ Width</button>
        <button onclick="startResize('height')">↕️ Height</button>
        <button onclick="deselectAperture()">✖️ Close</button>
    `;
    hud.style.display = 'flex';
}

function hideTransformHUD() {
    const hud = document.getElementById('transform-hud');
    if (hud) hud.style.display = 'none';
    resizeMode = null;
    isDraggingAperture = false;
    document.body.style.cursor = 'default';
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
    pos.y += selectedApertureData.h / 2 + 0.4; 
    
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

window.deleteSelectedAperture = function() {
    if (!selectedApertureData) return;
    window.removeAperture(selectedApertureData.id);
    deselectAperture();
};

window.startMove = function() {
    if (!selectedApertureData) return;
    isDraggingAperture = true;
    resizeMode = null;
    document.body.style.cursor = 'move';
};

window.startResize = function(mode) {
    if (!selectedApertureData) return;
    resizeMode = mode;
    isDraggingAperture = false;
    document.body.style.cursor = mode === 'width' ? 'ew-resize' : 'ns-resize';
};

function onCanvasMouseDown(event) {
    if (selectedApertureData && (isDraggingAperture || resizeMode)) {
        updateMousePosition(event);
        raycaster.setFromCamera(mouse, camera);

        const normal = wallNormals[selectedApertureData.wallId];
        const wallMesh = walls[selectedApertureData.wallId];
        const wallWorldPos = new THREE.Vector3();
        wallMesh.getWorldPosition(wallWorldPos);
        
        dragPlane.setFromNormalAndCoplanarPoint(normal, wallWorldPos);
        raycaster.ray.intersectPlane(dragPlane, dragStartPos);
        
        dragStartAperture = JSON.parse(JSON.stringify(selectedApertureData));
    }
}

function onCanvasMouseMove(event) {
    if (selectedApertureData && (isDraggingAperture || resizeMode) && dragStartAperture) {
        updateMousePosition(event);
        raycaster.setFromCamera(mouse, camera);
        
        let currentPt = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, currentPt)) {
            let delta = currentPt.clone().sub(dragStartPos);
            
            let localDeltaX = 0;
            let localDeltaY = delta.y; 
            
            const wid = selectedApertureData.wallId;
            // Reversed directions to map cleanly to freeroam
            if (wid === 'front' || wid === 'innerBack') localDeltaX = delta.x;
            if (wid === 'back') localDeltaX = delta.x; 
            if (wid === 'left') localDeltaX = delta.z; 
            if (wid === 'right' || wid === 'innerLeft') localDeltaX = delta.z;

            let candidate = JSON.parse(JSON.stringify(dragStartAperture));

            if (isDraggingAperture) {
                candidate.x += localDeltaX;
                candidate.y += localDeltaY;
            } else if (resizeMode === 'width') {
                candidate.w = Math.max(0.3, dragStartAperture.w + localDeltaX);
            } else if (resizeMode === 'height') {
                candidate.h = Math.max(0.3, dragStartAperture.h + localDeltaY);
                if (candidate.type === 'door') {
                    candidate.y = candidate.h / 2;
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
    }
}

function onCanvasMouseUp() {
    if (isDraggingAperture || resizeMode) {
        isDraggingAperture = false;
        resizeMode = null;
        dragStartAperture = null;
        document.body.style.cursor = 'default';
        updateApertureList();
    }
}

function isValidAperture(candidate) {
    const wallDim = getWallDimensions(candidate.wallId);
    const halfW = candidate.w / 2;
    const halfH = candidate.h / 2;

    if (
        (candidate.x - halfW) < -wallDim.width / 2 || 
        (candidate.x + halfW) > wallDim.width / 2 || 
        (candidate.y - halfH) < 0 || 
        (candidate.y + halfH) > wallDim.height
    ) {
        return false;
    }

    const pad = 0.02;
    for (let current of apertures) {
        if (current.id !== candidate.id && current.wallId === candidate.wallId) {
            const horizontalOverlap = Math.abs(candidate.x - current.x) < ((candidate.w / 2) + (current.w / 2) + pad);
            const verticalOverlap = Math.abs(candidate.y - current.y) < ((candidate.h / 2) + (current.h / 2) + pad);
            
            if (horizontalOverlap && verticalOverlap) return false;
        }
    }
    return true;
}

function getWallDimensions(wallId) {
    let wallWidth = W;
    let wallHeight = H;
    const t = wallThickness;

    if (currentShapeType === "rectangle") {
        if (wallId === "front" || wallId === "back") {
            wallWidth = W - 2 * t;
            if (wallId === "front" && currentRoofType === "pent") wallHeight = H + slopeHeight;
        } else if (wallId === "left" || wallId === "right") {
            wallWidth = D;
            // Prevent holes outside geometry (Triangulation Error / Deform Bug Fix)
            // Hard restrict aperture placement bounds to rectangular safe height
            wallHeight = H;
        }
    } else {
        if (wallId === "front") {
            wallWidth = W - 2 * t;
            wallHeight = currentRoofType === "pent" ? H + slopeHeight : H;
        } else if (wallId === "back") {
            wallWidth = W / 2 - 2 * t;
            wallHeight = H;
        } else if (wallId === "left") {
            wallWidth = D;
            wallHeight = H;
        } else if (wallId === "right") {
            wallWidth = D / 2;
            wallHeight = H;
        } else if (wallId === "innerBack") {
            wallWidth = W / 2 - t;
            wallHeight = H;
        } else if (wallId === "innerLeft") {
            wallWidth = D / 2 + t;
            wallHeight = H;
        }
    }
    return { width: wallWidth, height: wallHeight };
}

function setupApertureUIListeners() {
    const typeSelect = document.getElementById('aperture-type');
    if (!typeSelect) return;

    const updateFormLayout = () => {
        const type = typeSelect.value;
        const yRow = document.getElementById('aperture-y-row');
        if (yRow) yRow.style.display = (type === 'door') ? 'none' : '';
    };

    typeSelect.addEventListener('change', updateFormLayout);
    updateFormLayout();
}

window.addAperture = function() {
    const typeSelect = document.getElementById('aperture-type');
    if (!typeSelect) return;
    
    const type = typeSelect.value;
    const wallId = document.getElementById('aperture-wall').value;
    const width = parseFloat(document.getElementById('aperture-width').value);
    const height = parseFloat(document.getElementById('aperture-height').value);
    const x = parseFloat(document.getElementById('aperture-x').value);
    
    let y = (type === 'door') ? height / 2 : parseFloat(document.getElementById('aperture-y').value);

    const candidate = {
        id: Date.now(),
        type: type,
        wallId: wallId,
        w: width,
        h: height,
        x: x,
        y: y
    };

    if (!isValidAperture(candidate)) {
        alert("Placement Error: Aperture is out of bounds or overlapping.");
        return;
    }

    apertures.push(candidate);
    updateApertureList();
    updateBuilding();
};

window.removeAperture = function(id) {
    apertures = apertures.filter(a => a.id !== id);
    updateApertureList();
    updateBuilding();
};

function updateApertureList() {
    const list = document.getElementById('aperture-list');
    if (!list) return;
    
    list.innerHTML = apertures.map(a => `
        <div class="aperture-item">
            <span>${a.type === 'window' ? '🪟' : '🚪'} on ${a.wallId}</span>
            <button onclick="removeAperture(${a.id})">×</button>
        </div>
    `).join('');
}

function createWallShapeWithHoles(wallId, baseShape) {
    const wallApertures = apertures.filter(a => a.wallId === wallId);
    
    wallApertures.forEach(aperture => {
        const hole = new THREE.Path();
        const hw = aperture.w / 2;
        const hh = aperture.h / 2;
        
        hole.moveTo(aperture.x - hw, aperture.y - hh);
        hole.lineTo(aperture.x + hw, aperture.y - hh);
        hole.lineTo(aperture.x + hw, aperture.y + hh);
        hole.lineTo(aperture.x - hw, aperture.y + hh);
        hole.lineTo(aperture.x - hw, aperture.y - hh);
        
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
        const frameColor = isSelected ? 0xffff00 : 0x2c2c2c;

        const frameMaterial = new THREE.MeshLambertMaterial({ color: frameColor });
        const glassMaterial = new THREE.MeshLambertMaterial({ 
            color: isSelected ? 0xffffbb : 0x88ccff, 
            transparent: true, 
            opacity: 0.4 
        });
        const doorMaterial = new THREE.MeshLambertMaterial({ color: isSelected ? 0xd4a373 : 0x8b4513 });
        
        const frameDepth = wallThickness + 0.01; 
        const frameThickness = 0.05;
        
        if (aperture.type === 'window') {
            const topFrame = new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth);
            const bottomFrame = new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth);
            const leftFrame = new THREE.BoxGeometry(frameThickness, aperture.h - (frameThickness * 2), frameDepth);
            const rightFrame = new THREE.BoxGeometry(frameThickness, aperture.h - (frameThickness * 2), frameDepth);
            
            const top = new THREE.Mesh(topFrame, frameMaterial);
            top.position.set(0, (aperture.h / 2) - (frameThickness / 2), 0);
            group.add(top);
            
            const bottom = new THREE.Mesh(bottomFrame, frameMaterial);
            bottom.position.set(0, (-aperture.h / 2) + (frameThickness / 2), 0);
            group.add(bottom);
            
            const left = new THREE.Mesh(leftFrame, frameMaterial);
            left.position.set((-aperture.w / 2) + (frameThickness / 2), 0, 0);
            group.add(left);
            
            const right = new THREE.Mesh(rightFrame, frameMaterial);
            right.position.set((aperture.w / 2) - (frameThickness / 2), 0, 0);
            group.add(right);
            
            const glassGeo = new THREE.BoxGeometry(
                aperture.w - frameThickness * 2, 
                aperture.h - frameThickness * 2, 
                frameDepth * 0.3
            );
            const glass = new THREE.Mesh(glassGeo, glassMaterial);
            glass.position.set(0, 0, 0);
            group.add(glass);
            
        } else if (aperture.type === 'door') {
            const doorGeo = new THREE.BoxGeometry(aperture.w - (frameThickness * 2), aperture.h - frameThickness, frameDepth * 0.7);
            const door = new THREE.Mesh(doorGeo, doorMaterial);
            door.position.set(0, -frameThickness / 2, 0);
            group.add(door);
            
            const topFrame = new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth);
            const top = new THREE.Mesh(topFrame, frameMaterial);
            top.position.set(0, (aperture.h / 2) - (frameThickness / 2), 0);
            group.add(top);
            
            const leftFrame = new THREE.BoxGeometry(frameThickness, aperture.h - frameThickness, frameDepth);
            const left = new THREE.Mesh(leftFrame, frameMaterial);
            left.position.set((-aperture.w / 2) + (frameThickness / 2), -frameThickness / 2, 0);
            group.add(left);
            
            const rightFrame = new THREE.BoxGeometry(frameThickness, aperture.h - frameThickness, frameDepth);
            const right = new THREE.Mesh(rightFrame, frameMaterial);
            right.position.set((aperture.w / 2) - (frameThickness / 2), -frameThickness / 2, 0);
            group.add(right);
        }
        
        group.position.copy(wallMesh.position);
        group.rotation.copy(wallMesh.rotation);
        
        group.translateX(aperture.x);
        group.translateY(aperture.y);
        group.translateZ(wallThickness / 2);
        
        if (!apertureComponents[wallId]) {
            apertureComponents[wallId] = [];
        }
        apertureComponents[wallId].push(group);
        
        buildingGroup.add(group);
    });
}

function createSideWallGeometry(widthAlongZ, baseH, roofType, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-widthAlongZ / 2, 0);
    shape.lineTo(widthAlongZ / 2, 0);

    if (roofType === "apex") {
        shape.lineTo(widthAlongZ / 2, baseH);
        shape.lineTo(0, baseH + peakHeight);
        shape.lineTo(-widthAlongZ / 2, baseH);
    } else if (roofType === "pent") {
        shape.lineTo(widthAlongZ / 2, baseH + slopeHeight);
        shape.lineTo(-widthAlongZ / 2, baseH);
    } else {
        shape.lineTo(widthAlongZ / 2, baseH);
        shape.lineTo(-widthAlongZ / 2, baseH);
    }
    shape.closePath();

    if (wallId) createWallShapeWithHoles(wallId, shape);

    return new THREE.ExtrudeGeometry(shape, {
        steps: 1, depth: wallThickness, bevelEnabled: false,
    });
}

function createRectWallGeometry(widthAlongX, heightY, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-widthAlongX / 2, 0);
    shape.lineTo(widthAlongX / 2, 0);
    shape.lineTo(widthAlongX / 2, heightY);
    shape.lineTo(-widthAlongX / 2, heightY);
    shape.closePath();

    if (wallId) createWallShapeWithHoles(wallId, shape);

    return new THREE.ExtrudeGeometry(shape, {
        steps: 1, depth: wallThickness, bevelEnabled: false,
    });
}

function createPanelGeo(width, hLeft, hRight, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, hRight);
    shape.lineTo(-width / 2, hLeft);
    shape.closePath();

    if (wallId) createWallShapeWithHoles(wallId, shape);

    return new THREE.ExtrudeGeometry(shape, {
        steps: 1, depth: wallThickness, bevelEnabled: false,
    });
}

function createRoof(roofType, shape, buildingGroup, roofMaterial, isLShape = false, centerX = 0, centerZ = 0) {
    if (roofType === "pent") {
        const roofGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: roofThickness, bevelEnabled: false });
        roofGeo.rotateX(-Math.PI / 2);
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        const angle = -Math.atan2(slopeHeight, D);
        
        if (isLShape) {
            roof.position.set(-centerX, H - 0.01, -centerZ);
            roof.geometry.translate(0, 0, -D / 2);
            roof.rotation.x = angle;
            roof.geometry.translate(0, 0, D / 2);
            roof.position.y += slopeHeight / 2 + roofGap;
        } else {
            roof.rotation.x = angle;
            roof.position.y = H + slopeHeight / 2 + roofGap;
        }
        buildingGroup.add(roof);
    } else if (roofType === "apex" && !isLShape) {
        const angle = Math.atan2(peakHeight, D / 2);
        const roofHalfWidth = D / 2 / Math.cos(angle) + roofOverhang;
        const roofPlateGeo = new THREE.BoxGeometry(W + roofOverhang * 2, roofThickness, roofHalfWidth);
        const zOffset = D / 4 + roofOverhang / 2;

        const roofL = new THREE.Mesh(roofPlateGeo, roofMaterial);
        roofL.position.set(0, H + peakHeight / 2 + roofThickness / 2 + roofGap, zOffset);
        roofL.rotation.x = angle;
        buildingGroup.add(roofL);

        const roofR = new THREE.Mesh(roofPlateGeo, roofMaterial);
        roofR.position.set(0, H + peakHeight / 2 + roofThickness / 2 + roofGap, -zOffset);
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

function updateBuilding() {
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
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x707173, side: THREE.DoubleSide });
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

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

        walls.left = addMeshWithEdges(leftGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.left.rotation.y = -Math.PI / 2;
        walls.left.position.set(-W / 2 + t, 0, 0);
        buildApertureComponents("left", walls.left, buildingGroup);

        walls.right = addMeshWithEdges(rightGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.right.rotation.y = -Math.PI / 2;
        walls.right.position.set(W / 2, 0, 0);
        buildApertureComponents("right", walls.right, buildingGroup);

        walls.front = addMeshWithEdges(frontGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.front.position.set(0, 0, D / 2 - t);
        buildApertureComponents("front", walls.front, buildingGroup);

        walls.back = addMeshWithEdges(backGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.back.position.set(0, 0, -D / 2);
        buildApertureComponents("back", walls.back, buildingGroup);

        const floorGeo = new THREE.PlaneGeometry(W, D);
        floorGeo.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(floorGeo, floorMaterial);
        floor.position.y = 0.01;
        buildingGroup.add(floor);

        if (showRoof) {
            const roofShape = new THREE.Shape();
            const o = roofOverhang;
            roofShape.moveTo(-W / 2 - o, -D / 2 - o);
            roofShape.lineTo(W / 2 + o, -D / 2 - o);
            roofShape.lineTo(W / 2 + o, D / 2 + o);
            roofShape.lineTo(-W / 2 - o, D / 2 + o);
            roofShape.closePath();
            createRoof(currentRoofType, roofShape, buildingGroup, roofMaterial, false);
        }
    } else {
        const effectiveRoofType = currentRoofType === "apex" ? "pent" : currentRoofType;

        const getZHeight = (z) => {
            if (effectiveRoofType !== "pent") return H;
            return H + slopeHeight * ((z + D / 2) / D);
        };

        const leftGeo = createPanelGeo(D, getZHeight(-D / 2), getZHeight(D / 2), "left");
        const frontGeo = createPanelGeo(W - 2 * t, getZHeight(D / 2 - t), getZHeight(D / 2 - t), "front");
        const rightGeo = createPanelGeo(D / 2, getZHeight(0), getZHeight(D / 2), "right");
        const innerBackGeo = createPanelGeo(W / 2 - t, getZHeight(0), getZHeight(0), "innerBack");
        const innerLeftGeo = createPanelGeo(D / 2 + t, getZHeight(-D / 2), getZHeight(0), "innerLeft");
        const backGeo = createPanelGeo(W / 2 - 2 * t, getZHeight(-D / 2), getZHeight(-D / 2), "back");

        walls.left = addMeshWithEdges(leftGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.left.rotation.y = -Math.PI / 2;
        walls.left.position.set(-W / 2 + t, 0, 0);
        buildApertureComponents("left", walls.left, buildingGroup);

        walls.front = addMeshWithEdges(frontGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.front.position.set(0, 0, D / 2 - t);
        buildApertureComponents("front", walls.front, buildingGroup);

        walls.right = addMeshWithEdges(rightGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.right.rotation.y = -Math.PI / 2;
        walls.right.position.set(W / 2, 0, D / 4);
        buildApertureComponents("right", walls.right, buildingGroup);

        walls.innerBack = addMeshWithEdges(innerBackGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.innerBack.position.set(W / 4 - t / 2, 0, 0);
        buildApertureComponents("innerBack", walls.innerBack, buildingGroup);

        walls.innerLeft = addMeshWithEdges(innerLeftGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.innerLeft.rotation.y = -Math.PI / 2;
        walls.innerLeft.position.set(0, 0, -D / 4 + t / 2);
        buildApertureComponents("innerLeft", walls.innerLeft, buildingGroup);

        walls.back = addMeshWithEdges(backGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.back.position.set(-W / 4, 0, -D / 2);
        buildApertureComponents("back", walls.back, buildingGroup);

        const floorShape = new THREE.Shape();
        floorShape.moveTo(-W / 2, D / 2);
        floorShape.lineTo(0, D / 2);
        floorShape.lineTo(0, 0);
        floorShape.lineTo(W / 2, 0);
        floorShape.lineTo(W / 2, -D / 2);
        floorShape.lineTo(-W / 2, -D / 2);
        floorShape.closePath();

        const floorGeo = new THREE.ShapeGeometry(floorShape);
        floorGeo.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(floorGeo, floorMaterial);
        floor.position.y = 0.01;
        buildingGroup.add(floor);

        if (showRoof) {
            const roofShape = new THREE.Shape();
            const o = roofOverhang;
            roofShape.moveTo(-W / 2 - o, D / 2 + o);
            roofShape.lineTo(o, D / 2 + o);
            roofShape.lineTo(o, o);
            roofShape.lineTo(W / 2 + o, o);
            roofShape.lineTo(W / 2 + o, -D / 2 - o);
            roofShape.lineTo(-W / 2 - o, -D / 2 - o);
            roofShape.closePath();
            createRoof(effectiveRoofType, roofShape, buildingGroup, roofMaterial, true, 0, 0);
        }
    }

    applyWallVisibility();

    building = buildingGroup;
    scene.add(building);
}

function addMeshWithEdges(geo, mat, edgeMat, group) {
    const mesh = new THREE.Mesh(geo, mat);
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, edgeMat);
    
    mesh.userData.edgeLine = line;
    mesh.add(line);
    group.add(mesh);
    
    return mesh;
}

function applyWallVisibility() {
    Object.keys(walls).forEach(wallName => {
        if (walls[wallName]) {
            const visible = wallVisibility[wallName];
            walls[wallName].visible = visible;
            if (walls[wallName].userData.edgeLine) {
                walls[wallName].userData.edgeLine.visible = visible;
            }
            if (apertureComponents[wallName]) {
                apertureComponents[wallName].forEach(comp => comp.visible = visible);
            }
        }
    });
}

window.toggleWall = function(wallName, e) {
    const evt = e || window.event;
    wallVisibility[wallName] = !wallVisibility[wallName];
    applyWallVisibility();
    
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.toggle('active');
    }
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
    if (prop === "W") W = parseFloat(val);
    if (prop === "D") D = parseFloat(val);
    const label = document.getElementById(`val-${prop.toLowerCase()}`);
    if (label) label.innerText = val;
    updateBuilding();
    fitCamera();
};

window.setRoof = function (type, e) {
    const evt = e || window.event;
    currentRoofType = type;
    document.querySelectorAll("#roof-options .style-option").forEach((o) => o.classList.remove("active"));
    if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");
    updateBuilding();
};

window.setShape = function (type, e) {
    const evt = e || window.event;
    currentShapeType = type;
    document.querySelectorAll(".sidebar-nav .nav-section:first-child .style-option").forEach((o) => o.classList.remove("active"));
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
                document.querySelectorAll("#roof-options .style-option").forEach((o) => o.classList.remove("active"));
                const pentOption = document.querySelector('#roof-options .style-option[onclick*="pent"]');
                if (pentOption) pentOption.classList.add("active");
            }
        } else {
            apexOption.style.display = "";
        }
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
    document.querySelectorAll(".nav-section").forEach((s) => s.classList.remove("active"));
    if (!wasActive) section.classList.add("active");
};

window.toggleFreeRoam = function () {
    isFreeRoam = !isFreeRoam;
    const btn = document.getElementById("roam-toggle");
    if(btn) {
        btn.innerHTML = isFreeRoam ? "🔓" : "🔒";
        btn.style.background = isFreeRoam ? "#007bff" : "white";
        btn.style.color = isFreeRoam ? "white" : "black";
    }
};

window.rotateTo = function (view, e) {
    const evt = e || window.event;
    document.querySelectorAll(".view-controls button").forEach((btn) => btn.classList.remove("active"));
    
    if (evt && evt.currentTarget && evt.currentTarget.id !== "roam-toggle" && evt.currentTarget.id !== "roof-toggle") {
        evt.currentTarget.classList.add("active");
    }
    
    const views = {
        front: [0, 0],
        right: [Math.PI / 2, 0],
        back: [Math.PI, 0],
        left: [-Math.PI / 2, 0],
        top: [0, 1.5],
        iso: [-Math.PI / 4, 0.25],
    };
    if (views[view]) [targetAngle, targetVerticalAngle] = views[view];
};

function setupInputs(container) {
    const start = (x, y) => {
        if (isFreeRoam) {
            isDragging = true;
            previousX = x;
            previousY = y;
        }
    };
    const move = (x, y) => {
        if (!isDragging || !isFreeRoam) return;
        targetAngle += (x - previousX) * 0.005;
        targetVerticalAngle += (y - previousY) * 0.005;
        targetVerticalAngle = Math.max(-1.4, Math.min(1.4, targetVerticalAngle));
        previousX = x;
        previousY = y;
    };
    container.addEventListener("mousedown", (e) => start(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", () => (isDragging = false));
    container.addEventListener("wheel", (e) => {
            e.preventDefault();
            targetRadius = Math.max(5, Math.min(25, targetRadius + (e.deltaY > 0 ? 0.5 : -0.5)));
        }, { passive: false });
}

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

init();