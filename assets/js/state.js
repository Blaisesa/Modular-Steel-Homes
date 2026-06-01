// state.js

export const state = {
    // Dimensions & Config
    W: 6, 
    H: 2.8, 
    D: 4,
    currentShapeType: "rectangle",
    currentRoofType: "pent",
    showRoof: true,
    currentExteriorTexture: "default",
    showMeasurements: true,

    // Scene Collections
    walls: { front: null, back: null, left: null, right: null, innerBack: null, innerLeft: null },
    wallVisibility: { front: true, back: true, left: true, right: true, innerBack: true, innerLeft: true },
    apertures: [],
    apertureComponents: {},

    // Interaction & Selection
    selectedApertureData: null,
    isPlacingNewAperture: false,
    placementConfig: null,
    currentHoveredWall: null,
    ghostMesh: null,
    isDraggingAperture: false,
    dragStartAperture: null,

    // Camera Kinematics
    currentAngle: -Math.PI / 4,
    targetAngle: -Math.PI / 4,
    currentVerticalAngle: 0.25,
    targetVerticalAngle: 0.25,
    radius: 12,
    targetRadius: 12,
    isFreeRoam: false,
    isDragging: false,
    previousX: 0,
    previousY: 0
};

export const CONSTANTS = {
    lerpSpeed: 0.08,
    roofOverhang: 0.2, 
    slopeHeight: 0.45, 
    peakHeight: 1.1,
    wallThickness: 0.15, 
    roofThickness: 0.15, 
    roofGap: 0,
    TEXTURES: {
        default: { color: 0x303030, name: "Modern Charcoal" },
        timber: { color: 0x8b4513, name: "Natural Cedar" },
        brick: { color: 0xa52a2a, name: "Red Brick" },
        metal: { color: 0x708090, name: "Industrial Steel" }
    },
    APERTURE_PRESETS: {
        window: {
            standard: { w: 1.2, h: 1.5, y: 1.4 },
            large: { w: 2.0, h: 1.8, y: 1.5 },
            small: { w: 0.8, h: 1.0, y: 1.3 }
        },
        door: {
            standard: { w: 0.9, h: 2.1 },
            double: { w: 1.8, h: 2.1 }
        }
    }
};