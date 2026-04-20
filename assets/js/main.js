// Main JavaScript file for the building viewer using Three.js
let scene, camera, renderer, building;
let currentAngle = -Math.PI / 4; 
let targetAngle = -Math.PI / 4; 
let currentVerticalAngle = 0.25; 
let targetVerticalAngle = 0.25;

// Camera & Interaction settings
let radius = 12; 
const lerpSpeed = 0.08; 
const W = 6, H = 2.5, D = 4;

let isFreeRoam = false;
let isDragging = false;
let previousX = 0;
let previousY = 0;

// Initialize the Three.js scene, camera, renderer, and building mesh
function init() {
    const container = document.getElementById('builder-viewport');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);

    // Camera aspect ratio based on container width
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 7);
    scene.add(light);

    const geometry = new THREE.BoxGeometry(W, H, D);
    const materials = [
        new THREE.MeshLambertMaterial({ color: 0x5a5b5d }), // Right
        new THREE.MeshLambertMaterial({ color: 0x5a5b5d }), // Left
        new THREE.MeshLambertMaterial({ color: 0x8a8b8d }), // Top
        new THREE.MeshLambertMaterial({ color: 0x222222 }), // Bottom
        new THREE.MeshLambertMaterial({ color: 0x707173 }), // Front
        new THREE.MeshLambertMaterial({ color: 0x444444 })  // Back
    ];

    building = new THREE.Mesh(geometry, materials);
    building.position.y = H / 2;
    scene.add(building);

    // Unified Input Handling (Desktop + Mobile)

    const startAction = (x, y) => {
        if (!isFreeRoam) return;
        isDragging = true;
        previousX = x;
        previousY = y;
    };

    const moveAction = (x, y) => {
        if (!isDragging || !isFreeRoam) return;
        const deltaX = x - previousX;
        const deltaY = y - previousY;

        targetAngle += deltaX * 0.005; 
        targetVerticalAngle += deltaY * 0.005;
        targetVerticalAngle = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetVerticalAngle));

        previousX = x;
        previousY = y;
    };

    const endAction = () => { isDragging = false; };

    // Mouse Listeners
    container.addEventListener('mousedown', (e) => startAction(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => moveAction(e.clientX, e.clientY));
    window.addEventListener('mouseup', endAction);

    // Touch Listeners (Mobile)
    container.addEventListener('touchstart', (e) => {
        // Prevent scrolling the whole page while rotating the building
        if (isFreeRoam) e.preventDefault(); 
        startAction(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (isFreeRoam) e.preventDefault();
        moveAction(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    window.addEventListener('touchend', endAction);

    // Zoom (Wheel)
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.5;
        radius += e.deltaY > 0 ? zoomSpeed : -zoomSpeed;
        radius = Math.max(5, Math.min(25, radius));
    }, { passive: false });

    animate();
}

window.toggleFreeRoam = function() {
    isFreeRoam = !isFreeRoam;
    const btn = document.getElementById('roam-toggle');
    // Your updated logic: Unlocked when active
    btn.innerHTML = isFreeRoam ? '🔓' : '🔒'; 
    btn.style.background = isFreeRoam ? '#007bff' : 'white';
    btn.style.color = isFreeRoam ? 'white' : 'black';
}

window.rotateTo = function(view) {
    const views = {
        'front': { h: 0, v: 0 },
        'right': { h: Math.PI / 2, v: 0 },
        'back':  { h: Math.PI, v: 0 },
        'left':  { h: -Math.PI / 2, v: 0 },
        'top':   { h: 0, v: Math.PI / 2.1 },
        'iso':   { h: -Math.PI / 4, v: 0.25 }
    };
    if (views[view]) {
        targetAngle = views[view].h;
        targetVerticalAngle = views[view].v;
    }
}

// Animate the camera to smoothly transition to the target angles
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

// Handle window resize
window.addEventListener('resize', () => {
    const container = document.getElementById('builder-viewport');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

init();