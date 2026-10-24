import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildNiaLiveSegmentPrompt } from '../nia-business-api.js';
import { buildNiaTvSegmentPrompt } from '../nia-tv-business-api.js';
import * as cues from '../../mmd-dialogue-stage/portrait-cues.js';
import { SceneDirector } from '../../mmd-dialogue-stage/scene-director.js';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const host = readFileSync(new URL('../st.html', import.meta.url), 'utf8');

test('VN parses automatic cast and ordered entrance tags without a preload tag', () => {
    const start = app.indexOf('function parseNovelSlides(');
    const end = app.indexOf('function getSceneBackground(', start);
    const build = new Function('globalThis', 'sanitizeVnStorySource', 'hatsuHcg', 'state', 'cleanReplyText',
        `${app.slice(start, end)}; return buildVnSlidesFromStory;`)(
        { Hatsu3DPortraitCues: cues }, value => value, {}, { idol: '藤田琴音' }, value => value);
    const slides = build(`<narration>月村手毬今天不在。</narration>
<stage-enter idol="藤田琴音" position="left"/>
<dialogue char="藤田琴音(说话)">你好。</dialogue>
<stage-exit idol="藤田琴音"/>`);
    assert.deepEqual(slides.map(slide => slide.type), ['narration', 'stage', 'dialogue', 'stage']);
    assert.deepEqual(cues.stageSnapshot(slides, -1), { cast: ['fktn', 'ttmr'], actors: {} });
    assert.deepEqual(cues.stageSnapshot(slides, 2).actors, { fktn: { position: 'left' } });
    assert.deepEqual(cues.stageSnapshot(slides, 3).actors, {});
    assert.equal(slides[2].speaker, '藤田琴音(说话)');
});

test('VN accepts AI replies whose XML delimiters are backslash-escaped', () => {
    const sanitize = app.slice(app.indexOf('function sanitizeVnStorySource('), app.indexOf('function parseNovelSlides('));
    const parse = app.slice(app.indexOf('function parseNovelSlides('), app.indexOf('function getSceneBackground('));
    const build = new Function('globalThis', 'sanitizeVnStorySource', 'hatsuHcg', 'state', 'cleanReplyText',
        `${sanitize}${parse}; return buildVnSlidesFromStory;`)(
        { Hatsu3DPortraitCues: cues }, value => String(value || ''), {}, { idol: '藤田琴音' }, value => value);
    const slides = build('\\<stage-enter idol="藤田琴音" position="center"/>\n\\<dialogue char="藤田琴音(说话)">你好\\</dialogue>');
    assert.deepEqual(slides.map(slide => slide.type), ['stage', 'dialogue']);
    assert.equal(slides[1].speaker, '藤田琴音(说话)');
});

test('raw replies retain stage controls through extraction, cleaning and actor entry', async () => {
    const extraction = app.slice(app.indexOf('function stripAiThinkingBlocks('), app.indexOf('function extractTaggedSummarySection('));
    const parser = app.slice(app.indexOf('function sanitizeVnStorySource('), app.indexOf('function getSceneBackground('));
    const pipeline = new Function('globalThis', 'hatsuHcg', 'state', `${extraction}\n${parser}
        return { extractReplyCandidate, cleanReplyText, buildVnSlidesFromStory };`)(
        { Hatsu3DPortraitCues: cues }, {}, { idol: '藤田琴音' });
    const source = `<content>
【初星正文开始】
<stage-preload idols="藤田琴音"/>
<stage-enter idol="藤田琴音" position="center"/>
<!-- 草稿：十王星南不应被预加载。 -->
<narration>制作人办公室里，藤田琴音看着企划书。</narration>
<dialogue char="藤田琴音(思考)">这就是NEXT IDOL AUDITION？</dialogue>
<stage-exit idol="藤田琴音"/>
【初星正文结束】
</content>`;
    for (const raw of [source, source.replaceAll('<', '\\<'), source.replaceAll('<', '&lt;').replaceAll('>', '&gt;')]) {
        const reply = pipeline.extractReplyCandidate(raw);
        assert.equal(reply.method, 'hatsu');
        assert.match(reply.text, /<stage-enter idol="藤田琴音"/);
        assert.doesNotMatch(reply.text, /草稿|十王星南|<content>/);
        const slides = pipeline.buildVnSlidesFromStory(pipeline.cleanReplyText(reply.text));
        assert.deepEqual(slides.map(slide => slide.type), ['stage', 'stage', 'narration', 'dialogue', 'stage']);
        assert.deepEqual(cues.stageSnapshot(slides, -1), { cast: ['fktn'], actors: {} });
        const transitions = [];
        const container = {
            ownerDocument: { createElement: () => ({ hidden: true, dataset: {}, style: {}, remove() {} }) },
            append() {},
        };
        const director = new SceneDirector(container, () => ({
            async ensure(idolId) { assert.equal(idolId, 'fktn'); return true; },
            async playStageTransition(family, { onStart }) { transitions.push(family); onStart?.(); },
            async playSpeakerCue(speaker) { assert.equal(speaker, '藤田琴音(思考)'); return true; },
            resume() {}, pause() {}, dispose() {},
        }));
        try {
            await director.sync(slides, 0);
            assert.equal(director.entries.get('fktn').canvas.hidden, true);
            await director.sync(slides, 1);
            assert.equal(director.entries.get('fktn').canvas.hidden, false);
            await director.sync(slides, 3);
            assert.equal(await director.speak(slides[3].speaker, 'dialogue'), true);
            await director.sync(slides, 4);
            assert.equal(director.entries.get('fktn').canvas.hidden, true);
            assert.deepEqual(transitions, ['enter', 'exit']);
        } finally {
            director.dispose();
        }
    }
    assert.equal(pipeline.cleanReplyText('<stage-other/><stage-enter-extra/><dialogue-extra/>'), '');
});

test('VN preloads text-only casts and does not wait for stage tags', () => {
    const start = app.indexOf('function initVisualNovelPlayer(');
    const end = app.indexOf('vnCurrentIndex = 0;', start);
    const initialize = new Function('globalThis', 'vnLivePortraitState', 'hideVnLivePortraitLayer', 'ensureVnSceneDirector',
        `let vnSlides = []; const vnNsfwModeActive = false; ${app.slice(start, end)} } return initVisualNovelPlayer;`);
    let requested = null;
    const run = initialize({ Hatsu3DPortraitCues: cues }, { sceneSession: 0, generation: 0 }, () => {},
        () => ({ then(callback) { callback({ preload(cast) { requested = cast; } }); return { catch() {} }; } }));
    run([{ type: 'narration', speaker: '', text: '藤田琴音提到了月村手毬。' }]);
    assert.deepEqual(requested, ['fktn', 'ttmr']);
    assert.match(app, /syncVnStage\(index, true\)/);
    assert.match(app, /if \(vnLivePortraitState\.stageBusy\) return;/);
});

test('VN passes the original tagged speaker, not the display name, and guards async completion', () => {
    const render = app.slice(app.indexOf('function renderVnSlide('), app.indexOf('function renderVnSlide(') + 8500);
    assert.match(render, /syncVnLivePortrait\(\{\s*speaker: slide\.speaker,/);
    assert.doesNotMatch(render, /syncVnLivePortrait\(\{\s*speaker: visual\.speaker/);
    const sync = app.slice(app.indexOf('async function syncVnLivePortrait('), app.indexOf('function setVnLivePortraitTalking('));
    assert.match(sync, /director\?\.speak\(speaker, slideType\)/);
    assert.match(sync, /generation !== vnLivePortraitState\.generation/);
    assert.match(sync, /generation !== vnLivePortraitState\.generation/);
});

test('live and TV both generate bilingual Beat lines for the current idol', () => {
    const live = buildNiaLiveSegmentPrompt({ idol: '藤田琴音' }, {});
    const shape = JSON.parse(live.match(/<NIA_LIVE_SEGMENT>\s*({[\s\S]*?})\s*<\/NIA_LIVE_SEGMENT>/)[1]);
    assert.ok(shape.beats[0].text.includes('speaker="fktn"'));
    assert.ok(shape.beats[0].text.includes('<display lang="zh">'));
    assert.doesNotMatch(live, /可用偶像：|<stage-preload|<stage-enter/);
    const tv = buildNiaTvSegmentPrompt({ idol: '藤田琴音' }, {});
    const tvShape = JSON.parse(tv.match(/<NIA_TV_PROGRAM>\s*({[\s\S]*?})\s*<\/NIA_TV_PROGRAM>/)[1]);
    assert.ok(tvShape.lines.some(line => line.text.includes('speaker="fktn"') && line.text.includes('<tts lang="ja">')));
    assert.doesNotMatch(tv, /俏皮推销|平常待机|不够用时/);
});

test('embedded classic loader binds the current contracts and still rejects unrelated imports', async () => {
    const start = host.indexOf('function convertNiaBusinessModuleToClassic');
    const end = host.indexOf('\n  async function probeEmbedAssetBase', start);
    const convert = new Function(`${host.slice(start, end)}; return convertNiaBusinessModuleToClassic;`)();
    assert.throws(() => convert("import unsafe from 'unknown';"), /import_not_supported/);
    for (const file of ['nia-business-api.js', 'nia-tv-business-api.js']) {
        const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
        const browserGlobal = { Hatsu3DPortraitCues: cues, HatsuBeatPlayerCore: await import('../../mmd-dialogue-stage/beat-player-core.js'), HatsuBeatProtocol: await import('../../mmd-dialogue-stage/beat-protocol.js') };
        new Function('globalThis', convert(source))(browserGlobal);
        const build = browserGlobal.HatsuNiaBusiness?.buildNiaLiveSegmentPrompt || browserGlobal.HatsuNiaTvApi?.buildNiaTvSegmentPrompt;
        const prompt = build({ idol: '藤田琴音' });
        if (file === 'nia-business-api.js') assert.ok(prompt.includes('<display lang=\"zh\">'));
        else {
            const shape=JSON.parse(prompt.match(/<NIA_TV_PROGRAM>\s*({[\s\S]*?})\s*<\/NIA_TV_PROGRAM>/)[1]);
            assert.ok(shape.lines.some(line=>line.text.includes('<tts lang="ja">')));
        }
    }
});
