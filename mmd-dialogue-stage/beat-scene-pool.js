import * as THREE from 'three';
import { GakumasSceneStage } from './gakumas-scene.js?v=20261017-browser-cache-v1';
import { GakumasPostPass } from './gakumas-post.js?v=20261004-beat-taa-v2';
import { isBeatScene, resolveBeatBackgroundAsset, sceneAssetUrl } from './beat-background-assets.js?v=20261008-background-aliases-v1';

function warmScene(renderer, scene, camera) {
    const textures = new Set();
    scene.traverse(object => {
        for (const material of [object.material].flat().filter(Boolean)) {
            for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
            for (const uniform of Object.values(material.uniforms || {})) {
                for (const value of [uniform.value].flat()) if (value?.isTexture) textures.add(value);
            }
        }
    });
    textures.forEach(texture => renderer.initTexture(texture));
    renderer.compile(scene, camera);
}

// One parsed scene per resource. Only the focused character's renderer owns
// its root/sky at a time; background and character then share depth and camera.
export class BeatScenePool {
    constructor(container) {
        this.container = container;
        this.entries = new Map();
        this.activePlayer = null;
        this.warmQueue = Promise.resolve();
        this.disposed = false;
        this.fallbackCanvas = null;
    }

    async preload(names) {
        const selected = [...new Set(names.filter(isBeatScene))];
        await Promise.all(selected.map(async name => {
            if (this.entries.has(name)) return this.entries.get(name).ready;
            const asset = resolveBeatBackgroundAsset(name);
            if (!asset.matched) return false;
            const stage = new GakumasSceneStage({ scene: new THREE.Scene(), scale: 12.5 });
            stage.resources = this.resources;
            const entry = { asset, stage, loaded: false };
            this.entries.set(name, entry);
            entry.ready = stage.load(sceneAssetUrl(asset), { layout: 'generic-medium' }).then(stats => {
                entry.loaded = Boolean(stats) && !this.disposed;
                if (this.disposed) stage.unload();
                return entry.loaded;
            }).catch(error => {
                console.warn('[BeatScenePool] scene preload failed', name, error);
                return false;
            });
            return entry.ready;
        }));
        return selected.every(name => this.entries.get(name)?.loaded);
    }

    warmPlayers(players, names, isCurrent = () => true) {
        this.warmQueue = this.warmQueue.catch(() => {}).then(async () => {
            for (const name of names.filter(isBeatScene)) {
                const entry = this.entries.get(name);
                if (entry?.loaded && isCurrent() && !this.disposed) this.drawBackground(entry.stage, 'medium', 'center', false);
            }
            for (const player of players) {
                if (!isCurrent() || this.disposed) return false;
                player.setPresentationActive(false);
                for (const name of names.filter(isBeatScene)) {
                    const entry = this.entries.get(name);
                    if (!entry?.loaded) continue;
                    // Compile off-screen materials and upload their textures too.
                    // The warmup does not advance the prepared character pose.
                    try {
                        player.setStageScene(entry.stage, 'medium', 'center');
                        warmScene(player.renderer, player.scene, player.camera);
                        player.renderFrame();
                    } finally {
                        player.setStageScene(null);
                    }
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    if (!isCurrent() || this.disposed) return false;
                }
            }
            return true;
        });
        return this.warmQueue;
    }

    present(name, player, shot = 'medium', position = 'center') {
        if (this.activePlayer && this.activePlayer !== player) this.activePlayer.setStageScene(null);
        this.activePlayer = null;
        if (this.fallbackCanvas) this.fallbackCanvas.style.visibility = 'hidden';
        this.fallbackStage = null;
        if (!isBeatScene(name)) {
            player?.setStageScene(null);
            return false;
        }
        const entry = this.entries.get(name);
        if (!entry?.loaded) return false;
        if (player) {
            this.activePlayer = player;
            player.setStageScene(entry.stage, shot, position);
            player.renderFrame();
        } else {
            this.drawBackground(entry.stage, shot, position);
        }
        return true;
    }

    drawBackground(stage, shot, position, visible = true) {
        if (!this.fallbackCanvas) {
            const canvas = this.container.ownerDocument.createElement('canvas');
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;';
            this.container.append(canvas);
            this.fallbackCanvas = canvas;
            this.fallbackRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: true });
            this.fallbackRenderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75));
            this.fallbackRenderer.outputColorSpace = THREE.SRGBColorSpace;
            this.fallbackRenderer.toneMapping = THREE.NoToneMapping;
            this.fallbackCamera = new THREE.PerspectiveCamera(36, 1, .1, 10000);
            this.fallbackPost = new GakumasPostPass(this.fallbackRenderer, { keepAlpha: true });
            this.fallbackResize = new ResizeObserver(() => {
                if (this.fallbackStage && this.fallbackCanvas.style.visibility === 'visible') this.drawBackground(this.fallbackStage, this.fallbackShot, this.fallbackPosition);
            });
            this.fallbackResize.observe(this.container);
        }
        stage.applyBeatLayout(shot, position);
        stage.scene.add(stage.root);
        if (stage.sky) stage.scene.add(stage.sky);
        const rect = this.container.getBoundingClientRect();
        const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
        this.fallbackRenderer.setSize(width, height, false);
        const view = stage.cameraView();
        const camera = this.fallbackCamera;
        camera.position.fromArray(view.position);camera.up.fromArray(view.up);camera.lookAt(new THREE.Vector3().fromArray(view.target));
        camera.aspect = width / height;camera.fov = view.fov;camera.near = view.near;camera.far = view.far;
        stage.ensureCameraRange(camera);camera.updateProjectionMatrix();
        if (!visible) warmScene(this.fallbackRenderer, stage.scene, camera);
        this.fallbackPost.enabled = true;this.fallbackPost.apply(stage.post);this.fallbackPost.resetHistory = true;
        this.fallbackPost.render(() => this.fallbackRenderer.render(stage.scene, camera), camera);
        this.fallbackCanvas.style.visibility = visible ? 'visible' : 'hidden';
        this.fallbackStage = stage;this.fallbackShot = shot;this.fallbackPosition = position;
    }

    dispose() {
        this.disposed = true;
        this.fallbackStage = null;
        this.activePlayer?.setStageScene(null);
        this.activePlayer = null;
        this.fallbackResize?.disconnect();
        this.fallbackPost?.dispose();
        this.fallbackRenderer?.dispose();
        this.fallbackCanvas?.remove();
        for (const { stage } of this.entries.values()) {
            stage.scene.add(stage.root);
            if (stage.sky) stage.scene.add(stage.sky);
            stage.unload();
        }
        this.entries.clear();
    }
}
