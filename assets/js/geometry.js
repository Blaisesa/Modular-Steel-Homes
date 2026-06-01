// geometry.js
import * as THREE from 'three';
import { state, CONSTANTS } from './state.js';
import { buildingGroupContainer } from './engine.js';

export function getWallDimensions(wallId) {
    let wallWidth = state.W, wallHeight = state.H;
    const t = CONSTANTS.wallThickness;

    if (state.currentShapeType === "rectangle") {
        if (wallId === "front" || wallId === "back") {
            wallWidth = state.W - 2 * t;
            if (wallId === "front" && state.currentRoofType === "pent") wallHeight = state.H + CONSTANTS.slopeHeight;
        } else if (wallId === "left" || wallId === "right") {
            wallWidth = state.D;
            wallHeight = state.H;
        }
    } else {
        if (wallId === "front") { wallWidth = state.W - 2 * t; wallHeight = state.currentRoofType === "pent" ? state.H + CONSTANTS.slopeHeight : state.H; }
        else if (wallId === "back") { wallWidth = state.W / 2 - 2 * t; wallHeight = state.H; }
        else if (wallId === "left") { wallWidth = state.D; wallHeight = state.H; }
        else if (wallId === "right") { wallWidth = state.D / 2; wallHeight = state.H; }
        else if (wallId === "innerBack") { wallWidth = state.W / 2 - t; wallHeight = state.H; }
        else if (wallId === "innerLeft") { wallWidth = state.D / 2 + t; wallHeight = state.H; }
    }
    return { width: wallWidth, height: wallHeight };
}

function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'bold 24px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#666666'; 
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9, depthTest: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2.5, 0.625, 1); 
    return sprite;
}

function createDimensionLine(start, end, offsetDir, offsetDist, text) {
    const group = new THREE.Group();
    const offset = offsetDir.clone().normalize().multiplyScalar(offsetDist);
    const p1 = start.clone().add(offset);
    const p2 = end.clone().add(offset);
    
    const material = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), material));
    
    const tickSize = 0.15;
    const tickDir = offsetDir.clone().normalize();
    
    const p1a = p1.clone().add(tickDir.clone().multiplyScalar(tickSize));
    const p1b = p1.clone().sub(tickDir.clone().multiplyScalar(tickSize));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1a, p1b]), material));
    
    const p2a = p2.clone().add(tickDir.clone().multiplyScalar(tickSize));
    const p2b = p2.clone().sub(tickDir.clone().multiplyScalar(tickSize));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p2a, p2b]), material));

    const sprite = createTextSprite(text);
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    sprite.position.copy(midPoint);
    sprite.position.y += 0.2; 
    group.add(sprite);
    
    return group;
}

export function addMeasurements(group) {
    const dOffset = 0.45;
    const yHeight = 0.05;

    let p1 = new THREE.Vector3(-state.W/2, yHeight, state.D/2);
    let p2 = new THREE.Vector3(state.W/2, yHeight, state.D/2);
    group.add(createDimensionLine(p1, p2, new THREE.Vector3(0,0,1), dOffset, state.W.toFixed(1) + 'm'));
    
    p1 = new THREE.Vector3(state.W/2, yHeight, state.D/2);
    p2 = new THREE.Vector3(state.W/2, yHeight, -state.D/2);
    group.add(createDimensionLine(p1, p2, new THREE.Vector3(1,0,0), dOffset, state.D.toFixed(1) + 'm'));
    
    p1 = new THREE.Vector3(state.W/2, yHeight, -state.D/2);
    p2 = new THREE.Vector3(-state.W/2, yHeight, -state.D/2);
    group.add(createDimensionLine(p1, p2, new THREE.Vector3(0,0,-1), dOffset, state.W.toFixed(1) + 'm'));

    p1 = new THREE.Vector3(-state.W/2, yHeight, -state.D/2);
    p2 = new THREE.Vector3(-state.W/2, yHeight, state.D/2);
    group.add(createDimensionLine(p1, p2, new THREE.Vector3(-1,0,0), dOffset, state.D.toFixed(1) + 'm'));
    
    let totalHeight = state.H + CONSTANTS.roofOverhang;
    if (state.currentRoofType === "pent") totalHeight = state.H + CONSTANTS.slopeHeight;
    else if (state.currentRoofType === "apex") totalHeight = state.H + CONSTANTS.peakHeight;

    p1 = new THREE.Vector3(-state.W/2, yHeight, -state.D/2);
    p2 = new THREE.Vector3(-state.W/2, yHeight + totalHeight, -state.D/2);
    group.add(createDimensionLine(p1, p2, new THREE.Vector3(-1,0,0), dOffset, totalHeight.toFixed(1) + 'm'));
}

export function isValidAperture(candidate) {
    const wallDim = getWallDimensions(candidate.wallId);
    const halfW = candidate.w / 2;
    const halfH = candidate.h / 2;

    if (
        (candidate.x - halfW) < -wallDim.width / 2 || 
        (candidate.x + halfW) > wallDim.width / 2 || 
        (candidate.y - halfH) < (candidate.type === 'door' ? -0.01 : 0) || 
        (candidate.y + halfH) > wallDim.height
    ) return false;

    const pad = 0.02;
    for (let current of state.apertures) {
        if (current.id !== candidate.id && current.wallId === candidate.wallId) {
            const horiz = Math.abs(candidate.x - current.x) < ((candidate.w / 2) + (current.w / 2) + pad);
            const vert = Math.abs(candidate.y - current.y) < ((candidate.h / 2) + (current.h / 2) + pad);
            if (horiz && vert) return false;
        }
    }
    return true;
}

function createWallShapeWithHoles(wallId, baseShape) {
    const wallDim = getWallDimensions(wallId);
    const wallApertures = state.apertures.filter(a => a.wallId === wallId);
    wallApertures.forEach(aperture => {
        const hole = new THREE.Path();
        const m = 0.002; 
        
        let left = aperture.x - (aperture.w / 2) + m;
        let right = aperture.x + (aperture.w / 2) - m;
        let bottom = aperture.y - (aperture.h / 2);
        let top = aperture.y + (aperture.h / 2) - m;

        if (bottom < m) bottom = m;
        if (left < -wallDim.width / 2 + m) left = -wallDim.width / 2 + m;
        if (right > wallDim.width / 2 - m) right = wallDim.width / 2 - m;
        if (top > wallDim.height - m) top = wallDim.height - m;

        hole.moveTo(left, bottom); hole.lineTo(right, bottom);
        hole.lineTo(right, top); hole.lineTo(left, top); hole.lineTo(left, bottom);
        
        baseShape.holes.push(hole);
    });
    return baseShape;
}

function buildApertureComponents(wallId, wallMesh, groupContainer) {
    const wallApertures = state.apertures.filter(a => a.wallId === wallId);
    wallApertures.forEach(aperture => {
        const group = new THREE.Group();
        group.userData.apertureId = aperture.id;
        group.userData.wallId = wallId;
        
        const isSelected = state.selectedApertureData && state.selectedApertureData.id === aperture.id;
        const frameColor = isSelected ? 0x007bff : 0x2c2c2c;
        const frameMaterial = new THREE.MeshLambertMaterial({ color: frameColor });
        const glassMaterial = new THREE.MeshLambertMaterial({ color: isSelected ? 0xcce5ff : 0x88ccff, transparent: true, opacity: 0.5 });
        const doorMaterial = new THREE.MeshLambertMaterial({ color: isSelected ? 0x007bff : 0x495057 });
        
        const frameDepth = CONSTANTS.wallThickness + 0.01; 
        const frameThickness = 0.05;
        
        if (aperture.type === 'window') {
            const topFrame = new THREE.Mesh(new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth), frameMaterial);
            topFrame.position.set(0, (aperture.h / 2) - (frameThickness / 2), 0); group.add(topFrame);
            
            const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth), frameMaterial);
            bottomFrame.position.set(0, (-aperture.h / 2) + (frameThickness / 2), 0); group.add(bottomFrame);
            
            const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, aperture.h - (frameThickness * 2), frameDepth), frameMaterial);
            leftFrame.position.set((-aperture.w / 2) + (frameThickness / 2), 0, 0); group.add(leftFrame);
            
            const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, aperture.h - (frameThickness * 2), frameDepth), frameMaterial);
            rightFrame.position.set((aperture.w / 2) - (frameThickness / 2), 0, 0); group.add(rightFrame);
            
            const glass = new THREE.Mesh(new THREE.BoxGeometry(aperture.w - frameThickness * 2, aperture.h - frameThickness * 2, frameDepth * 0.3), glassMaterial);
            group.add(glass);
        } else if (aperture.type === 'door') {
            const isDouble = aperture.w > 1.5; 
            if (isDouble) {
                const leafW = (aperture.w - (frameThickness * 3)) / 2;
                const doorL = new THREE.Mesh(new THREE.BoxGeometry(leafW, aperture.h - frameThickness, frameDepth * 0.7), doorMaterial);
                doorL.position.set(-leafW / 2 - frameThickness / 4, -frameThickness / 2, 0); group.add(doorL);
                
                const doorR = new THREE.Mesh(new THREE.BoxGeometry(leafW, aperture.h - frameThickness, frameDepth * 0.7), doorMaterial);
                doorR.position.set(leafW / 2 + frameThickness / 4, -frameThickness / 2, 0); group.add(doorR);

                const midFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness / 2, aperture.h - frameThickness, frameDepth), frameMaterial);
                midFrame.position.set(0, -frameThickness / 2, 0); group.add(midFrame);
            } else {
                const door = new THREE.Mesh(new THREE.BoxGeometry(aperture.w - (frameThickness * 2), aperture.h - frameThickness, frameDepth * 0.7), doorMaterial);
                door.position.set(0, -frameThickness / 2, 0); group.add(door);
            }
            
            const topFrame = new THREE.Mesh(new THREE.BoxGeometry(aperture.w, frameThickness, frameDepth), frameMaterial);
            topFrame.position.set(0, (aperture.h / 2) - (frameThickness / 2), 0); group.add(topFrame);
            
            const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, aperture.h - frameThickness, frameDepth), frameMaterial);
            leftFrame.position.set((-aperture.w / 2) + (frameThickness / 2), -frameThickness / 2, 0); group.add(leftFrame);
            
            const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, aperture.h - frameThickness, frameDepth), frameMaterial);
            rightFrame.position.set((aperture.w / 2) - (frameThickness / 2), -frameThickness / 2, 0); group.add(rightFrame);
        }
        
        group.position.copy(wallMesh.position);
        group.rotation.copy(wallMesh.rotation);
        group.translateX(aperture.x); group.translateY(aperture.y); group.translateZ(CONSTANTS.wallThickness / 2);
        
        if (isSelected) {
            const dOffset = 0.25; 
            const p1Top = new THREE.Vector3(-aperture.w / 2, aperture.h / 2, 0);
            const p2Top = new THREE.Vector3(aperture.w / 2, aperture.h / 2, 0);
            group.add(createDimensionLine(p1Top, p2Top, new THREE.Vector3(0, 1, 0), dOffset, aperture.w.toFixed(2) + 'm'));

            const p1Left = new THREE.Vector3(-aperture.w / 2, -aperture.h / 2, 0);
            const p2Left = new THREE.Vector3(-aperture.w / 2, aperture.h / 2, 0);
            group.add(createDimensionLine(p1Left, p2Left, new THREE.Vector3(-1, 0, 0), dOffset, aperture.h.toFixed(2) + 'm'));
        }
        
        if (!state.apertureComponents[wallId]) state.apertureComponents[wallId] = [];
        state.apertureComponents[wallId].push(group);
        groupContainer.add(group);
    });
}

function createSideWallGeometry(widthAlongZ, baseH, roofType, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-widthAlongZ / 2, 0); shape.lineTo(widthAlongZ / 2, 0);
    if (roofType === "apex") {
        shape.lineTo(widthAlongZ / 2, baseH); shape.lineTo(0, baseH + CONSTANTS.peakHeight); shape.lineTo(-widthAlongZ / 2, baseH);
    } else if (roofType === "pent") {
        shape.lineTo(widthAlongZ / 2, baseH + CONSTANTS.slopeHeight); shape.lineTo(-widthAlongZ / 2, baseH);
    } else {
        shape.lineTo(widthAlongZ / 2, baseH); shape.lineTo(-widthAlongZ / 2, baseH);
    }
    shape.closePath();
    if (wallId) createWallShapeWithHoles(wallId, shape);
    return new THREE.ExtrudeGeometry(shape, { steps: 1, depth: CONSTANTS.wallThickness, bevelEnabled: false });
}

function createRectWallGeometry(widthAlongX, heightY, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-widthAlongX / 2, 0); shape.lineTo(widthAlongX / 2, 0);
    shape.lineTo(widthAlongX / 2, heightY); shape.lineTo(-widthAlongX / 2, heightY); shape.closePath();
    if (wallId) createWallShapeWithHoles(wallId, shape);
    return new THREE.ExtrudeGeometry(shape, { steps: 1, depth: CONSTANTS.wallThickness, bevelEnabled: false });
}

function createPanelGeo(width, hLeft, hRight, wallId = null) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, hRight); shape.lineTo(-width / 2, hLeft); shape.closePath();
    if (wallId) createWallShapeWithHoles(wallId, shape);
    return new THREE.ExtrudeGeometry(shape, { steps: 1, depth: CONSTANTS.wallThickness, bevelEnabled: false });
}

function createRoof(roofType, shape, groupContainer, roofMaterial, isLShape = false, centerX = 0, centerZ = 0) {
    if (roofType === "pent") {
        const roofGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: CONSTANTS.roofThickness, bevelEnabled: false });
        roofGeo.rotateX(-Math.PI / 2);
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        const angle = -Math.atan2(CONSTANTS.slopeHeight, state.D);
        if (isLShape) {
            roof.position.set(-centerX, state.H - 0.01, -centerZ);
            roof.geometry.translate(0, 0, -state.D / 2); roof.rotation.x = angle; roof.geometry.translate(0, 0, state.D / 2);
            roof.position.y += CONSTANTS.slopeHeight / 2 + CONSTANTS.roofGap;
        } else {
            roof.rotation.x = angle; roof.position.y = state.H + CONSTANTS.slopeHeight / 2 + CONSTANTS.roofGap;
        }
        groupContainer.add(roof);
    } else if (roofType === "apex" && !isLShape) {
        const angle = Math.atan2(CONSTANTS.peakHeight, state.D / 2);
        const roofHalfWidth = (state.D / 2) / Math.cos(angle) + CONSTANTS.roofOverhang + 0.08;
        const roofPlateGeo = new THREE.BoxGeometry(state.W + CONSTANTS.roofOverhang * 2, CONSTANTS.roofThickness, roofHalfWidth);
        const overlap = -0.085;
        const zOffset = state.D / 4 - overlap;
        const roofY = state.H + CONSTANTS.peakHeight / 2;

        const roofL = new THREE.Mesh(roofPlateGeo, roofMaterial);
        roofL.position.set(0, roofY, zOffset); roofL.rotation.x = angle;
        groupContainer.add(roofL);

        const roofR = new THREE.Mesh(roofPlateGeo, roofMaterial);
        roofR.position.set(0, roofY, -zOffset); roofR.rotation.x = -angle;
        groupContainer.add(roofR);
    } else {
        const roofGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: CONSTANTS.roofThickness, bevelEnabled: false });
        roofGeo.rotateX(-Math.PI / 2);
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        if (isLShape) roof.position.set(-centerX, state.H + CONSTANTS.roofGap, -centerZ);
        else roof.position.y = state.H + CONSTANTS.roofGap;
        groupContainer.add(roof);
    }
}

export function clampAllApertures() {
    const m = 0.02; const minWindowW = 0.3; const pad = 0.02; 
    const wallGroups = {};
    
    state.apertures.forEach(ap => {
        if (!wallGroups[ap.wallId]) wallGroups[ap.wallId] = [];
        wallGroups[ap.wallId].push(ap);
    });

    for (const wallId in wallGroups) {
        let aps = wallGroups[wallId];
        const wallDim = getWallDimensions(wallId);

        aps.forEach(ap => {
            if (ap.h > wallDim.height - m * 2) {
                ap.h = Math.max(0.3, wallDim.height - m * 2);
                if (ap.type === 'door') ap.y = ap.h / 2;
            }
            const halfH = ap.h / 2;
            if (ap.type === 'door') ap.y = halfH;
            else ap.y = Math.max(halfH + m, Math.min(wallDim.height - halfH - m, ap.y));
        });

        aps.sort((a, b) => a.x - b.x);

        let totalRequiredW = aps.reduce((sum, ap) => sum + ap.w, 0) + (aps.length + 1) * pad;
        if (totalRequiredW > wallDim.width) {
            let deficit = totalRequiredW - wallDim.width;
            let shrinkableWindows = aps.filter(ap => ap.type === 'window' && ap.w > minWindowW);
            
            while (deficit > 0.01 && shrinkableWindows.length > 0) {
                let share = deficit / shrinkableWindows.length;
                for (let i = 0; i < shrinkableWindows.length; i++) {
                    let ap = shrinkableWindows[i];
                    let newW = Math.max(minWindowW, ap.w - share);
                    deficit -= (ap.w - newW); 
                    ap.w = newW;
                }
                shrinkableWindows = aps.filter(ap => ap.type === 'window' && ap.w > minWindowW);
            }
        }

        let currentX = -wallDim.width / 2 + m;
        for (let i = 0; i < aps.length; i++) {
            let ap = aps[i];
            let halfW = ap.w / 2;
            if (ap.x - halfW < currentX) ap.x = currentX + halfW;
            currentX = ap.x + halfW + pad;
        }

        let currentRightX = wallDim.width / 2 - m;
        for (let i = aps.length - 1; i >= 0; i--) {
            let ap = aps[i];
            let halfW = ap.w / 2;
            if (ap.x + halfW > currentRightX) ap.x = currentRightX - halfW;
            currentRightX = ap.x - halfW - pad;
        }
    }
}

export function applyWallVisibility() {
    Object.keys(state.walls).forEach(wallName => {
        if (state.walls[wallName]) {
            const visible = state.wallVisibility[wallName];
            state.walls[wallName].visible = visible;
            if (state.walls[wallName].userData.edgeLine) state.walls[wallName].userData.edgeLine.visible = visible;
            if (state.apertureComponents[wallName]) state.apertureComponents[wallName].forEach(comp => comp.visible = visible);
        }
    });
}

function addMeshWithEdges(geo, mat, edgeMat, group, wallId) {
    const mesh = new THREE.Mesh(geo, mat);
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, edgeMat);
    mesh.userData = { edgeLine: line, wallId: wallId }; 
    mesh.add(line);
    group.add(mesh);
    return mesh;
}

export function updateBuilding() {
    clampAllApertures(); 

    buildingGroupContainer.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
        }
    });
    buildingGroupContainer.clear();

    state.walls = { front: null, back: null, left: null, right: null, innerBack: null, innerLeft: null };
    state.apertureComponents = {};

    const exteriorColor = CONSTANTS.TEXTURES[state.currentExteriorTexture]?.color || 0x333333;
    const wallMaterial = new THREE.MeshLambertMaterial({ color: exteriorColor, side: THREE.DoubleSide });
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide });
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 1 }); 
    const t = CONSTANTS.wallThickness;

    if (state.currentShapeType === "rectangle") {
        const frontW = state.W - 2 * t;
        let leftGeo, rightGeo, frontGeo, backGeo;

        if (state.currentRoofType === "apex") {
            leftGeo = createSideWallGeometry(state.D, state.H, "apex", "left"); rightGeo = createSideWallGeometry(state.D, state.H, "apex", "right");
            frontGeo = createRectWallGeometry(frontW, state.H, "front"); backGeo = createRectWallGeometry(frontW, state.H, "back");
        } else if (state.currentRoofType === "pent") {
            leftGeo = createSideWallGeometry(state.D, state.H, "pent", "left"); rightGeo = createSideWallGeometry(state.D, state.H, "pent", "right");
            frontGeo = createRectWallGeometry(frontW, state.H + CONSTANTS.slopeHeight, "front"); backGeo = createRectWallGeometry(frontW, state.H, "back");
        } else {
            leftGeo = createSideWallGeometry(state.D, state.H, "flat", "left"); rightGeo = createSideWallGeometry(state.D, state.H, "flat", "right");
            frontGeo = createRectWallGeometry(frontW, state.H, "front"); backGeo = createRectWallGeometry(frontW, state.H, "back");
        }

        state.walls.left = addMeshWithEdges(leftGeo, wallMaterial, edgeMaterial, buildingGroupContainer, "left");
        state.walls.left.rotation.y = -Math.PI / 2; state.walls.left.position.set(-state.W / 2 + t, 0, 0); buildApertureComponents("left", state.walls.left, buildingGroupContainer);

        state.walls.right = addMeshWithEdges(rightGeo, wallMaterial, edgeMaterial, buildingGroupContainer, "right");
        state.walls.right.rotation.y = -Math.PI / 2; state.walls.right.position.set(state.W / 2, 0, 0); buildApertureComponents("right", state.walls.right, buildingGroupContainer);

        state.walls.front = addMeshWithEdges(frontGeo, wallMaterial, edgeMaterial, buildingGroupContainer, "front");
        state.walls.front.position.set(0, 0, state.D / 2 - t); buildApertureComponents("front", state.walls.front, buildingGroupContainer);

        state.walls.back = addMeshWithEdges(backGeo, wallMaterial, edgeMaterial, buildingGroupContainer, "back");
        state.walls.back.position.set(0, 0, -state.D / 2); buildApertureComponents("back", state.walls.back, buildingGroupContainer);

        const floorGeo = new THREE.PlaneGeometry(state.W, state.D); floorGeo.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(floorGeo, floorMaterial); floor.position.y = 0.01; buildingGroupContainer.add(floor);

        if (state.showRoof) {
            const roofShape = new THREE.Shape(); const o = CONSTANTS.roofOverhang;
            roofShape.moveTo(-state.W / 2 - o, -state.D / 2 - o); roofShape.lineTo(state.W / 2 + o, -state.D / 2 - o);
            roofShape.lineTo(state.W / 2 + o, state.D / 2 + o); roofShape.lineTo(-state.W / 2 - o, state.D / 2 + o); roofShape.closePath();
            createRoof(state.currentRoofType, roofShape, buildingGroupContainer, roofMaterial, false);
        }
    } else {
        const effectiveRoofType = state.currentRoofType === "apex" ? "pent" : state.currentRoofType;
        const getZHeight = (z) => { if (effectiveRoofType !== "pent") return state.H; return state.H + CONSTANTS.slopeHeight * ((z + state.D / 2) / state.D); };

        state.walls.left = addMeshWithEdges(createPanelGeo(state.D, getZHeight(-state.D / 2), getZHeight(state.D / 2), "left"), wallMaterial, edgeMaterial, buildingGroupContainer, "left");
        state.walls.left.rotation.y = -Math.PI / 2; state.walls.left.position.set(-state.W / 2 + t, 0, 0); buildApertureComponents("left", state.walls.left, buildingGroupContainer);

        state.walls.front = addMeshWithEdges(createPanelGeo(state.W - 2 * t, getZHeight(state.D / 2 - t), getZHeight(state.D / 2 - t), "front"), wallMaterial, edgeMaterial, buildingGroupContainer, "front");
        state.walls.front.position.set(0, 0, state.D / 2 - t); buildApertureComponents("front", state.walls.front, buildingGroupContainer);

        state.walls.right = addMeshWithEdges(createPanelGeo(state.D / 2, getZHeight(0), getZHeight(state.D / 2), "right"), wallMaterial, edgeMaterial, buildingGroupContainer, "right");
        state.walls.right.rotation.y = -Math.PI / 2; state.walls.right.position.set(state.W / 2, 0, state.D / 4); buildApertureComponents("right", state.walls.right, buildingGroupContainer);

        state.walls.innerBack = addMeshWithEdges(createPanelGeo(state.W / 2 - t, getZHeight(0), getZHeight(0), "innerBack"), wallMaterial, edgeMaterial, buildingGroupContainer, "innerBack");
        state.walls.innerBack.position.set(state.W / 4 - t / 2, 0, 0); buildApertureComponents("innerBack", state.walls.innerBack, buildingGroupContainer);

        state.walls.innerLeft = addMeshWithEdges(createPanelGeo(state.D / 2 + t, getZHeight(-state.D / 2), getZHeight(0), "innerLeft"), wallMaterial, edgeMaterial, buildingGroupContainer, "innerLeft");
        state.walls.innerLeft.rotation.y = -Math.PI / 2; state.walls.innerLeft.position.set(0, 0, -state.D / 4 + t / 2); buildApertureComponents("innerLeft", state.walls.innerLeft, buildingGroupContainer);

        state.walls.back = addMeshWithEdges(createPanelGeo(state.W / 2 - 2 * t, getZHeight(-state.D / 2), getZHeight(-state.D / 2), "back"), wallMaterial, edgeMaterial, buildingGroupContainer, "back");
        state.walls.back.position.set(-state.W / 4, 0, -state.D / 2); buildApertureComponents("back", state.walls.back, buildingGroupContainer);

        const floorShape = new THREE.Shape();
        floorShape.moveTo(-state.W / 2, state.D / 2); floorShape.lineTo(0, state.D / 2); floorShape.lineTo(0, 0);
        floorShape.lineTo(state.W / 2, 0); floorShape.lineTo(state.W / 2, -state.D / 2); floorShape.lineTo(-state.W / 2, -state.D / 2); floorShape.closePath();
        const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape).rotateX(-Math.PI / 2), floorMaterial); floor.position.y = 0.01; buildingGroupContainer.add(floor);

        if (state.showRoof) {
            const roofShape = new THREE.Shape(); const o = CONSTANTS.roofOverhang;
            roofShape.moveTo(-state.W / 2 - o, state.D / 2 + o); roofShape.lineTo(o, state.D / 2 + o); roofShape.lineTo(o, o);
            roofShape.lineTo(state.W / 2 + o, o); roofShape.lineTo(state.W / 2 + o, -state.D / 2 - o); roofShape.lineTo(-state.W / 2 - o, -state.D / 2 - o); roofShape.closePath();
            createRoof(effectiveRoofType, roofShape, buildingGroupContainer, roofMaterial, true, 0, 0);
        }
    }

    applyWallVisibility();
    if (state.showMeasurements && !state.selectedApertureData) {
        addMeasurements(buildingGroupContainer);
    }
}