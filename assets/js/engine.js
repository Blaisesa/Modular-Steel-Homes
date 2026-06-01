// engine.js
import * as THREE from 'three';
import { state, CONSTANTS } from './state.js';

export let scene, camera, renderer, buildingGroupContainer;

export function initEngine(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.DirectionalLight(0xffffff, 0.6);
    light.position.set(5, 10, 7);
    scene.add(light);

    const grid = new THREE.GridHelper(20, 20, 0xdddddd, 0xeeeeee);
    scene.add(grid);

    // Using a persistent container avoids needing to re-add to scene
    buildingGroupContainer = new THREE.Group();
    scene.add(buildingGroupContainer);

    window.addEventListener("resize", () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    container.addEventListener("wheel", (e) => {
        e.preventDefault();
        state.targetRadius = Math.max(5, Math.min(25, state.targetRadius + (e.deltaY > 0 ? 0.5 : -0.5)));
    }, { passive: false });
}

export function animate() {
    requestAnimationFrame(animate);
    
    state.radius += (state.targetRadius - state.radius) * CONSTANTS.lerpSpeed;
    const slider = document.getElementById("zoom-slider");
    if (slider) slider.value = state.radius;
    
    state.currentAngle += (state.targetAngle - state.currentAngle) * CONSTANTS.lerpSpeed;
    state.currentVerticalAngle += (state.targetVerticalAngle - state.currentVerticalAngle) * CONSTANTS.lerpSpeed;
    
    camera.position.x = state.radius * Math.cos(state.currentVerticalAngle) * Math.sin(state.currentAngle);
    camera.position.z = state.radius * Math.cos(state.currentVerticalAngle) * Math.cos(state.currentAngle);
    camera.position.y = state.radius * Math.sin(state.currentVerticalAngle) + state.H / 2;
    camera.lookAt(0, state.H / 2, 0);
    
    renderer.render(scene, camera);
}