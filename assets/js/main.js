let scene, camera, renderer, building;
let currentAngle = -Math.PI / 4, targetAngle = -Math.PI / 4;
let currentVerticalAngle = 0.25, targetVerticalAngle = 0.25;
let radius = 12, isFreeRoam = false, isDragging = false;
let previousX = 0, previousY = 0;

/* Default Dimensions */
const lerpSpeed = 0.08;
let W = 6, H = 2.5, D = 4;
let currentShapeType = 'rectangle';

function init() {
    const container = document.getElementById('builder-viewport');
    
    /* Scene Setup */
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);

    /* Camera Setup */
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    
    /* Renderer Setup */
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    /* Lighting */
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 7);
    scene.add(light);

    /* Initial Geometry Render */
    updateBuilding();
    
    /* Input Handling */
    setupInputs(container);
    animate();
}

function updateBuilding() {
    /* Cleanup old mesh and geometry to prevent memory leaks */
    if (building) {
        scene.remove(building);
        building.geometry.dispose();
    }

    let geometry;

    if (currentShapeType === 'rectangle') {
        /* Standard Box Geometry */
        geometry = new THREE.BoxGeometry(W, H, D);
        /* Shift geometry up so the bottom is at Y=0 */
        geometry.translate(0, H / 2, 0);
    } else {
        /* L-Shape Logic with Front Cutout */
        const shape = new THREE.Shape();
        
        /* Define the leg sizes (the part that remains) */
        const legW = 3; 
        const legD = 2; 

        /* Drawing the shape so the 'cutout' is at the front (lower Y in 2D)
           Points follow a counter-clockwise path 
        */
        shape.moveTo(0, 0);             /* Bottom Left */
        shape.lineTo(legW, 0);          /* Bottom Inner Corner */
        shape.lineTo(legW, legD);       /* Inner Corner 'Depth' */
        shape.lineTo(W, legD);          /* Right Inner Corner */
        shape.lineTo(W, D);             /* Top Right */
        shape.lineTo(0, D);             /* Top Left */
        shape.lineTo(0, 0);             /* Close Path */

        const extrudeSettings = {
            steps: 1,
            depth: H,
            bevelEnabled: false
        };

        geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        /* Rotate to lay flat on the XZ plane */
        geometry.rotateX(-Math.PI / 2);
        
        /* Center the object so it rotates around the middle of the total Width/Depth */
        geometry.translate(-W / 2, 0, -D / 2);
    }

    /* Standard PIR Panel Style Material */
    const material = new THREE.MeshLambertMaterial({ color: 0x707173 });
    building = new THREE.Mesh(geometry, material);
    scene.add(building);
}

function setupInputs(container) {
    /* Handle Mouse and Touch Start */
    const start = (x, y) => { 
        if (isFreeRoam) { 
            isDragging = true; 
            previousX = x; 
            previousY = y; 
        } 
    };

    /* Handle Camera Movement */
    const move = (x, y) => {
        if (!isDragging || !isFreeRoam) return;

        /* Reset active view buttons if user moves camera manually */
        document.querySelectorAll('.view-controls button:not(#roam-toggle)').forEach(btn => {
            btn.classList.remove('active');
        });

        targetAngle += (x - previousX) * 0.005;
        targetVerticalAngle += (y - previousY) * 0.005;
        
        /* Limit vertical rotation to prevent flipping upside down */
        targetVerticalAngle = Math.max(-1.4, Math.min(1.4, targetVerticalAngle));
        
        previousX = x; 
        previousY = y;
    };
    
    /* Browser Event Listeners */
    container.addEventListener('mousedown', (e) => start(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => isDragging = false);

    /* Mobile Touch Support */
    container.addEventListener('touchstart', (e) => { 
        if(isFreeRoam) e.preventDefault(); 
        start(e.touches[0].clientX, e.touches[0].clientY); 
    }, {passive: false});
    window.addEventListener('touchmove', (e) => { 
        if(isFreeRoam) e.preventDefault(); 
        move(e.touches[0].clientX, e.touches[0].clientY); 
    }, {passive: false});
    window.addEventListener('touchend', () => isDragging = false);

    /* Scroll Wheel Zoom */
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        radius = Math.max(5, Math.min(25, radius + (e.deltaY > 0 ? 0.5 : -0.5)));
    }, { passive: false });
}

/* Sidebar Navigation Toggles */
window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('active');
    document.getElementById('menu-toggle').classList.toggle('open');
    /* Trigger resize to ensure 3D canvas fills new space */
    setTimeout(() => window.dispatchEvent(new Event('resize')), 400);
};

/* Accordion Logic */
window.toggleSection = function(header) {
    const section = header.parentElement;
    const wasActive = section.classList.contains('active');
    document.querySelectorAll('.nav-section').forEach(s => s.classList.remove('active'));
    if (!wasActive) section.classList.add('active');
};

/* Shape Selector Logic */
window.setShape = function(type) {
    currentShapeType = type;
    
    /* Update Sidebar Active Classes */
    document.querySelectorAll('.style-option').forEach(o => o.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    /* Redraw the building with new geometry */
    updateBuilding();
};

/* Free Roam Toggle */
window.toggleFreeRoam = function() {
    isFreeRoam = !isFreeRoam;
    const btn = document.getElementById('roam-toggle');
    btn.innerHTML = isFreeRoam ? '🔓' : '🔒';
    btn.style.background = isFreeRoam ? '#007bff' : 'white';
    btn.style.color = isFreeRoam ? 'white' : 'black';
};

/* Predefined View Angle Snapping */
window.rotateTo = function(view) {
    document.querySelectorAll('.view-controls button').forEach(btn => btn.classList.remove('active'));
    const clickedBtn = event.currentTarget;
    if (clickedBtn && clickedBtn.id !== 'roam-toggle') clickedBtn.classList.add('active');

    const views = {
        'front': [0, 0], 
        'right': [Math.PI/2, 0], 
        'back': [Math.PI, 0],
        'left': [-Math.PI/2, 0], 
        'top': [0, 1.5], 
        'iso': [-Math.PI/4, 0.25]
    };

    if (views[view]) [targetAngle, targetVerticalAngle] = views[view];
};

/* Rendering Loop */
function animate() {
    requestAnimationFrame(animate);
    
    /* Smooth camera interpolation (Lerp) */
    currentAngle += (targetAngle - currentAngle) * lerpSpeed;
    currentVerticalAngle += (targetVerticalAngle - currentVerticalAngle) * lerpSpeed;
    
    /* Update Camera position based on orbital angles */
    camera.position.x = radius * Math.cos(currentVerticalAngle) * Math.sin(currentAngle);
    camera.position.z = radius * Math.cos(currentVerticalAngle) * Math.cos(currentAngle);
    camera.position.y = radius * Math.sin(currentVerticalAngle) + (H / 2);
    
    camera.lookAt(0, H / 2, 0);
    renderer.render(scene, camera);
}

/* Handle Window Resizing */
window.addEventListener('resize', () => {
    const container = document.getElementById('builder-viewport');
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

init();