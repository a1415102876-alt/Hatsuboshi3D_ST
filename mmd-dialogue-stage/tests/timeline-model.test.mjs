import test from 'node:test';
import assert from 'node:assert/strict';
import {
    addClip, addCastMember, createTimelineDocument, deleteItems, duplicateItems, easeProgress, evaluateTimeline,
    findItem, formatTimecode, lerpAngle, moveItems, normalizeTimeline, parseTimeline, quantizeTime, removeCastMember,
    serializeTimeline, setKey, snapCandidates, snapTime, splitClip, timelinePreloadScript, trackFor, trimClip,
} from '../timeline-model.js';
import { parseBeatScript } from '../beat-protocol.js';

const near = (actual, expected, epsilon = 1e-3) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} ≈ ${expected}`);

test('time helpers quantize to frames and format timecode', () => {
    assert.equal(quantizeTime(1.01), 1);
    assert.equal(quantizeTime(1.02), 1.033333);
    assert.equal(formatTimecode(0), '00:00:00');
    assert.equal(formatTimecode(61.5), '01:01:15');
    assert.equal(easeProgress('step', 0.9), 0);
    assert.equal(easeProgress('linear', 0.25), 0.25);
    near(easeProgress('easeInOut', 0.5), 0.5);
    near(lerpAngle(170, -170, 0.5), 180);
});

test('normalizeTimeline builds standard tracks and drops invalid data', () => {
    const doc = normalizeTimeline({
        duration: 5,
        cast: [{ id: 'hkne' }, { id: 'hkne' }, { id: '' }],
        tracks: [
            { kind: 'camera', keys: [{ time: 1, pose: { x: 0, y: 1, z: 2, yaw: 0, pitch: 100 } }, { time: 2, pose: { x: 'bad' } }] },
            { kind: 'motion', actor: 'nobody', clips: [{ start: 0, duration: 1 }] },
            { kind: 'unknown' },
        ],
    });
    assert.deepEqual(doc.cast.map(member => member.id), ['hkne']);
    assert.deepEqual(doc.tracks.map(track => `${track.kind}:${track.actor || ''}`), ['scene:', 'camera:', 'dialogue:', 'fade:', 'motion:hkne', 'transform:hkne']);
    const camera = trackFor(doc, 'camera');
    assert.equal(camera.keys.length, 1);
    assert.equal(camera.keys[0].pose.pitch, 80);
});

test('clips stay inside the document and on frame boundaries', () => {
    let doc = normalizeTimeline({ duration: 4, cast: [{ id: 'fktn' }] });
    const motion = trackFor(doc, 'motion', 'fktn');
    ({ doc } = addClip(doc, motion.id, { start: 3.5, duration: 9, cue: 'talk' }));
    const clip = trackFor(doc, 'motion', 'fktn').clips[0];
    assert.equal(clip.start, 3.5);
    assert.equal(clip.duration, 0.5);
    doc = moveItems(doc, [clip.id], 10);
    assert.equal(findItem(doc, clip.id).item.start, 3.5);
    doc = moveItems(doc, [clip.id], -1.01);
    assert.equal(findItem(doc, clip.id).item.start, 2.5);
});

test('trim, split and duplicate keep motion source offsets', () => {
    let doc = normalizeTimeline({ duration: 10, cast: [{ id: 'fktn' }], tracks: [{ kind: 'motion', actor: 'fktn', clips: [{ id: 'm1', start: 1, duration: 4, cue: 'talk' }] }] });
    doc = trimClip(doc, 'm1', 'start', 2);
    let clip = findItem(doc, 'm1').item;
    assert.equal(clip.start, 2);
    assert.equal(clip.duration, 3);
    assert.equal(clip.clipIn, 1);
    const split = splitClip(doc, 'm1', 3);
    doc = split.doc;
    const tail = findItem(doc, split.id).item;
    assert.equal(findItem(doc, 'm1').item.duration, 1);
    assert.equal(tail.start, 3);
    assert.equal(tail.clipIn, 2);
    const copy = duplicateItems(doc, ['m1'], 5);
    assert.equal(findItem(copy.doc, copy.ids[0]).item.start, 7);
    doc = deleteItems(copy.doc, ['m1']);
    assert.equal(findItem(doc, 'm1'), null);
});

test('setKey replaces a key on the same frame', () => {
    let doc = normalizeTimeline({ duration: 5 });
    const camera = trackFor(doc, 'camera');
    const pose = { x: 0, y: 15, z: 30, yaw: 0, pitch: 0 };
    const first = setKey(doc, camera.id, { time: 1, pose });
    const second = setKey(first.doc, camera.id, { time: 1.01, pose: { ...pose, x: 5 } });
    const keys = trackFor(second.doc, 'camera').keys;
    assert.equal(keys.length, 1);
    assert.equal(keys[0].id, first.id);
    assert.equal(keys[0].pose.x, 5);
});

test('camera samples interpolate, hold outside keys and respect step', () => {
    const doc = normalizeTimeline({
        duration: 10,
        tracks: [{ kind: 'camera', keys: [
            { time: 2, pose: { x: 0, y: 10, z: 30, yaw: 0, pitch: 0 }, focal: 35, ease: 'linear' },
            { time: 4, pose: { x: 10, y: 10, z: 30, yaw: 90, pitch: 10 }, focal: 85, ease: 'step' },
            { time: 6, pose: { x: 20, y: 10, z: 30, yaw: 90, pitch: 10 }, focal: 85 },
        ] }],
    });
    assert.equal(evaluateTimeline(doc, 0).camera.pose.x, 0);
    const mid = evaluateTimeline(doc, 3).camera;
    near(mid.pose.x, 5);
    near(mid.pose.yaw, 45);
    near(mid.focal, 60);
    assert.equal(evaluateTimeline(doc, 5.9).camera.pose.x, 10);
    assert.equal(evaluateTimeline(doc, 9).camera.pose.x, 20);
});

test('evaluation resolves scene, dialogue, fade, visibility and held motions', () => {
    const doc = normalizeTimeline({
        duration: 10,
        cast: [{ id: 'hkne', enter: 1, exit: 8 }],
        tracks: [
            { kind: 'scene', clips: [{ start: 0, duration: 5, background: 'a' }, { start: 5, duration: 5, background: 'b' }] },
            { kind: 'dialogue', clips: [{ start: 2, duration: 2, speaker: 'hkne', text: '你好' }] },
            { kind: 'fade', clips: [{ start: 0, duration: 1, from: 1, to: 0 }] },
            { kind: 'motion', actor: 'hkne', clips: [{ id: 'm', start: 1, duration: 2, cue: 'talk', clipIn: 0.5, talk: true }] },
            { kind: 'transform', actor: 'hkne', keys: [{ time: 0, pose: { x: 0, y: 0, z: 0, yaw: 0 }, ease: 'linear' }, { time: 4, pose: { x: 8, y: 0, z: 0, yaw: 0 } }] },
        ],
    });
    const early = evaluateTimeline(doc, 0.5);
    assert.equal(early.actors.hkne.visible, false);
    near(early.fade.opacity, 0.5);
    const talk = evaluateTimeline(doc, 2.5);
    assert.equal(talk.scene.background, 'a');
    assert.equal(talk.dialogue.text, '你好');
    assert.equal(talk.actors.hkne.motion.clipId, 'm');
    near(talk.actors.hkne.motion.localTime, 2);
    assert.equal(talk.actors.hkne.talking, true);
    near(talk.actors.hkne.pose.x, 5);
    const held = evaluateTimeline(doc, 6);
    assert.equal(held.scene.background, 'b');
    assert.equal(held.dialogue, null);
    assert.equal(held.actors.hkne.motion.clipId, 'm');
    assert.equal(held.actors.hkne.motion.active, false);
    near(held.actors.hkne.motion.localTime, 2.5);
    assert.equal(held.actors.hkne.talking, false);
    assert.equal(evaluateTimeline(doc, 9).actors.hkne.visible, false);
});

test('snapping prefers nearby edges and otherwise quantizes', () => {
    const doc = normalizeTimeline({ duration: 10, tracks: [{ kind: 'dialogue', clips: [{ id: 'd', start: 2, duration: 1.5 }] }] });
    const candidates = snapCandidates(doc, { playhead: 6 });
    assert.ok(candidates.includes(3.5) && candidates.includes(6));
    assert.equal(snapTime(3.46, candidates, 0.1), 3.5);
    assert.equal(snapTime(4.71, candidates, 0.1), 4.7);
    assert.ok(!snapCandidates(doc, { exclude: new Set(['d']) }).includes(3.5));
});

test('cast changes add and remove actor tracks', () => {
    let doc = normalizeTimeline({ duration: 5 });
    doc = addCastMember(doc, 'hkne', { costume: 'Onsen' });
    assert.ok(trackFor(doc, 'motion', 'hkne'));
    assert.equal(doc.cast[0].costume, 'Onsen');
    doc = removeCastMember(doc, 'hkne');
    assert.equal(trackFor(doc, 'motion', 'hkne'), null);
});

test('preload script parses as Beats that carry every clip, scene and costume', () => {
    const doc = createTimelineDocument({ actor: 'hkne', speaker: '冰渡香名江', background: '声乐练习室-午' });
    const withCostume = normalizeTimeline({ ...doc, cast: [{ id: 'hkne', costume: 'Onsen' }] });
    const motionIds = ['tl-idle-hkne', ...trackFor(withCostume, 'motion', 'hkne').clips.map(clip => `tl-${clip.id}`)];
    const script = timelinePreloadScript(withCostume, { actorName: () => '冰渡香名江' });
    const parsed = parseBeatScript(script);
    assert.deepEqual(parsed.errors.filter(error => error.code !== 'paired-face'), []);
    assert.deepEqual(parsed.beats.map(beat => beat.id), motionIds);
    assert.ok(parsed.beats.every(beat => beat.background));
    assert.match(script, /costume="Onsen"/u);
});

test('serialize and parse round-trip', () => {
    const doc = createTimelineDocument({ actor: 'fktn', background: 'x' });
    const again = parseTimeline(serializeTimeline(doc));
    assert.deepEqual(again, normalizeTimeline(doc));
    assert.throws(() => parseTimeline('{"format":"other"}'), /Timeline/u);
});
