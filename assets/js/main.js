let scene, camera, renderer, building;
let currentAngle = -Math.PI / 4, targetAngle = -Math.PI / 4;
let currentVerticalAngle = 0.25, targetVerticalAngle = 0.25;
let radius = 12, isFreeRoam = false, isDragging = false;
let previousX = 0, previousY = 0;

/* Global Dimensions & States */
const lerpSpeed = 0.08;
let W = 6, H = 2.5, D = 4;
let currentShapeType = 'rectangle';
let currentRoofType = 'pent'; 
const roofOverhang = 0.2; // 20cm overhang on all sides

function init() {
    const container = document.getElementById('builder-viewport');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 7);
    scene.add(light);

    updateBuilding();
    setupInputs(container);
    animate();
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
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x707173 });
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const slopeHeight = 0.3; 

    if (currentShapeType === 'rectangle') {
        if (currentRoofType === 'pent') {
            /* PENT WALLS (Rectangle) - Logic is already shape-based, so it slopes */
            const wallShape = new THREE.Shape();
            wallShape.moveTo(0, 0);
            wallShape.lineTo(D, 0);
            wallShape.lineTo(D, H);
            wallShape.lineTo(0, H + slopeHeight);
            wallShape.lineTo(0, 0);

            const wallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: W, bevelEnabled: false });
            wallGeo.rotateY(Math.PI / 2);
            wallGeo.translate(-W / 2, 0, D / 2);
            buildingGroup.add(new THREE.Mesh(wallGeo, wallMaterial));

            const roofGeo = new THREE.BoxGeometry(W + (roofOverhang * 2), 0.15, D + (roofOverhang * 2));
            const roof = new THREE.Mesh(roofGeo, roofMaterial);
            const angle = -Math.atan2(slopeHeight, D);
            roof.position.y = H + (slopeHeight / 2) + 0.1;
            roof.rotation.x = angle;
            buildingGroup.add(roof);

        } else if (currentRoofType === 'apex') {
            /* APEX Logic (Rectangle) - Same as previous stable version */
            const wallShape = new THREE.Shape();
            const peak = 0.6; 
            wallShape.moveTo(0, 0);
            wallShape.lineTo(D, 0);
            wallShape.lineTo(D, H);
            wallShape.lineTo(D / 2, H + peak); 
            wallShape.lineTo(0, H);
            wallShape.lineTo(0, 0);

            const wallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: W, bevelEnabled: false });
            wallGeo.rotateY(Math.PI / 2);
            wallGeo.translate(-W / 2, 0, D / 2);
            buildingGroup.add(new THREE.Mesh(wallGeo, wallMaterial));

            const roofHalfWidth = Math.sqrt(Math.pow(D / 2, 2) + Math.pow(peak, 2)) + roofOverhang;
            const roofPlateGeo = new THREE.BoxGeometry(W + (roofOverhang * 2), 0.1, roofHalfWidth);
            const angle = Math.atan2(peak, D / 2);

            const roofL = new THREE.Mesh(roofPlateGeo, roofMaterial);
            roofL.position.set(0, H + (peak / 2) + 0.05, D / 3.75);
            roofL.rotation.x = angle;
            buildingGroup.add(roofL);

            const roofR = new THREE.Mesh(roofPlateGeo, roofMaterial);
            roofR.position.set(0, H + (peak / 2) + 0.05, -D / 3.75);
            roofR.rotation.x = -angle;
            buildingGroup.add(roofR);
        }
    } else {
        /*  L-SHAPE SLOPED WALL LOGIC  */
        const legW = W * 0.5; 
        const legD = D * 0.5;
        
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); 
        shape.lineTo(legW, 0); 
        shape.lineTo(legW, legD); 
        shape.lineTo(W, legD); 
        shape.lineTo(W, D); 
        shape.lineTo(0, D); 
        shape.lineTo(0, 0);

        const wallGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: H, bevelEnabled: false });
        wallGeo.rotateX(-Math.PI / 2);
        
        /* Centering */
        wallGeo.computeBoundingBox();
        const centerX = (wallGeo.boundingBox.max.x + wallGeo.boundingBox.min.x) / 2;
        const centerZ = (wallGeo.boundingBox.max.z + wallGeo.boundingBox.min.z) / 2;
        wallGeo.translate(-centerX, 0, -centerZ);

        /* SLOPE THE L-SHAPE WALLS: 
           We iterate through the top vertices and add height based on depth (Z) */
        if (currentRoofType === 'pent') {
            const pos = wallGeo.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                // If vertex is at the top (Y ≈ H)
                if (pos.getY(i) > H - 0.01) {
                    const zPos = pos.getZ(i);
                    /* Calculate how far back the vertex is (from 0 to D)
                       We reverse it so the Front (most negative Z) is taller */
                    const normalizedZ = 1 + ((zPos - (D / 2)) /D);
                    pos.setY(i, H + (normalizedZ * slopeHeight));
                }
            }
            pos.needsUpdate = true;
        }

        buildingGroup.add(new THREE.Mesh(wallGeo, wallMaterial));

        /* ROOF PLATE (with Overhang) */
        const roofShape = new THREE.Shape();
        const o = roofOverhang;
        roofShape.moveTo(-o, -o);
        roofShape.lineTo(legW + o, -o);
        roofShape.lineTo(legW + o, legD - o);
        roofShape.lineTo(W + o, legD - o);
        roofShape.lineTo(W + o, D + o);
        roofShape.lineTo(-o, D + o);
        roofShape.lineTo(-o, -o);

        const roofGeo = new THREE.ExtrudeGeometry(roofShape, { steps: 1, depth: 0.15, bevelEnabled: false });
        roofGeo.rotateX(-Math.PI / 2);
        
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        
        if (currentRoofType === 'pent') {
            /* Position roof slightly above the highest point of the wall */
            roof.position.set(-centerX, H + (slopeHeight / 2) + 0.1, -centerZ);
            roof.rotation.x = -Math.atan2(slopeHeight, D); 
        } else {
            roof.position.set(-centerX, H, -centerZ);
        }
        
        buildingGroup.add(roof);
    }

    building = buildingGroup;
    scene.add(building);
}

/* UI & Input Logic */
window.setRoof = function(type) {
    currentRoofType = type;
    document.querySelectorAll('#roof-options .style-option').forEach(o => o.classList.remove('active'));
    event.currentTarget.classList.add('active');
    updateBuilding();
};

window.setShape = function(type) {
    currentShapeType = type;
    document.querySelectorAll('.sidebar-nav .nav-section:first-child .style-option').forEach(o => o.classList.remove('active'));
    event.currentTarget.classList.add('active');
    updateBuilding();
};

/* Camera & Control logic */
window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('active');
    document.getElementById('menu-toggle').classList.toggle('open');
    setTimeout(() => window.dispatchEvent(new Event('resize')), 400);
};

window.toggleSection = function(header) {
    const section = header.parentElement;
    const wasActive = section.classList.contains('active');
    document.querySelectorAll('.nav-section').forEach(s => s.classList.remove('active'));
    if (!wasActive) section.classList.add('active');
};

window.toggleFreeRoam = function() {
    isFreeRoam = !isFreeRoam;
    const btn = document.getElementById('roam-toggle');
    btn.innerHTML = isFreeRoam ? '🔓' : '🔒';
    btn.style.background = isFreeRoam ? '#007bff' : 'white';
    btn.style.color = isFreeRoam ? 'white' : 'black';
};

window.rotateTo = function(view) {
    document.querySelectorAll('.view-controls button').forEach(btn => btn.classList.remove('active'));
    const clickedBtn = event.currentTarget;
    if (clickedBtn && clickedBtn.id !== 'roam-toggle') clickedBtn.classList.add('active');
    const views = { 'front': [0, 0], 'right': [Math.PI/2, 0], 'back': [Math.PI, 0], 'left': [-Math.PI/2, 0], 'top': [0, 1.5], 'iso': [-Math.PI/4, 0.25] };
    if (views[view]) [targetAngle, targetVerticalAngle] = views[view];
};

function setupInputs(container) {
    const start = (x, y) => { if (isFreeRoam) { isDragging = true; previousX = x; previousY = y; } };
    const move = (x, y) => {
        if (!isDragging || !isFreeRoam) return;
        document.querySelectorAll('.view-controls button:not(#roam-toggle)').forEach(btn => btn.classList.remove('active'));
        targetAngle += (x - previousX) * 0.005;
        targetVerticalAngle += (y - previousY) * 0.005;
        targetVerticalAngle = Math.max(-1.4, Math.min(1.4, targetVerticalAngle));
        previousX = x; previousY = y;
    };
    container.addEventListener('mousedown', (e) => start(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => isDragging = false);
    container.addEventListener('wheel', (e) => { e.preventDefault(); radius = Math.max(5, Math.min(25, radius + (e.deltaY > 0 ? 0.5 : -0.5))); }, { passive: false });
}

function animate() {
    requestAnimationFrame(animate);
    currentAngle += (targetAngle - currentAngle) * lerpSpeed;
    currentVerticalAngle += (targetVerticalAngle - currentVerticalAngle) * lerpSpeed;
    camera.position.x = radius * Math.cos(currentVerticalAngle) * Math.sin(currentAngle);
    camera.position.z = radius * Math.cos(currentVerticalAngle) * Math.cos(currentAngle);
    camera.position.y = radius * Math.sin(currentVerticalAngle) + (H / 2);
    camera.lookAt(0, H / 2, 0);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    const container = document.getElementById('builder-viewport');
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

init();