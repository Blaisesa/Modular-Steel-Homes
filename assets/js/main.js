// main.js
import { initEngine, animate } from './engine.js';
import { updateBuilding } from './geometry.js';
import { setupInteractions } from './interaction.js';
import { setupUI, fitCamera } from './ui.js';

document.addEventListener("DOMContentLoaded", () => {
    // 1. Boot the render engine
    initEngine("builder-viewport");
    
    // 2. Attach Pointer / Drag controls
    setupInteractions("builder-viewport");
    
    // 3. Mount UI and global HTML bindings
    setupUI();
    
    // 4. Compile the initial 3D mesh
    updateBuilding();
    fitCamera();
    
    // 5. Start the render loop
    animate();
});