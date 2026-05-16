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

    updateBuilding();
    fitCamera();
    setupInputs(container);
    animate();
}

function createSubdividedPath(points, isHole = false, subdivideEdges = null) {
    const shape = isHole ? new THREE.Path() : new THREE.Shape();
    shape.moveTo(points[0].x, points[0].y);
    
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        
        const shouldSubdivide = subdivideEdges === null || subdivideEdges.includes(i);
        const segments = shouldSubdivide ? Math.max(1, Math.floor(dist * 5)) : 1;

        for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            shape.lineTo(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t);
        }
    }
    
    if (!isHole) shape.closePath(); 
    
    return shape;
}

/* Wall Geometry Helpers to eliminate Seam Lines */
function createSideWallGeometry(widthAlongZ, baseH, roofType) {
    const shape = new THREE.Shape();
    shape.moveTo(-widthAlongZ / 2, 0);
    shape.lineTo(widthAlongZ / 2, 0);
    
    if (roofType === "apex") {
        shape.lineTo(widthAlongZ / 2, baseH);
        shape.lineTo(0, baseH + peakHeight);
        shape.lineTo(-widthAlongZ / 2, baseH);
    } else if (roofType === "pent") {
        shape.lineTo(widthAlongZ / 2, baseH + slopeHeight); // High front side
        shape.lineTo(-widthAlongZ / 2, baseH);              // Low back side
    } else {
        shape.lineTo(widthAlongZ / 2, baseH);
        shape.lineTo(-widthAlongZ / 2, baseH);
    }
    shape.closePath();
    
    return new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: wallThickness,
        bevelEnabled: false,
    });
}

function createRectWallGeometry(widthAlongX, heightY) {
    const shape = new THREE.Shape();
    shape.moveTo(-widthAlongX / 2, 0);
    shape.lineTo(widthAlongX / 2, 0);
    shape.lineTo(widthAlongX / 2, heightY);
    shape.lineTo(-widthAlongX / 2, heightY);
    shape.closePath();
    
    return new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: wallThickness,
        bevelEnabled: false,
    });
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
        // --- 4-PANEL SOLID WALL SYSTEM ---
        const frontW = W - 2 * t;
        let leftWallGeo, rightWallGeo, frontWallGeo, backWallGeo;

        if (currentRoofType === "apex") {
            leftWallGeo = createSideWallGeometry(D, H, "apex");
            rightWallGeo = createSideWallGeometry(D, H, "apex");
            frontWallGeo = createRectWallGeometry(frontW, H);
            backWallGeo = createRectWallGeometry(frontW, H);
        } else if (currentRoofType === "pent") {
            leftWallGeo = createSideWallGeometry(D, H, "pent");
            rightWallGeo = createSideWallGeometry(D, H, "pent");
            frontWallGeo = createRectWallGeometry(frontW, H + slopeHeight);
            backWallGeo = createRectWallGeometry(frontW, H);
        } else {
            leftWallGeo = createSideWallGeometry(D, H, "flat");
            rightWallGeo = createSideWallGeometry(D, H, "flat");
            frontWallGeo = createRectWallGeometry(frontW, H);
            backWallGeo = createRectWallGeometry(frontW, H);
        }

        // Align and position Left Wall panel
        leftWallGeo.rotateY(-Math.PI / 2);
        leftWallGeo.translate(-W / 2 + t, 0, 0);
        addMeshWithEdges(leftWallGeo, wallMaterial, edgeMaterial, buildingGroup);

        // Align and position Right Wall panel
        rightWallGeo.rotateY(-Math.PI / 2);
        rightWallGeo.translate(W / 2, 0, 0);
        addMeshWithEdges(rightWallGeo, wallMaterial, edgeMaterial, buildingGroup);

        // Align and position Front Wall panel
        frontWallGeo.translate(0, 0, D / 2 - t);
        addMeshWithEdges(frontWallGeo, wallMaterial, edgeMaterial, buildingGroup);

        // Align and position Back Wall panel
        backWallGeo.translate(0, 0, -D / 2);
        addMeshWithEdges(backWallGeo, wallMaterial, edgeMaterial, buildingGroup);

        // --- PERMANENT FLOOR ---
        const floorGeo = new THREE.PlaneGeometry(W, D);
        floorGeo.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(floorGeo, floorMaterial);
        floor.position.y = 0.01;
        buildingGroup.add(floor);

        // --- ROOF (Toggled) ---
        if (showRoof) {
            if (currentRoofType === "pent") {
                const roofGeo = new THREE.BoxGeometry(
                    W + roofOverhang * 2,
                    0.1,
                    D + roofOverhang * 2,
                );
                const roof = new THREE.Mesh(roofGeo, roofMaterial);
                const angle = -Math.atan2(slopeHeight, D);
                roof.rotation.x = angle;
                roof.position.y = H + slopeHeight / 2 + 0.05;
                buildingGroup.add(roof);
            } else {
                const roofThickness = 0.1;
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
                    H + peakHeight / 2 + roofThickness / 2,
                    zOffset,
                );
                roofL.rotation.x = angle;
                buildingGroup.add(roofL);

                const roofR = new THREE.Mesh(roofPlateGeo, roofMaterial);
                roofR.position.set(
                    0,
                    H + peakHeight / 2 + roofThickness / 2,
                    -zOffset,
                );
                roofR.rotation.x = -angle;
                buildingGroup.add(roofR);
            }
        }
    } else {
        /* L-SHAPE LOGIC (Hollow) */
        const legW = W * 0.5;
        const legD = D * 0.5;

        const outerPoints = [
            { x: 0, y: 0 },
            { x: legW, y: 0 },
            { x: legW, y: legD },
            { x: W, y: legD },
            { x: W, y: D },
            { x: 0, y: D },
        ];
        const shape = createSubdividedPath(outerPoints, false);

        const innerPoints = [
            { x: t, y: t },
            { x: t, y: D - t },
            { x: W - t, y: D - t },
            { x: W - t, y: legD + t },
            { x: legW - t, y: legD + t },
            { x: legW - t, y: t },
        ];
        const hole = createSubdividedPath(innerPoints, true);
        shape.holes.push(hole);

        const wallGeo = new THREE.ExtrudeGeometry(shape, {
            steps: 1,
            depth: H,
            bevelEnabled: false,
        });
        wallGeo.rotateX(-Math.PI / 2);

        wallGeo.computeBoundingBox();
        const centerX = (wallGeo.boundingBox.max.x + wallGeo.boundingBox.min.x) / 2;
        const centerZ = (wallGeo.boundingBox.max.z + wallGeo.boundingBox.min.z) / 2;
        wallGeo.translate(-centerX, 0, -centerZ);

        if (currentRoofType === "pent") {
            const pos = wallGeo.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                if (pos.getY(i) > H - 0.01) {
                    const zPos = pos.getZ(i) + centerZ;
                    const normalizedZ = zPos / D;
                    pos.setY(i, H + normalizedZ * slopeHeight);
                }
            }
            wallGeo.computeVertexNormals();
            pos.needsUpdate = true;
        }

        addMeshWithEdges(wallGeo, wallMaterial, edgeMaterial, buildingGroup);

        const floorShape = new THREE.Shape();
        floorShape.moveTo(0, 0);
        floorShape.lineTo(legW, 0);
        floorShape.lineTo(legW, legD);
        floorShape.lineTo(W, legD);
        floorShape.lineTo(W, D);
        floorShape.lineTo(0, D);
        const floorGeo = new THREE.ShapeGeometry(floorShape);
        floorGeo.rotateX(-Math.PI / 2);
        floorGeo.translate(-centerX, 0.01, -centerZ);
        const floor = new THREE.Mesh(floorGeo, floorMaterial);
        buildingGroup.add(floor);

        if (showRoof) {
            const roofShape = new THREE.Shape();
            const o = roofOverhang;
            roofShape.moveTo(-o, -o);
            roofShape.lineTo(legW + o, -o);
            roofShape.lineTo(legW + o, legD - o);
            roofShape.lineTo(W + o, legD - o);
            roofShape.lineTo(W + o, D + o);
            roofShape.lineTo(-o, D + o);
            roofShape.closePath();

            const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
                steps: 1,
                depth: 0.1,
                bevelEnabled: false,
            });
            roofGeo.rotateX(-Math.PI / 2);

            const roof = new THREE.Mesh(roofGeo, roofMaterial);
            if (currentRoofType === "pent") {
                const angle = -Math.atan2(slopeHeight, D);
                roof.position.set(-centerX, H - 0.21, -centerZ);
                roof.geometry.translate(0, 0, -D / 2);
                roof.rotation.x = angle;
                roof.geometry.translate(0, 0, D / 2);
                roof.position.y += slopeHeight / 2;
            } else {
                roof.position.set(-centerX, H + 0.05, -centerZ);
            }
            buildingGroup.add(roof);
        }
    }

    building = buildingGroup;
    scene.add(building);
}

function addMeshWithEdges(geo, mat, edgeMat, group) {
    const mesh = new THREE.Mesh(geo, mat);
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, edgeMat);
    group.add(mesh);
    group.add(line);
}

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
    updateBuilding();
    fitCamera();
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