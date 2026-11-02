import { BEAT_BACKGROUND_NAMES } from '../beat-backgrounds.js';
import '../beat-background-routing.js';

export const WEIRD_SCRIPT_MODE = Object.freeze({ FULL: 'full', EXPAND: 'expand', DIRECT: 'direct' });

const DEFAULT_MAX_LOCATION_CHARS = 12000;
const DEFAULT_BEAT_TARGET = 100;

function safeText(value) {
  return String(value || '').trim();
}

function uniqueSafeLocations(names) {
  const source = Array.isArray(names) && names.length ? names : BEAT_BACKGROUND_NAMES;
  return [...new Set(source.map(safeText).filter(name => /^[^./\\][^/\\]*\.png$/iu.test(name)))];
}

export function formatWeirdLocationList(names = BEAT_BACKGROUND_NAMES, { maxChars = DEFAULT_MAX_LOCATION_CHARS } = {}) {
  const limit = Number.isFinite(Number(maxChars)) && Number(maxChars) > 0 ? Math.floor(Number(maxChars)) : DEFAULT_MAX_LOCATION_CHARS;
  const lines = [];
  let used = 0;
  for (const name of uniqueSafeLocations(names)) {
    const line = `- ${name}`;
    const next = used ? `${line}\n` : line;
    if (used + next.length > limit) break;
    lines.push(line);
    used += next.length;
  }
  return lines.join('\n');
}

function beatOutputRules() {
  return [
    'cue 只能写这些中文情绪或动作词，不要写 talk、happy 这类英文 id，也不要自造近义词：说话、待机、生气、害羞、难过、吃惊、高兴、安心、不甘、得意、干劲、哭泣、无奈、兴奋、点头、摇头、思考、询问、应答、鞠躬、指向、讨好、定格、察觉。',
    '除 cue="说话" 以外，这些词自带表情，不要再写 face。face 只在 cue="说话" 时写，只能是：高兴、惊讶、害羞、困扰、自然、难过、生气。',
    '每个有台词的偶像 Beat 必须同时写两段，顺序固定，不能只写其中一段：<display lang="zh">玩家看到的中文</display><tts lang="ja">给语音朗读的日语</tts>。',
    'display 的 lang 必须是 zh，内容是中文；tts 的 lang 必须是 ja，内容是和这句中文意思对应的日语。不要把中文写进 tts，不要把日语写进 display，不要省略 lang，不要写成 <tts>日语</tts>。',
    '制作人和旁白只写 <display lang="zh">，不要写 tts。没有台词的纯动作 Beat 也只写一句短 display，不要写空的 tts。',
    '样例：<beat id="b001" speaker="担当偶像" cue="说话" face="高兴" look="camera" position="center" background="宿舍走廊-午" shot="medium" wait="text"><display lang="zh">今天从这里开始。</display><tts lang="ja">今日はここから始めよう。</tts></beat>',
  ].join('\n');
}

function beatContract({ idolName = '' } = {}) {
  const idol = safeText(idolName) || '当前担当偶像';
  return [
    '你是 Beat 剧情编排器。只输出可直接交给 BeatPlayerApp 的完整 <beat>...</beat> 标签，不要输出解释、Markdown 围栏、JSON、旧 VN/NIA 标签或其他外壳。',
    '每个 Beat 都要有 id、speaker、cue、look、position、background、shot、wait。cue="说话" 时再加 face。',
    beatOutputRules(),
    `当前偶像：${idol}`,
    'speaker 只能使用当前担当、producer 或已注册的其他角色，不要创造新的角色 ID。',
    'position 只能是 left、center、right；shot 使用 wide、medium、close、reaction、keep；look 用 camera，或看向在场的另一个 speaker。情绪或动作发生明显转换时拆到下一个 Beat。',
    'wait 有台词时用 text；这句要等语音念完再进下一句时用 voice。',
    'background 写成「地点-时段」，时段只用晨、午、夕、夜，例如宿舍走廊-午、学生会室-夕。不要写 .png 文件名。地点只能从下面的名单里选；文案没有地点时按语境补一个名单里的地点。同一段场景不要来回换地点。',
    `尽量完整写完用户文案；自然延伸时允许超过 ${DEFAULT_BEAT_TARGET} 个 Beat，但不要为了凑数重复句子。`,
  ].join('\n');
}

function promptLocationName(name) {
  const formatted = globalThis.HatsuBeatBackgroundRouting?.formatBackground?.(name) || safeText(name).replace(/\.png$/iu, '');
  return formatted.replace(/-(?:晨|午|夕|夜|morning|noon|evening|night|other)$/u, '');
}

export function formatWeirdPromptLocations(names = BEAT_BACKGROUND_NAMES, { maxChars = DEFAULT_MAX_LOCATION_CHARS } = {}) {
  const limit = Number.isFinite(Number(maxChars)) && Number(maxChars) > 0 ? Math.floor(Number(maxChars)) : DEFAULT_MAX_LOCATION_CHARS;
  const lines = [];
  const seen = new Set();
  let used = 0;
  for (const name of (Array.isArray(names) && names.length ? names : BEAT_BACKGROUND_NAMES)) {
    const label = promptLocationName(name);
    if (!label || seen.has(label) || /[\\/]/.test(label)) continue;
    seen.add(label);
    const line = `- ${label}`;
    const next = used ? `${line}\n` : line;
    if (used + next.length > limit) break;
    lines.push(line);
    used += next.length;
  }
  return lines.join('\n');
}

export function buildWeirdScriptPrompt({ mode = WEIRD_SCRIPT_MODE.FULL, text = '', idolName = '', locations = BEAT_BACKGROUND_NAMES, beatTarget = DEFAULT_BEAT_TARGET } = {}) {
  const source = safeText(text);
  const locationList = formatWeirdPromptLocations(locations);
  const target = Number.isFinite(Number(beatTarget)) ? Math.max(1, Math.floor(Number(beatTarget))) : DEFAULT_BEAT_TARGET;
  const contract = beatContract({ idolName });
  const modeInstruction = mode === WEIRD_SCRIPT_MODE.EXPAND
    ? [
      '这是 AI 扩写模式。根据当前担当偶像的角色性格、说话方式和世界书约束，把用户点子扩展为完整长篇；不要直接复述资料，也不要泄露世界书原文。',
      `用户点子：\n${source}`,
    ]
    : [
      '这是全文案转 Beat 模式。用户提供的是要演出的文案；只把它组织成 Beat，不额外添加角色资料或历史对话。',
      `用户全文案：\n${source}`,
    ];
  return [
    '[HATSU_WEIRD_SCRIPT]',
    contract,
    `本次目标长度：至少围绕 ${target} 个 Beat 组织内容；若用户文案较短，以自然完整为先。`,
    ...modeInstruction,
    '允许使用的地点清单：',
    locationList,
    mode === WEIRD_SCRIPT_MODE.EXPAND ? '扩写时遵守当前偶像的世界书设定。' : '全文案模式不读取角色资料、历史或世界书，只依据本提示和用户文案。',
  ].join('\n\n');
}

export function prepareDirectBeatScript(source) {
  const closed = extractClosedBeatScript(source);
  if (!closed.count) {
    return { ok: false, error: '没有找到完整的 Beat。每个 beat 都要闭合，并带有 display。' };
  }
  if (closed.hasOpenBeat) {
    return { ok: false, error: '末尾还有未闭合的 Beat，补全后再演出。' };
  }
  return { ok: true, script: closed.script, count: closed.count };
}

export function extractClosedBeatScript(source) {
  const raw = safeText(source);
  const matches = raw.match(/<beat\b[^>]*>[\s\S]*?<\/beat>/gi) || [];
  const valid = matches.filter(match => /<display\b[^>]*>[\s\S]*?<\/display>/i.test(match) && /<display\b[^>]*>\s*[^<\s][\s\S]*?<\/display>/i.test(match));
  const opened = (raw.match(/<beat\b/gi) || []).length;
  const hasOpenBeat = opened > matches.length || /<beat\b[^>]*>[\s\S]*$/i.test(raw.slice(raw.lastIndexOf('</beat>') + 7));
  const last = valid.at(-1) || '';
  const background = last.match(/\bbackground=["']([^"']+)["']/i)?.[1] || '';
  return {
    script: valid.join('\n'),
    count: valid.length,
    hasOpenBeat,
    tail: raw.slice(Math.max(0, raw.lastIndexOf('</beat>') + 7)).trim(),
    lastBackground: background,
  };
}

export function buildWeirdContinuationPrompt({ completedScript = '', completedCount = 0, lastBackground = '', idolName = '' } = {}) {
  const closed = safeText(completedScript);
  const count = Number.isFinite(Number(completedCount)) ? Math.max(0, Math.floor(Number(completedCount))) : 0;
  const background = safeText(lastBackground) || '沿用上一个完整 Beat 的 background';
  return [
    '[HATSU_WEIRD_SCRIPT_CONTINUE]',
    `当前偶像：${safeText(idolName) || '当前担当偶像'}`,
    `前面已经保留 ${count} 个完整 Beat，最后地点为：${background}。`,
    '只输出后续新的、完整闭合的 <beat>...</beat>；不要重复已完成内容，不要输出解释或 Markdown。',
    beatOutputRules(),
    '保持前文人物关系、情绪和地点连续；如果故事已经自然结束，就输出剩余收束 Beat，不要硬凑长度。',
    '已完成内容的末尾仅用于承接：',
    closed.slice(-5000),
  ].join('\n\n');
}
