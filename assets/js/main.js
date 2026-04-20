let scene, camera, renderer, building;
let currentAngle = -Math.PI / 4, targetAngle = -Math.PI / 4;
let currentVerticalAngle = 0.25, targetVerticalAngle = 0.25;
let radius = 12, isFreeRoam = false, isDragging = false;
let previousX = 0, previousY = 0;

/* Global Dimensions */
const lerpSpeed = 0.08;
let W = 6, H = 2.5, D = 4;
let currentShapeType = 'rectangle';

function init() {
    const container = document.getElementById('builder-viewport');
    
    /* Scene & Camera Initialization */
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    /* Lighting Configuration */
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 7);
    scene.add(light);

    /* Build Initial State */
    updateBuilding();
    
    setupInputs(container);
    animate();
}

function updateBuilding() {
    /* Cleanup existing building group and members */
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

    if (currentShapeType === 'rectangle') {
        /*  1. SLOPED WALLS (Pent Style)  */
        const wallShape = new THREE.Shape();
        const slopeHeight = 0.3; // 30cm pitch

        wallShape.moveTo(0, 0);
        wallShape.lineTo(D, 0);
        wallShape.lineTo(D, H);                 /* Back Wall Height */
        wallShape.lineTo(0, H + slopeHeight);   /* Front Wall Height (Taller) */
        wallShape.lineTo(0, 0);

        const wallExtrudeSettings = { depth: W, bevelEnabled: false };
        const wallGeo = new THREE.ExtrudeGeometry(wallShape, wallExtrudeSettings);
        
        /* Aligning and centering walls */
        wallGeo.rotateY(Math.PI / 2);
        wallGeo.translate(-W / 2, 0, D / 2);
        
        const walls = new THREE.Mesh(wallGeo, wallMaterial);
        buildingGroup.add(walls);

        /*  2. PENT ROOF  */
        const roofGeo = new THREE.BoxGeometry(W + 0.4, 0.15, D + 0.4);
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        
        /* Calculate slope angle: atan2(opposite, adjacent) */
        const slopeAngle = Math.atan2(slopeHeight, D);
        
        /* Position: Sit on the taller wall and rotate DOWNWARD (negative) */
        roof.position.y = H + (slopeHeight / 2) + 0.1; 
        roof.rotation.x = -slopeAngle; // Negative to slope toward the back
        
        buildingGroup.add(roof);

    } else {
        /*  L-SHAPE WITH FLAT CAP  */
        const shape = new THREE.Shape();
        const legW = W * 0.5;
        const legD = D * 0.5;

        shape.moveTo(0, 0);
        shape.lineTo(legW, 0);
        shape.lineTo(legW, legD);
        shape.lineTo(W, legD);
        shape.lineTo(W, D);
        shape.lineTo(0, D);
        shape.lineTo(0, 0);

        const extrudeSettings = { steps: 1, depth: H, bevelEnabled: false };
        const wallGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        wallGeo.rotateX(-Math.PI / 2);
        
        /* Calculate bounds for L-shape centering */
        wallGeo.computeBoundingBox();
        const centerX = (wallGeo.boundingBox.max.x + wallGeo.boundingBox.min.x) / 2;
        const centerZ = (wallGeo.boundingBox.max.z + wallGeo.boundingBox.min.z) / 2;
        wallGeo.translate(-centerX, 0, -centerZ);

        const walls = new THREE.Mesh(wallGeo, wallMaterial);
        buildingGroup.add(walls);

        /* L-Shape Roof Plate */
        const roofGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: 0.15, bevelEnabled: false });
        roofGeo.rotateX(-Math.PI / 2);
        roofGeo.translate(-centerX, H, -centerZ);
        
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        buildingGroup.add(roof);
    }

    building = buildingGroup;
    scene.add(building);
}

/* Interaction and UI Logic Below */

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

    container.addEventListener('touchstart', (e) => { 
        if(isFreeRoam) e.preventDefault(); 
        start(e.touches[0].clientX, e.touches[0].clientY); 
    }, {passive: false});
    window.addEventListener('touchmove', (e) => { 
        if(isFreeRoam) e.preventDefault(); 
        move(e.touches[0].clientX, e.touches[0].clientY); 
    }, {passive: false});
    window.addEventListener('touchend', () => isDragging = false);

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        radius = Math.max(5, Math.min(25, radius + (e.deltaY > 0 ? 0.5 : -0.5)));
    }, { passive: false });
}

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

window.setShape = function(type) {
    currentShapeType = type;
    document.querySelectorAll('.style-option').forEach(o => o.classList.remove('active'));
    event.currentTarget.classList.add('active');
    updateBuilding();
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
    const views = {
        'front': [0, 0], 'right': [Math.PI/2, 0], 'back': [Math.PI, 0],
        'left': [-Math.PI/2, 0], 'top': [0, 1.5], 'iso': [-Math.PI/4, 0.25]
    };
    if (views[view]) [targetAngle, targetVerticalAngle] = views[view];
};

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