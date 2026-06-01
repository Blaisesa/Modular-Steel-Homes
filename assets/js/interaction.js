// interaction.js
import * as THREE from 'three';
import { state, CONSTANTS } from './state.js';
import { camera, scene } from './engine.js';
import { getWallDimensions, isValidAperture, updateBuilding } from './geometry.js';
import { selectAperture, deselectAperture, showPropertiesPanel, updateQuickStats, showConstraintAlert } from './ui.js';

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let dragPlane = new THREE.Plane();
let dragStartPos = new THREE.Vector3();

const wallNormals = {
    front: new THREE.Vector3(0, 0, 1), back: new THREE.Vector3(0, 0, -1),
    left: new THREE.Vector3(-1, 0, 0), right: new THREE.Vector3(1, 0, 0),
    innerBack: new THREE.Vector3(0, 0, 1), innerLeft: new THREE.Vector3(1, 0, 0)
};

export function setupInteractions(containerId) {
    const container = document.getElementById(containerId);
    container.style.touchAction = 'none'; 
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    
    // Attach Drag/Drop to window for HTML UI triggers
    window.enterPlacementMode = enterPlacementMode;
    window.exitPlacementMode = exitPlacementMode;
}

function updateMousePosition(event) {
    const canvas = event.target;
    const bounds = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function getWallMeshes() {
    return Object.keys(state.walls).map(k => state.walls[k]).filter(m => m && m.visible);
}

function createGhostMesh() {
    if (state.ghostMesh) scene.remove(state.ghostMesh);
    
    const geo = new THREE.BoxGeometry(state.placementConfig.w, state.placementConfig.h, CONSTANTS.wallThickness * 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5, depthWrite: false });
    state.ghostMesh = new THREE.Mesh(geo, mat);
    state.ghostMesh.visible = false; 
    scene.add(state.ghostMesh);
}

function enterPlacementMode(type, preset) {
    deselectAperture();
    const config = CONSTANTS.APERTURE_PRESETS[type][preset];
    state.placementConfig = { type, ...config };
    state.isPlacingNewAperture = true;
    
    document.getElementById('placement-ui').classList.remove('hidden');
    document.body.classList.add('placing-aperture');

    if (window.innerWidth <= 768) window.toggleSidebar(); 
    createGhostMesh();
}

function exitPlacementMode() {
    state.isPlacingNewAperture = false;
    state.placementConfig = null;
    state.currentHoveredWall = null;
    document.getElementById('placement-ui').classList.add('hidden');
    document.body.classList.remove('placing-aperture');
    
    if (state.ghostMesh) {
        scene.remove(state.ghostMesh);
        state.ghostMesh.geometry.dispose();
        state.ghostMesh.material.dispose();
        state.ghostMesh = null;
    }
}

function onPointerDown(event) {
    updateMousePosition(event);
    raycaster.setFromCamera(mouse, camera);

    if (state.isPlacingNewAperture) {
        if (state.currentHoveredWall && state.ghostMesh && state.ghostMesh.visible && state.ghostMesh.material.color.getHex() === 0x00ff00) {
            const dropConfig = {
                id: Date.now(),
                type: state.placementConfig.type,
                wallId: state.currentHoveredWall.userData.wallId,
                w: state.placementConfig.w, h: state.placementConfig.h,
                x: state.ghostMesh.userData.localX, y: state.ghostMesh.userData.localY
            };
            state.apertures.push(dropConfig);
            updateQuickStats();
            updateBuilding();
            exitPlacementMode();
            showConstraintAlert(`✓ Added successfully!`, 'success');
        }
        return;
    }

    const allApertureMeshes = [];
    Object.values(state.apertureComponents).forEach(compArray => {
        compArray.forEach(group => group.children.forEach(child => { if (child.isMesh) allApertureMeshes.push(child); }));
    });

    const intersects = raycaster.intersectObjects(allApertureMeshes, true);
    
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && !obj.userData.apertureId && obj.parent) obj = obj.parent;

        if (obj && obj.userData.apertureId) {
            const clickedId = obj.userData.apertureId;
            if (state.selectedApertureData && state.selectedApertureData.id === clickedId) {
                state.isDraggingAperture = true;
                const normal = wallNormals[state.selectedApertureData.wallId];
                const wallMesh = state.walls[state.selectedApertureData.wallId];
                const wallWorldPos = new THREE.Vector3();
                wallMesh.getWorldPosition(wallWorldPos);
                
                dragPlane.setFromNormalAndCoplanarPoint(normal, wallWorldPos);
                raycaster.ray.intersectPlane(dragPlane, dragStartPos);
                state.dragStartAperture = JSON.parse(JSON.stringify(state.selectedApertureData));
                
                document.body.classList.add('dragging-aperture');
                if (event.pointerType !== 'mouse') event.preventDefault(); 
                return;
            } else {
                const apertureData = state.apertures.find(a => a.id === clickedId);
                if (apertureData) {
                    if (state.isFreeRoam) {
                        window.toggleFreeRoam();
                        const viewMap = { front: 'front', innerBack: 'front', back: 'back', left: 'left', right: 'right', innerLeft: 'right' };
                        window.rotateTo(viewMap[apertureData.wallId]);
                    }
                    selectAperture(apertureData);
                    return;
                }
            }
        }
    } else {
        deselectAperture();
    }

    if (state.isFreeRoam && !state.selectedApertureData && !state.isPlacingNewAperture) {
        state.isDragging = true;
        state.previousX = event.clientX;
        state.previousY = event.clientY;
    }
}

function onPointerMove(event) {
    if (state.isPlacingNewAperture) {
        updateMousePosition(event);
        raycaster.setFromCamera(mouse, camera);
        const wallIntersects = raycaster.intersectObjects(getWallMeshes(), false);
        
        if (wallIntersects.length > 0) {
            const hit = wallIntersects[0];
            const hitWallMesh = hit.object;
            const wallId = hitWallMesh.userData.wallId;
            state.currentHoveredWall = hitWallMesh;
            
            const localHit = hitWallMesh.worldToLocal(hit.point.clone());
            const wallDim = getWallDimensions(wallId);
            const EDGE_PAD = 0.02; 
            const halfW = state.placementConfig.w / 2;
            const halfH = state.placementConfig.h / 2;

            let clampedX = Math.max(-wallDim.width / 2 + halfW + EDGE_PAD, Math.min(wallDim.width / 2 - halfW - EDGE_PAD, localHit.x));
            let clampedY = state.placementConfig.type === 'door' ? halfH : Math.max(halfH + EDGE_PAD, Math.min(wallDim.height - halfH - EDGE_PAD, localHit.y));
            
            const candidate = { id: 'temp', wallId: wallId, type: state.placementConfig.type, w: state.placementConfig.w, h: state.placementConfig.h, x: clampedX, y: clampedY };

            state.ghostMesh.material.color.setHex(isValidAperture(candidate) ? 0x00ff00 : 0xff0000);
            state.ghostMesh.position.copy(hitWallMesh.position);
            state.ghostMesh.rotation.copy(hitWallMesh.rotation);
            state.ghostMesh.translateX(clampedX); state.ghostMesh.translateY(clampedY); state.ghostMesh.translateZ(CONSTANTS.wallThickness / 2);
            state.ghostMesh.visible = true;
            state.ghostMesh.userData = { localX: clampedX, localY: clampedY };
        } else {
            state.ghostMesh.visible = false;
            state.currentHoveredWall = null;
        }
        return;
    }

    if (state.isDraggingAperture && state.selectedApertureData && state.dragStartAperture) {
        updateMousePosition(event);
        raycaster.setFromCamera(mouse, camera);
        let currentPt = new THREE.Vector3();
        
        if (raycaster.ray.intersectPlane(dragPlane, currentPt)) {
            let delta = currentPt.clone().sub(dragStartPos);
            let localDeltaX = 0, localDeltaY = delta.y; 
            const wid = state.selectedApertureData.wallId;
            if (wid === 'front' || wid === 'innerBack' || wid === 'back') localDeltaX = delta.x;
            if (wid === 'left' || wid === 'right' || wid === 'innerLeft') localDeltaX = delta.z;

            let candidate = JSON.parse(JSON.stringify(state.dragStartAperture));
            const wallDim = getWallDimensions(candidate.wallId);
            const EDGE_PAD = 0.02; 
            
            candidate.x += localDeltaX;
            candidate.y += localDeltaY;
            
            const halfW = candidate.w / 2;
            const halfH = candidate.h / 2;
            
            candidate.x = Math.max(-wallDim.width / 2 + halfW + EDGE_PAD, Math.min(wallDim.width / 2 - halfW - EDGE_PAD, candidate.x));
            if (candidate.type === 'door') candidate.y = halfH; 
            else candidate.y = Math.max(halfH + EDGE_PAD, Math.min(wallDim.height - halfH - EDGE_PAD, candidate.y));

            if (isValidAperture(candidate)) {
                const index = state.apertures.findIndex(a => a.id === candidate.id);
                if (index !== -1) {
                    state.apertures[index] = candidate;
                    state.selectedApertureData = candidate;
                    showPropertiesPanel(candidate); 
                    updateBuilding();
                }
            }
        }
        return;
    }

    if (state.isDragging && state.isFreeRoam) {
        state.targetAngle += (event.clientX - state.previousX) * 0.005;
        state.targetVerticalAngle += (event.clientY - state.previousY) * 0.005;
        state.targetVerticalAngle = Math.max(-1.4, Math.min(1.4, state.targetVerticalAngle));
        state.previousX = event.clientX;
        state.previousY = event.clientY;
    }
}

function onPointerUp() {
    state.isDragging = false;
    if (state.isDraggingAperture) {
        state.isDraggingAperture = false;
        state.dragStartAperture = null;
        document.body.classList.remove('dragging-aperture');
        updateQuickStats();
    }
}