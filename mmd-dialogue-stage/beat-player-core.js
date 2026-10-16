import { BEAT_CUE_IDS, BEAT_EFFECT_IDS, BEAT_FACE_IDS, BEAT_OVERLAY_CUE_IDS } from './beat-cues.js?v=20261011-stage-cue-rules-v4';
import { BEAT_NPC_SPEAKER_NAMES } from './beat-npc-portraits.js?v=20261014-npc-portraits-v1';
import { sceneIdolId } from './scene-protocol.js?v=20261006-star-eyes-v1';

export const BEAT_ACTOR_NAMES = Object.freeze({
    kotone: '藤田琴音',
    mao: '有村麻央',
    rinami: '姬崎莉波',
    hski: '花海咲季',
    hume: '花海佑芽',
    ssmk: '紫云清夏',
    kllj: '葛城莉莉娅',
    jsna: '十王星南',
    hmsz: '秦谷美铃',
    atbm: '雨夜燕',
    ttmr: '月村手毬',
    kcna: '仓本千奈',
    shro: '筱泽广',
    amao: '有村麻央',
    fktn: '藤田琴音',
    hrnm: '姬崎莉波',
    nasr: '亚纱里老师',
    asari: '亚纱里老师',
});

// Non-idol speakers are rendered as dialogue labels only. They do not create
// a SceneDirector actor or consume a model slot.
export const BEAT_SPEAKER_NAMES = Object.freeze({
    ...BEAT_ACTOR_NAMES,
    ...BEAT_NPC_SPEAKER_NAMES,
    producer: '制作人',
    narrator: '旁白',
});

export function beatActorId(speaker) {
    const name = String(speaker || '').trim();
    return sceneIdolId(BEAT_ACTOR_NAMES[name] || name);
}

// Derive the camera from script order instead of playback history, so seeking
// to an offscreen speaker holds the same idol and framing as sequential play.
export function resolveBeatShot(beats, index) {
    const source = Array.isArray(beats) ? beats : [];
    for (let i = Math.min(index, source.length - 1); i >= 0; i--) {
        const focus = beatActorId(source[i]?.speaker);
        if (focus) return { focus, shot: source[i].shot || 'medium', inherited: i !== index };
    }
    return { focus: '', shot: 'medium', inherited: false };
}

export const BEAT_CUES = BEAT_CUE_IDS;
export const BEAT_FACES = BEAT_FACE_IDS;
export const BEAT_OVERLAYS = BEAT_OVERLAY_CUE_IDS;
export const BEAT_EFFECTS = BEAT_EFFECT_IDS;

export const BEAT_SHOTS = Object.freeze(['wide', 'medium', 'close', 'reaction', 'keep']);
export const BEAT_POSITIONS = Object.freeze(['left', 'center', 'right']);

export function stagePositionOffset(position) {
    return ({ left: -100 / 3, center: 0, right: 100 / 3 })[String(position || '').trim().toLowerCase()] ?? 0;
}

export function backgroundPanPosition(position) {
    return ({ left: '0%', center: '50%', right: '100%' })[String(position || '').trim().toLowerCase()] ?? '50%';
}

export function backgroundPanAmount(position) {
    return ({ left: 0, center: 0.5, right: 1 })[String(position || '').trim().toLowerCase()] ?? 0.5;
}

// CSS `background-size: cover` window, in image UV. Y is top-down so it matches
// the stage plate behind the transparent canvas.
export function stagePlateCover(viewWidth, viewHeight, imageWidth, imageHeight, panX = 0.5, panY = 0.5) {
    const viewW = Math.max(1, Number(viewWidth) || 1);
    const viewH = Math.max(1, Number(viewHeight) || 1);
    const imageW = Math.max(1, Number(imageWidth) || 1);
    const imageH = Math.max(1, Number(imageHeight) || 1);
    const scale = Math.max(viewW / imageW, viewH / imageH);
    const displayedWidth = imageW * scale;
    const displayedHeight = imageH * scale;
    return {
        scaleX: viewW / displayedWidth,
        scaleY: viewH / displayedHeight,
        offsetX: ((displayedWidth - viewW) * panX) / displayedWidth,
        offsetY: ((displayedHeight - viewH) * panY) / displayedHeight,
    };
}

export function buildBackgroundPlan(beats) {
    return [...new Set((Array.isArray(beats) ? beats : [])
        .map(beat => String(beat?.background || '').trim())
        .filter(Boolean))];
}

export function beatBackgroundChanged(previousBackground, nextBackground) {
    const previous = String(previousBackground || '').trim();
    const next = String(nextBackground || '').trim();
    return Boolean(previous && next && previous !== next);
}

export function estimateBeatHold(text) {
    const length = [...String(text || '')].length;
    if (length < 8) return 900;
    return Math.min(5200, Math.max(900, Math.round((900 + length * 70) / 100) * 100));
}

export function getShotPreset(shot, focus = '') {
    const key = String(shot || '').trim().toLowerCase();
    // Scales are relative to the Beat camera (head below the top, hips near the
    // dialogue box). Wide pulls back to a knee-length view, reaction is a bust,
    // and close fills the frame with the face. The actor stays centered.
    const framing = {
        wide: { scale: 0.67, originY: 0.58 },
        medium: { scale: 1, originY: 0.5 },
        close: { scale: 2.55, originY: 0.34 },
        reaction: { scale: 1.5, originY: 0.46 },
        keep: { scale: 1, originY: 0.5 },
    }[key];
    if (!framing) return { scale: 1, focus: '', backgroundDim: 0 };
    return { ...framing, focus: key === 'wide' ? '' : String(focus || ''), backgroundDim: 0 };
}
