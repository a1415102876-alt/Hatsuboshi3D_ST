import { BeatPlayerApp } from './beat-player.js?v=20261115-lamp-taa-v3';
import { loadResourceLibrary } from './asset-runtime.js?v=20261114-manifest-fix-v1';
import { resourceCatalog } from './dialogue-asset-plan.js?v=20261112-custom-background-v2';
import { motionAvailability } from './library-client.js?v=20261017-browser-cache-v1';
import { indexMotionFiles } from './core.js?v=20261011-stage-cue-rules-v4';
import { BEAT_COSTUME_IDS, resolveBeatCostume } from './beat-costumes.js?v=20261113-hkne-onsen-v1';
import { BEAT_SCENE_ASSETS } from './beat-scene-assets.js?v=20261007-beat-scenes-v1';
import { BEAT_BACKGROUND_NAMES } from './beat-backgrounds.js?v=20261017-browser-cache-v1';
import {
    DEFAULT_TALK_FACE, DEFAULT_TALK_MOTION, EASINGS, TIMELINE_STORAGE_KEY, TRACK_KINDS, addCastMember, addClip, createTimelineDocument, deleteItems,
    duplicateItems, findItem, findTrack, formatTimecode, frameDuration, heldClipAt, itemStart, moveItems,
    normalizeTimeline, parseTimeline, quantizeTime, removeCastMember, serializeTimeline, setDuration, setKey,
    snapCandidates, snapTime, splitClip, trackFor, trimClip, updateCastMember, updateItem,
} from './timeline-model.js?v=20261114-timeline-v3';
import { STAGE_UNITS_PER_METRE, TIMELINE_CAST_OPTIONS, TimelineRuntime, timelineActorName } from './timeline-runtime.js?v=20261114-timeline-v3';

const qs = id => document.getElementById(id);
const DEFAULT_SCENE = 'env_3d_adv_vocalroom-00-00-noon';
const HISTORY_LIMIT = 120;
const SNAP_PX = 8;
const SPEAKER_EXTRAS = ['制作人', '旁白'];
const LOAD_DEBOUNCE_MS = 700;

// ------------------------------------------------------------------ state

function loadStoredDocument() {
    try {
        const raw = localStorage.getItem(TIMELINE_STORAGE_KEY);
        if (raw) return normalizeTimeline(JSON.parse(raw));
    } catch { /* fall through to a new document */ }
    return createTimelineDocument({ title: '新 Timeline', background: DEFAULT_SCENE, actor: 'fktn', speaker: 'fktn' });
}

const state = {
    doc: loadStoredDocument(),
    time: 0,
    playing: false,
    loop: false,
    speed: 1,
    snap: true,
    zoom: 90,
    selection: new Set(),
    undo: [],
    redo: [],
    camMode: 'follow',
    freeCam: null,
    drag: null,
    pendingInspectorHistory: null,
};

const elements = {
    stage: qs('tlStage'), background: qs('tlStageBackground'), script: qs('tlBeatScript'),
    dialogueCard: qs('tlBeatDialogueCard'), portrait: qs('tlBeatPortrait'), choices: qs('tlBeatChoices'), choiceList: qs('tlBeatChoiceList'),
    play: null, previous: null, next: null, stop: null, auto: null,
    progress: qs('tlBeatProgress'), speaker: qs('tlBeatSpeaker'), text: qs('tlBeatText'), shot: qs('tlBeatShot'), status: qs('tlBeatStatus'),
    diagnostics: qs('tlBeatDiagnostics'),
};
const app = new BeatPlayerApp(document, { elements, bindEvents: false, loadSample: false });
const runtime = new TimelineRuntime(app);
window.timelineEditor = { app, runtime, state };

// ------------------------------------------------------------------ helpers

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const fmt = (value, digits = 2) => (Number.isFinite(Number(value)) ? String(Math.round(Number(value) * 10 ** digits) / 10 ** digits) : '');
const castName = id => timelineActorName(id);
const speakerLabel = value => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return TIMELINE_CAST_OPTIONS.some(option => option.id === raw) ? castName(raw) : raw;
};
const sceneOptions = (() => {
    const scenes = BEAT_SCENE_ASSETS.map(asset => asset.name);
    const flats = BEAT_BACKGROUND_NAMES.map(name => name.replace(/\.png$/iu, ''));
    return [...new Set([...scenes, ...flats])];
})();
const shortScene = name => String(name || '').replace(/^env_3d_(adv|home|lesson)_/u, '3D ').replace(/^env_2d_adv_/u, '2D ');

let toastTimer = 0;
function toast(message) {
    const node = qs('tlToast');
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 2200);
}

function setLoadState(message, tone = '') {
    const node = qs('tlLoadState');
    node.textContent = message;
    node.dataset.tone = tone;
}

// ------------------------------------------------------------------ motion catalog

// Every motion and face file the resource manifest can deliver, from
// gakumas-motion-map.json. Lists are filtered per actor to common motions
// plus that idol's own.
const motionCatalog = { ready: false, items: [], byLabel: new Map(), error: '' };

async function loadMotionCatalog() {
    try {
        const library = await loadResourceLibrary();
        const index = new Map(Object.entries(library.manifest.status.packs).map(([id, pack]) => [id, indexMotionFiles(pack.files)]));
        const bucketLabels = new Map((library.map.buckets || []).map(bucket => [bucket.id, bucket.label || bucket.id]));
        const familyLabels = new Map((library.map.buckets || []).flatMap(bucket => (bucket.families || []).map(family => [`${bucket.id}/${family.id}`, family.label || family.id])));
        const items = [];
        for (const item of resourceCatalog(library.map)) {
            if (!item.label || !motionAvailability(item, index).ready) continue;
            const bucket = item.catalog.bucket;
            items.push({
                label: item.label,
                title: item.title || item.label,
                character: item.character || 'cmmn',
                bucket,
                bucketLabel: bucketLabels.get(bucket) || bucket,
                familyLabel: familyLabels.get(`${bucket}/${item.catalog.family}`) || '',
                faceOnly: !item.body && Boolean(item.face),
                additive: Boolean(item.additive),
                hasFace: Boolean(item.body && item.face),
            });
        }
        motionCatalog.items = items;
        motionCatalog.byLabel = new Map(items.map(item => [item.label, item]));
        motionCatalog.ready = true;
    } catch (error) {
        motionCatalog.error = String(error?.message || error);
    }
    renderTracks();
    renderInspector();
}

function motionsFor(actorId) {
    return motionCatalog.items.filter(item => !item.faceOnly && !item.additive && ['cmmn', actorId].includes(item.character));
}

function facesFor(actorId) {
    return motionCatalog.items.filter(item => item.faceOnly && ['cmmn', actorId].includes(item.character));
}

function motionTitle(label) {
    const item = motionCatalog.byLabel.get(label);
    return item ? item.title : label;
}

function defaultMotionFor(actorId) {
    const motions = motionsFor(actorId);
    return motions.find(item => item.label === DEFAULT_TALK_MOTION)?.label || motions[0]?.label || 'talk';
}

const pickerQueries = new Map();

/**
 * Searchable list of catalog entries, grouped by category. `extra` rows
 * ([value, label]) are pinned above the list.
 */
function catalogPicker(label, key, items, value, onCommit, { extra = [], note = '' } = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tl-picker';
    const title = document.createElement('div');
    title.className = 'tl-picker-label';
    title.textContent = label;
    const current = document.createElement('div');
    current.className = 'tl-picker-current';
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = '搜索名称或文件名…';
    search.value = pickerQueries.get(key) || '';
    search.setAttribute('aria-label', `${label}：搜索`);
    const list = document.createElement('select');
    list.size = 9;
    list.className = 'tl-picker-list';
    list.setAttribute('aria-label', label);
    const count = document.createElement('div');
    count.className = 'tl-picker-meta';
    const pinned = extra.find(([optionValue]) => optionValue === value);
    const currentItem = motionCatalog.byLabel.get(value);
    current.textContent = `当前：${pinned ? pinned[1] : (currentItem ? currentItem.title : (value || '—'))}`;
    current.title = value || '';
    const fill = () => {
        const query = search.value.trim().toLowerCase();
        pickerQueries.set(key, search.value);
        const matched = query
            ? items.filter(item => `${item.title} ${item.label} ${item.familyLabel} ${item.bucketLabel}`.toLowerCase().includes(query))
            : items;
        const nodes = extra.map(([optionValue, optionLabel]) => new Option(optionLabel, optionValue));
        if (value && !extra.some(([optionValue]) => optionValue === value) && !items.some(item => item.label === value)) {
            nodes.push(new Option(`（当前）${value}`, value));
        }
        const groups = new Map();
        for (const item of matched) {
            if (!groups.has(item.bucketLabel)) groups.set(item.bucketLabel, []);
            const option = new Option(`${item.title}${item.character !== 'cmmn' ? ' ★' : ''}`, item.label);
            option.title = `${item.familyLabel ? `${item.familyLabel} · ` : ''}${item.label}`;
            groups.get(item.bucketLabel).push(option);
        }
        for (const [groupLabel, options] of groups) {
            const group = document.createElement('optgroup');
            group.label = `${groupLabel}（${options.length}）`;
            group.append(...options);
            nodes.push(group);
        }
        list.replaceChildren(...nodes);
        list.value = value;
        count.textContent = motionCatalog.ready
            ? `${matched.length} / ${items.length} 项${note ? ` · ${note}` : ''}`
            : (motionCatalog.error ? `列表读取失败：${motionCatalog.error}` : '正在读取动作列表…');
    };
    search.addEventListener('input', fill);
    search.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown') return;
        event.preventDefault();
        list.focus();
        if (list.selectedIndex < 0) list.selectedIndex = 0;
    });
    list.addEventListener('change', () => {
        if (list.value && list.value !== value) onCommit(list.value);
        else if (list.value === '' && value !== '') onCommit('');
    });
    fill();
    wrapper.append(title, current, search, list, count);
    return wrapper;
}

// ------------------------------------------------------------------ history & persistence

let saveTimer = 0;
function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try { localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(state.doc)); } catch { /* storage full or blocked */ }
    }, 300);
}

function pushHistory(snapshot = state.doc) {
    state.undo.push(snapshot);
    if (state.undo.length > HISTORY_LIMIT) state.undo.shift();
    state.redo = [];
    syncHistoryButtons();
}

function syncHistoryButtons() {
    qs('tlUndoBtn').disabled = !state.undo.length;
    qs('tlRedoBtn').disabled = !state.redo.length;
}

/** Replace the document. `history: false` is for live drags already recorded. */
function commit(doc, { history = true, from = state.doc } = {}) {
    if (history) pushHistory(from);
    state.doc = doc;
    for (const id of [...state.selection]) if (!findItem(doc, id)) state.selection.delete(id);
    state.time = Math.min(state.time, doc.duration);
    persist();
    afterDocumentChange();
}

function undo() {
    if (!state.undo.length) return;
    state.redo.push(state.doc);
    state.doc = state.undo.pop();
    syncHistoryButtons();
    persist();
    afterDocumentChange();
}

function redo() {
    if (!state.redo.length) return;
    state.undo.push(state.doc);
    state.doc = state.redo.pop();
    syncHistoryButtons();
    persist();
    afterDocumentChange();
}

let reloadTimer = 0;
function afterDocumentChange({ inspector = true } = {}) {
    renderAll({ inspector });
    if (!zoomTouched) fitZoom();
    if (runtime.needsReload(state.doc)) {
        clearTimeout(reloadTimer);
        setLoadState('资源有变化，稍后重新加载…', 'busy');
        reloadTimer = setTimeout(() => { void loadResources(); }, LOAD_DEBOUNCE_MS);
        return;
    }
    runtime.setDocument(state.doc);
    applyFrame({ seek: true });
}

// ------------------------------------------------------------------ resources

let loadSerial = 0;
async function loadResources() {
    clearTimeout(reloadTimer);
    const serial = ++loadSerial;
    setPlaying(false);
    setLoadState('正在加载模型、动作和场景…', 'busy');
    try {
        const ok = await runtime.load(state.doc);
        if (serial !== loadSerial) return;
        if (!ok) {
            setLoadState(app.renderUnavailable || '资源没有完全准备好，可点击“重新加载资源”。', 'error');
            return;
        }
        setLoadState('资源已就绪', 'ok');
        runtime.cameraOverride = state.camMode === 'free' ? state.freeCam : null;
        applyFrame({ seek: true });
    } catch (error) {
        if (serial !== loadSerial) return;
        setLoadState(`加载失败：${error?.message || error}`, 'error');
    }
}

// ------------------------------------------------------------------ frame application

function applyFrame({ seek = false } = {}) {
    const result = runtime.ready ? runtime.apply(state.time, { seek }) : null;
    const evaluated = result || null;
    renderOverlays(evaluated);
    updatePlayhead();
    updateCameraReadout(evaluated);
}

function renderOverlays(evaluated) {
    const fade = qs('tlFade');
    if (evaluated?.fade) {
        fade.style.opacity = String(evaluated.fade.opacity);
        fade.style.background = evaluated.fade.color;
    } else fade.style.opacity = '0';
    const box = qs('tlDialogue');
    const line = evaluated?.dialogue;
    box.hidden = !line || !String(line.text || '').trim();
    if (line) {
        qs('tlDialogueSpeaker').textContent = speakerLabel(line.speaker);
        qs('tlDialogueText').textContent = line.text;
    }
}

function updateCameraReadout(evaluated) {
    const readout = qs('tlCamReadout');
    const pose = runtime.cameraOverride?.pose || evaluated?.camera?.pose || runtime.currentCameraPose();
    const free = state.camMode === 'free';
    readout.dataset.detached = String(free);
    if (!pose) { readout.textContent = ''; return; }
    const focal = runtime.cameraOverride?.focal ?? evaluated?.camera?.focal;
    const prefix = free ? '自由取景 · ' : (evaluated?.camera ? '轨道机位 · ' : '场景默认机位 · ');
    readout.textContent = `${prefix}x ${fmt(pose.x, 1)}  y ${fmt(pose.y, 1)}  z ${fmt(pose.z, 1)}  偏航 ${fmt(pose.yaw, 0)}°  俯仰 ${fmt(pose.pitch, 0)}°${focal ? `  ${fmt(focal, 0)}mm` : ''}`;
}

// ------------------------------------------------------------------ playback

let lastTick = 0;
let frameRequest = 0;

function setPlaying(playing) {
    if (playing && !runtime.ready) { toast('资源还在加载。'); return; }
    state.playing = Boolean(playing);
    if (state.playing && state.time >= state.doc.duration - 1e-6) state.time = 0;
    runtime.setPlaying(state.playing, state.speed);
    const button = qs('tlPlay');
    button.textContent = state.playing ? '❚❚' : '▶';
    button.setAttribute('aria-pressed', String(state.playing));
    button.setAttribute('aria-label', state.playing ? '暂停' : '播放');
    if (state.playing) {
        lastTick = performance.now();
        applyFrame({ seek: true });
        cancelAnimationFrame(frameRequest);
        frameRequest = requestAnimationFrame(tick);
    } else {
        cancelAnimationFrame(frameRequest);
        state.time = quantizeTime(state.time, state.doc.fps);
        applyFrame({ seek: true });
    }
}

function tick(now) {
    if (!state.playing) return;
    const delta = Math.min(0.1, (now - lastTick) / 1000) * state.speed;
    lastTick = now;
    let next = state.time + delta;
    if (next >= state.doc.duration) {
        if (state.loop) {
            next = 0;
            state.time = next;
            applyFrame({ seek: true });
            frameRequest = requestAnimationFrame(tick);
            return;
        }
        state.time = state.doc.duration;
        setPlaying(false);
        return;
    }
    state.time = next;
    applyFrame();
    frameRequest = requestAnimationFrame(tick);
}

function seek(time) {
    state.time = clamp(quantizeTime(time, state.doc.fps), 0, state.doc.duration);
    if (state.playing) {
        lastTick = performance.now();
        applyFrame({ seek: true });
        return;
    }
    applyFrame({ seek: true });
}

const stepFrame = direction => seek(state.time + direction * frameDuration(state.doc.fps));

// ------------------------------------------------------------------ rendering: shell

function renderAll({ inspector = true } = {}) {
    qs('tlTitle').value = state.doc.title;
    const duration = qs('tlDuration');
    if (document.activeElement !== duration) duration.value = String(state.doc.duration);
    qs('tlTotal').textContent = `/ ${formatTimecode(state.doc.duration, state.doc.fps)}`;
    renderCast();
    renderTracks();
    if (inspector) renderInspector();
    syncHistoryButtons();
}

function costumeOptionsFor(id) {
    return BEAT_COSTUME_IDS.filter(costume => resolveBeatCostume(costume, id));
}

function renderCast() {
    const list = qs('tlCastList');
    list.replaceChildren(...state.doc.cast.map(member => {
        const item = document.createElement('li');
        item.className = 'tl-cast-item';
        const head = document.createElement('div');
        head.className = 'tl-cast-head';
        head.innerHTML = '<span class="tl-swatch" aria-hidden="true"></span>';
        head.append(castName(member.id));
        const remove = button('移除', () => {
            if (!window.confirm(`移除 ${castName(member.id)}？这会删除她的动作和站位轨道。`)) return;
            commit(removeCastMember(state.doc, member.id));
        }, 'tl-mini');
        remove.textContent = '✕';
        remove.title = `移除 ${castName(member.id)}`;
        remove.setAttribute('aria-label', `移除 ${castName(member.id)}`);
        head.append(remove);
        const grid = document.createElement('div');
        grid.className = 'tl-cast-grid';
        const costume = selectField('服装', costumeOptionsFor(member.id).map(value => [value, value]), member.costume, value => {
            commit(updateCastMember(state.doc, member.id, { costume: value }));
        });
        costume.classList.add('tl-wide');
        const enter = numberField('出场 (s)', member.enter, value => commit(updateCastMember(state.doc, member.id, { enter: value })), { step: 0.1, min: 0 });
        const exit = numberField('退场 (s)', member.exit ?? '', value => commit(updateCastMember(state.doc, member.id, { exit: value === '' ? null : value })), { step: 0.1, min: 0, allowEmpty: true, placeholder: '到结尾' });
        grid.append(costume, enter, exit);
        item.append(head, grid);
        return item;
    }));
    const add = qs('tlCastAdd');
    const used = new Set(state.doc.cast.map(member => member.id));
    add.replaceChildren(...TIMELINE_CAST_OPTIONS.filter(option => !used.has(option.id)).map(option => new Option(option.name, option.id)));
    qs('tlCastAddBtn').disabled = !add.options.length;
}

// ------------------------------------------------------------------ rendering: timeline

const SHORT_TRACK_LABEL = { motion: '动作', transform: '站位' };
function trackLabel(track) {
    const kind = TRACK_KINDS[track.kind].label;
    if (!track.actor) return kind;
    return `<b>${castName(track.actor)}</b> ${SHORT_TRACK_LABEL[track.kind] || kind}`;
}

function clipLabel(track, clip) {
    if (track.kind === 'scene') return shortScene(clip.background) || '（未选场景）';
    if (track.kind === 'dialogue') return `${speakerLabel(clip.speaker) || '—'}：${clip.text || '（空台词）'}`;
    if (track.kind === 'motion') return `${motionTitle(clip.cue)}${clip.face ? ` · ${motionTitle(clip.face)}` : ''}${clip.talk ? ' · 口型' : ''}`;
    if (track.kind === 'fade') return `${Math.round(clip.from * 100)}% → ${Math.round(clip.to * 100)}%`;
    return '';
}

function tickStep(zoom) {
    const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60];
    return steps.find(step => step * zoom >= 64) || 60;
}

function renderTracks() {
    const { doc } = state;
    const width = Math.ceil(doc.duration * state.zoom) + 48;
    const lanes = qs('tlLanes');
    lanes.style.width = `${width}px`;

    // Ruler.
    const ruler = qs('tlRuler');
    const ticks = [];
    const step = tickStep(state.zoom);
    const minor = step / 5;
    for (let t = 0; t <= doc.duration + 1e-6; t += minor) {
        const major = Math.abs(t / step - Math.round(t / step)) < 1e-6;
        if (!major && minor * state.zoom < 10) continue;
        const tickNode = document.createElement('div');
        tickNode.className = major ? 'tl-tick' : 'tl-tick is-minor';
        tickNode.style.left = `${t * state.zoom}px`;
        if (major) tickNode.innerHTML = `<span>${formatTimecode(t, doc.fps).replace(/^00:/u, '')}</span>`;
        ticks.push(tickNode);
    }
    const end = document.createElement('div');
    end.className = 'tl-ruler-end';
    end.style.left = `${doc.duration * state.zoom}px`;
    ruler.replaceChildren(...ticks, end);

    // Headers and lanes.
    const headers = [];
    const rows = [];
    let previousActor = '';
    for (const track of doc.tracks) {
        const firstOfActor = Boolean(track.actor && track.actor !== previousActor);
        previousActor = track.actor || '';
        const header = document.createElement('div');
        header.className = `tl-track-header${firstOfActor ? ' is-actor-first' : ''}${track.muted ? ' is-muted' : ''}`;
        header.dataset.kind = track.kind;
        header.innerHTML = `<span class="tl-swatch" aria-hidden="true"></span><span class="tl-track-name">${trackLabel(track)}</span>`;
        header.title = track.actor ? `${castName(track.actor)} · ${TRACK_KINDS[track.kind].label}` : TRACK_KINDS[track.kind].label;
        const mute = button(track.muted ? '◌' : '●', () => commit(mapTrackPatch(track.id, { muted: !track.muted })), 'tl-mini');
        mute.title = track.muted ? '取消静音（恢复这条轨道）' : '静音这条轨道';
        mute.setAttribute('aria-pressed', String(track.muted));
        mute.setAttribute('aria-label', mute.title);
        const add = button('+', () => addAtTime(track, state.time), 'tl-mini');
        add.title = TRACK_KINDS[track.kind].items === 'keys' ? '在播放头添加关键帧' : '在播放头添加片段';
        add.setAttribute('aria-label', add.title);
        header.append(mute, add);
        headers.push(header);

        const lane = document.createElement('div');
        lane.className = `tl-lane${firstOfActor ? ' is-actor-first' : ''}${track.muted ? ' is-muted' : ''}`;
        lane.dataset.trackId = track.id;
        lane.dataset.kind = track.kind;
        const shade = document.createElement('div');
        shade.className = 'tl-lane-end';
        shade.style.left = `${doc.duration * state.zoom}px`;
        shade.style.width = '48px';
        lane.append(shade);
        if (track.clips) {
            for (const clip of track.clips) {
                const node = document.createElement('div');
                node.className = `tl-clip${state.selection.has(clip.id) ? ' is-selected' : ''}`;
                node.dataset.itemId = clip.id;
                node.style.left = `${clip.start * state.zoom}px`;
                node.style.width = `${Math.max(4, clip.duration * state.zoom)}px`;
                node.title = `${clipLabel(track, clip)}\n${formatTimecode(clip.start, doc.fps)} – ${formatTimecode(clip.start + clip.duration, doc.fps)}`;
                node.textContent = clipLabel(track, clip);
                const startEdge = document.createElement('span');
                startEdge.className = 'tl-clip-edge is-start';
                startEdge.dataset.edge = 'start';
                const endEdge = document.createElement('span');
                endEdge.className = 'tl-clip-edge is-end';
                endEdge.dataset.edge = 'end';
                node.append(startEdge, endEdge);
                lane.append(node);
            }
        } else {
            track.keys.forEach((key, index) => {
                const next = track.keys[index + 1];
                if (next) {
                    const span = document.createElement('div');
                    span.className = `tl-key-span${key.ease === 'step' ? ' is-step' : ''}`;
                    span.style.left = `${key.time * state.zoom}px`;
                    span.style.width = `${(next.time - key.time) * state.zoom}px`;
                    lane.append(span);
                }
                const node = document.createElement('div');
                node.className = `tl-key${key.ease === 'step' ? ' is-step' : ''}${state.selection.has(key.id) ? ' is-selected' : ''}`;
                node.dataset.itemId = key.id;
                node.style.left = `${key.time * state.zoom}px`;
                node.title = `${formatTimecode(key.time, doc.fps)} · ${EASINGS[key.ease]}`;
                lane.append(node);
            });
        }
        rows.push(lane);
    }
    const corner = qs('tlHeaders').querySelector('.tl-ruler-corner');
    qs('tlHeaders').replaceChildren(corner, ...headers);
    qs('tlLaneRows').replaceChildren(...rows);
    updatePlayhead();
}

function updatePlayhead() {
    const x = state.time * state.zoom;
    qs('tlPlayhead').style.transform = `translateX(${x}px)`;
    qs('tlTimecode').textContent = formatTimecode(state.time, state.doc.fps);
    if (state.playing) {
        const scroll = qs('tlLanesScroll');
        const visibleEnd = scroll.scrollLeft + scroll.clientWidth - 40;
        if (x > visibleEnd || x < scroll.scrollLeft) scroll.scrollLeft = Math.max(0, x - 80);
    }
}

function mapTrackPatch(trackId, patch) {
    return normalizeTimeline({ ...state.doc, tracks: state.doc.tracks.map(track => (track.id === trackId ? { ...track, ...patch } : track)) });
}

// ------------------------------------------------------------------ adding items

function nextClipStart(track, time) {
    const after = (track.clips || []).filter(clip => clip.start > time + 1e-6);
    return after.length ? after[0].start : state.doc.duration;
}

function defaultActorPose(actorId) {
    const live = runtime.actorPose(actorId);
    if (live) return live;
    return runtime.lastState?.actors?.[actorId]?.pose || { x: 0, y: 0, z: 0, yaw: 0 };
}

function currentCameraForKey() {
    if (state.camMode === 'free' && state.freeCam) return { pose: { ...state.freeCam.pose }, focal: state.freeCam.focal ?? null };
    const evaluated = runtime.lastState?.camera;
    const pose = evaluated?.pose || runtime.currentCameraPose();
    return pose ? { pose: { ...pose }, focal: evaluated?.focal ?? null } : null;
}

function addAtTime(track, time) {
    if (track.locked) return;
    const at = clamp(quantizeTime(time, state.doc.fps), 0, state.doc.duration);
    const spec = TRACK_KINDS[track.kind];
    let result;
    if (spec.items === 'keys') {
        const previous = [...track.keys].reverse().find(key => key.time <= at);
        if (track.kind === 'camera') {
            const camera = currentCameraForKey();
            if (!camera) { toast('还没有可用的摄像机，请等资源加载完成。'); return; }
            result = setKey(state.doc, track.id, { time: at, pose: camera.pose, focal: camera.focal, ease: previous?.ease || 'smooth' });
        } else {
            result = setKey(state.doc, track.id, { time: at, pose: defaultActorPose(track.actor), ease: previous?.ease || 'easeInOut' });
        }
    } else {
        const room = nextClipStart(track, at) - at;
        const defaults = { scene: 4, dialogue: 2.5, motion: 2, fade: 1 };
        const duration = clamp(room > frameDuration() ? room : defaults[track.kind], frameDuration(), defaults[track.kind] * (track.kind === 'scene' ? 100 : 1));
        const clip = { start: at, duration };
        if (track.kind === 'scene') clip.background = heldClipAt(track.clips, at)?.background || DEFAULT_SCENE;
        if (track.kind === 'dialogue') clip.speaker = state.doc.cast[0]?.id || '旁白';
        if (track.kind === 'dialogue') clip.text = '';
        if (track.kind === 'motion') Object.assign(clip, { cue: defaultMotionFor(track.actor), face: motionCatalog.byLabel.has(DEFAULT_TALK_FACE) ? DEFAULT_TALK_FACE : '', talk: true });
        if (track.kind === 'fade') Object.assign(clip, { from: 0, to: 1, color: '#000000' });
        result = addClip(state.doc, track.id, clip);
    }
    if (!result?.id) return;
    commit(result.doc);
    state.selection = new Set([result.id]);
    renderAll();
    if (track.kind === 'dialogue') qs('tlInspector').querySelector('textarea')?.focus();
}

// ------------------------------------------------------------------ inspector

function labelled(label, control) {
    const wrapper = document.createElement('label');
    wrapper.className = 'tl-field';
    wrapper.append(label, control);
    return wrapper;
}

function button(text, onClick, className = 'tl-btn') {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = className;
    node.textContent = text;
    node.addEventListener('click', onClick);
    return node;
}

function numberField(label, value, onCommit, { step = 0.01, min, max, allowEmpty = false, placeholder = '' } = {}) {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = String(step);
    if (min !== undefined) input.min = String(min);
    if (max !== undefined) input.max = String(max);
    input.value = value === '' || value === null || value === undefined ? '' : fmt(value, 3);
    input.placeholder = placeholder;
    input.addEventListener('change', () => {
        const raw = input.value.trim();
        if (raw === '' && allowEmpty) { onCommit(''); return; }
        const number = Number(raw);
        if (Number.isFinite(number)) onCommit(number);
    });
    return labelled(label, input);
}

function textField(label, value, onCommit, { multiline = false, list = '' } = {}) {
    const input = document.createElement(multiline ? 'textarea' : 'input');
    if (!multiline) input.type = 'text';
    if (list) input.setAttribute('list', list);
    input.value = value || '';
    input.addEventListener('change', () => onCommit(input.value));
    return labelled(label, input);
}

function selectField(label, options, value, onCommit) {
    const select = document.createElement('select');
    for (const [optionValue, optionLabel] of options) select.append(new Option(optionLabel, optionValue));
    if (![...select.options].some(option => option.value === value)) select.append(new Option(String(value), String(value)));
    select.value = value;
    select.addEventListener('change', () => onCommit(select.value));
    return labelled(label, select);
}

function row(cols, ...children) {
    const node = document.createElement('div');
    node.className = 'tl-field-row';
    node.style.setProperty('--cols', String(cols));
    node.append(...children);
    const group = document.createElement('div');
    group.className = 'tl-field-group';
    group.append(node);
    return group;
}

function ensureDatalist(id, values) {
    let list = qs(id);
    if (!list) {
        list = document.createElement('datalist');
        list.id = id;
        document.body.append(list);
        list.replaceChildren(...values.map(value => new Option(value, value)));
    }
    return id;
}

function patchItem(id, patch) {
    commit(updateItem(state.doc, id, patch));
}

function renderInspector() {
    const root = qs('tlInspector');
    const title = qs('tlInspectorTitle');
    const ids = [...state.selection];
    if (ids.length !== 1) {
        title.textContent = ids.length > 1 ? `已选 ${ids.length} 项` : '属性';
        const empty = document.createElement('div');
        empty.className = 'tl-inspector-empty';
        empty.innerHTML = ids.length > 1
            ? '可以一起拖动、复制（Ctrl+D）或删除（Delete）。'
            : '点选时间轴上的片段或关键帧来编辑属性。<br><br>在空白轨道上双击即可添加；轨道左侧的“+”会在播放头位置添加。';
        root.replaceChildren(empty);
        return;
    }
    const found = findItem(state.doc, ids[0]);
    if (!found) { root.replaceChildren(); return; }
    const { track, item, type } = found;
    title.textContent = TRACK_KINDS[track.kind].label + (track.actor ? ` · ${castName(track.actor)}` : '');
    const kind = document.createElement('div');
    kind.className = 'tl-inspector-kind';
    kind.dataset.kind = track.kind;
    kind.textContent = type === 'clip' ? '片段' : '关键帧';
    const nodes = [kind];
    if (type === 'clip') {
        nodes.push(row(2,
            numberField('开始 (s)', item.start, value => patchItem(item.id, { start: value }), { step: frameDuration(), min: 0 }),
            numberField('时长 (s)', item.duration, value => patchItem(item.id, { duration: value }), { step: frameDuration(), min: frameDuration() }),
        ));
    } else {
        nodes.push(numberField('时间 (s)', item.time, value => patchItem(item.id, { time: value }), { step: frameDuration(), min: 0 }));
    }

    if (track.kind === 'scene') {
        nodes.push(textField('场景 / 背景', item.background, value => patchItem(item.id, { background: value.trim() }), { list: ensureDatalist('tlSceneList', sceneOptions) }));
        nodes.push(textField('3D 机位布局（可留空）', item.layout, value => patchItem(item.id, { layout: value.trim() })));
        const note = document.createElement('p');
        note.className = 'tl-note';
        note.textContent = '可输入 3D 场景名（env_3d_…）、2D 背景名或中文别名，例如“声乐练习室-午”。摄像机关键帧在 3D 场景中效果最好。';
        nodes.push(note);
    } else if (track.kind === 'dialogue') {
        const speakers = [...state.doc.cast.map(member => [member.id, castName(member.id)]), ...SPEAKER_EXTRAS.map(name => [name, name])];
        nodes.push(selectField('说话人', speakers, item.speaker, value => patchItem(item.id, { speaker: value })));
        nodes.push(textField('台词', item.text, value => patchItem(item.id, { text: value }), { multiline: true }));
    } else if (track.kind === 'motion') {
        const own = motionCatalog.byLabel.get(item.cue);
        nodes.push(catalogPicker('动作', `motion:${track.actor}`, motionsFor(track.actor), item.cue, value => patchItem(item.id, { cue: value }), {
            note: '★ 为该偶像专属',
        }));
        nodes.push(catalogPicker('表情', `face:${track.actor}`, facesFor(track.actor), item.face, value => patchItem(item.id, { face: value }), {
            extra: [['', own?.hasFace ? '（使用动作自带表情）' : '（不另加表情）']],
            note: '选中后替换动作自带的表情',
        }));
        nodes.push(numberField('起始偏移 (s)', item.clipIn || 0, value => patchItem(item.id, { clipIn: Math.max(0, value) }), { step: frameDuration(), min: 0 }));
        const talk = document.createElement('label');
        talk.className = 'tl-check';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = Boolean(item.talk);
        box.addEventListener('change', () => patchItem(item.id, { talk: box.checked }));
        talk.append(box, ' 播放时做说话口型');
        nodes.push(talk);
        const note = document.createElement('p');
        note.className = 'tl-note';
        note.textContent = '片段结束后会保持最后一帧，直到下一个动作开始。“仅动作”类没有配套表情，建议再选一个表情。列表只显示能加载的文件：通用动作和该偶像的专属动作（★）。';
        nodes.push(note);
    } else if (track.kind === 'fade') {
        nodes.push(row(3,
            numberField('起始不透明', item.from, value => patchItem(item.id, { from: clamp(value, 0, 1) }), { step: 0.05, min: 0, max: 1 }),
            numberField('结束不透明', item.to, value => patchItem(item.id, { to: clamp(value, 0, 1) }), { step: 0.05, min: 0, max: 1 }),
            colorField('颜色', item.color, value => patchItem(item.id, { color: value })),
        ));
        const presets = document.createElement('div');
        presets.className = 'tl-inspector-actions';
        presets.append(
            button('淡入（黑→画面）', () => patchItem(item.id, { from: 1, to: 0 })),
            button('淡出（画面→黑）', () => patchItem(item.id, { from: 0, to: 1 })),
        );
        nodes.push(presets);
    } else if (track.kind === 'camera') {
        nodes.push(row(3,
            numberField('X', item.pose.x, value => patchItem(item.id, { pose: { ...item.pose, x: value } }), { step: 0.1 }),
            numberField('Y', item.pose.y, value => patchItem(item.id, { pose: { ...item.pose, y: value } }), { step: 0.1 }),
            numberField('Z', item.pose.z, value => patchItem(item.id, { pose: { ...item.pose, z: value } }), { step: 0.1 }),
        ));
        nodes.push(row(3,
            numberField('偏航 °', item.pose.yaw, value => patchItem(item.id, { pose: { ...item.pose, yaw: value } }), { step: 1 }),
            numberField('俯仰 °', item.pose.pitch, value => patchItem(item.id, { pose: { ...item.pose, pitch: value } }), { step: 1, min: -80, max: 80 }),
            numberField('焦距 mm', item.focal ?? '', value => patchItem(item.id, { focal: value === '' ? null : value }), { step: 1, min: 8, max: 300, allowEmpty: true, placeholder: '场景默认' }),
        ));
        nodes.push(selectField('到下一帧的插值', Object.entries(EASINGS), item.ease, value => patchItem(item.id, { ease: value })));
        const actions = document.createElement('div');
        actions.className = 'tl-inspector-actions';
        actions.append(
            button('用当前视角覆盖', () => {
                const camera = currentCameraForKey();
                if (camera) patchItem(item.id, { pose: camera.pose, ...(camera.focal ? { focal: camera.focal } : {}) });
            }),
            button('跳到这一帧', () => seek(item.time)),
        );
        nodes.push(actions);
    } else if (track.kind === 'transform') {
        const metre = value => value / STAGE_UNITS_PER_METRE;
        nodes.push(row(3,
            numberField('X (m)', metre(item.pose.x), value => patchItem(item.id, { pose: { ...item.pose, x: value * STAGE_UNITS_PER_METRE } }), { step: 0.05 }),
            numberField('Y (m)', metre(item.pose.y), value => patchItem(item.id, { pose: { ...item.pose, y: value * STAGE_UNITS_PER_METRE } }), { step: 0.05 }),
            numberField('Z (m)', metre(item.pose.z), value => patchItem(item.id, { pose: { ...item.pose, z: value * STAGE_UNITS_PER_METRE } }), { step: 0.05 }),
        ));
        nodes.push(numberField('朝向 °', item.pose.yaw, value => patchItem(item.id, { pose: { ...item.pose, yaw: value } }), { step: 5 }));
        nodes.push(selectField('到下一帧的插值', Object.entries(EASINGS), item.ease, value => patchItem(item.id, { ease: value })));
        const nudge = document.createElement('div');
        nudge.className = 'tl-inspector-actions';
        const move = (axis, metres) => () => patchItem(item.id, { pose: { ...item.pose, [axis]: item.pose[axis] + metres * STAGE_UNITS_PER_METRE } });
        nudge.append(
            button('← 0.25m', move('x', -0.25)), button('0.25m →', move('x', 0.25)),
            button('靠近 0.25m', move('z', 0.25)), button('远离 0.25m', move('z', -0.25)),
            button('转 -15°', () => patchItem(item.id, { pose: { ...item.pose, yaw: item.pose.yaw - 15 } })),
            button('转 +15°', () => patchItem(item.id, { pose: { ...item.pose, yaw: item.pose.yaw + 15 } })),
        );
        nodes.push(nudge);
        const note = document.createElement('p');
        note.className = 'tl-note';
        note.textContent = '站位使用场景坐标（米）。有两个以上关键帧时，角色会按插值在它们之间移动。';
        nodes.push(note);
    }
    const remove = button('删除', () => deleteSelection(), 'tl-btn tl-btn-danger');
    const footer = document.createElement('div');
    footer.className = 'tl-inspector-actions';
    if (type === 'clip') footer.append(button('在播放头切开', () => splitSelection()));
    footer.append(button('复制', () => duplicateSelection()), remove);
    nodes.push(footer);
    root.replaceChildren(...nodes);
}

function colorField(label, value, onCommit) {
    const input = document.createElement('input');
    input.type = 'color';
    input.value = value || '#000000';
    input.addEventListener('change', () => onCommit(input.value));
    return labelled(label, input);
}

// ------------------------------------------------------------------ selection actions

function deleteSelection() {
    if (!state.selection.size) return;
    commit(deleteItems(state.doc, [...state.selection]));
    state.selection.clear();
    renderAll();
}

function duplicateSelection() {
    if (!state.selection.size) return;
    const items = [...state.selection].map(id => findItem(state.doc, id)).filter(Boolean);
    const start = Math.min(...items.map(found => itemStart(found.item)));
    const end = Math.max(...items.map(found => (found.type === 'clip' ? found.item.start + found.item.duration : found.item.time + frameDuration())));
    const result = duplicateItems(state.doc, [...state.selection], end - start);
    commit(result.doc);
    state.selection = new Set(result.ids);
    renderAll();
}

function splitSelection() {
    const clips = [...state.selection].map(id => findItem(state.doc, id)).filter(found => found?.type === 'clip');
    const targets = clips.length ? clips : state.doc.tracks.flatMap(track => (track.clips || [])
        .filter(clip => clip.start < state.time && clip.start + clip.duration > state.time)
        .map(clip => ({ item: clip })));
    let doc = state.doc;
    let made = 0;
    for (const { item } of targets) {
        const result = splitClip(doc, item.id, state.time);
        if (result.id) { doc = result.doc; made += 1; }
    }
    if (!made) { toast('播放头没有落在可切开的片段上。'); return; }
    commit(doc);
}

// ------------------------------------------------------------------ timeline pointer interaction

function laneTime(event) {
    const rect = qs('tlLanes').getBoundingClientRect();
    return (event.clientX - rect.left) / state.zoom;
}

qs('tlRuler').addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const ruler = event.currentTarget;
    ruler.setPointerCapture(event.pointerId);
    const wasPlaying = state.playing;
    if (wasPlaying) setPlaying(false);
    seek(laneTime(event));
    const move = moveEvent => seek(laneTime(moveEvent));
    const up = () => {
        ruler.removeEventListener('pointermove', move);
        ruler.removeEventListener('pointerup', up);
        ruler.removeEventListener('pointercancel', up);
    };
    ruler.addEventListener('pointermove', move);
    ruler.addEventListener('pointerup', up);
    ruler.addEventListener('pointercancel', up);
});

qs('tlLaneRows').addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const itemNode = event.target.closest('[data-item-id]');
    const lane = event.target.closest('.tl-lane');
    if (!lane) return;
    if (!itemNode) {
        if (!event.shiftKey && state.selection.size) {
            state.selection.clear();
            renderTracks();
            renderInspector();
        }
        return;
    }
    const id = itemNode.dataset.itemId;
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
        if (state.selection.has(id)) state.selection.delete(id);
        else state.selection.add(id);
        renderTracks();
        renderInspector();
        return;
    }
    if (!state.selection.has(id)) {
        state.selection = new Set([id]);
        renderTracks();
        renderInspector();
    }
    const found = findItem(state.doc, id);
    if (!found || found.track.locked) return;
    const edge = event.target.dataset.edge || '';
    event.preventDefault();
    const surface = qs('tlLaneRows');
    surface.setPointerCapture(event.pointerId);
    state.drag = {
        pointerId: event.pointerId,
        mode: edge ? `trim-${edge}` : 'move',
        id,
        ids: [...state.selection],
        startX: event.clientX,
        origin: state.doc,
        item: found.item,
        moved: false,
        candidates: snapCandidates(state.doc, { exclude: new Set(state.selection), playhead: state.time }),
    };
});

qs('tlLaneRows').addEventListener('pointermove', event => {
    const drag = state.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) < 3) return;
    drag.moved = true;
    const dt = dx / state.zoom;
    const threshold = SNAP_PX / state.zoom;
    const snap = time => (state.snap && !event.altKey ? snapTime(time, drag.candidates, threshold, state.doc.fps) : quantizeTime(time, state.doc.fps));
    const item = drag.item;
    let doc;
    if (drag.mode === 'move') {
        const start = itemStart(item);
        let target = snap(start + dt);
        if (Number.isFinite(item.duration) && state.snap && !event.altKey) {
            const endSnap = snapTime(start + item.duration + dt, drag.candidates, threshold, state.doc.fps);
            if (Math.abs(endSnap - (start + item.duration + dt)) < Math.abs(target - (start + dt))) target = endSnap - item.duration;
        }
        doc = moveItems(drag.origin, drag.ids, target - start);
    } else if (drag.mode === 'trim-start') {
        doc = trimClip(drag.origin, drag.id, 'start', snap(item.start + dt));
    } else {
        doc = trimClip(drag.origin, drag.id, 'end', snap(item.start + item.duration + dt));
    }
    state.doc = doc;
    renderTracks();
    qs('tlLaneRows').querySelectorAll('.is-selected').forEach(node => node.classList.add('is-dragging'));
});

function endDrag(event) {
    const drag = state.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    state.drag = null;
    if (!drag.moved) return;
    commit(state.doc, { from: drag.origin });
}
qs('tlLaneRows').addEventListener('pointerup', endDrag);
qs('tlLaneRows').addEventListener('pointercancel', event => {
    const drag = state.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    state.doc = drag.origin;
    state.drag = null;
    renderTracks();
});

qs('tlLaneRows').addEventListener('dblclick', event => {
    if (event.target.closest('[data-item-id]')) return;
    const lane = event.target.closest('.tl-lane');
    const track = lane ? findTrack(state.doc, lane.dataset.trackId) : null;
    if (track) addAtTime(track, laneTime(event));
});

qs('tlLanesScroll').addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const scroll = qs('tlLanesScroll');
    const rect = scroll.getBoundingClientRect();
    const anchor = (event.clientX - rect.left + scroll.scrollLeft) / state.zoom;
    userZoom(state.zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
    scroll.scrollLeft = anchor * state.zoom - (event.clientX - rect.left);
}, { passive: false });

// Track headers follow the lanes' vertical scroll; the wheel over the
// headers scrolls the lanes.
qs('tlLanesScroll').addEventListener('scroll', () => { qs('tlHeaders').scrollTop = qs('tlLanesScroll').scrollTop; }, { passive: true });
qs('tlHeaders').addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) return;
    qs('tlLanesScroll').scrollTop += event.deltaY;
    event.preventDefault();
}, { passive: false });

function setZoom(value) {
    state.zoom = clamp(value, 10, 600);
    qs('tlZoom').value = String(Math.round(state.zoom));
    renderTracks();
}

// Until the user zooms by hand, the timeline keeps fitting the whole
// duration. A hidden or not-yet-laid-out panel reports width 0; skip it.
let zoomTouched = false;
function fitZoom() {
    const width = qs('tlLanesScroll').clientWidth - 60;
    if (width < 120) return false;
    setZoom(width / state.doc.duration);
    qs('tlLanesScroll').scrollLeft = 0;
    return true;
}
const userZoom = value => { zoomTouched = true; setZoom(value); };
new ResizeObserver(() => { if (!zoomTouched) fitZoom(); }).observe(qs('tlLanesScroll'));

// ------------------------------------------------------------------ free camera navigation

const nav = { keys: new Set(), frame: 0, last: 0, drag: null };

function setCamMode(mode) {
    state.camMode = mode;
    const free = mode === 'free';
    qs('tlCamFollow').setAttribute('aria-checked', String(!free));
    qs('tlCamFree').setAttribute('aria-checked', String(free));
    qs('tlNavSurface').hidden = !free;
    qs('tlNavHint').hidden = !free;
    qs('tlStage').dataset.nav = free ? 'free' : 'follow';
    if (free) {
        if (state.playing) setPlaying(false);
        const start = currentCameraForKey();
        if (!start) { toast('资源加载完成后才能自由取景。'); setCamMode('follow'); return; }
        state.freeCam = { pose: { ...start.pose }, focal: start.focal ?? null };
        runtime.cameraOverride = state.freeCam;
        qs('tlNavSurface').focus({ preventScroll: true });
    } else {
        state.freeCam = null;
        runtime.cameraOverride = null;
        nav.keys.clear();
    }
    applyFrame({ seek: !state.playing });
}

function moveFreeCamera(forward, right, up) {
    const cam = state.freeCam;
    if (!cam) return;
    const yaw = cam.pose.yaw * Math.PI / 180;
    const pitch = cam.pose.pitch * Math.PI / 180;
    // Three.js cameras look down -Z; yaw turns about +Y.
    const fx = -Math.sin(yaw) * Math.cos(pitch);
    const fy = Math.sin(pitch);
    const fz = -Math.cos(yaw) * Math.cos(pitch);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    cam.pose.x += fx * forward + rx * right;
    cam.pose.y += fy * forward + up;
    cam.pose.z += fz * forward + rz * right;
}

function refreshFreeCamera() {
    runtime.cameraOverride = state.freeCam;
    applyFrame({ seek: false });
}

function navLoop(now) {
    if (state.camMode !== 'free' || !nav.keys.size) { nav.frame = 0; return; }
    const dt = Math.min(0.05, (now - nav.last) / 1000);
    nav.last = now;
    const speed = (nav.keys.has('shift') ? 3 : 1) * 1.6 * STAGE_UNITS_PER_METRE * dt;
    const forward = (nav.keys.has('w') ? 1 : 0) - (nav.keys.has('s') ? 1 : 0);
    const right = (nav.keys.has('d') ? 1 : 0) - (nav.keys.has('a') ? 1 : 0);
    const up = (nav.keys.has('e') ? 1 : 0) - (nav.keys.has('q') ? 1 : 0);
    if (forward || right || up) {
        moveFreeCamera(forward * speed, right * speed, up * speed);
        refreshFreeCamera();
    }
    nav.frame = requestAnimationFrame(navLoop);
}

const navSurface = qs('tlNavSurface');
navSurface.addEventListener('contextmenu', event => event.preventDefault());
navSurface.addEventListener('pointerdown', event => {
    if (!state.freeCam) return;
    navSurface.focus({ preventScroll: true });
    navSurface.setPointerCapture(event.pointerId);
    nav.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: event.button === 2 || event.button === 1 || event.shiftKey };
    event.preventDefault();
});
navSurface.addEventListener('pointermove', event => {
    const drag = nav.drag;
    if (!drag || drag.id !== event.pointerId || !state.freeCam) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    const pose = state.freeCam.pose;
    if (drag.pan) {
        const scale = 0.004 * STAGE_UNITS_PER_METRE;
        moveFreeCamera(0, -dx * scale, dy * scale);
    } else {
        pose.yaw = ((pose.yaw - dx * 0.25 + 540) % 360) - 180;
        pose.pitch = clamp(pose.pitch - dy * 0.25, -80, 80);
    }
    refreshFreeCamera();
});
const endNavDrag = event => { if (nav.drag?.id === event.pointerId) nav.drag = null; };
navSurface.addEventListener('pointerup', endNavDrag);
navSurface.addEventListener('pointercancel', endNavDrag);
navSurface.addEventListener('wheel', event => {
    if (!state.freeCam) return;
    event.preventDefault();
    if (event.altKey) {
        const focal = state.freeCam.focal || 35;
        state.freeCam.focal = clamp(Math.round(focal * (event.deltaY < 0 ? 1.08 : 1 / 1.08)), 8, 300);
    } else {
        moveFreeCamera((event.deltaY < 0 ? 1 : -1) * 0.25 * STAGE_UNITS_PER_METRE, 0, 0);
    }
    refreshFreeCamera();
}, { passive: false });

const NAV_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e']);
navSurface.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (event.key === 'Shift') nav.keys.add('shift');
    if (!NAV_KEYS.has(key) || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();
    nav.keys.add(key);
    if (!nav.frame) { nav.last = performance.now(); nav.frame = requestAnimationFrame(navLoop); }
});
navSurface.addEventListener('keyup', event => {
    nav.keys.delete(event.key === 'Shift' ? 'shift' : event.key.toLowerCase());
});
navSurface.addEventListener('blur', () => nav.keys.clear());

function keyCamera() {
    const track = trackFor(state.doc, 'camera');
    if (!track) return;
    const camera = currentCameraForKey();
    if (!camera) { toast('还没有可用的摄像机。'); return; }
    const previous = [...track.keys].reverse().find(key => key.time <= state.time);
    const result = setKey(state.doc, track.id, { time: state.time, pose: camera.pose, focal: camera.focal, ease: previous?.ease || 'smooth' });
    commit(result.doc);
    state.selection = new Set([result.id]);
    renderAll();
    toast(`已在 ${formatTimecode(state.time, state.doc.fps)} 记录机位`);
}

// ------------------------------------------------------------------ toolbar wiring

qs('tlPlay').addEventListener('click', () => setPlaying(!state.playing));
qs('tlToStart').addEventListener('click', () => seek(0));
qs('tlToEnd').addEventListener('click', () => seek(state.doc.duration));
qs('tlPrevFrame').addEventListener('click', () => stepFrame(-1));
qs('tlNextFrame').addEventListener('click', () => stepFrame(1));
qs('tlLoop').addEventListener('change', event => { state.loop = event.currentTarget.checked; });
qs('tlSpeed').addEventListener('change', event => { state.speed = Number(event.currentTarget.value) || 1; runtime.setPlaying(state.playing, state.speed); });
qs('tlSnap').addEventListener('change', event => { state.snap = event.currentTarget.checked; });
qs('tlZoom').addEventListener('input', event => userZoom(Number(event.currentTarget.value)));
qs('tlFitBtn').addEventListener('click', () => { zoomTouched = false; fitZoom(); });
qs('tlSplitBtn').addEventListener('click', splitSelection);
qs('tlDeleteBtn').addEventListener('click', deleteSelection);
qs('tlCamFollow').addEventListener('click', () => setCamMode('follow'));
qs('tlCamFree').addEventListener('click', () => setCamMode('free'));
qs('tlCamKeyBtn').addEventListener('click', keyCamera);
qs('tlUndoBtn').addEventListener('click', undo);
qs('tlRedoBtn').addEventListener('click', redo);
qs('tlHelpBtn').addEventListener('click', () => qs('tlHelp').showModal());
qs('tlReloadBtn').addEventListener('click', () => { void loadResources(); });
qs('tlTitle').addEventListener('change', event => commit(normalizeTimeline({ ...state.doc, title: event.currentTarget.value })));
qs('tlDuration').addEventListener('change', event => {
    const value = Number(event.currentTarget.value);
    if (Number.isFinite(value)) commit(setDuration(state.doc, value));
});
qs('tlCastAddBtn').addEventListener('click', () => {
    const id = qs('tlCastAdd').value;
    if (!id) return;
    commit(addCastMember(state.doc, id));
});
qs('tlNewBtn').addEventListener('click', () => {
    if (!window.confirm('新建会替换当前 Timeline（可以撤销）。继续？')) return;
    state.selection.clear();
    commit(createTimelineDocument({ title: '新 Timeline', background: DEFAULT_SCENE, actor: 'fktn', speaker: 'fktn' }));
    seek(0);
});
qs('tlSaveBtn').addEventListener('click', exportFile);
qs('tlOpenFile').addEventListener('change', async event => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    try {
        const doc = parseTimeline(await file.text());
        state.selection.clear();
        commit(doc);
        seek(0);
        toast(`已打开 ${file.name}`);
    } catch (error) {
        toast(`无法打开：${error?.message || error}`);
    }
});

function exportFile() {
    const payload = JSON.stringify({ format: 'gakumas-timeline', version: 1, timeline: JSON.parse(serializeTimeline(state.doc)) }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(state.doc.title || 'timeline').replace(/[\\/:*?"<>|]+/gu, '_')}.timeline.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast('已导出 Timeline 文件');
}

// ------------------------------------------------------------------ keyboard

document.addEventListener('keydown', event => {
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 's') { event.preventDefault(); exportFile(); return; }
    if (typing || qs('tlHelp').open) return;
    if (mod && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
    if (mod && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return; }
    if (mod && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelection(); return; }
    if (mod) return;
    switch (event.key) {
        case ' ': event.preventDefault(); setPlaying(!state.playing); break;
        case 'ArrowLeft': event.preventDefault(); if (event.shiftKey) seek(state.time - 1); else stepFrame(-1); break;
        case 'ArrowRight': event.preventDefault(); if (event.shiftKey) seek(state.time + 1); else stepFrame(1); break;
        case 'Home': event.preventDefault(); seek(0); break;
        case 'End': event.preventDefault(); seek(state.doc.duration); break;
        case 'Delete':
        case 'Backspace': event.preventDefault(); deleteSelection(); break;
        case 'Escape': if (state.camMode === 'free') setCamMode('follow'); else { state.selection.clear(); renderTracks(); renderInspector(); } break;
        default:
            if (event.key.toLowerCase() === 'k') { event.preventDefault(); keyCamera(); }
            else if (event.key.toLowerCase() === 's' && target !== navSurface) { event.preventDefault(); splitSelection(); }
            else if (event.key.toLowerCase() === 'f') { event.preventDefault(); zoomTouched = false; fitZoom(); }
            else if (event.key === '+' || event.key === '=') userZoom(state.zoom * 1.25);
            else if (event.key === '-') userZoom(state.zoom / 1.25);
    }
});

window.addEventListener('resize', () => {
    for (const entry of app.director?.allEntries?.() || []) entry.player?.resize?.();
    applyFrame({ seek: !state.playing });
});
window.addEventListener('pagehide', () => {
    try { localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(state.doc)); } catch { /* ignore */ }
});

// ------------------------------------------------------------------ boot

renderAll();
void loadMotionCatalog();
requestAnimationFrame(fitZoom);
void loadResources();
