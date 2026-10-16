import { createSceneDirector } from './live-portrait.js?v=20261017-browser-cache-v1';
import { sceneIdolId } from './scene-protocol.js?v=20261006-star-eyes-v1';
import { buildStageSlides, parseBeatScript, resolveBeatCue } from './beat-protocol.js?v=20261014-npc-portraits-v1';
import { BeatScenePool } from './beat-scene-pool.js?v=20261017-browser-cache-v1';
import { isBeatScene } from './beat-background-assets.js?v=20261008-background-aliases-v1';
import { beatSpeakerStyle } from './beat-speaker-theme.js?v=20261007-speaker-colors-v1';
import { BEAT_CUES, BEAT_EFFECTS, BEAT_FACES, BEAT_OVERLAYS, BEAT_POSITIONS, BEAT_SHOTS, BEAT_SPEAKER_NAMES, backgroundPanPosition, beatActorId, beatBackgroundChanged, buildBackgroundPlan, estimateBeatHold, getShotPreset, resolveBeatShot, stagePositionOffset } from './beat-player-core.js?v=20261014-npc-portraits-v1';
import { BEAT_BACKGROUND_NAMES, backgroundAssetUrl, preloadBackgrounds } from './beat-backgrounds.js?v=20261017-browser-cache-v1';
import { TtsLipSyncAnalyzer } from './tts-lip-sync.js?v=20261013-audio-talk-v3';
import { loadResourceLibrary, ResourceSession } from './asset-runtime.js';
import { buildDialogueAssetPlan } from './dialogue-asset-plan.js';
import { createResourceLoading } from './resource-loading.js';
import { ResourceBarrier } from './resource-barrier.js';

// Resolve against this module. A document-relative ./backgrounds_2d path
// points at the produce page when the player is embedded there.
const BEAT_BACKGROUND_ROOT = new URL('./backgrounds_2d/', import.meta.url).href;

const SAMPLE_SCRIPT = `<beat speaker="kotone" cue="greet" look="mao" position="center" background="宿舍门口-午" shot="medium">
啊、麻央宿舍长，早上好！
</beat>

<beat speaker="mao" cue="talk" look="kotone" shot="medium">
早安，琴音。一大早就打扫，辛苦了。
</beat>

<beat speaker="kotone" cue="happy" look="mao" shot="close">
感谢关心！晨练加油！
</beat>

<beat speaker="rinami" cue="greet" look="kotone" shot="reaction">
琴音妹妹早上好。
</beat>

<beat speaker="rinami" cue="happy" look="kotone">
谢谢你来打扫卫生。
</beat>`;

const CHOICE_SCRIPT = `<beat speaker="kotone" cue="talk" look="camera" position="center" background="宿舍门口-午" shot="medium">
制作人，清扫已经做完了。接下来要去哪里？
</beat>
<choice>
<option>先去教室准备下一节课。</option>
<option>回宿舍休息一下。</option>
<option>去操场做晨练。</option>
<option>在门口等麻央一起走。</option>
</choice>`;

const SCENE_SCRIPT = `<beat speaker="kotone" cue="talk" look="camera" position="center" background="声乐练习室-午" shot="medium">制作人，今天先从发声练习开始吗？</beat>
<beat speaker="producer">先按自己的节奏试一遍。</beat>
<beat speaker="mao" cue="talk" look="camera" position="right" shot="medium">我也准备好了。</beat>
<beat speaker="kotone" cue="happy" look="camera" position="center" shot="close">好！那我先来。</beat>
<beat speaker="rinami" cue="greet" look="camera" position="left" shot="reaction">琴音妹妹，加油。</beat>`;

const NAME_MAP = BEAT_SPEAKER_NAMES;
const ACTOR_OPTIONS = [...new Set([...Object.keys(NAME_MAP), ...Object.values(NAME_MAP)])];

function getElement(root, id) {
    return root.querySelector(`#${id}`) || document.getElementById(id);
}

export class BeatPlayerApp {
    constructor(root = document, options = {}) {
        this.root = root;
        this.elements = options.elements || {
            stage: getElement(root, 'beatStage'),
            background: getElement(root, 'beatBackground'),
            script: getElement(root, 'beatScript'),
            load: getElement(root, 'loadBeatBtn'),
            sample: getElement(root, 'sampleBeatBtn'),
            choiceSample: getElement(root, 'choiceBeatBtn'),
            sceneSample: getElement(root, 'sceneBeatBtn'),
            dialogueCard: getElement(root, 'beatDialogueCard'),
            portrait: getElement(root, 'beatSpeakerPortrait'),
            choices: getElement(root, 'beatChoices'),
            choiceList: getElement(root, 'beatChoiceList'),
            play: getElement(root, 'playBeatBtn'),
            previous: getElement(root, 'previousBeatBtn'),
            next: getElement(root, 'nextBeatBtn'),
            stop: getElement(root, 'stopBeatBtn'),
            auto: getElement(root, 'beatAutoPlay'),
            progress: getElement(root, 'beatProgress'),
            speaker: getElement(root, 'beatSpeaker'),
            text: getElement(root, 'beatText'),
            shot: getElement(root, 'beatShot'),
            status: getElement(root, 'beatStatus'),
            diagnostics: getElement(root, 'beatDiagnostics'),
        };
        this.director = createSceneDirector(this.elements.stage, {
            // Medium dialogue: head sits below the top of the portrait, and the
            // hips land near the dialogue box. Other shots zoom around that.
            cameraDistanceFactor: 1.6,
            cameraTargetY: 0.71,
            autoIdleAdditiveOnHold: true,
        });
        this.director.useShotFrame = true;
        this.scenePool = new BeatScenePool(this.elements.stage);
        this.resourceGeneration = 0;
        this.resourceLoading = createResourceLoading(this.elements.stage, () => this.retryResources());
        this.state = { generation: 0, current: -1, playing: false, timer: null, choosing: false, selectedChoice: -1 };
        this.compiled = { beats: [], slides: [], beatIndexes: [], choices: [], errors: [] };
        this.preloadPromise = Promise.resolve(false);
        this.preloadPlan = { cast: [], cuesById: {} };
        this.backgroundCategory = String(options.backgroundCategory || '').trim().toLowerCase();
        this.backgroundContext = String(options.backgroundContext || '').trim();
        this.defaultBackground = String(options.defaultBackground || '').trim();
        this.resolveSpeakerTheme = options.resolveSpeakerTheme;
        this.fixedPresentation = options.fixedPresentation || null;
        this.defaultCostumes = options.defaultCostumes || {};
        this.backgroundImages = new Map();
        this.backgroundPlan = [];
        this.focusedActor = '';
        this.tts = options.tts || globalThis.HatsuFishTts || null;
        this.ttsSession = '';
        this.ttsLipSync = options.ttsLipSync || new TtsLipSyncAnalyzer();
        this.ttsLipSyncSpeaker = '';
        this.elements.portrait?.addEventListener('error', () => { this.elements.portrait.hidden = true; });
        if (options.bindEvents !== false) this.bindEvents();
        if (options.loadSample !== false && this.elements.script) {
            this.elements.script.value = SAMPLE_SCRIPT;
            this.compile();
        }
    }

    bindEvents() {
        this.elements.load?.addEventListener('click', () => this.compile());
        this.elements.sample?.addEventListener('click', () => {
            this.elements.script.value = SAMPLE_SCRIPT;
            this.compile();
        });
        this.elements.choiceSample?.addEventListener('click', () => {
            this.elements.script.value = CHOICE_SCRIPT;
            this.compile();
        });
        this.elements.sceneSample?.addEventListener('click', () => {
            this.elements.script.value = SCENE_SCRIPT;
            this.compile();
        });
        this.elements.play?.addEventListener('click', () => this.togglePlay());
        this.elements.previous?.addEventListener('click', () => this.goTo(Math.max(0, this.state.current - 1), { autoplay: false }));
        this.elements.next?.addEventListener('click', () => this.advanceDialogue());
        getElement(this.root, 'advanceBeatBtn')?.addEventListener('click', () => this.advanceDialogue());
        this.elements.dialogueCard?.addEventListener('click', event => {
            if (event.defaultPrevented || event.target.closest('button, a, input, textarea, select, label')) return;
            this.advanceDialogue();
        });
        this.elements.dialogueCard?.addEventListener('keydown', event => {
            if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            this.advanceDialogue();
        });

        this.elements.stop?.addEventListener('click', () => this.stop());
        this.elements.auto?.addEventListener('change', () => {
            if (this.state.playing && this.state.current >= 0) this.scheduleNext();
        });
    }

    compile({ prepareCompiled } = {}) {
        this.stop();
        this.resourceBarrier?.cancel();
        this.resources?.dispose();
        if (this.resourceGeneration) this.resetResourcePlayers();
        this.ttsSession = this.tts?.beginSession?.(`beat-${Date.now()}`) || '';
        this.resourceGeneration += 1;
        this.scenePool.present('', null);
        for (const entry of this.director.allEntries()) {
            entry.present = false;
            entry.canvas.style.visibility = 'hidden';
            entry.canvas.style.opacity = '0';
        }
        this.state.selectedChoice = -1;
        this.needsResourcePreparation = false;
        this.hideChoicePanel();
        const parsed = parseBeatScript(this.elements.script.value, {
            actors: ACTOR_OPTIONS,
            allowOtherSpeakers: true,
            cues: BEAT_CUES,
            faces: BEAT_FACES,
            overlays: BEAT_OVERLAYS,
            effects: BEAT_EFFECTS,
            shots: BEAT_SHOTS,
            positions: BEAT_POSITIONS,
            backgrounds: BEAT_BACKGROUND_NAMES,
            backgroundCategory: this.backgroundCategory,
            backgroundContext: this.backgroundContext,
            defaultBackground: this.defaultBackground,
            defaultCostumes: this.defaultCostumes,
        });
        const stage = buildStageSlides(parsed.beats, NAME_MAP);
        this.compiled = { ...parsed, ...stage };
        prepareCompiled?.(this.compiled);
        this.preloadPlan = this.buildPreloadPlan(parsed.beats);
        this.backgroundPlan = buildBackgroundPlan(parsed.beats);
        this.renderDiagnostics();
        this.state.current = -1;
        this.renderBeat(null);
        if (!parsed.beats.length) {
            this.preloadPromise = Promise.resolve(false);
            this.setStatus('没有可播放的 Beat。');
            return;
        }
        const generation = this.resourceGeneration;
        const choiceNote = parsed.choices.length === 4 ? '，结尾有选项事件' : '';
        this.setStatus(`已解析 ${parsed.beats.length} 段 Beat${choiceNote}，正在预加载角色资源…`);
        this.resourceBarrier = new ResourceBarrier({
            prepare: () => this.prepareResources(this.preloadPlan, generation),
            beforeRetry: () => { this.resources?.dispose(); this.resetResourcePlayers(); },
            isCurrent: () => generation === this.resourceGeneration,
        });
        this.preloadPromise = this.resourceBarrier.run();
        // A rejected barrier remains rejected for callers, without an unhandled
        // rejection when the user is still looking at the script editor.
        this.preloadPromise.catch(() => {});
        this.prepareBeatVoices();
    }

    async togglePlay() {
        if (this.state.playing) {
            this.stop();
            return;
        }
        if (!this.compiled.beats.length || this.needsResourcePreparation) this.compile();
        if (!this.compiled.beats.length) return;
        this.state.playing = true;
        this.updatePlayButton();
        const generation = ++this.state.generation;
        if (!await this.preloadPromise) return false;
        if (!this.state.playing || generation !== this.state.generation) return;
        const index = this.state.current < 0 ? 0 : this.state.current;
        await this.goTo(index, { autoplay: true });
    }

    async goTo(index, { autoplay = this.state.playing } = {}) {
        if (index >= this.compiled.beats.length) {
            if (this.compiled.choices?.length === 4 && this.state.selectedChoice < 0) {
                this.presentChoices();
                return false;
            }
            // Let the final sentence finish playing when autoplay reaches the
            // end of the script. Explicit stop/compile actions still cancel it.
            this.stop({ cancelTts: false });
            return false;
        }
        if (index < 0) return false;
        const previousIndex = this.state.current;
        this.state.choosing = false;
        this.state.selectedChoice = -1;
        this.hideChoicePanel();
        this.clearTimer();
        this.state.current = index;
        const generation = ++this.state.generation;
        const beat = this.compiled.beats[index];
        const slideIndex = this.compiled.beatIndexes[index];
        const speakerName = NAME_MAP[beat.speaker] || beat.speaker;
        const entryCue = speakerName && sceneIdolId(speakerName)
            ? `${speakerName}(${resolveBeatCue(beat.cue, beat.face)})`
            : '';
        const previousBackground = previousIndex >= 0 && previousIndex !== index
            ? this.compiled.beats[previousIndex]?.background
            : '';
        const sceneChanged = beatBackgroundChanged(previousBackground, beat.background);
        this.cancelSceneWipe();
        const theme = beatSpeakerStyle(speakerName, this.resolveSpeakerTheme);
        const wipe = sceneChanged ? this.playSceneWipe(theme.color === '#978c83' ? '#ff4f9a' : theme.color) : null;
        if (!wipe) this.renderBeat(beat);
        this.setStatus(`正在准备第 ${index + 1} / ${this.compiled.beats.length} 段…`);
        try {
            if (!await this.preloadPromise) return false;
            if (generation !== this.state.generation) return false;
            if (wipe) await wipe.covered;
            if (generation !== this.state.generation || (wipe && !wipe.active())) return false;
            if (wipe) this.renderBeat(beat);
            let cuePrepared = false;
            const ready = await this.director.sync(this.compiled.slides, slideIndex, {
                animate: false,
                entryCue,
                costumes: beat.costumes,
                deferPresentation: true,
                onEntryCuePrepared: () => { cuePrepared = true; },
            });
            if (generation !== this.state.generation) return false;
            const sceneReady = this.applyShot(beat);
            if (ready && beat.effects?.length) {
                await this.director.setFacialEffects(speakerName, beat.effects, this.focusedActor);
            } else if (ready && speakerName && sceneIdolId(speakerName)) {
                await this.director.setFacialEffects(speakerName, [], this.focusedActor);
            }
            if (ready && speakerName && sceneIdolId(speakerName)) {
                // sync already selected and posed this Beat's body/face pair. A
                // second selection would choose another variant and move its root
                // from the first entry motion's start to the second one's start.
                if (!cuePrepared) await this.director.speak(entryCue, 'dialogue');
                for (const overlay of beat.overlay || []) {
                    await this.director.speak(`${speakerName}(${resolveBeatCue(overlay)})`, 'overlay');
                }
            }
            if (generation !== this.state.generation) return false;
            this.director.resume();
            const voicePlayback = this.playBeatVoice(beat, generation);
            if (wipe?.active()) wipe.finish();
            this.setStatus(ready && sceneReady ? `第 ${index + 1} / ${this.compiled.beats.length} 段` : '部分角色或场景资源未就绪，已保留台词和可用内容。');
            if (autoplay && this.elements.auto.checked) this.scheduleNext(generation, voicePlayback);
            return true;
        } finally {
            if (wipe?.active() && !wipe.revealed) this.cancelSceneWipe();
        }
    }

    prepareBeatVoices() {
        if (!this.tts?.prepare || !this.ttsSession) return;
        this.compiled.beats.forEach((beat, index) => {
            if (!beat?.ttsText) return;
            const speakerName = NAME_MAP[beat.speaker] || beat.speaker;
            this.tts.prepare({
                id: beat.id || `${index}`,
                speaker: speakerName,
                text: beat.ttsText,
                session: this.ttsSession,
                priority: index
            });
        });
    }

    isTtsLipSyncEnabled() {
        const config = this.tts?.getConfig?.();
        return config ? config.enabled !== false : true;
    }

    stopTtsLipSync() {
        this.ttsLipSync?.stop?.();
        if (this.ttsLipSyncSpeaker) {
            this.director.setTalkLevel?.(this.ttsLipSyncSpeaker, 0, { active: false });
        }
        this.ttsLipSyncSpeaker = '';
    }

    startTtsLipSync(audio, speakerName, generation) {
        this.stopTtsLipSync();
        if (!audio || !this.isTtsLipSyncEnabled() || generation !== this.state.generation) return false;
        this.ttsLipSyncSpeaker = speakerName;
        const started = this.ttsLipSync?.start?.(audio, metrics => {
            if (generation !== this.state.generation || this.ttsLipSyncSpeaker !== speakerName) return;
            this.director.setTalkLevel?.(speakerName, metrics.talkPower, {
                active: true,
                isTalk: metrics.isTalk,
            });
        });
        if (!started) {
            this.ttsLipSyncSpeaker = '';
            return false;
        }
        return true;
    }

    playBeatVoice(beat, generation) {
        const speakerName = NAME_MAP[beat?.speaker] || beat?.speaker || '';
        if (!beat?.ttsText || typeof this.tts?.playPrepared !== 'function') {
            this.stopTtsLipSync();
            this.tts?.stopPlayback?.();
            return Promise.resolve(false);
        }
        this.stopTtsLipSync();
        return this.tts.playPrepared({
            id: beat.id || `${this.state.current}`,
            speaker: speakerName,
            text: beat.ttsText,
            session: this.ttsSession,
            isCurrent: () => generation === this.state.generation,
            onAudio: audio => this.startTtsLipSync(audio, speakerName, generation),
            onPlaybackEnd: () => {
                if (generation === this.state.generation && this.ttsLipSyncSpeaker === speakerName) {
                    this.stopTtsLipSync();
                }
            },
        });
    }

    scheduleNext(generation = this.state.generation, voicePlayback = null) {
        this.clearTimer();
        if (!this.state.playing || generation !== this.state.generation) return;
        const beat = this.compiled.beats[this.state.current];
        if (!beat) return;
        const hold = beat.wait === 'none' ? 80 : estimateBeatHold(beat.text);
        const advance = () => {
            if (generation !== this.state.generation) return;
            this.goTo(this.state.current + 1, { autoplay: true });
        };
        if (beat.wait !== 'none' && voicePlayback && typeof voicePlayback.then === 'function') {
            const timer = window.setTimeout(advance, Math.max(hold, 20000));
            this.state.timer = timer;
            voicePlayback.then((played) => {
                if (generation !== this.state.generation || this.state.timer !== timer) return;
                this.clearTimer();
                this.state.timer = window.setTimeout(advance, played ? 240 : hold);
            });
            return;
        }
        this.state.timer = window.setTimeout(advance, hold);
    }

    clearTimer() {
        if (this.state.timer !== null) window.clearTimeout(this.state.timer);
        this.state.timer = null;
    }

    presentChoices() {
        this.clearTimer();
        this.state.playing = false;
        this.state.choosing = true;
        this.updatePlayButton();
        this.renderChoiceButtons();
        if (this.elements.dialogueCard) this.elements.dialogueCard.hidden = true;
        if (this.elements.choices) this.elements.choices.hidden = false;
        this.setStatus('请从四个行动里选择。');
    }

    renderChoiceButtons() {
        const list = this.elements.choiceList;
        if (!list) return;
        list.replaceChildren();
        this.compiled.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'beat-choice-button';
            const label = document.createElement('span');
            label.className = 'beat-choice-label';
            label.textContent = choice.text;
            button.append(label);
            button.addEventListener('click', () => this.selectChoice(index));
            list.append(button);
        });
    }

    selectChoice(index) {
        const choice = this.compiled.choices[index];
        if (!choice || !this.state.choosing) return;
        this.state.selectedChoice = index;
        this.state.choosing = false;
        this.hideChoicePanel();
        this.renderSpeaker('制作人');
        this.renderPortrait(null);
        this.elements.text.textContent = choice.text;
        this.setStatus(`已选择：${choice.text}`);
    }

    hideChoicePanel() {
        this.state.choosing = false;
        if (this.elements.choices) this.elements.choices.hidden = true;
        if (this.elements.dialogueCard) this.elements.dialogueCard.hidden = false;
    }

    stop({ cancelTts = true } = {}) {
        if (this.resourceLoadingActive) this.cancelResourceLoad();
        this.clearTimer();
        this.cancelSceneWipe();
        this.state.playing = false;
        if (cancelTts) this.state.generation++;
        if (this.state.choosing) this.hideChoicePanel();
        if (cancelTts) {
            this.director.pause();
            this.stopTtsLipSync();
            this.tts?.stopPlayback?.();
        }
        this.updatePlayButton();
    }

    ensureSceneWipe() {
        if (this.sceneWipe) return this.sceneWipe;
        const stage = this.elements.stage;
        if (!stage) return null;
        const layer = document.createElement('div');
        layer.className = 'beat-scene-wipe';
        layer.hidden = true;
        layer.setAttribute('aria-hidden', 'true');
        for (let index = 0; index < 6; index += 1) {
            const stripe = document.createElement('div');
            stripe.className = 'beat-scene-wipe-stripe';
            stripe.style.setProperty('--i', String(index));
            layer.append(stripe);
        }
        stage.append(layer);
        this.sceneWipe = layer;
        return layer;
    }

    cancelSceneWipe() {
        this.sceneWipeToken = (this.sceneWipeToken || 0) + 1;
        this.sceneWipeRelease?.();
        this.sceneWipeRelease = null;
        const layer = this.sceneWipe;
        if (!layer) return;
        layer.classList.remove('is-covering', 'is-holding', 'is-revealing');
        layer.hidden = true;
    }

    playSceneWipe(color) {
        const token = (this.sceneWipeToken || 0) + 1;
        this.sceneWipeToken = token;
        this.sceneWipeRelease?.();
        const layer = this.ensureSceneWipe();
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        let resolveCovered = () => {};
        const covered = new Promise((resolve) => {
            resolveCovered = resolve;
        });
        this.sceneWipeRelease = resolveCovered;
        const active = () => token === this.sceneWipeToken;
        if (!layer || reduced) {
            resolveCovered();
            this.sceneWipeRelease = null;
            return { covered, active, finish() {}, revealed: true };
        }
        layer.style.setProperty('--wipe-color', color || '#ff4f9a');
        layer.hidden = false;
        layer.classList.remove('is-covering', 'is-holding', 'is-revealing');
        void layer.offsetWidth;
        layer.classList.add('is-covering');
        let coveredOnce = false;
        const finishCover = () => {
            if (!active() || coveredOnce) return;
            coveredOnce = true;
            window.clearTimeout(coverTimer);
            layer.classList.add('is-holding');
            layer.classList.remove('is-covering');
            this.sceneWipeRelease = null;
            resolveCovered();
        };
        const coverTimer = window.setTimeout(finishCover, 720);
        layer.lastElementChild?.addEventListener('animationend', () => {
            window.clearTimeout(coverTimer);
            finishCover();
        }, { once: true });
        return {
            covered,
            active,
            revealed: false,
            finish() {
                if (!active() || layer.hidden) return;
                this.revealed = true;
                layer.classList.remove('is-covering', 'is-holding');
                void layer.offsetWidth;
                layer.classList.add('is-revealing');
                const hide = () => {
                    if (!active()) return;
                    layer.classList.remove('is-revealing');
                    layer.hidden = true;
                };
                const revealTimer = window.setTimeout(hide, 680);
                layer.lastElementChild?.addEventListener('animationend', () => {
                    window.clearTimeout(revealTimer);
                    hide();
                }, { once: true });
            },
        };
    }

    applyShot(beat) {
        const presentation = this.fixedPresentation || resolveBeatShot(this.compiled.beats, this.state.current);
        const preset = getShotPreset(presentation.shot, presentation.focus);
        const interaction = ['pinch', 'pinch-receive', 'shake', 'shake-receive'].includes(String(beat?.cue || '').toLowerCase());
        const solo = Boolean(preset.focus) && (!interaction || Boolean(this.fixedPresentation));
        this.focusedActor = preset.focus || '';
        const focusedEntry = preset.focus ? this.director.entries.get(preset.focus) : null;
        const scene3d = isBeatScene(beat?.background);
        this.applyBackground(beat, focusedEntry?.position || 'center');
        this.elements.stage.dataset.shot = presentation.shot;
        for (const [idolId, entry] of this.director.entries) {
            if (!entry.canvas) continue;
            const base = stagePositionOffset(entry.position);
            const focused = !solo || preset.focus === idolId;
            const visible = Boolean(entry.present && focused);
            // Focused actors return to the viewport center. The background is
            // panned separately to the actor's left/center/right station.
            const translate = solo && focused ? 0 : base;
            const scale = solo ? (focused ? preset.scale : 0.84) : preset.scale;
            entry.canvas.style.transition = 'none';
            entry.canvas.style.transform = 'none';
            entry.player.setShotFrame?.(scene3d ? { scale: 1, shiftX: 0, originY: .5 } : { scale, shiftX: (translate / 100) * 2, originY: preset.originY });
            entry.canvas.style.zIndex = focused ? '3' : '1';
            entry.canvas.style.visibility = visible ? 'visible' : 'hidden';
            entry.canvas.style.opacity = visible ? '1' : '0';
            entry.player.setPresentationActive?.(visible);
        }
        const scenePlayer = focusedEntry?.present && focusedEntry.player.ready ? focusedEntry.player : null;
        return this.scenePool.present(beat?.background || '', scenePlayer, presentation.shot, focusedEntry?.position || 'center') || !scene3d;
    }

    buildPreloadPlan(beats) {
        const cast = [];
        const cuesById = {};
        const costumesById = {};
        for (const beat of Array.isArray(beats) ? beats : []) {
            const idolId = beatActorId(beat?.speaker);
            if (!idolId) continue;
            if (!cast.includes(idolId)) cast.push(idolId);
            costumesById[idolId] ||= [];
            if (!costumesById[idolId].includes(beat.costume || 'Default')) costumesById[idolId].push(beat.costume || 'Default');
            const speakerName = NAME_MAP[beat.speaker] || beat.speaker || '';
            const cue = `${speakerName}(${resolveBeatCue(beat.cue, beat.face)})`;
            cuesById[idolId] ||= [];
            if (!cuesById[idolId].includes(cue)) cuesById[idolId].push(cue);
            for (const overlay of beat.overlay || []) {
                const overlayCue = `${speakerName}(${resolveBeatCue(overlay)})`;
                if (!cuesById[idolId].includes(overlayCue)) cuesById[idolId].push(overlayCue);
            }
        }
        return { cast, cuesById, costumesById };
    }

    async prepareResources(plan, generation) {
        const director = this.director, scenePool = this.scenePool, compiled = this.compiled, backgroundPlan = [...this.backgroundPlan];
        const current = () => generation === this.resourceGeneration;
        this.resourceLoadingActive = true;
        try {
            this.resourceLoading.update({ phase: 'checking' });
            const library = await loadResourceLibrary();
            if (generation !== this.resourceGeneration) return false;
            const selected = buildDialogueAssetPlan(compiled, plan, library);
            const resources = this.resources = new ResourceSession(library, { onProgress: progress => {
                if (generation === this.resourceGeneration) this.resourceLoading.update(progress);
            }});
            await resources.prepare(selected.keys);
            if (generation !== this.resourceGeneration) return false;
            plan = selected;
            this.preloadPlan = selected;
            scenePool.resources = resources;
            const [ready, backgrounds, scenesReady, portraitsReady] = await Promise.all([
                director.preload(plan.cast, {
                prewarm: true,
                cuesById: plan.cuesById,
                costumesById: plan.costumesById,
                resources,
                performances: plan.performances,
                }),
                preloadBackgrounds(backgroundPlan, { base: BEAT_BACKGROUND_ROOT, resolveUrl: url => resources.resolve(url) }),
                scenePool.preload(backgroundPlan),
                this.preloadPortraits(compiled.beats, resources),
            ]);
            if (generation !== this.resourceGeneration) return false;
            backgrounds.loaded.forEach((image, name) => this.backgroundImages.set(name, image));
            for (const entry of director.allEntries().filter(entry => plan.cast.includes(entry.canvas.dataset.idol) && entry.player.ready)) {
                if (!current()) return false;
                // Some eye effects are mutually exclusive. Warming their union
                // silently drops one; prepare each combination actually used.
                const combinations = [...new Map(compiled.beats.map(beat => {
                    const effects = [...(beat.effects || [])].sort();
                    return [JSON.stringify(effects), effects];
                })).values()];
                for (const effects of combinations) {
                    await entry.player.setFacialEffects(effects);
                    if (!current()) return false;
                    await entry.player.prewarm();
                    if (!current()) return false;
                }
                await entry.player.setFacialEffects([]);
            }
            if (!current()) return false;
            await scenePool.warmPlayers(director.allEntries().filter(entry => plan.cast.includes(entry.canvas.dataset.idol) && entry.player.ready).map(entry => entry.player), backgroundPlan, current);
            if (!current()) return false;
            const allReady = ready && backgrounds.ready && scenesReady && portraitsReady;
            if (!allReady) throw new Error('角色、动作、背景或场景未能完整加载，请重试。');
            resources.report('preparing', { task: '首帧渲染' });
            const first = compiled.beats[0];
            const speaker = NAME_MAP[first.speaker] || first.speaker || '';
            const cue = `${speaker}(${resolveBeatCue(first.cue, first.face)})`;
            if (!await director.sync(compiled.slides, compiled.beatIndexes[0], {
                animate: false, entryCue: cue, costumes: first.costumes, deferPresentation: true,
            })) throw new Error('首帧动作准备失败。');
            if (generation !== this.resourceGeneration) return false;
            if (!this.applyShot(first)) throw new Error('首帧场景准备失败。');
            await director.setFacialEffects(speaker, first.effects || [], this.focusedActor);
            if (!current()) return false;
            for (const entry of director.allEntries()) {
                if (entry.present) entry.player.renderFrame();
                entry.player.pause();
            }
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            if (generation !== this.resourceGeneration) return false;
            this.resourceLoading.ready();
            this.resourceLoadingActive = false;
            if (generation === this.resourceGeneration && !this.state.playing) {
                this.setStatus(allReady
                    ? (plan.cast.length ? '角色、贴图、动作和背景已预加载，可以播放。' : '背景已预加载，可以播放制作人或旁白段落。')
                    : '部分角色或背景资源未就绪，播放时会保留可用内容。');
            }
            return allReady;
        } catch (error) {
            if (generation !== this.resourceGeneration || error.name === 'AbortError') return false;
            console.warn('[BeatPlayer] preload failed', error);
            this.setStatus(`资源加载失败：${error.message}`);
            this.resourceLoading.update({ phase: 'error', message: String(error.message || error) });
            throw error;
        }
    }

    retryResources() {
        if (this.resourceBarrier?.resume) { this.resourceBarrier.retry(); return; }
        this.resourceGeneration++;
        this.resources?.dispose();
        this.resetResourcePlayers();
        this.preloadPromise = this.prepareResources(this.preloadPlan, this.resourceGeneration);
        this.preloadPromise.then(ready => ready && this.goTo(Math.max(0, this.state.current), { autoplay: false })).catch(() => {});
    }

    resetResourcePlayers() {
        this.director.dispose();
        this.director = createSceneDirector(this.elements.stage, { cameraDistanceFactor: 1.6, cameraTargetY: .71, autoIdleAdditiveOnHold: true });
        this.director.useShotFrame = true;
        this.scenePool.dispose();
        this.scenePool = new BeatScenePool(this.elements.stage);
        this.backgroundImages.clear();
    }

    cancelResourceLoad() {
        this.resourceGeneration++;
        this.resourceBarrier?.cancel();
        this.resourceLoadingActive = false;
        this.needsResourcePreparation = true;
        this.resources?.dispose();
        this.resources = null;
        this.resourceLoading.ready();
        this.resetResourcePlayers();
    }

    renderSpeaker(name) {
        const label = this.elements.speaker;
        label.textContent = name;
        const plate = label.closest('.speaker-plate');
        if (!plate) return;
        const { color, textColor } = beatSpeakerStyle(name, this.resolveSpeakerTheme);
        plate.style.setProperty('--speaker-theme-color', color);
        plate.style.setProperty('--speaker-text-color', textColor);
    }

    advanceDialogue() {
        if (this.state.choosing) return false;
        return this.goTo(this.state.current + 1, { autoplay: this.state.playing });
    }

    renderPortrait(beat) {
        const image = this.elements.portrait;
        if (!image) return;
        const portrait = beat?.portrait;
        if (!portrait) {
            image.hidden = true;
            image.removeAttribute('src');
            image.alt = '';
            delete image.dataset.character;
            delete image.dataset.emotion;
            return;
        }
        image.alt = portrait.name + ' · ' + portrait.emotion;
        image.dataset.character = portrait.characterId;
        image.dataset.emotion = portrait.emotion;
        image.src = this.resources?.resolve(portrait.src) || portrait.src;
        image.hidden = false;
    }

    async preloadPortraits(beats = this.compiled.beats, resources = this.resources) {
        const sources = [...new Set(beats.map(beat => beat.portrait?.src).filter(Boolean))];
        const ready = await Promise.all(sources.map(src => new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve(true);
            image.onerror = () => resolve(false);
            image.src = resources?.resolve(src) || src;
        })));
        return ready.every(Boolean);
    }

    renderBeat(beat) {
        const current = this.state.current;
        this.elements.progress.textContent = beat ? `${current + 1} / ${this.compiled.beats.length}` : '—';
        this.renderSpeaker(beat ? (NAME_MAP[beat.speaker] || beat.speaker || '旁白') : '等待播放');
        this.elements.text.textContent = beat?.text || '在左侧输入 Beat，或载入示例开始。';
        this.renderPortrait(beat);
        const presentation = beat ? (this.fixedPresentation || resolveBeatShot(this.compiled.beats, current)) : null;
        this.elements.shot.textContent = beat
            ? `镜头：${presentation.shot}${presentation.inherited ? '（沿用上一位偶像）' : ''}`
            : '镜头：—';
    }

    applyBackground(beat, position = 'center') {
        const name = String(beat?.background || '').trim();
        const image = this.backgroundImages.get(name);
        const url = backgroundAssetUrl(name, BEAT_BACKGROUND_ROOT);
        if (!this.elements.background) return;
        const plate = url ? `url("${this.resources?.resolve(url) || url}")` : '';
        this.elements.background.style.backgroundImage = plate;
        this.elements.background.style.backgroundPosition = backgroundPanPosition(position);
        for (const entry of this.director.entries.values()) entry.player.setStagePlate?.(image || null, position);
        this.elements.stage.dataset.background = name;
        this.elements.stage.dataset.backgroundKind = isBeatScene(name) ? '3d' : '2d';
        this.elements.stage.dataset.backgroundPosition = String(position || 'center').trim().toLowerCase();
    }

    renderDiagnostics() {
        const errors = this.compiled.errors || [];
        this.elements.diagnostics.replaceChildren();
        if (!errors.length) {
            this.elements.diagnostics.textContent = '协议检查通过';
            this.elements.diagnostics.dataset.level = 'ok';
            return;
        }
        this.elements.diagnostics.dataset.level = 'warn';
        const fragment = document.createDocumentFragment();
        for (const error of errors) {
            const item = document.createElement('li');
            item.textContent = error.message;
            fragment.append(item);
        }
        this.elements.diagnostics.append(fragment);
    }

    updatePlayButton() {
        if (!this.elements.play) return;
        const playLabel = this.elements.play.querySelector('.toolbar-label');
        if (playLabel) playLabel.textContent = this.state.playing ? '暂停' : '播放';
        else this.elements.play.textContent = this.state.playing ? '暂停' : '播放';
        this.elements.play.setAttribute('aria-pressed', String(this.state.playing));
    }

    setStatus(message) {
        if (this.elements.status) this.elements.status.textContent = message;
    }

    dispose() {
        this.stop();
        this.resourceGeneration += 1;
        this.resources?.dispose();
        this.resourceLoading.dispose();
        this.scenePool.dispose();
        this.director.dispose();
    }
}

if (/\/beat-player\.html$/i.test(window.location.pathname)) {
    const app = new BeatPlayerApp(document);
    window.beatPlayer = app;
    window.addEventListener('beforeunload', () => app.dispose(), { once: true });
}
