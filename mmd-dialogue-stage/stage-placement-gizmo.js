import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { scenePointToStage } from './stage-placement.js?v=20261026-placement-v2';

// A separate editor pass keeps handles readable without subjecting them to
// character outlines, scene postprocessing or temporal history.
export function createPlacementGizmo({ camera, canvas, orbit, actorRoot, beforeEdit, onChange, onDragEnd }) {
    const overlay = new THREE.Scene();
    const control = new TransformControls(camera, canvas);
    control.setMode('translate');
    control.setSpace('world');
    control.setSize(0.85);
    control.enabled = false;
    overlay.add(control);
    let enabled = false, orbitState = null;
    const perimeter = new THREE.Group();
    overlay.add(perimeter);

    function lockOrbit() {
        if (orbitState) return;
        orbitState = { enabled: orbit.enabled, damping: orbit.enableDamping };
        orbit.enableDamping = false;
        orbit.update(); // Clear any residual orbit damping before dragging.
        orbit.enabled = false;
    }
    function unlockOrbit() {
        if (!orbitState) return;
        orbit.enabled = orbitState.enabled;
        orbit.enableDamping = orbitState.damping;
        orbitState = null;
    }
    function preparePointer(event) {
        if (!enabled || event.button !== 0) return;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        control.updateMatrixWorld();
        control.pointerHover({ x: (event.clientX - rect.left) / rect.width * 2 - 1, y: -(event.clientY - rect.top) / rect.height * 2 + 1, button: event.button });
        if (!control.axis) return;
        beforeEdit();
        lockOrbit(); // Capture phase runs before OrbitControls' pointerdown.
        control.updateMatrixWorld();
    }
    control.addEventListener('dragging-changed', event => event.value ? lockOrbit() : unlockOrbit());
    control.addEventListener('objectChange', () => onChange());
    control.addEventListener('mouseUp', () => onDragEnd?.());
    canvas.addEventListener('pointerdown', preparePointer, true);

    function cancel(revert = false) {
        if (control.dragging) {
            if (revert) control.reset();
            control.pointerUp({ button: 0 });
        }
        unlockOrbit();
    }
    const cancelPointer = () => cancel(true);
    // TransformControls releases capture before its normal pointerUp. Keep the
    // last position here; only an explicit cancel/Escape should roll it back.
    const loseCapture = () => { if (control.dragging) cancel(); };
    const keydown = event => {
        if (event.key === 'Escape' && control.dragging) { cancel(true); event.preventDefault(); }
    };
    canvas.addEventListener('pointercancel', cancelPointer);
    canvas.addEventListener('lostpointercapture', loseCapture);
    window.addEventListener('blur', cancelPointer);
    window.addEventListener('keydown', keydown);

    function clearBoundary() {
        for (const child of [...perimeter.children]) {
            child.geometry?.dispose(); child.material?.dispose(); perimeter.remove(child);
        }
    }

    return {
        cancel,
        setEnabled(value) {
            value = Boolean(value);
            if (value === enabled) return;
            enabled = value;
            if (enabled) control.attach(actorRoot);
            else { cancel(); control.detach(); }
            control.enabled = enabled;
        },
        setBoundary(boundary, transform) {
            clearBoundary();
            if (!boundary || !transform) return;
            const points = boundary.points.map(p => new THREE.Vector3().fromArray(scenePointToStage([p[0], p[1] + 0.02, p[2]], transform)));
            perimeter.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
                new THREE.LineBasicMaterial({ color: 0xf4bd45, depthTest: false, toneMapped: false })));
            for (const point of points) {
                const marker = new THREE.Mesh(new THREE.SphereGeometry(transform.scale * 0.06, 8, 6),
                    new THREE.MeshBasicMaterial({ color: 0xf4bd45, depthTest: false, toneMapped: false }));
                marker.position.copy(point); perimeter.add(marker);
            }
        },
        render(renderer) {
            if (!enabled) return;
            const wasAutoClear = renderer.autoClear;
            try {
                renderer.autoClear = false;
                renderer.clearDepth();
                renderer.render(overlay, camera);
            } finally { renderer.autoClear = wasAutoClear; }
        },
        dispose() {
            cancel(); clearBoundary(); control.dispose();
            canvas.removeEventListener('pointerdown', preparePointer, true);
            canvas.removeEventListener('pointercancel', cancelPointer);
            canvas.removeEventListener('lostpointercapture', loseCapture);
            window.removeEventListener('blur', cancelPointer);
            window.removeEventListener('keydown', keydown);
        },
    };
}
