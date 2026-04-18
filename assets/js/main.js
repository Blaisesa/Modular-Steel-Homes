let scene, camera, renderer, building;
let currentAngle = Math.PI / 4; 
let targetAngle = Math.PI / 4; 
let currentVerticalAngle = 0.5; 
let targetVerticalAngle = 0.5;

const radius = 12; 
const lerpSpeed = 0.08; 
const W = 6, H = 2.5, D = 4;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('builder-viewport').appendChild(renderer.domElement);

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

    animate();
}

window.rotateTo = function(view) {
    const views = {
        'front': { h: 0, v: 0 },
        'right': { h: Math.PI / 2, v: 0 },
        'back':  { h: Math.PI, v: 0 },
        'left':  { h: -Math.PI / 2, v: 0 },
        'top':   { h: 0, v: Math.PI / 2.1 },
        'iso':   { h: Math.PI / 4, v: 0.5 }
    };
    if (views[view]) {
        targetAngle = views[view].h;
        targetVerticalAngle = views[view].v;
    }
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();