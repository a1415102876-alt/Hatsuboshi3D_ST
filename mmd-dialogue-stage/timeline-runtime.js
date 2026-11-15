// Drives the existing Beat stage from a Timeline document.
//
// BeatPlayerApp still owns resource loading (models, motions, scenes) and
// the shared WebGL stage. A timeline is first turned into a preload Beat
// script, compiled, and prepared; after that this runtime takes over every
// frame: scene, camera pose, actor placement, visibility and motion timing
// all come from evaluateTimeline(doc, time).

import { applyCameraFocal, applyCameraPose, cameraPoseFromObject } from './scene-free-look.js?v=20261103-camera-lens-v1';
import { isBeatScene, resolveBeatBackgroundAsset } from './beat-background-assets.js?v=20261108-chat-clock-v1';
import { resolveBeatCue } from './beat-protocol.js?v=20261113-hkne-onsen-v1';
import { BEAT_SPEAKER_NAMES } from './beat-player-core.js?v=20261112-custom-bg-transition-v1';
import { SCENE_IDOLS } from './scene-protocol.js?v=20261111-hkne-motions-v1';
import { evaluateTimeline, timelinePreloadScript } from './timeline-model.js?v=20261114-timeline-v3';

const NAME_BY_ID = Object.fromEntries(Object.entries(SCENE_IDOLS).map(([name, id]) => [id, name]));
export const timelineActorName = id => NAME_BY_ID[id] || id;
export const TIMELINE_CAST_OPTIONS = Object.freeze(Object.entries(SCENE_IDOLS).map(([name, id]) => ({ id, name })));
// One metre in stage units: GLB actors are imported at x12.5.
export const STAGE_UNITS_PER_METRE = 12.5;
const DEFAULT_SPACING = 0.9 * STAGE_UNITS_PER_METRE;
const IDENTITY_FRAME = Object.freeze({ scale: 1, shiftX: 0, originY: 0.5 });

export class TimelineRuntime {
    constructor(app) {
        this.app = app;
        this.doc = null;
        this.ready = false;
        this.loading = null;
        this.loadToken = 0;
        this.cueByClip = new Map();
        this.motion = new Map();
        this.sceneKey = '';
        this.host = null;
        this.layoutCamera = null;
        this.playing = false;
        this.speed = 1;
        this.cameraOverride = null;
        this.lastState = null;
    }

    /** Resource key: everything that changes which assets must be loaded. */
    static resourceKey(doc) {
        return timelinePreloadScript(doc, { actorName: timelineActorName });
    }

    async load(doc) {
        const token = ++this.loadToken;
        this.ready = false;
        this.doc = doc;
        const script = TimelineRuntime.resourceKey(doc);
        this.resourceKey = script;
        const app = this.app;
        app.stop?.();
        if (!script.trim()) {
            this.ready = true;
            return true;
        }
        // The player recompiles its script once the local custom background
        // library is read; compiling before that would cancel this preload.
        await app.customBackgroundsReady?.catch?.(() => {});
        if (token !== this.loadToken) return false;
        app.elements.script.value = script;
        app.compile();
        let ok = false;
        try {
            // Follow a recompile (it replaces preloadPromise) instead of
            // reporting the cancelled first attempt as a failure.
            let promise;
            do {
                promise = app.preloadPromise;
                this.loading = promise;
                ok = await promise;
            } while (!ok && promise !== app.preloadPromise && token === this.loadToken);
        } catch (error) {
            if (token === this.loadToken) throw error;
            return false;
        }
        if (token !== this.loadToken) return false;
        app.stop?.();
        this.cueByClip.clear();
        for (const beat of app.compiled.beats || []) {
            const id = String(beat.id || '');
            if (!id.startsWith('tl-')) continue;
            const speaker = BEAT_SPEAKER_NAMES[beat.speaker] || beat.speaker;
            this.cueByClip.set(id.slice(3), `${speaker}(${resolveBeatCue(beat.cue, beat.face)})`);
        }
        this.motion.clear();
        this.sceneKey = '';
        this.host = null;
        this.layoutCamera = null;
        for (const entry of app.director.allEntries()) {
            if (entry.player) entry.player.autoIdleAdditiveOnHold = false;
        }
        this.ready = Boolean(ok);
        return this.ready;
    }

    /** Swap in an edited document whose resources are already loaded. */
    setDocument(doc) {
        this.doc = doc;
    }

    needsReload(doc) {
        return TimelineRuntime.resourceKey(doc) !== this.resourceKey;
    }

    entryFor(member) {
        const director = this.app.director;
        return director.entryFor?.(member.id, { [member.id]: member.costume }) || director.entries.get(member.id) || null;
    }

    resolveScene(background) {
        const raw = String(background || '').trim();
        if (!raw) return { name: '', kind: '' };
        const asset = resolveBeatBackgroundAsset(raw);
        if (asset.kind === '3d' && asset.matched) return { name: asset.name, kind: '3d', layout: asset.defaultLayout || '' };
        if (asset.matched) return { name: `${asset.name}.png`.replace(/\.png\.png$/u, '.png'), kind: '2d' };
        return { name: raw, kind: isBeatScene(raw) ? '3d' : '2d' };
    }

    /** Camera currently used for the frame, for "key from view". */
    currentCameraPose() {
        if (this.cameraOverride) return { ...this.cameraOverride.pose };
        const camera = this.host?.player?.camera || this.firstVisible()?.player?.camera || this.app.scenePool?.fallbackCamera;
        return camera ? cameraPoseFromObject(camera) : null;
    }

    currentFocal() {
        if (this.cameraOverride?.focal) return this.cameraOverride.focal;
        return this.lastState?.camera?.focal ?? null;
    }

    actorPose(id) {
        const member = this.doc?.cast.find(entry => entry.id === id);
        const model = member ? this.entryFor(member)?.player?.model : null;
        if (!model) return null;
        return { x: model.position.x, y: model.position.y, z: model.position.z, yaw: model.rotation.y * 180 / Math.PI };
    }

    firstVisible() {
        if (!this.doc) return null;
        for (const member of this.doc.cast) {
            const entry = this.entryFor(member);
            if (entry?.present && entry.player?.ready) return entry;
        }
        return null;
    }

    setPlaying(playing, speed = this.speed) {
        this.playing = Boolean(playing);
        this.speed = speed;
        this.syncMixerSpeed();
    }

    syncMixerSpeed() {
        for (const entry of this.app.director.allEntries()) {
            const mixer = entry.player?.animationMixer;
            if (mixer) mixer.timeScale = this.playing ? this.speed : 0;
        }
    }

    /**
     * Apply the document at `time`. `seek` forces every motion to the exact
     * frame (scrubbing); during playback motions advance on their own and are
     * only re-synced when a clip boundary is crossed.
     */
    apply(time, { seek = false } = {}) {
        if (!this.ready || !this.doc) return null;
        const state = evaluateTimeline(this.doc, time);
        this.lastState = state;
        const app = this.app;
        const castEntries = this.doc.cast.map(member => ({ member, entry: this.entryFor(member), actor: state.actors[member.id] }));
        const castSet = new Set(castEntries.map(item => item.entry).filter(Boolean));
        for (const entry of app.director.allEntries()) {
            if (castSet.has(entry)) continue;
            if (entry.present || entry.view?.visible) {
                entry.present = false;
                entry.view?.hide?.();
                entry.player?.setPresentationActive?.(false);
                entry.player?.setStageScene?.(null);
            }
        }

        // Visibility and placement.
        let fallbackIndex = 0;
        for (const { member, entry, actor } of castEntries) {
            if (!entry?.player?.ready) continue;
            const player = entry.player;
            const visible = Boolean(actor?.visible);
            if (visible !== Boolean(entry.present && entry.view?.visible)) {
                entry.present = visible;
                if (visible) {
                    entry.view.show(true);
                    player.setPresentationActive?.(true);
                } else {
                    entry.view.hide();
                    player.setPresentationActive?.(false);
                    player.setTalkLevel?.(0, { active: false });
                }
            }
            // Resource preparation leaves every actor paused; a visible actor
            // needs its loop for animation, physics and drawing.
            if (visible && player.paused) player.resume();
            player.setShotFrame?.(IDENTITY_FRAME);
            const pose = actor?.pose || { x: fallbackIndex * DEFAULT_SPACING * (fallbackIndex % 2 ? -1 : 1), y: 0, z: 0, yaw: 0 };
            if (!actor?.pose) fallbackIndex += 1;
            if (player.model) player.setActorPose(pose);
            if (visible) this.applyMotion(member, entry, actor, seek);
        }

        // Scene: hosted by the first visible actor so it shares that renderer.
        const host = this.firstVisible();
        const scene = this.resolveScene(state.scene?.background);
        const key = `${scene.name}|${state.scene?.layout || ''}|${host?.view?.idolId || ''}`;
        if (key !== this.sceneKey) {
            this.sceneKey = key;
            this.host = host;
            for (const { entry } of castEntries) {
                if (entry?.player && entry !== host) entry.player.setStageScene?.(null);
            }
            if (scene.kind === '3d') {
                app.applyBackground?.({ background: '' });
                const options = state.scene?.layout ? { layout: state.scene.layout } : {};
                app.scenePool.present(scene.name, host?.player || null, 'medium', 'center', options);
            } else {
                app.scenePool.present('', null);
                app.applyBackground?.({ background: scene.name });
            }
            this.layoutCamera = null;
            const camera = host?.player?.camera || app.scenePool?.fallbackCamera;
            if (camera) this.layoutCamera = { pose: cameraPoseFromObject(camera), fov: camera.fov };
        }

        // Camera: track keys, an editor override, or the scene layout camera.
        const cameraPose = this.cameraOverride?.pose || state.camera?.pose || this.layoutCamera?.pose || null;
        const focal = this.cameraOverride?.focal ?? state.camera?.focal ?? null;
        const cameras = castEntries.filter(item => item.entry?.present && item.entry.player?.camera).map(item => item.entry.player.camera);
        if (app.scenePool?.fallbackCamera && !host) cameras.push(app.scenePool.fallbackCamera);
        for (const camera of cameras) {
            if (cameraPose) applyCameraPose(camera, cameraPose);
            if (focal) applyCameraFocal(camera, focal);
            else if (this.layoutCamera?.fov) { camera.fov = this.layoutCamera.fov; camera.updateProjectionMatrix(); }
            if (host?.player?.stageScene?.ensureCameraRange) host.player.stageScene.ensureCameraRange(camera);
        }

        // Layer order. The scene host's layer carries the opaque 3D scene, so
        // it must be at the bottom; the other actors are composited over it,
        // farthest first.
        const visibleItems = castEntries.filter(item => item.entry?.present && item.entry.player?.model);
        const others = visibleItems.filter(item => item.entry !== host);
        if (cameraPose) {
            others.sort((a, b) => {
                const da = Math.hypot(a.entry.player.model.position.x - cameraPose.x, a.entry.player.model.position.z - cameraPose.z);
                const db = Math.hypot(b.entry.player.model.position.x - cameraPose.x, b.entry.player.model.position.z - cameraPose.z);
                return db - da;
            });
        }
        if (host) host.view.setOrder?.(1);
        others.forEach((item, index) => item.entry.view.setOrder?.(index + 2));

        // Lip motion while a motion clip marked as speech is active.
        for (const { entry, actor } of castEntries) {
            if (!entry?.present || !entry.player?.setTalking) continue;
            const talking = Boolean(actor?.talking) && this.playing;
            if (Boolean(entry.player.talking) !== talking) void entry.player.setTalking(talking);
        }

        this.syncMixerSpeed();
        this.render(host);
        return state;
    }

    applyMotion(member, entry, actor, seek) {
        const player = entry.player;
        // Before an actor's first clip she holds the preloaded idle pose.
        const motion = actor?.motion || { clipId: `idle-${member.id}`, cue: 'idle', face: '', localTime: this.lastState?.time || 0 };
        const state = this.motion.get(member.id) || { clipId: '', pending: null, token: 0 };
        this.motion.set(member.id, state);
        if (motion.clipId !== state.clipId) {
            state.clipId = motion.clipId;
            const token = ++state.token;
            const cue = this.cueByClip.get(motion.clipId) || `${timelineActorName(member.id)}(${resolveBeatCue(motion.cue, motion.face)})`;
            state.pending = player.playSpeakerCue(cue, { firstFrame: seek || !this.playing, isCurrent: () => token === state.token })
                .then(played => {
                    if (token !== state.token) return;
                    state.pending = null;
                    // Land on the frame the timeline asks for now, not when the cue was requested.
                    const now = this.lastState?.actors?.[member.id]?.motion
                        || { clipId: `idle-${member.id}`, localTime: this.lastState?.time || 0 };
                    if (played && now.clipId === motion.clipId) this.seekMotion(player, now.localTime);
                    this.syncMixerSpeed();
                    this.render(this.host);
                })
                .catch(error => console.warn('[Timeline] motion failed', cue, error));
            return;
        }
        if (seek && !state.pending) this.seekMotion(player, motion.localTime);
    }

    seekMotion(player, localTime) {
        const mixer = player.animationMixer;
        if (!mixer) return;
        for (const action of player.liveActions || []) {
            const clip = action.getClip();
            const length = clip?.duration || 0;
            const looping = action.loop !== 2200; // THREE.LoopOnce
            action.enabled = true;
            action.setEffectiveWeight?.(1);
            action.time = length > 0 ? (looping ? localTime % length : Math.min(localTime, length)) : 0;
            action.paused = false;
        }
        for (const action of player.fadingActions || []) action.stop?.();
        if (player.fadingActions) player.fadingActions.length = 0;
        const scale = mixer.timeScale;
        mixer.timeScale = 1;
        mixer.update(0);
        mixer.timeScale = scale;
        player.secondaryMotion?.reset?.();
        player.physicsProxy?.reset?.();
    }

    render(host = this.host) {
        let drew = false;
        for (const member of this.doc?.cast || []) {
            const entry = this.entryFor(member);
            if (!entry?.present || !entry.player?.ready) continue;
            entry.player.renderFrame?.();
            drew = true;
        }
        if (!drew && this.app.scenePool?.renderBackground) this.app.scenePool.renderBackground();
        return drew;
    }

    dispose() {
        this.loadToken += 1;
        this.ready = false;
    }
}
