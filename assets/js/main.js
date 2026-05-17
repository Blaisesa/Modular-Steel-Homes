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
const roofThickness = 0.15; // Consolidated roof thickness
const roofGap = 0.02; // Gap between wall and roof

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

/* Wall Geometry Helpers */
function createSideWallGeometry(widthAlongZ, baseH, roofType) {
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

// Universal dynamic sloped panel builder
function createPanelGeo(width, hLeft, hRight) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, hRight);
    shape.lineTo(-width / 2, hLeft);
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: wallThickness,
        bevelEnabled: false,
    });
}

// Consolidated roof creation function
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
        // Apex only for rectangle
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
        // Flat roof
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
        addMeshWithEdges(
            leftWallGeo,
            wallMaterial,
            edgeMaterial,
            buildingGroup,
        );

        // Align and position Right Wall panel
        rightWallGeo.rotateY(-Math.PI / 2);
        rightWallGeo.translate(W / 2, 0, 0);
        addMeshWithEdges(
            rightWallGeo,
            wallMaterial,
            edgeMaterial,
            buildingGroup,
        );

        // Align and position Front Wall panel
        frontWallGeo.translate(0, 0, D / 2 - t);
        addMeshWithEdges(
            frontWallGeo,
            wallMaterial,
            edgeMaterial,
            buildingGroup,
        );

        // Align and position Back Wall panel
        backWallGeo.translate(0, 0, -D / 2);
        addMeshWithEdges(
            backWallGeo,
            wallMaterial,
            edgeMaterial,
            buildingGroup,
        );

        // --- PERMANENT FLOOR ---
        const floorGeo = new THREE.PlaneGeometry(W, D);
        floorGeo.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(floorGeo, floorMaterial);
        floor.position.y = 0.01;
        buildingGroup.add(floor);

        // --- ROOF (Toggled) ---
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
        // --- 6-PANEL SOLID WALL SYSTEM (L-SHAPE) ---
        // L-Shape disables the "Apex" roof entirely
        const effectiveRoofType = currentRoofType === "apex" ? "pent" : currentRoofType;

        const getZHeight = (z) => {
            if (effectiveRoofType !== "pent") return H;
            return H + slopeHeight * ((z + D / 2) / D);
        };

        // 1. Left Wall (Full depth: -D/2 to D/2)
        const leftWallGeo = createPanelGeo(
            D,
            getZHeight(-D / 2),
            getZHeight(D / 2),
        );
        leftWallGeo.rotateY(-Math.PI / 2);
        leftWallGeo.translate(-W / 2 + t, 0, 0);
        addMeshWithEdges(
            leftWallGeo,
            wallMaterial,
            edgeMaterial,
            buildingGroup,
        );

        // 2. Front Wall (Full width: -W/2+t to W/2-t)
        const frontWallGeo = createPanelGeo(
            W - 2 * t,
            getZHeight(D / 2 - t),
            getZHeight(D / 2 - t),
        );
        frontWallGeo.translate(0, 0, D / 2 - t);
        addMeshWithEdges(
            frontWallGeo,
            wallMaterial,
            edgeMaterial,
            buildingGroup,
        );

        // 3. Right Wall (Front half of right leg: z=0+t to z=D/2-t)
        const rightWallGeo = createPanelGeo(
            D / 2,
            getZHeight(0),
            getZHeight(D / 2),
        );
        rightWallGeo.rotateY(-Math.PI / 2);
        rightWallGeo.translate(W / 2, 0, D / 4);
        addMeshWithEdges(
            rightWallGeo,
            wallMaterial,
            edgeMaterial,
            buildingGroup,
        );

        // 4. Inner Back Wall (At notch, runs along z=0+t from x=0+t to x=W/2-t)
        const innerBackWallGeo = createPanelGeo(
            W / 2,
            getZHeight(0),
            getZHeight(0),
        );
        innerBackWallGeo.translate(W / 4, 0, 0);
        addMeshWithEdges(
            innerBackWallGeo,
            wallMaterial,
            edgeMaterial,
            buildingGroup,
        );

        // 5. Inner Left Wall (At notch, runs along x=0+t from z=-D/2+t to z=0+t)
        const innerLeftWallGeo = createPanelGeo(
            D / 2 + t,
            getZHeight(-D / 2),
            getZHeight(0),
        );
        innerLeftWallGeo.rotateY(-Math.PI / 2);
        innerLeftWallGeo.translate(0, 0, -D / 4 + t / 2);
        addMeshWithEdges(
            innerLeftWallGeo,
            wallMaterial,
            edgeMaterial,
            buildingGroup,
        );

        // 6. Back Wall (Right leg only: x=0+t to x=W/2-t)
        const backWallGeo = createPanelGeo(
            W / 2 - 2 * t,
            getZHeight(-D / 2),
            getZHeight(-D / 2),
        );
        backWallGeo.translate(-W / 4, 0, -D / 2);
        addMeshWithEdges(
            backWallGeo,
            wallMaterial,
            edgeMaterial,
            buildingGroup,
        );

        // --- L-SHAPE FLOOR ---
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

        // --- L-SHAPE ROOF ---
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

            const roofGeo = new THREE.ShapeGeometry(roofShape);
            const centerX = 0;
            const centerZ = 0;

            createRoof(effectiveRoofType, roofShape, buildingGroup, roofMaterial, true, centerX, centerZ);
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
    
    // Update roof options visibility based on shape
    updateRoofOptionsVisibility();
    
    updateBuilding();
    fitCamera();
};

// New function to show/hide apex option based on shape
window.updateRoofOptionsVisibility = function () {
    const apexOption = document.querySelector('#roof-options .style-option[onclick*="apex"]');
    if (apexOption) {
        if (currentShapeType === "l-shape") {
            apexOption.style.display = "none";
            // If apex is currently selected, switch to pent
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