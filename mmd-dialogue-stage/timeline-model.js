// Timeline mode data model. Pure functions only: the editor UI and the
// runtime both read documents through evaluateTimeline(), and tests cover
// the math without a browser.
//
// A document mirrors the Gakumas ADV timeline: every command lives on a
// track as either a clip (start + duration, like actormotion / message) or a
// keyframe (time + value, like camerasetting / actorlayout), and tweens
// between keyframes replace cameratween / actortween.

export const TIMELINE_VERSION = 1;
export const TIMELINE_FPS = 30;
export const TIMELINE_MIN_DURATION = 1;
export const TIMELINE_MAX_DURATION = 600;
export const TIMELINE_STORAGE_KEY = 'gakumasTimelineDocumentV1';
// Motion clips name real motion files from gakumas-motion-map.json: `cue`
// is a body (or paired) motion and `face` an optional face-only motion that
// replaces the motion's own expression. Older documents may still hold the
// Beat preset words (talk, idle, happy …); those keep working.
export const DEFAULT_TALK_MOTION = 'mot_all_chr_cmmn_talk-003_in_b';
export const DEFAULT_TALK_FACE = 'mot_all_chr_cmmn_facial-all-normal1-egao1_in_f';
export const DEFAULT_IDLE_MOTION = 'mot_aud_chr_cmmn_cmmn-idle-a-001_lp';

// Track kinds. `actor` tracks belong to one cast member.
export const TRACK_KINDS = Object.freeze({
    scene: { label: '场景', items: 'clips', actor: false, single: true },
    camera: { label: '摄像机', items: 'keys', actor: false, single: true },
    dialogue: { label: '台词', items: 'clips', actor: false, single: true },
    fade: { label: '淡入淡出', items: 'clips', actor: false, single: true },
    motion: { label: '动作 / 表情', items: 'clips', actor: true, single: true },
    transform: { label: '站位', items: 'keys', actor: true, single: true },
});

export const EASINGS = Object.freeze({
    linear: '线性',
    smooth: '平滑曲线',
    easeInOut: '缓入缓出',
    easeIn: '缓入',
    easeOut: '缓出',
    step: '定格（不过渡）',
});

const round = (value, digits = 4) => Math.round(Number(value) * 10 ** digits) / 10 ** digits;
const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
let idSerial = 0;

export function makeTimelineId(prefix = 'tl') {
    idSerial = (idSerial + 1) % 1e6;
    return `${prefix}-${Date.now().toString(36)}-${idSerial.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function frameDuration(fps = TIMELINE_FPS) {
    return 1 / Math.max(1, finite(fps, TIMELINE_FPS));
}

/** Snap a time to the nearest frame boundary. */
export function quantizeTime(time, fps = TIMELINE_FPS) {
    const step = frameDuration(fps);
    return round(Math.round(finite(time) / step) * step, 6);
}

/** Seconds → "00:03:12" (min:sec:frame). */
export function formatTimecode(time, fps = TIMELINE_FPS) {
    const rate = Math.max(1, Math.round(finite(fps, TIMELINE_FPS)));
    const totalFrames = Math.max(0, Math.round(finite(time) * rate));
    const frames = totalFrames % rate;
    const seconds = Math.floor(totalFrames / rate) % 60;
    const minutes = Math.floor(totalFrames / rate / 60);
    const pad = value => String(value).padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

export function easeProgress(ease, u) {
    const t = clamp(finite(u), 0, 1);
    switch (ease) {
        case 'step': return 0;
        case 'easeIn': return t * t * t;
        case 'easeOut': return 1 - (1 - t) ** 3;
        case 'easeInOut':
        case 'smooth': return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        default: return t;
    }
}

const lerp = (a, b, t) => a + (b - a) * t;

/** Interpolate degrees along the shortest arc. */
export function lerpAngle(from, to, t) {
    const delta = ((((to - from) % 360) + 540) % 360) - 180;
    return from + delta * t;
}

function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// ---------------------------------------------------------------- normalize

export function normalizeCameraPose(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const pose = {};
    for (const key of ['x', 'y', 'z', 'yaw', 'pitch']) {
        const value = Number(raw[key]);
        if (!Number.isFinite(value)) return null;
        pose[key] = round(value, 4);
    }
    pose.pitch = clamp(pose.pitch, -80, 80);
    return pose;
}

export function normalizeActorPose(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const pose = {};
    for (const key of ['x', 'y', 'z', 'yaw']) {
        const value = Number(raw[key]);
        if (!Number.isFinite(value)) return null;
        pose[key] = round(value, 4);
    }
    return pose;
}

function normalizeEase(value, fallback = 'smooth') {
    return Object.hasOwn(EASINGS, value) ? value : fallback;
}

function normalizeClip(kind, raw, duration, fps) {
    const minimum = frameDuration(fps);
    const start = clamp(quantizeTime(raw?.start, fps), 0, Math.max(0, duration - minimum));
    const length = clamp(quantizeTime(raw?.duration ?? 1, fps), minimum, Math.max(minimum, duration - start));
    const clip = { id: String(raw?.id || makeTimelineId('clip')), start, duration: length };
    if (kind === 'scene') {
        clip.background = String(raw?.background || '').trim();
        clip.layout = String(raw?.layout || '').trim();
    } else if (kind === 'dialogue') {
        clip.speaker = String(raw?.speaker || '').trim();
        clip.text = String(raw?.text || '');
    } else if (kind === 'motion') {
        clip.cue = String(raw?.cue || 'talk').trim() || 'talk';
        clip.face = String(raw?.face || '').trim();
        clip.clipIn = Math.max(0, quantizeTime(raw?.clipIn ?? 0, fps));
        clip.talk = raw?.talk === true;
    } else if (kind === 'fade') {
        clip.from = clamp(finite(raw?.from, 1), 0, 1);
        clip.to = clamp(finite(raw?.to, 0), 0, 1);
        clip.color = /^#[0-9a-f]{6}$/iu.test(String(raw?.color || '')) ? String(raw.color).toLowerCase() : '#000000';
    }
    return clip;
}

function normalizeKey(kind, raw, duration, fps) {
    const key = {
        id: String(raw?.id || makeTimelineId('key')),
        time: clamp(quantizeTime(raw?.time, fps), 0, duration),
        ease: normalizeEase(raw?.ease, kind === 'camera' ? 'smooth' : 'easeInOut'),
    };
    if (kind === 'camera') {
        key.pose = normalizeCameraPose(raw?.pose);
        const focal = Number(raw?.focal);
        key.focal = Number.isFinite(focal) && focal >= 8 && focal <= 300 ? round(focal, 2) : null;
        if (!key.pose) return null;
    } else if (kind === 'transform') {
        key.pose = normalizeActorPose(raw?.pose);
        if (!key.pose) return null;
    }
    return key;
}

export function normalizeTrack(raw, duration, fps, castIds) {
    const kind = String(raw?.kind || '');
    const spec = TRACK_KINDS[kind];
    if (!spec) return null;
    const actor = spec.actor ? String(raw?.actor || '') : '';
    if (spec.actor && !castIds.has(actor)) return null;
    const track = {
        id: String(raw?.id || makeTimelineId('track')),
        kind,
        ...(actor ? { actor } : {}),
        muted: raw?.muted === true,
        locked: raw?.locked === true,
    };
    if (spec.items === 'clips') {
        track.clips = (Array.isArray(raw?.clips) ? raw.clips : [])
            .map(clip => normalizeClip(kind, clip, duration, fps))
            .sort((a, b) => a.start - b.start);
    } else {
        const keys = (Array.isArray(raw?.keys) ? raw.keys : [])
            .map(key => normalizeKey(kind, key, duration, fps))
            .filter(Boolean)
            .sort((a, b) => a.time - b.time);
        // One keyframe per frame: the later entry wins.
        const byFrame = new Map();
        for (const key of keys) byFrame.set(Math.round(key.time * fps), key);
        track.keys = [...byFrame.values()].sort((a, b) => a.time - b.time);
    }
    return track;
}

function normalizeCastMember(raw, duration, fps) {
    const id = String(raw?.id || '').trim();
    if (!id) return null;
    const enter = clamp(quantizeTime(raw?.enter ?? 0, fps), 0, duration);
    const exitRaw = raw?.exit;
    const exit = exitRaw === null || exitRaw === undefined || exitRaw === ''
        ? null
        : clamp(quantizeTime(exitRaw, fps), enter, duration);
    return { id, costume: String(raw?.costume || 'Default').trim() || 'Default', enter, exit };
}

export function normalizeTimeline(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const fps = TIMELINE_FPS;
    const duration = clamp(quantizeTime(finite(source.duration, 12), fps), TIMELINE_MIN_DURATION, TIMELINE_MAX_DURATION);
    const seen = new Set();
    const cast = (Array.isArray(source.cast) ? source.cast : [])
        .map(member => normalizeCastMember(member, duration, fps))
        .filter(member => member && !seen.has(member.id) && seen.add(member.id));
    const castIds = new Set(cast.map(member => member.id));
    const tracks = [];
    const singles = new Set();
    for (const rawTrack of Array.isArray(source.tracks) ? source.tracks : []) {
        const track = normalizeTrack(rawTrack, duration, fps, castIds);
        if (!track) continue;
        const slot = `${track.kind}:${track.actor || ''}`;
        if (TRACK_KINDS[track.kind].single && singles.has(slot)) continue;
        singles.add(slot);
        tracks.push(track);
    }
    const doc = {
        version: TIMELINE_VERSION,
        title: String(source.title || '未命名 Timeline').slice(0, 120),
        fps,
        duration,
        cast,
        tracks,
    };
    return ensureStandardTracks(doc);
}

/** Every document has the global tracks and one motion + transform track per actor. */
export function ensureStandardTracks(doc) {
    const tracks = [...doc.tracks];
    const has = (kind, actor = '') => tracks.some(track => track.kind === kind && (track.actor || '') === actor);
    const add = (kind, actor = '') => {
        const spec = TRACK_KINDS[kind];
        tracks.push({ id: makeTimelineId('track'), kind, ...(actor ? { actor } : {}), muted: false, locked: false, [spec.items]: [] });
    };
    for (const kind of ['scene', 'camera', 'dialogue', 'fade']) if (!has(kind)) add(kind);
    for (const member of doc.cast) {
        for (const kind of ['motion', 'transform']) if (!has(kind, member.id)) add(kind, member.id);
    }
    const castIds = new Set(doc.cast.map(member => member.id));
    const order = ['scene', 'camera', 'dialogue', 'fade'];
    const castOrder = doc.cast.map(member => member.id);
    const rank = track => (TRACK_KINDS[track.kind].actor
        ? 10 + castOrder.indexOf(track.actor) * 2 + (track.kind === 'transform' ? 1 : 0)
        : order.indexOf(track.kind));
    return {
        ...doc,
        tracks: tracks.filter(track => !TRACK_KINDS[track.kind].actor || castIds.has(track.actor)).sort((a, b) => rank(a) - rank(b)),
    };
}

export function createTimelineDocument({ title = '新 Timeline', duration = 12, background = '', actor = 'fktn', speaker = '藤田琴音' } = {}) {
    const doc = normalizeTimeline({
        title,
        duration,
        cast: actor ? [{ id: actor }] : [],
        tracks: [
            { kind: 'scene', clips: background ? [{ start: 0, duration, background }] : [] },
            { kind: 'dialogue', clips: [{ start: 0.5, duration: 3, speaker, text: '制作人，今天也一起加油吧。' }] },
            ...(actor ? [{ kind: 'motion', actor, clips: [
                { start: 0, duration: 3.5, cue: DEFAULT_TALK_MOTION, face: DEFAULT_TALK_FACE, talk: true },
                { start: 3.5, duration: Math.max(1, duration - 3.5), cue: DEFAULT_IDLE_MOTION, face: '' },
            ] }] : []),
            { kind: 'fade', clips: [{ start: 0, duration: 0.8, from: 1, to: 0, color: '#000000' }] },
        ],
    });
    return doc;
}

// ---------------------------------------------------------------- lookups

export function findTrack(doc, trackId) {
    return doc.tracks.find(track => track.id === trackId) || null;
}

export function trackFor(doc, kind, actor = '') {
    return doc.tracks.find(track => track.kind === kind && (track.actor || '') === actor) || null;
}

export function findItem(doc, itemId) {
    for (const track of doc.tracks) {
        const list = track.clips || track.keys || [];
        const item = list.find(entry => entry.id === itemId);
        if (item) return { track, item, type: track.clips ? 'clip' : 'key' };
    }
    return null;
}

export function itemStart(item) {
    return Number.isFinite(item?.start) ? item.start : item?.time ?? 0;
}

export function itemEnd(item) {
    return Number.isFinite(item?.start) ? item.start + item.duration : item?.time ?? 0;
}

/** Times worth snapping to: clip edges, keyframes and the playhead. */
export function snapCandidates(doc, { exclude = new Set(), playhead = null } = {}) {
    const times = new Set([0, doc.duration]);
    if (Number.isFinite(playhead)) times.add(playhead);
    for (const track of doc.tracks) {
        for (const clip of track.clips || []) {
            if (exclude.has(clip.id)) continue;
            times.add(clip.start);
            times.add(round(clip.start + clip.duration, 6));
        }
        for (const key of track.keys || []) if (!exclude.has(key.id)) times.add(key.time);
    }
    return [...times].sort((a, b) => a - b);
}

export function snapTime(time, candidates, threshold, fps = TIMELINE_FPS) {
    let best = null;
    for (const candidate of candidates) {
        const distance = Math.abs(candidate - time);
        if (distance <= threshold && (best === null || distance < Math.abs(best - time))) best = candidate;
    }
    return best === null ? quantizeTime(time, fps) : best;
}

// ---------------------------------------------------------------- edits

function mapTrack(doc, trackId, update) {
    return { ...doc, tracks: doc.tracks.map(track => (track.id === trackId ? update(track) : track)) };
}

function renormalize(doc) {
    return normalizeTimeline(doc);
}

export function addClip(doc, trackId, clip) {
    const track = findTrack(doc, trackId);
    if (!track?.clips) return { doc, id: null };
    const id = clip?.id || makeTimelineId('clip');
    const next = renormalize(mapTrack(doc, trackId, current => ({ ...current, clips: [...current.clips, { ...clip, id }] })));
    return { doc: next, id };
}

/** Insert a keyframe, replacing one already on the same frame. */
export function setKey(doc, trackId, key) {
    const track = findTrack(doc, trackId);
    if (!track?.keys) return { doc, id: null };
    const time = quantizeTime(key.time, doc.fps);
    const existing = track.keys.find(entry => Math.abs(entry.time - time) < frameDuration(doc.fps) / 2);
    const id = existing?.id || key.id || makeTimelineId('key');
    const merged = { ...(existing || {}), ...key, id, time };
    const next = renormalize(mapTrack(doc, trackId, current => ({
        ...current,
        keys: [...current.keys.filter(entry => entry.id !== id && entry !== existing), merged],
    })));
    return { doc: next, id };
}

export function updateItem(doc, itemId, patch) {
    const found = findItem(doc, itemId);
    if (!found) return doc;
    const listName = found.type === 'clip' ? 'clips' : 'keys';
    return renormalize(mapTrack(doc, found.track.id, track => ({
        ...track,
        [listName]: track[listName].map(entry => (entry.id === itemId ? { ...entry, ...patch, id: itemId } : entry)),
    })));
}

/** Move clips/keys by `delta` seconds, keeping clips inside the document. */
export function moveItems(doc, itemIds, delta) {
    const ids = new Set(itemIds);
    if (!ids.size || !Number.isFinite(delta)) return doc;
    let shift = delta;
    for (const track of doc.tracks) {
        for (const clip of track.clips || []) {
            if (!ids.has(clip.id)) continue;
            shift = clamp(shift, -clip.start, doc.duration - clip.start - clip.duration);
        }
        for (const key of track.keys || []) {
            if (!ids.has(key.id)) continue;
            shift = clamp(shift, -key.time, doc.duration - key.time);
        }
    }
    return renormalize({
        ...doc,
        tracks: doc.tracks.map(track => ({
            ...track,
            ...(track.clips ? { clips: track.clips.map(clip => (ids.has(clip.id) ? { ...clip, start: clip.start + shift } : clip)) } : {}),
            ...(track.keys ? { keys: track.keys.map(key => (ids.has(key.id) ? { ...key, time: key.time + shift } : key)) } : {}),
        })),
    });
}

/** Trim a clip edge. `edge` is 'start' or 'end'; the other edge stays put. */
export function trimClip(doc, clipId, edge, time) {
    const found = findItem(doc, clipId);
    if (!found || found.type !== 'clip') return doc;
    const { item } = found;
    const minimum = frameDuration(doc.fps);
    const end = item.start + item.duration;
    if (edge === 'start') {
        const start = clamp(quantizeTime(time, doc.fps), 0, end - minimum);
        const patch = { start, duration: end - start };
        // Trimming a motion's head also skips into the source clip, as in Unity.
        if (found.track.kind === 'motion') patch.clipIn = Math.max(0, (item.clipIn || 0) + (start - item.start));
        return updateItem(doc, clipId, patch);
    }
    const nextEnd = clamp(quantizeTime(time, doc.fps), item.start + minimum, doc.duration);
    return updateItem(doc, clipId, { duration: nextEnd - item.start });
}

export function splitClip(doc, clipId, time) {
    const found = findItem(doc, clipId);
    if (!found || found.type !== 'clip') return { doc, id: null };
    const { item, track } = found;
    const at = quantizeTime(time, doc.fps);
    const minimum = frameDuration(doc.fps);
    if (at <= item.start + minimum / 2 || at >= item.start + item.duration - minimum / 2) return { doc, id: null };
    const id = makeTimelineId('clip');
    const head = { ...item, duration: at - item.start };
    const tail = { ...item, id, start: at, duration: item.start + item.duration - at };
    if (track.kind === 'motion') tail.clipIn = (item.clipIn || 0) + (at - item.start);
    const next = renormalize(mapTrack(doc, track.id, current => ({
        ...current,
        clips: [...current.clips.filter(clip => clip.id !== clipId), head, tail],
    })));
    return { doc: next, id };
}

export function duplicateItems(doc, itemIds, offset) {
    const ids = new Set(itemIds);
    const created = [];
    const next = {
        ...doc,
        tracks: doc.tracks.map(track => {
            if (track.clips) {
                const copies = track.clips.filter(clip => ids.has(clip.id)).map(clip => {
                    const id = makeTimelineId('clip');
                    created.push(id);
                    return { ...clip, id, start: clip.start + offset };
                });
                return copies.length ? { ...track, clips: [...track.clips, ...copies] } : track;
            }
            const copies = track.keys.filter(key => ids.has(key.id)).map(key => {
                const id = makeTimelineId('key');
                created.push(id);
                return { ...key, id, time: key.time + offset };
            });
            return copies.length ? { ...track, keys: [...track.keys, ...copies] } : track;
        }),
    };
    return { doc: renormalize(next), ids: created };
}

export function deleteItems(doc, itemIds) {
    const ids = new Set(itemIds);
    return {
        ...doc,
        tracks: doc.tracks.map(track => ({
            ...track,
            ...(track.clips ? { clips: track.clips.filter(clip => !ids.has(clip.id)) } : {}),
            ...(track.keys ? { keys: track.keys.filter(key => !ids.has(key.id)) } : {}),
        })),
    };
}

export function setDuration(doc, duration) {
    return renormalize({ ...doc, duration });
}

export function addCastMember(doc, id, { costume = 'Default' } = {}) {
    if (!id || doc.cast.some(member => member.id === id)) return doc;
    return renormalize({ ...doc, cast: [...doc.cast, { id, costume, enter: 0, exit: null }] });
}

export function updateCastMember(doc, id, patch) {
    return renormalize({ ...doc, cast: doc.cast.map(member => (member.id === id ? { ...member, ...patch, id } : member)) });
}

export function removeCastMember(doc, id) {
    return renormalize({
        ...doc,
        cast: doc.cast.filter(member => member.id !== id),
        tracks: doc.tracks.filter(track => track.actor !== id),
    });
}

// ---------------------------------------------------------------- evaluate

/** The clip in effect at `time`: the latest one that has started, held past its end. */
export function heldClipAt(clips, time) {
    let found = null;
    for (const clip of clips || []) {
        if (clip.start <= time + 1e-9) found = clip;
        else break;
    }
    return found;
}

/** The clip covering `time` (start inclusive, end exclusive). */
export function activeClipAt(clips, time) {
    let found = null;
    for (const clip of clips || []) {
        if (clip.start > time + 1e-9) break;
        if (time < clip.start + clip.duration - 1e-9) found = clip;
    }
    return found;
}

function bracket(keys, time) {
    if (!keys?.length) return null;
    if (time <= keys[0].time) return { a: keys[0], b: keys[0], u: 0, index: 0 };
    const last = keys.length - 1;
    if (time >= keys[last].time) return { a: keys[last], b: keys[last], u: 0, index: last };
    let index = 0;
    while (index < last && keys[index + 1].time <= time) index += 1;
    const a = keys[index];
    const b = keys[index + 1];
    const span = b.time - a.time;
    return { a, b, u: span > 0 ? (time - a.time) / span : 0, index };
}

export function sampleCamera(keys, time) {
    const found = bracket(keys, time);
    if (!found) return null;
    const { a, b, index } = found;
    if (a === b) return { pose: { ...a.pose }, focal: a.focal ?? null, keyId: a.id };
    const ease = a.ease;
    const t = easeProgress(ease, found.u);
    const pose = {};
    if (ease === 'smooth') {
        // Catmull-Rom through the neighbouring keys gives a continuous path;
        // the eased parameter adds a gentle start and stop at each key.
        const p0 = keys[Math.max(0, index - 1)].pose;
        const p3 = keys[Math.min(keys.length - 1, index + 2)].pose;
        for (const axis of ['x', 'y', 'z']) pose[axis] = catmullRom(p0[axis], a.pose[axis], b.pose[axis], p3[axis], t);
    } else {
        for (const axis of ['x', 'y', 'z']) pose[axis] = lerp(a.pose[axis], b.pose[axis], t);
    }
    pose.yaw = lerpAngle(a.pose.yaw, b.pose.yaw, t);
    pose.pitch = lerp(a.pose.pitch, b.pose.pitch, t);
    const focal = a.focal != null && b.focal != null ? lerp(a.focal, b.focal, t) : (t < 1 ? a.focal : b.focal) ?? null;
    return { pose, focal, keyId: null };
}

export function sampleActorPose(keys, time) {
    const found = bracket(keys, time);
    if (!found) return null;
    const { a, b } = found;
    if (a === b) return { ...a.pose };
    const t = easeProgress(a.ease, found.u);
    return {
        x: lerp(a.pose.x, b.pose.x, t),
        y: lerp(a.pose.y, b.pose.y, t),
        z: lerp(a.pose.z, b.pose.z, t),
        yaw: lerpAngle(a.pose.yaw, b.pose.yaw, t),
    };
}

export function evaluateTimeline(doc, time) {
    const t = clamp(finite(time), 0, doc.duration);
    const live = kind => doc.tracks.filter(track => track.kind === kind && !track.muted);
    const sceneClip = heldClipAt(live('scene')[0]?.clips, t) || live('scene')[0]?.clips?.[0] || null;
    const cameraTrack = live('camera')[0];
    const dialogueClip = activeClipAt(live('dialogue')[0]?.clips, t);
    const fadeClip = activeClipAt(live('fade')[0]?.clips, t);
    const actors = {};
    for (const member of doc.cast) {
        const motionTrack = doc.tracks.find(track => track.kind === 'motion' && track.actor === member.id && !track.muted);
        const transformTrack = doc.tracks.find(track => track.kind === 'transform' && track.actor === member.id && !track.muted);
        const motionClip = heldClipAt(motionTrack?.clips, t);
        const visible = t >= member.enter - 1e-9 && (member.exit === null || t < member.exit - 1e-9);
        actors[member.id] = {
            visible,
            costume: member.costume,
            pose: sampleActorPose(transformTrack?.keys, t),
            motion: motionClip ? {
                clipId: motionClip.id,
                cue: motionClip.cue,
                face: motionClip.face,
                localTime: Math.max(0, Math.min(t, motionClip.start + motionClip.duration) - motionClip.start) + (motionClip.clipIn || 0),
                active: t < motionClip.start + motionClip.duration,
            } : null,
            talking: Boolean(motionClip?.talk && t < motionClip.start + motionClip.duration),
        };
    }
    let fade = null;
    if (fadeClip) {
        const u = (t - fadeClip.start) / fadeClip.duration;
        fade = { opacity: lerp(fadeClip.from, fadeClip.to, easeProgress('easeInOut', u)), color: fadeClip.color };
    }
    return {
        time: t,
        scene: sceneClip ? { clipId: sceneClip.id, background: sceneClip.background, layout: sceneClip.layout } : null,
        camera: sampleCamera(cameraTrack?.keys, t),
        dialogue: dialogueClip ? { clipId: dialogueClip.id, speaker: dialogueClip.speaker, text: dialogueClip.text } : null,
        fade,
        actors,
    };
}

// ---------------------------------------------------------------- preload

const xml = value => String(value ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

/**
 * Build a Beat script that names every model, motion, face and scene the
 * timeline needs. The Beat compiler then plans and downloads exactly those
 * resources, and each motion clip maps back to its Beat through `id`.
 */
export function timelinePreloadScript(doc, { actorName = id => id } = {}) {
    const sceneTrack = doc.tracks.find(track => track.kind === 'scene');
    const backgrounds = (sceneTrack?.clips || []).map(clip => clip.background).filter(Boolean);
    const backgroundAt = time => heldClipAt(sceneTrack?.clips, time)?.background || backgrounds[0] || '';
    const lines = [];
    const costumed = new Set();
    const costumeAttr = member => {
        if (!member || costumed.has(member.id) || member.costume === 'Default') return '';
        costumed.add(member.id);
        return ` costume="${xml(member.costume)}"`;
    };
    for (const member of doc.cast) {
        const track = doc.tracks.find(entry => entry.kind === 'motion' && entry.actor === member.id);
        // Every actor also gets an idle pose for times before her first clip.
        const clips = [{ id: `idle-${member.id}`, start: 0, cue: 'idle', face: '' }, ...(track?.clips || [])];
        for (const clip of clips) {
            const background = backgroundAt(clip.start);
            const face = clip.face ? ` face="${xml(clip.face)}"` : '';
            lines.push(`<beat id="${xml(`tl-${clip.id}`)}" speaker="${xml(actorName(member.id))}" cue="${xml(clip.cue)}"${face}${costumeAttr(member)} look="camera"${background ? ` background="${xml(background)}"` : ''} wait="none"><display lang="zh">…</display></beat>`);
        }
    }
    // Scenes nobody stands in front of still have to load.
    const used = new Set(lines.map(line => /background="([^"]*)"/u.exec(line)?.[1]).filter(Boolean));
    for (const background of backgrounds) {
        if (used.has(xml(background))) continue;
        used.add(xml(background));
        lines.push(`<beat id="tl-scene-${lines.length}" speaker="旁白" background="${xml(background)}" wait="none"><display lang="zh">…</display></beat>`);
    }
    return lines.join('\n');
}

// ---------------------------------------------------------------- storage

export function serializeTimeline(doc) {
    return JSON.stringify(normalizeTimeline(doc), null, 2);
}

export function parseTimeline(text) {
    const raw = JSON.parse(String(text || ''));
    if (raw?.format && raw.format !== 'gakumas-timeline') throw new Error('不是 Timeline 文件。');
    return normalizeTimeline(raw?.timeline || raw);
}
