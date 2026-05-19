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
const wallThickness = 0.15; // 150mm
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

/* Aperture System */
let apertures = [];
let apertureComponents = {};

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

    // Initialize UI hooks
    setupApertureUIListeners();
    updateBuilding();
    fitCamera();
    setupInputs(container);
    animate();
}

/* Helper to get runtime wall width and height dimensions */
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
            if (currentRoofType === "pent") wallHeight = H + slopeHeight;
            if (currentRoofType === "apex") wallHeight = H + peakHeight;
        }
    } else { // l-shape
        if (wallId === "front") {
            wallWidth = W - 2 * t;
            wallHeight = H + slopeHeight;
        } else if (wallId === "back") {
            wallWidth = W / 2 - 2 * t;
        } else if (wallId === "left") {
            wallWidth = D;
            wallHeight = H + slopeHeight;
        } else if (wallId === "right") {
            wallWidth = D / 2;
            wallHeight = H + slopeHeight;
        } else if (wallId === "innerBack") {
            wallWidth = W / 2 - t;
        } else if (wallId === "innerLeft") {
            wallWidth = D / 2 + t;
        }
    }
    return { width: wallWidth, height: wallHeight };
}

/* Watch UI Type selection to alternate field forms dynamically */
function setupApertureUIListeners() {
    const typeSelect = document.getElementById('aperture-type');
    if (!typeSelect) return;

    const updateFormLayout = () => {
        const type = typeSelect.value;
        const yRow = document.getElementById('aperture-y-row'); // DOM element containing the Y input
        if (yRow) {
            yRow.style.display = (type === 'door') ? 'none' : '';
        }
    };

    typeSelect.addEventListener('change', updateFormLayout);
    updateFormLayout();
}

/* Aperture Management */
window.addAperture = function() {
    const type = document.getElementById('aperture-type').value;
    const wallId = document.getElementById('aperture-wall').value;
    const width = parseFloat(document.getElementById('aperture-width').value);
    const height = parseFloat(document.getElementById('aperture-height').value);
    const x = parseFloat(document.getElementById('aperture-x').value);
    
    // Doors automatically snap to baseline bottom floor level
    let y = 0;
    if (type === 'door') {
        y = height / 2;
    } else {
        y = parseFloat(document.getElementById('aperture-y').value);
    }

    const wallDim = getWallDimensions(wallId);

    // 1. Boundary Check: Ensure aperture fits entirely inside the wall boundary geometry
    const halfW = width / 2;
    const halfH = height / 2;

    if (
        (x - halfW) < -wallDim.width / 2 || 
        (x + halfW) > wallDim.width / 2 || 
        (y - halfH) < 0 || 
        (y + halfH) > wallDim.height
    ) {
        alert("Placement Error: Aperture goes outside of the wall boundaries!");
        return;
    }

    // 2. Overlap Check: Block intersecting aperture cutouts to avoid geometry glitch deletions
    const pad = 0.02; // Safety margin buffer padding
    for (let current of apertures) {
        if (current.wallId === wallId) {
            const horizontalOverlap = Math.abs(x - current.x) < ((width / 2) + (current.w / 2) + pad);
            const verticalOverlap = Math.abs(y - current.y) < ((height / 2) + (current.h / 2) + pad);
            
            if (horizontalOverlap && verticalOverlap) {
                alert("Placement Error: Apertures cannot overlap in the same area!");
                return;
            }
        }
    }

    const aperture = {
        id: Date.now(),
        type: type,
        wallId: wallId,
        w: width,
        h: height,
        x: x,
        y: y
    };

    apertures.push(aperture);
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
            <span>${a.type === 'window' ? '🪟' : '🚪'} ${a.type} on ${a.wallId} (${a.w}×${a.h}m) at X:${a.x.toFixed(2)}, Y:${a.y.toFixed(2)}</span>
            <button onclick="removeAperture(${a.id})">×</button>
        </div>
    `).join('');
}

/* Create aperture holes in wall shape */
function createWallShapeWithHoles(wallId, baseShape) {
    const wallApertures = apertures.filter(a => a.wallId === wallId);
    
    wallApertures.forEach(aperture => {
        const hole = new THREE.Path();
        const hw = aperture.w / 2;
        const hh = aperture.h / 2;
        
        // Create rectangular hole (clockwise for THREE.js path subtraction)
        hole.moveTo(aperture.x - hw, aperture.y - hh);
        hole.lineTo(aperture.x + hw, aperture.y - hh);
        hole.lineTo(aperture.x + hw, aperture.y + hh);
        hole.lineTo(aperture.x - hw, aperture.y + hh);
        hole.lineTo(aperture.x - hw, aperture.y - hh);
        
        baseShape.holes.push(hole);
    });
    
    return baseShape;
}

/* Build 3D components for apertures (frames, glass, doors) */
function buildApertureComponents(wallId, wallMesh, buildingGroup) {
    const wallApertures = apertures.filter(a => a.wallId === wallId);
    
    wallApertures.forEach(aperture => {
        const group = new THREE.Group();
        
        const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
        const glassMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x88ccff, 
            transparent: true, 
            opacity: 0.3 
        });
        const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        
        const frameDepth = wallThickness;
        const frameThickness = 0.05;
        
        if (aperture.type === 'window') {
            // Window frame (4 pieces)
            const topFrame = new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth);
            const bottomFrame = new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth);
            const leftFrame = new THREE.BoxGeometry(frameThickness, aperture.h, frameDepth);
            const rightFrame = new THREE.BoxGeometry(frameThickness, aperture.h, frameDepth);
            
            const top = new THREE.Mesh(topFrame, frameMaterial);
            top.position.set(0, aperture.h / 2, 0);
            group.add(top);
            
            const bottom = new THREE.Mesh(bottomFrame, frameMaterial);
            bottom.position.set(0, -aperture.h / 2, 0);
            group.add(bottom);
            
            const left = new THREE.Mesh(leftFrame, frameMaterial);
            left.position.set(-aperture.w / 2, 0, 0);
            group.add(left);
            
            const right = new THREE.Mesh(rightFrame, frameMaterial);
            right.position.set(aperture.w / 2, 0, 0);
            group.add(right);
            
            // Glass pane
            const glassGeo = new THREE.BoxGeometry(
                aperture.w - frameThickness * 2, 
                aperture.h - frameThickness * 2, 
                frameDepth * 0.8
            );
            const glass = new THREE.Mesh(glassGeo, glassMaterial);
            group.add(glass);
            
        } else if (aperture.type === 'door') {
            // Door panel
            const doorGeo = new THREE.BoxGeometry(aperture.w, aperture.h, frameDepth * 0.9);
            const door = new THREE.Mesh(doorGeo, doorMaterial);
            group.add(door);
            
            // Door frame
            const topFrame = new THREE.BoxGeometry(aperture.w + frameThickness, frameThickness, frameDepth);
            const top = new THREE.Mesh(topFrame, frameMaterial);
            top.position.set(0, aperture.h / 2 + frameThickness / 2, 0);
            group.add(top);
            
            const leftFrame = new THREE.BoxGeometry(frameThickness, aperture.h + frameThickness, frameDepth);
            const left = new THREE.Mesh(leftFrame, frameMaterial);
            left.position.set(-aperture.w / 2 - frameThickness / 2, 0, 0);
            group.add(left);
            
            const rightFrame = new THREE.BoxGeometry(frameThickness, aperture.h + frameThickness, frameDepth);
            const right = new THREE.Mesh(rightFrame, frameMaterial);
            right.position.set(aperture.w / 2 + frameThickness / 2, 0, 0);
            group.add(right);
        }
        
        // Match base transformations parameters of parent Mesh
        group.position.copy(wallMesh.position);
        group.rotation.copy(wallMesh.rotation);
        
        // Translate locally using ThreeJS directional offset structure
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

/* Wall Geometry Helpers */
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

    if (wallId) {
        createWallShapeWithHoles(wallId, shape);
    }

    return new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: wallThickness,
        bevelEnabled: false,
    });
}

function createRectWallGeometry(widthAlongX, heightY, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-widthAlongX / 2, 0);
    shape.lineTo(widthAlongX / 2, 0);
    shape.lineTo(widthAlongX / 2, heightY);
    shape.lineTo(-widthAlongX / 2, heightY);
    shape.closePath();

    if (wallId) {
        createWallShapeWithHoles(wallId, shape);
    }

    return new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: wallThickness,
        bevelEnabled: false,
    });
}

function createPanelGeo(width, hLeft, hRight, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, hRight);
    shape.lineTo(-width / 2, hLeft);
    shape.closePath();

    if (wallId) {
        createWallShapeWithHoles(wallId, shape);
    }

    return new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: wallThickness,
        bevelEnabled: false,
    });
}

function createRoof(roofType, shape, buildingGroup, roofMaterial, isLShape = false, centerX = 0, centerZ = 0) {
    if (roofType === "pent") {
        const roofGeo = new THREE.ExtrudeGeometry(shape, {
            steps: 1,
            depth: roofThickness,
            bevelEnabled: false,
        });
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
        const roofPlateGeo = new THREE.BoxGeometry(
            W + roofOverhang * 2,
            roofThickness,
            roofHalfWidth,
        );
        const zOffset = D / 4 + roofOverhang / 2;

        const roofL = new THREE.Mesh(roofPlateGeo, roofMaterial);
        roofL.position.set(
            0,
            H + peakHeight / 2 + roofThickness / 2 + roofGap,
            zOffset,
        );
        roofL.rotation.x = angle;
        buildingGroup.add(roofL);

        const roofR = new THREE.Mesh(roofPlateGeo, roofMaterial);
        roofR.position.set(
            0,
            H + peakHeight / 2 + roofThickness / 2 + roofGap,
            -zOffset,
        );
        roofR.rotation.x = -angle;
        buildingGroup.add(roofR);
    } else {
        const roofGeo = new THREE.ExtrudeGeometry(shape, {
            steps: 1,
            depth: roofThickness,
            bevelEnabled: false,
        });
        roofGeo.rotateX(-Math.PI / 2);

        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        if (isLShape) {
            roof.position.set(-centerX, H + roofGap, -centerZ);
        } else {
            roof.position.y = H + roofGap;
        }
        buildingGroup.add(roof);
    }
}

function updateBuilding() {
    if (building) {
        scene.remove(building);
        building.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }

    walls = {
        front: null,
        back: null,
        left: null,
        right: null,
        innerBack: null,
        innerLeft: null
    };
    
    apertureComponents = {};

    const buildingGroup = new THREE.Group();
    const wallMaterial = new THREE.MeshLambertMaterial({
        color: 0x707173,
        side: THREE.DoubleSide,
    });
    const roofMaterial = new THREE.MeshLambertMaterial({
        color: 0x333333,
        side: THREE.DoubleSide,
    });
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x000000,
        linewidth: 2,
    });

    const t = wallThickness;

    if (currentShapeType === "rectangle") {
        const frontW = W - 2 * t;
        let leftWallGeo, rightWallGeo, frontWallGeo, backWallGeo;

        if (currentRoofType === "apex") {
            leftWallGeo = createSideWallGeometry(D, H, "apex", "left");
            rightWallGeo = createSideWallGeometry(D, H, "apex", "right");
            frontWallGeo = createRectWallGeometry(frontW, H, "front");
            backWallGeo = createRectWallGeometry(frontW, H, "back");
        } else if (currentRoofType === "pent") {
            leftWallGeo = createSideWallGeometry(D, H, "pent", "left");
            rightWallGeo = createSideWallGeometry(D, H, "pent", "right");
            frontWallGeo = createRectWallGeometry(frontW, H + slopeHeight, "front");
            backWallGeo = createRectWallGeometry(frontW, H, "back");
        } else {
            leftWallGeo = createSideWallGeometry(D, H, "flat", "left");
            rightWallGeo = createSideWallGeometry(D, H, "flat", "right");
            frontWallGeo = createRectWallGeometry(frontW, H, "front");
            backWallGeo = createRectWallGeometry(frontW, H, "back");
        }

        walls.left = addMeshWithEdges(leftWallGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.left.rotation.y = -Math.PI / 2;
        walls.left.position.set(-W / 2 + t, 0, 0);
        buildApertureComponents("left", walls.left, buildingGroup);

        walls.right = addMeshWithEdges(rightWallGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.right.rotation.y = -Math.PI / 2;
        walls.right.position.set(W / 2, 0, 0);
        buildApertureComponents("right", walls.right, buildingGroup);

        walls.front = addMeshWithEdges(frontWallGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.front.position.set(0, 0, D / 2 - t);
        buildApertureComponents("front", walls.front, buildingGroup);

        walls.back = addMeshWithEdges(backWallGeo, wallMaterial, edgeMaterial, buildingGroup);
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

        const leftWallGeo = createPanelGeo(D, getZHeight(-D / 2), getZHeight(D / 2), "left");
        const frontWallGeo = createPanelGeo(W - 2 * t, getZHeight(D / 2 - t), getZHeight(D / 2 - t), "front");
        const rightWallGeo = createPanelGeo(D / 2, getZHeight(0), getZHeight(D / 2), "right");
        const innerBackWallGeo = createPanelGeo(W / 2 - t, getZHeight(0), getZHeight(0), "innerBack");
        const innerLeftWallGeo = createPanelGeo(D / 2 + t, getZHeight(-D / 2), getZHeight(0), "innerLeft");
        const backWallGeo = createPanelGeo(W / 2 - 2 * t, getZHeight(-D / 2), getZHeight(-D / 2), "back");

        walls.left = addMeshWithEdges(leftWallGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.left.rotation.y = -Math.PI / 2;
        walls.left.position.set(-W / 2 + t, 0, 0);
        buildApertureComponents("left", walls.left, buildingGroup);

        walls.front = addMeshWithEdges(frontWallGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.front.position.set(0, 0, D / 2 - t);
        buildApertureComponents("front", walls.front, buildingGroup);

        walls.right = addMeshWithEdges(rightWallGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.right.rotation.y = -Math.PI / 2;
        walls.right.position.set(W / 2, 0, D / 4);
        buildApertureComponents("right", walls.right, buildingGroup);

        walls.innerBack = addMeshWithEdges(innerBackWallGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.innerBack.position.set(W / 4 - t / 2, 0, 0);
        buildApertureComponents("innerBack", walls.innerBack, buildingGroup);

        walls.innerLeft = addMeshWithEdges(innerLeftWallGeo, wallMaterial, edgeMaterial, buildingGroup);
        walls.innerLeft.rotation.y = -Math.PI / 2;
        walls.innerLeft.position.set(0, 0, -D / 4 + t / 2);
        buildApertureComponents("innerLeft", walls.innerLeft, buildingGroup);

        walls.back = addMeshWithEdges(backWallGeo, wallMaterial, edgeMaterial, buildingGroup);
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
                apertureComponents[wallName].forEach(comp => {
                    comp.visible = visible;
                });
            }
        }
    });
}

window.toggleWall = function(wallName) {
    wallVisibility[wallName] = !wallVisibility[wallName];
    
    if (walls[wallName]) {
        walls[wallName].visible = wallVisibility[wallName];
        if (walls[wallName].userData.edgeLine) {
            walls[wallName].userData.edgeLine.visible = wallVisibility[wallName];
        }
        
        if (apertureComponents[wallName]) {
            apertureComponents[wallName].forEach(comp => {
                comp.visible = wallVisibility[wallName];
            });
        }
    }
    
    const btn = event ? event.currentTarget : null;
    if (btn) {
        btn.classList.toggle('active');
    }
};

function fitCamera() {
    const diagonal = Math.sqrt(W * W + D * D);
    targetRadius = Math.max(diagonal * 1.5, H * 3);
    targetRadius = Math.max(5, Math.min(25, targetRadius));
}

/* UI Logic */
window.toggleRoof = function () {
    showRoof = !showRoof;
    const btn = document.getElementById("roof-toggle");
    if (btn) {
        btn.classList.toggle("active");
        btn.innerHTML = showRoof ? "🏠" : "🏚️";
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

window.setRoof = function (type) {
    currentRoofType = type;
    document
        .querySelectorAll("#roof-options .style-option")
        .forEach((o) => o.classList.remove("active"));
    if (event) event.currentTarget.classList.add("active");
    updateBuilding();
};

window.setShape = function (type) {
    currentShapeType = type;
    document
        .querySelectorAll(".sidebar-nav .nav-section:first-child .style-option")
        .forEach((o) => o.classList.remove("active"));
    if (event) event.currentTarget.classList.add("active");
    
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
    document
        .querySelectorAll(".nav-section")
        .forEach((s) => s.classList.remove("active"));
    if (!wasActive) section.classList.add("active");
};

window.toggleFreeRoam = function () {
    isFreeRoam = !isFreeRoam;
    const btn = document.getElementById("roam-toggle");
    btn.innerHTML = isFreeRoam ? "🔓" : "🔒";
    btn.style.background = isFreeRoam ? "#007bff" : "white";
    btn.style.color = isFreeRoam ? "white" : "black";
};

window.rotateTo = function (view) {
    document
        .querySelectorAll(".view-controls button")
        .forEach((btn) => btn.classList.remove("active"));
    const clickedBtn = event ? event.currentTarget : null;
    if (
        clickedBtn &&
        clickedBtn.id !== "roam-toggle" &&
        clickedBtn.id !== "roof-toggle"
    )
        clickedBtn.classList.add("active");
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
        targetVerticalAngle = Math.max(
            -1.4,
            Math.min(1.4, targetVerticalAngle),
        );
        previousX = x;
        previousY = y;
    };
    container.addEventListener("mousedown", (e) => start(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", () => (isDragging = false));
    container.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            targetRadius = Math.max(
                5,
                Math.min(25, targetRadius + (e.deltaY > 0 ? 0.5 : -0.5)),
            );
        },
        { passive: false },
    );
}

function animate() {
    requestAnimationFrame(animate);
    radius += (targetRadius - radius) * lerpSpeed;
    const slider = document.getElementById("zoom-slider");
    if (slider) slider.value = radius;
    currentAngle += (targetAngle - currentAngle) * lerpSpeed;
    currentVerticalAngle +=
        (targetVerticalAngle - currentVerticalAngle) * lerpSpeed;
    camera.position.x =
        radius * Math.cos(currentVerticalAngle) * Math.sin(currentAngle);
    camera.position.z =
        radius * Math.cos(currentVerticalAngle) * Math.cos(currentAngle);
    camera.position.y = radius * Math.sin(currentVerticalAngle) + H / 2;
    camera.lookAt(0, H / 2, 0);
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