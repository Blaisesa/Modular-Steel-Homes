let scene, camera, renderer, building;
let currentAngle = -Math.PI / 4, targetAngle = -Math.PI / 4;
let currentVerticalAngle = 0.25, targetVerticalAngle = 0.25;
let radius = 12, isFreeRoam = false, isDragging = false;
let previousX = 0, previousY = 0;
const lerpSpeed = 0.08, W = 6, H = 2.5, D = 4;

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

    createBuilding();
    setupInputs(container);
    animate();
}

function createBuilding() {
    const geometry = new THREE.BoxGeometry(W, H, D);
    const materials = [
        new THREE.MeshLambertMaterial({ color: 0x5a5b5d }), // R
        new THREE.MeshLambertMaterial({ color: 0x5a5b5d }), // L
        new THREE.MeshLambertMaterial({ color: 0x8a8b8d }), // T
        new THREE.MeshLambertMaterial({ color: 0x222222 }), // B
        new THREE.MeshLambertMaterial({ color: 0x707173 }), // F
        new THREE.MeshLambertMaterial({ color: 0x444444 })  // Back
    ];
    building = new THREE.Mesh(geometry, materials);
    building.position.y = H / 2;
    scene.add(building);
}

function setupInputs(container) {
    const start = (x, y) => { if (isFreeRoam) { isDragging = true; previousX = x; previousY = y; } };
    const move = (x, y) => {
        if (!isDragging || !isFreeRoam) return;
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
    document.querySelectorAll('.style-option').forEach(o => o.classList.remove('active'));
    event.currentTarget.classList.add('active');
    console.log("Shape changed to:", type);
};

window.toggleFreeRoam = function() {
    isFreeRoam = !isFreeRoam;
    const btn = document.getElementById('roam-toggle');
    btn.innerHTML = isFreeRoam ? '🔓' : '🔒';
    btn.style.background = isFreeRoam ? '#007bff' : 'white';
    btn.style.color = isFreeRoam ? 'white' : 'black';
};

window.rotateTo = function(view) {
    const views = {
        'front': [0, 0], 'right': [Math.PI/2, 0], 'back': [Math.PI, 0],
        'left': [-Math.PI/2, 0], 'top': [0, 1.5], 'iso': [-Math.PI/4, 0.25]
    };
    if (views[view]) { [targetAngle, targetVerticalAngle] = views[view]; }
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