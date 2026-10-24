import { resolveNpcPortrait } from './beat-npc-portraits.js?v=20261014-npc-portraits-v1';
import { sceneIdolId, SCENE_IDOLS, STAR_EYE_IDOLS } from './scene-protocol.js?v=20261006-star-eyes-v1';
import { BEAT_CUE_IDS, BEAT_BODY_CUE_SPECS, BEAT_EFFECT_ALIASES, BEAT_EFFECT_IDS, BEAT_FACE_ALIASES, BEAT_FACE_IDS, BEAT_OVERLAY_CUE_IDS, resolveBeatCueAlias } from './beat-cues.js?v=20261011-stage-cue-rules-v4';
import { resolveBeatBackgroundAsset } from './beat-background-assets.js?v=20261008-background-aliases-v1';
import { resolveBeatCostume } from './beat-costumes.js?v=20261013-all-idol-solo1-v1';
import { BEAT_CAMERA_EASES, BEAT_CAMERA_MOTIONS, BEAT_CAMERA_PRESETS, beatActorId } from './beat-player-core.js?v=20261023-camera-v1';

const DEFAULT_CUES = BEAT_CUE_IDS;
const DEFAULT_SHOTS = Object.freeze(['wide', 'medium', 'close', 'reaction', 'keep']);
const DEFAULT_CAMERA_PRESETS = BEAT_CAMERA_PRESETS;
const DEFAULT_CAMERA_MOTIONS = BEAT_CAMERA_MOTIONS;
const DEFAULT_CAMERA_EASES = BEAT_CAMERA_EASES;
const DEFAULT_WAITS = Object.freeze(['text', 'voice', 'none']);
const DEFAULT_POSITIONS = Object.freeze(['left', 'center', 'right']);
const DEFAULT_FACES = BEAT_FACE_IDS;
const DEFAULT_OVERLAYS = BEAT_OVERLAY_CUE_IDS;
const DEFAULT_EFFECTS = BEAT_EFFECT_IDS;
const BUILTIN_OTHER_SPEAKERS = new Set(['producer', '制作人', 'narrator', '旁白']);
function asSet(values, fallback) {
    const source = Array.isArray(values) && values.length ? values : fallback;
    return new Set(source.map(value => String(value).trim()).filter(Boolean));
}

function parseAttributes(source) {
    const attributes = {};
    const pattern = /([A-Za-z][\w-]*)\s*=\s*(["'])(.*?)\2/g;
    let match;
    while ((match = pattern.exec(source))) attributes[match[1]] = match[3].trim();
    const costumeKeyword = source.match(/(?:^|\s)costume:([A-Za-z0-9_-]+)(?=\s|$)/i);
    if (!attributes.costume && costumeKeyword) attributes.costume = costumeKeyword[1];
    return attributes;
}

function normalizeText(text) {
    return String(text || '')
        .replace(/\r\n?/g, '\n')
        .replace(/^[ \t]+|[ \t]+$/gm, '')
        .trim();
}

function stripLocalizedMarkup(value) {
    return String(value || '')
        .replace(/<tts\b[^>]*>[\s\S]*?<\/tts>/gi, '')
        .replace(/<tts\b[^>]*>[\s\S]*$/gi, '')
        .replace(/<display\b[^>]*>([\s\S]*?)<\/display>/gi, '$1')
        .replace(/<\/?display\b[^>]*>/gi, '')
        .replace(/<\/?tts\b[^>]*>/gi, '');
}

function parseLocalizedBeatText(rawText, speaker) {
    const source = String(rawText || '')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .trim();
    const displayMatch = source.match(/<display\b[^>]*\blang=["']zh["'][^>]*>([\s\S]*?)<\/display>/i)
        || source.match(/<display\b[^>]*>([\s\S]*?)<\/display>/i);
    const ttsMatch = source.match(/<tts\b[^>]*\blang=["']ja["'][^>]*>([\s\S]*?)<\/tts>/i)
        || source.match(/<tts\b[^>]*>([\s\S]*?)<\/tts>/i);
    const display = normalizeText(stripLocalizedMarkup(displayMatch ? displayMatch[1] : source));
    const voiced = isFishVoicedSpeaker(speaker);
    const ttsText = voiced && ttsMatch
        ? String(ttsMatch[1] || '')
            .replace(/<[^>]*>/g, '')
            .replace(/\[([^\]]*)\]/g, (match, value) => {
                const tag = String(value || '').trim().toLowerCase();
                return ['soft', 'pause', 'long pause', 'emphasis', 'excited', 'sighing'].includes(tag) ? `[${tag}]` : '';
            })
            .replace(/\s{2,}/g, ' ')
            .trim()
        : '';
    return { text: display, ttsText };
}

function isFishVoicedSpeaker(speaker) {
    return /(?:kotone|fktn|藤田琴音|琴音|hski|花海咲季|咲季|ttmr|月村手毬|手毬|shro|筱泽广|篠澤広|广|hmsz|秦谷美铃|美铃|kllj|葛城莉莉娅|莉莉娅|jsna|十王星南|星南|hume|花海佑芽|佑芽|hrnm|rinami|姬崎莉波|莉波|ssmk|sumika|shiun\s+sumika|紫云清夏|清夏|amao|mao|arimura\s+mao|有村麻央|麻央|atbm|tsubame|amaya\s+tsubame|雨夜燕|燕|kcna|仓本千奈|千奈)/i.test(String(speaker || ''));
}

function addError(errors, code, message, index, beat = null) {
    errors.push({ code, message, index, beat });
}

function parseChoiceEvent(input, errors) {
    const source = String(input || '');
    const openIndex = source.search(/<choice\b/i);
    if (openIndex < 0) return { storySource: source, choices: [] };
    const closeIndex = source.toLowerCase().indexOf('</choice>', openIndex);
    if (closeIndex < 0) {
        addError(errors, 'malformed-choice', '选项事件缺少结束标签，已忽略。', openIndex);
        return { storySource: source, choices: [] };
    }
    const blockEnd = closeIndex + '</choice>'.length;
    if (/<choice\b/i.test(source.slice(blockEnd))) {
        addError(errors, 'extra-choice', '一段演出只保留第一个选项事件。', source.slice(blockEnd).search(/<choice\b/i) + blockEnd);
    }
    if (/<beat\b/i.test(source.slice(blockEnd))) {
        addError(errors, 'choice-trailing', '选项之后的 Beat 不进入本段演出。', blockEnd);
    }
    const body = source.slice(source.indexOf('>', openIndex) + 1, closeIndex);
    const choices = [];
    const optionPattern = /<option\b[^>]*>([\s\S]*?)<\/option>/gi;
    let optionMatch;
    while ((optionMatch = optionPattern.exec(body))) {
        const text = normalizeText(stripLocalizedMarkup(optionMatch[1]));
        if (!text) {
            addError(errors, 'empty-option', '空选项已跳过。', openIndex + optionMatch.index);
            continue;
        }
        choices.push({ id: `c${String(choices.length + 1).padStart(2, '0')}`, text });
    }
    if (choices.length !== 4) {
        addError(errors, 'choice-count', `选项事件需要 4 个选项，当前是 ${choices.length} 个。`, openIndex);
        return { storySource: source.slice(0, openIndex), choices: [] };
    }
    return { storySource: source.slice(0, openIndex), choices: choices.slice(0, 4) };
}

/**
 * Parse the small, AI-facing Beat markup used by the prototype.
 * The parser intentionally returns usable beats together with diagnostics so a
 * single malformed or invented tag cannot stop the whole scene.
 */
export function parseBeatScript(source, options = {}) {
    const input = String(source ?? '');
    const actors = Array.isArray(options.actors) && options.actors.length
        ? asSet(options.actors, [])
        : null;
    const cues = asSet(options.cues, DEFAULT_CUES);
    const shots = asSet(options.shots, DEFAULT_SHOTS);
    const cameraPresets = asSet(options.cameraPresets, DEFAULT_CAMERA_PRESETS);
    const cameraMotions = asSet(options.cameraMotions, DEFAULT_CAMERA_MOTIONS);
    const cameraEases = asSet(options.cameraEases, DEFAULT_CAMERA_EASES);
    const waits = asSet(options.waits, DEFAULT_WAITS);
    const positions = asSet(options.positions, DEFAULT_POSITIONS);
    const faces = asSet(options.faces, DEFAULT_FACES);
    const overlays = asSet(options.overlays, DEFAULT_OVERLAYS);
    const effects = asSet(options.effects, DEFAULT_EFFECTS);
    const backgrounds = asSet(options.backgrounds, []);
    const beats = [];
    const errors = [];
    const choiceEvent = parseChoiceEvent(input, errors);
    const storySource = choiceEvent.storySource;
    let searchIndex = 0;
    let previousLook = 'auto';
    let previousShot = 'keep';
    let previousBackground = '';
    let previousBackgroundAsset = null;
    const costumeByActor = new Map();
    for (const [actor, value] of Object.entries(options.defaultCostumes || {})) {
        const idolId = sceneIdolId(actor) || (actor === 'kotone' ? 'fktn' : actor);
        const costume = resolveBeatCostume(value, idolId);
        if (costume) costumeByActor.set(idolId, costume);
    }
    if (options.defaultBackground) {
        const initial = resolveBeatBackgroundAsset(options.defaultBackground, { backgrounds: [...backgrounds] });
        if (initial.matched) { previousBackground = initial.name; previousBackgroundAsset = initial; }
    }

    while (searchIndex < storySource.length) {
        const open = /<beat\b([^>]*)>/gi;
        open.lastIndex = searchIndex;
        const opening = open.exec(storySource);
        if (!opening) break;

        const openIndex = opening.index;
        const contentStart = open.lastIndex;
        const closeIndex = storySource.toLowerCase().indexOf('</beat>', contentStart);
        const nestedIndex = storySource.toLowerCase().indexOf('<beat', contentStart);
        if (closeIndex < 0 || (nestedIndex >= 0 && nestedIndex < closeIndex)) {
            addError(errors, 'malformed-beat', 'Beat 缺少结束标签，已跳过该段。', openIndex);
            searchIndex = nestedIndex >= 0 && nestedIndex < closeIndex ? nestedIndex : storySource.length;
            continue;
        }

        const attributes = parseAttributes(opening[1]);
        const rawText = storySource.slice(contentStart, closeIndex);
        const localized = parseLocalizedBeatText(rawText, attributes.speaker || 'narrator');
        const text = localized.text;
        const beatNumber = beats.length + 1;
        const beatId = attributes.id || `b${String(beatNumber).padStart(2, '0')}`;
        const speaker = attributes.speaker || 'narrator';
        const portrait = resolveNpcPortrait(speaker, attributes.face);

        if (!attributes.speaker) addError(errors, 'missing-speaker', 'Beat 缺少 speaker，按旁白处理。', openIndex, beatId);
        if (actors && !portrait && !BUILTIN_OTHER_SPEAKERS.has(speaker) && !actors.has(speaker) && options.allowOtherSpeakers !== true) {
            addError(errors, 'unknown-speaker', `未知角色：${speaker}。`, openIndex, beatId);
        }
        if (!text) {
            addError(errors, 'empty-text', 'Beat 没有台词文本，已跳过。', openIndex, beatId);
            searchIndex = closeIndex + '</beat>'.length;
            continue;
        }

        let cue = attributes.cue || 'talk';
        if (!cues.has(cue)) {
            addError(errors, 'unknown-cue', `未知动作：${cue}，已回退到 talk。`, openIndex, beatId);
            cue = cues.has('talk') ? 'talk' : [...cues][0] || 'idle';
        }

        let face = portrait ? portrait.emotion : String(attributes.face || '').trim().toLowerCase();
        if (portrait) {
            if (!portrait.matchedFace) addError(errors, 'unknown-portrait-face', `当前角色没有立绘表情：${attributes.face}，已回退到默认立绘。`, openIndex, beatId);
        } else {
            face = BEAT_FACE_ALIASES[face] || face;
            if (face && !faces.has(face)) {
                addError(errors, 'unknown-face', `未知独立表情：${face}，已回退到默认表情。`, openIndex, beatId);
                face = '';
            }
        }
        const overlay = [...new Set(String(attributes.overlay || '')
            .split(/[,，;；\s]+/u)
            .map(value => value.trim().toLowerCase())
            .filter(Boolean))];
        const invalidOverlays = overlay.filter(value => !overlays.has(value));
        if (invalidOverlays.length) {
            addError(errors, 'unknown-overlay', `未知叠加动作：${invalidOverlays.join('、')}，已忽略。`, openIndex, beatId);
        }
        let validOverlays = overlay.filter(value => overlays.has(value));
        const effect = [...new Set(String(attributes.effect || '')
            .split(/[,，;；\s]+/u)
            .map(value => BEAT_EFFECT_ALIASES[value.trim().toLowerCase()] || value.trim().toLowerCase())
            .filter(Boolean))];
        const invalidEffects = effect.filter(value => !effects.has(value));
        if (invalidEffects.length) {
            addError(errors, 'unknown-effect', `未知面部特殊效果：${invalidEffects.join('、')}，已忽略。`, openIndex, beatId);
        }
        let validEffects = effect.filter(value => effects.has(value));
        const normalizedSpeaker = String(speaker || '').trim().toLowerCase();
        const speakerId = sceneIdolId(speaker) || (normalizedSpeaker === 'kotone' ? 'fktn' : normalizedSpeaker);
        const actorId = beatActorId(speaker);
        if (attributes.costume) {
            const costume = actorId && resolveBeatCostume(attributes.costume, actorId);
            if (costume) costumeByActor.set(actorId, costume);
            else addError(errors, 'unknown-costume', `当前说话人不能使用服装 ${attributes.costume}，已沿用原服装。`, openIndex, beatId);
        }
        if (actorId && !costumeByActor.has(actorId)) costumeByActor.set(actorId, 'Default');
        if (validEffects.includes('star-eyes') && !STAR_EYE_IDOLS.includes(speakerId)) {
            addError(errors, 'effect-character', '当前角色没有星星眼材质，已忽略当前说话人的 star-eyes。', openIndex, beatId);
            validEffects = validEffects.filter(value => value !== 'star-eyes');
        }
        if (validEffects.length && ['producer', '制作人', 'narrator', '旁白'].includes(speaker)) {
            addError(errors, 'effect-speaker', '面部特殊效果只能用于偶像说话人，已忽略。', openIndex, beatId);
            validEffects = [];
        }
        const bodySpec = BEAT_BODY_CUE_SPECS[cue];
        if (portrait) {
            // A 2D NPC face must never change the last visible idol's morphs.
            validOverlays = [];
            validEffects = [];
        } else if (bodySpec) face ||= bodySpec.defaultFace;
        else {
            if (face) addError(errors, 'paired-face', '成套动作自带表情，已忽略独立 face。', openIndex, beatId);
            if (validOverlays.length) addError(errors, 'paired-overlay', '叠加动作需搭配独立身体动作，已忽略 overlay。', openIndex, beatId);
            face = '';
            validOverlays = [];
        }
        if (validOverlays.length > 1) {
            addError(errors, 'conflicting-overlays', '同一段只能选择点头或摇头的一种叠加，已保留第一项。', openIndex, beatId);
            validOverlays = validOverlays.slice(0, 1);
        }

        let shot = attributes.shot || previousShot;
        if (!shots.has(shot)) {
            addError(errors, 'unknown-shot', `未知镜头：${shot}，已回退到 keep。`, openIndex, beatId);
            shot = shots.has('keep') ? 'keep' : [...shots][0] || 'keep';
        }

        let camera = String(attributes.camera || '').trim().toLowerCase();
        if (camera && !cameraPresets.has(camera)) {
            addError(errors, 'unknown-camera', '未知 3D 构图：' + camera + '，已交给播放器按 shot 推断。', openIndex, beatId);
            camera = '';
        }
        let cameraMotion = String(attributes['camera-motion'] || '').trim().toLowerCase();
        if (cameraMotion && !cameraMotions.has(cameraMotion)) {
            addError(errors, 'unknown-camera-motion', '未知镜头运动：' + cameraMotion + '，已忽略。', openIndex, beatId);
            cameraMotion = '';
        }
        let cameraEase = String(attributes['camera-ease'] || '').trim().toLowerCase();
        if (cameraEase && !cameraEases.has(cameraEase)) {
            addError(errors, 'unknown-camera-ease', '未知镜头缓动：' + cameraEase + '，已回退到 out-sine。', openIndex, beatId);
            cameraEase = 'out-sine';
        }
        let cameraDuration = Number(attributes['camera-duration']);
        if (!Number.isFinite(cameraDuration) || cameraDuration <= 0) cameraDuration = 0;
        else cameraDuration = Math.min(20, cameraDuration);

        const look = attributes.look || previousLook;
        let position = String(attributes.position || '').trim().toLowerCase();
        if (position === 'middle') position = 'center';
        if (position && !positions.has(position)) {
            addError(errors, 'unknown-position', `未知站位：${position}，已交给播放器自动分配。`, openIndex, beatId);
            position = '';
        }
        if (attributes.background) {
            const requestedBackground = String(attributes.background).trim();
            const resolvedBackground = resolveBeatBackgroundAsset(requestedBackground, {
                backgrounds: [...backgrounds],
                category: options.backgroundCategory || '',
                context: options.backgroundContext || '',
            });
            if ((backgrounds.size || resolvedBackground.kind === '3d' || resolvedBackground.categoryMismatch) && !resolvedBackground.matched) {
                addError(errors, 'unknown-background', `未知背景：${requestedBackground}，已沿用上一背景。`, openIndex, beatId);
            } else {
                previousBackground = resolvedBackground.name || requestedBackground;
                previousBackgroundAsset = resolvedBackground.matched ? resolvedBackground : null;
            }
        }
        const background = previousBackground;
        if (previousBackgroundAsset?.kind === '3d') {
            if (shot === 'wide') {
                addError(errors, 'scene-wide', '3D 场景暂不使用全景，已回退到 medium。', openIndex, beatId);
                shot = 'medium';
            } else if (shot === 'keep') {
                shot = ['medium', 'close', 'reaction'].includes(previousShot) ? previousShot : 'medium';
            }
        }
        let wait = attributes.wait || 'text';
        if (!waits.has(wait)) {
            addError(errors, 'unknown-wait', `未知等待方式：${wait}，已回退到 text。`, openIndex, beatId);
            wait = 'text';
        }

        const beat = { id: beatId, speaker, cue, look, shot, text, wait };
        if (localized.ttsText && isFishVoicedSpeaker(speaker)) beat.ttsText = localized.ttsText;
        if (face) beat.face = face;
        if (portrait) beat.portrait = portrait;
        if (validOverlays.length) beat.overlay = validOverlays;
        if (validEffects.length) beat.effects = validEffects;
        if (background) beat.background = background;
        if (actorId) beat.costume = costumeByActor.get(actorId);
        beat.costumes = Object.fromEntries(costumeByActor);
        if (previousBackgroundAsset) beat.backgroundAsset = previousBackgroundAsset;
        if (position) beat.position = position;
        if (camera) beat.camera = camera;
        if (cameraMotion) beat.cameraMotion = cameraMotion;
        if (cameraEase) beat.cameraEase = cameraEase;
        if (cameraDuration) beat.cameraDuration = cameraDuration;
        beats.push(beat);
        previousLook = look;
        previousShot = shot;
        searchIndex = closeIndex + '</beat>'.length;
    }

    if (!beats.length && storySource.trim()) {
        addError(errors, 'no-beats', '没有找到可播放的 beat。', 0);
    }

    return { beats, choices: choiceEvent.choices, errors };
}

export const BEAT_DEFAULTS = Object.freeze({
    cues: DEFAULT_CUES,
    shots: DEFAULT_SHOTS,
    waits: DEFAULT_WAITS,
    positions: DEFAULT_POSITIONS,
    faces: DEFAULT_FACES,
    overlays: DEFAULT_OVERLAYS,
    effects: DEFAULT_EFFECTS,
});

/** Resolve friendly aliases and paired family IDs for the Stage cue parser. */
export function resolveBeatCue(cue, face = '') {
    return resolveBeatCueAlias(cue, face);
}

function resolveActorId(value, nameMap) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (Object.hasOwn(nameMap, raw)) return sceneIdolId(nameMap[raw]) || raw;
    const entry = Object.entries(nameMap).find(([, name]) => name === raw);
    return sceneIdolId(raw) || (entry ? sceneIdolId(entry[1]) || entry[0] : raw);
}

/**
 * Convert parsed beats into the slide shape consumed by SceneDirector. The
 * player keeps dialogue and presentation intent separate: action cues are
 * played when the current beat is spoken, while these slides establish cast,
 * placement, and attention targets.
 */
export function buildStageSlides(beats, nameMap = {}) {
    const slides = [];
    const beatIndexes = [];
    const entered = new Set();
    const positions = ['center', 'right', 'left'];
    const positionByActor = new Map();
    const targetId = value => {
        const raw = String(value || '').trim().toLowerCase();
        if (['camera', 'none', 'auto'].includes(raw)) return raw;
        return resolveActorId(value, nameMap);
    };
    const ensureActor = (idolId, position) => {
        if (!idolId) return;
        const nextPosition = position || positionByActor.get(idolId) || positions[positionByActor.size] || 'right';
        if (!positionByActor.has(idolId)) positionByActor.set(idolId, nextPosition);
        else if (position && positionByActor.get(idolId) !== position) {
            positionByActor.set(idolId, position);
            slides.push({ type: 'stage', action: 'position', idolId, position, speaker: '', text: '' });
        }
        if (!entered.has(idolId)) {
            entered.add(idolId);
            slides.push({ type: 'stage', action: 'enter', idolId, position: positionByActor.get(idolId), speaker: '', text: '' });
        }
    };

    for (const beat of Array.isArray(beats) ? beats : []) {
        const speakerName = nameMap[beat.speaker] || beat.speaker || '';
        // A Beat may be spoken by a non-idol (for example producer). Keep the
        // dialogue slide and label, but only idols create stage actors.
        const idolId = sceneIdolId(speakerName);
        if (idolId) {
            const interactionTarget = ['pinch', 'pinch-receive', 'shake', 'shake-receive'].includes(String(beat.cue || '').toLowerCase())
                ? targetId(beat.look)
                : '';
            if (interactionTarget && interactionTarget !== idolId && Object.values(SCENE_IDOLS).includes(interactionTarget)) {
                ensureActor(interactionTarget, beat.position || positionByActor.get(idolId) || 'center');
                ensureActor(idolId, beat.position || positionByActor.get(interactionTarget) || 'center');
            } else ensureActor(idolId, beat.position);
            if (beat.look && beat.look !== 'auto') {
                slides.push({ type: 'stage', action: 'look', idolId, target: targetId(beat.look) || 'camera', duration: 0, speaker: '', text: '' });
            }
        }
        beatIndexes.push(slides.length);
        const dialogueSlide = { type: 'dialogue', speaker: speakerName, text: beat.text || '' };
        if (beat.ttsText) dialogueSlide.ttsText = beat.ttsText;
        slides.push(dialogueSlide);
    }
    return { slides, beatIndexes };
}
