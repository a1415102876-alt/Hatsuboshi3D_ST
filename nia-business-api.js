import { beatActorId } from '../mmd-dialogue-stage/beat-player-core.js?v=20261014-npc-portraits-v1';
import { parseBeatScript } from '../mmd-dialogue-stage/beat-protocol.js?v=20261014-npc-portraits-v1';

import { buildPortraitRules, buildIdol3dRules, PAIRED_WORDS } from '../mmd-dialogue-stage/portrait-cues.js?v=20260914-3d-stage-v1';

const clampInteger = (value, min, max) => Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
const boundedStrings = (value, max, length = 180) => Array.isArray(value)
  ? value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, max).map((item) => item.slice(0, length))
  : [];

const SAKI_LIVE_VISUAL_TAGS = [
  '自信说明', '冷静思考', '被夸陶醉', '被夸慌张', '恳切请求', '正面挑战',
  '激动强调', '不服审视', '真诚表态', '沮丧低落', '平常待机', '意外动摇',
  '慌张解释', '震惊失语', '振奋宣言', '得意大笑', '温柔喜悦', '凑近追问'
];
const KOTONE_LIVE_VISUAL_TAGS = Object.keys(PAIRED_WORDS);
const UME_LIVE_VISUAL_TAGS = [
  '真诚说明', '惊讶解释', '羞涩待机', '轻微不满', '尴尬困惑', '温柔好奇',
  '俏皮提问', '恳切请求', '自信站姿', '严肃追问', '振奋宣言', '认真思考',
  '温柔喜悦', '开朗挥手', '害羞微笑', '不安询问', '羞恼抗议', '沮丧低落',
  '慌张不安', '得意欢呼', '凑近问候', '温暖问候', '倾慕陶醉', '沉思怀疑'
];
const HIRO_LIVE_VISUAL_TAGS = [
  '平常待机', '平静说明', '冷静思考', '出神侧目', '浅淡微笑', '捂脸害羞',
  '窘迫躲闪', '真诚表态', '虚脱乏力', '意外动摇', '困惑发问', '沉思顾虑',
  '安静自信', '温柔喜悦', '好奇询问', '怔住触动', '愿望浅笑', '前倾关心'
];
const LIVE_VISUAL_TAGS_BY_IDOL = Object.freeze({
  '花海咲季': SAKI_LIVE_VISUAL_TAGS,
  '藤田琴音': KOTONE_LIVE_VISUAL_TAGS,
  '花海佑芽': UME_LIVE_VISUAL_TAGS,
  '筱泽广': HIRO_LIVE_VISUAL_TAGS
});
const LIVE_DEFAULT_VISUAL_TAG_BY_IDOL = Object.freeze({
  '花海咲季': '平常待机',
  '藤田琴音': '待机',
  '花海佑芽': '羞涩待机',
  '筱泽广': '平常待机'
});
const LIVE_EXAMPLE_VISUAL_TAG_BY_IDOL = Object.freeze({
  '花海咲季': '被夸陶醉',
  '藤田琴音': '高兴',
  '花海佑芽': '得意欢呼',
  '筱泽广': '虚脱乏力'
});

function taggedJson(value, tag) {
  const text = String(value || '');
  const bodies = taggedJsonBodies(text, tag);
  if (!bodies.length) return { ok: false, reason: 'missing_' + tag.toLowerCase() };
  try { return { ok: true, data: JSON.parse(bodies[0].trim()) }; }
  catch { return { ok: false, reason: 'invalid_json' }; }
}

function taggedJsonBodies(value, tag) {
  const text = String(value || '');
  const opens = [...text.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'gi'))];
  const closes = [...text.matchAll(new RegExp('<\\/' + tag + '\\s*>', 'gi'))];
  const bodies = [];
  let openIndex = opens.length - 1;
  for (let closeIndex = closes.length - 1; closeIndex >= 0 && openIndex >= 0; closeIndex -= 1) {
    const close = closes[closeIndex];
    while (openIndex >= 0 && opens[openIndex].index > close.index) openIndex -= 1;
    if (openIndex < 0) break;
    const open = opens[openIndex];
    bodies.push(text.slice(open.index + open[0].length, close.index));
    openIndex -= 1;
  }
  return bodies;
}

export function parseNiaBusinessOpening(value) {
  const parsed = taggedJson(value, 'NIA_BUSINESS_OPENING');
  if (!parsed.ok) return parsed;
  const data = parsed.data || {};
  const story = String(data.story || '').trim();
  const problem = String(data.problem || '').trim();
  const options = boundedStrings(data.options, 4, 220);
  if (!story || !problem || options.length !== 4) return { ok: false, reason: 'invalid_opening_contract' };
  return { ok: true, data: { schemaVersion: 1, story, problem, options, continuity: boundedStrings(data.continuity, 8, 180) } };
}

export function parseNiaBusinessResolution(value) {
  const text = String(value || '');
  const parsed = taggedJson(text, 'NIA_BUSINESS_RESULT');
  if (!parsed.ok) return parsed;
  const storyMatch = text.match(/<story>([\s\S]*?)<\/story>/i);
  const story = String(storyMatch?.[1] || text.slice(0, text.indexOf('<NIA_BUSINESS_RESULT>'))).trim();
  if (!story) return { ok: false, reason: 'missing_resolution_story' };
  return { ok: true, data: { story, result: parsed.data || {} } };
}

export function normalizeNiaBusinessResult(value, options = {}) {
  const data = value || {};
  return {
    problemSolved: Boolean(data.problemSolved),
    baseFans: clampInteger(options.baseFans ?? 2000, 0, 100000),
    bonusFans: clampInteger(data.bonusFans, 0, 2000),
    pressureDelta: clampInteger(data.pressureDelta, 0, 8),
    impressions: boundedStrings(data.impressions, 4, 40),
    bonusReasons: boundedStrings(data.bonusReasons, 3, 180),
    summary: String(data.summary || '').trim().slice(0, 300)
  };
}

const contextJson = (context) => JSON.stringify(context || {}, null, 2);

export function buildNiaBusinessOpeningPrompt(context) {
  return [
    '[HATSU_OUTPUT_MODE:NIA_BUSINESS_OPENING]',
    '营业类型固定为 online_live（网上直播），不得改写成电视综艺、线下活动或其他项目。',
    '你正在为《学园偶像大师》N.I.A篇生成一次营业事件。这是非叙事系统任务，必须严格输出结构。',
    '营业上下文：', contextJson(context), '',
    '写一段适合现有VN播放器的节目开场，让本轮企划方向在实际营业中受到检验。只设置一个核心现场问题，而且必须具体、能由制作人当场介入、不能靠偶像单纯提升能力自动解决。问题出现时暂停剧情，不写结果。', '',
    '只输出：', '<NIA_BUSINESS_OPENING>',
    '{"schemaVersion":1,"story":"使用<narration>与<dialogue char=\\"角色名\\">的VN正文","problem":"核心现场问题","options":["制作人行动1","制作人行动2","制作人行动3","制作人行动4"],"continuity":["后续必须保持的事实"]}',
    '</NIA_BUSINESS_OPENING>', '',
    'options必须恰好四个，都是制作人能立即采取的不同解决思路，不得提前透露优劣或结果。'
  ].join('\n');
}

export function buildNiaBusinessResolutionPrompt(context, opening, action) {
  return [
    '[HATSU_OUTPUT_MODE:NIA_BUSINESS_RESOLUTION]',
    '本次仍是 online_live（网上直播），必须继续执行同一份网上直播企划单，不得切换营业类型。',
    '继续同一次N.I.A营业事件，并审查制作人的现场方案。',
    '营业上下文：' + contextJson(context),
    '前半段剧情：' + String(opening?.story || ''),
    '核心问题：' + String(opening?.problem || ''),
    '连续事实：' + JSON.stringify(opening?.continuity || []),
    '制作人的解决方案：' + String(action || ''), '',
    '这是当前营业事件的最后一段。先续写制作人方案引发的现场反应与偶像表现，再写出节目或活动实际结束后的落点。必须在本次回复内完成现场问题的处理与本场营业的收束。方案可以不完美、问题也可以没有彻底解决，但必须写清已经发生的具体后果；不得以新的问题、悬念、待回应的台词或下一轮选择结束。下一场可承接本场造成的结果，但本场本身必须完整结束。',
    '随后根据以下证据整体判断额外加分：是否解决问题、发挥偶像特质、符合本轮公开形象、形成传播高光、制作人与偶像是否有效配合。不得按关键词命中机械评分，也不得因为文辞华丽自动加分。', '',
    '严格输出：',
    '<story>只含<narration>与<dialogue char="角色名">的VN正文</story>',
    '<NIA_BUSINESS_RESULT>',
    '{"schemaVersion":1,"problemSolved":true,"bonusFans":0,"pressureDelta":0,"impressions":[],"bonusReasons":[],"summary":"本次营业如何推进企划"}',
    '</NIA_BUSINESS_RESULT>', '',
    'bonusFans范围0到2000，pressureDelta范围0到8。不要输出baseFans，基础粉丝由前端决定。理由必须引用正文实际发生的证据。'
  ].join('\n');
}

function isLiveBeatXmlTag(tag) {
  return /^<\/(?:beat|display|tts)\s*>$/i.test(tag)
    || /^<(?:beat|display|tts)(?:\s+[\w:-]+\s*=\s*(?:"[^"<>\r\n]*"|'[^'<>\r\n]*'))*\s*>$/i.test(tag);
}

// Run only after strict JSON fails. Do not guess missing story, keys or brackets.
function repairLiveJson(source) {
  const output = [], counts = new Map();
  const note = (type, count = 1) => counts.set(type, (counts.get(type) || 0) + count);
  let inString = false, depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (char === '\\') { output.push(char, source[++index] || ''); continue; }
      if (char === '<') {
        const tag = source.slice(index).match(/^<\/?(?:beat|display|tts)\b[^<>]*>/i)?.[0];
        // Restrict quote repair to complete XML attribute lists. Backslash runs
        // or ambiguous prose quotes are left for strict JSON to reject.
        if (tag && !tag.includes('\\\\')) {
          const xml = tag.replace(/\\"/g, '"');
          if (isLiveBeatXmlTag(xml)) {
            let repaired = '', count = 0;
            for (let offset = 0; offset < tag.length; offset += 1) {
              if (tag[offset] === '\n' || tag[offset] === '\r' || tag[offset] === '\t') {
                repaired += tag[offset] === '\n' ? '\\n' : tag[offset] === '\r' ? '\\r' : '\\t';
                note('string_control_character'); continue;
              }
              if (tag[offset] === '"' && tag[offset - 1] !== '\\') { repaired += '\\'; count++; }
              repaired += tag[offset];
            }
            if (count) note('xml_attribute_quote', count);
            output.push(repaired); index += tag.length - 1; continue;
          }
        }
      }
      if (char === '\n' || char === '\r' || char === '\t') {
        output.push(char === '\n' ? '\\n' : char === '\r' ? '\\r' : '\\t');
        note('string_control_character'); continue;
      }
      if (char === '"') inString = false;
    } else {
      if (char === '{') depth++;
      if (char === '}') depth = Math.max(0, depth - 1);
      if (char === '"' && depth) inString = true;
      if (char === ',' && depth) {
        let next = index + 1, previous = index - 1;
        while (/\s/.test(source[next] || '') && next < source.length) next++;
        while (previous >= 0 && /\s/.test(source[previous])) previous--;
        if ((source[next] === '}' || source[next] === ']') && /[}\]"0-9el]/.test(source[previous] || '')) {
          note('trailing_comma'); continue;
        }
      }
    }
    output.push(char);
  }
  return { text: output.join(''), repairs: [...counts].map(([type, count]) => ({ type, count })) };
}

// The player intentionally tolerates incomplete markup. A repaired JSON reply
// must cover the complete record, including every display/TTS closing tag.
function isCompleteLiveBeatSource(text) {
  const source = text.replace(/<!--[\s\S]*?-->/g, '').trim();
  const stack = [];
  let end = 0, roots = 0, children = 0, plainRootContent = false;
  for (const match of source.matchAll(/<\/?(?:beat|display|tts)\b[^<>]*>/gi)) {
    const gap = source.slice(end, match.index);
    if (/<\/?(?:beat|display|tts)\b/i.test(gap) || (!stack.length && gap.trim())) return false;
    if (stack.at(-1) === 'beat' && gap.trim()) plainRootContent = true;
    if (!isLiveBeatXmlTag(match[0])) return false;
    const [, closing, rawName] = match[0].match(/^<(\/?)(beat|display|tts)\b/i);
    const name = rawName.toLowerCase();
    if (closing) {
      if (stack.pop() !== name) return false;
    } else {
      if (name === 'beat') { if (stack.length || roots++) return false; }
      else { if (stack.at(-1) !== 'beat') return false; children++; }
      stack.push(name);
    }
    end = match.index + match[0].length;
  }
  return roots === 1 && stack.length === 0 && !source.slice(end).trim() && !(children && plainRootContent);
}

function lastTaggedJson(value, tag) {
  const last = taggedJsonBodies(value, tag)[0];
  if (last === undefined) return { ok: false, reason: 'missing_' + tag.toLowerCase() };
  try { return { ok: true, data: JSON.parse(last.trim()) }; } catch { /* Try bounded repairs. */ }
  const { text, repairs } = repairLiveJson(last);
  const result = data => ({ ok: true, data, ...(repairs.length ? { repairs } : {}) });
  try { return result(JSON.parse(text.trim())); } catch { /* Allow explanatory text and code fences. */ }
  let start = -1, depth = 0, inString = false, escaped = false, recovered = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (start < 0) {
      if (char === '{') { start = index; depth = 1; recovered = null; }
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) {
      try {
        const candidate = JSON.parse(text.slice(start, index + 1));
        if (candidate && Object.hasOwn(candidate, 'businessId') && Object.hasOwn(candidate, 'segmentIndex') && Array.isArray(candidate.beats)) recovered = candidate;
      } catch { /* Never descend into a damaged root's comments or beats. */ }
      start = -1;
    }
  }
  return start < 0 && recovered ? result(recovered) : { ok: false, reason: 'invalid_json' };
}

const enumValue = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
const boundedText = (value, length = 600) => String(value || '').trim().slice(0, length);

function normalizeLiveBeats(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 48).map((item, index) => ({
    id: boundedText(item?.id, 80) || `beat-${index + 1}`,
    type: enumValue(item?.type, ['narration', 'dialogue', 'action'], 'narration'),
    speaker: boundedText(item?.speaker, 60),
    text: boundedText(item?.text, /<beat\b/i.test(String(item?.text || '')) ? 4000 : 500),
    delayMs: clampInteger(item?.delayMs, 0, 8000)
  })).filter((item) => item.text);
}

function normalizeLiveComments(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 48).map((item, index) => ({
    id: boundedText(item?.id, 80) || `comment-${index + 1}`,
    text: boundedText(item?.text, 180),
    tone: enumValue(item?.tone, ['positive', 'neutral', 'concerned', 'excited', 'negative'], 'neutral'),
    triggerAfterBeatId: boundedText(item?.triggerAfterBeatId, 80),
    delayMs: clampInteger(item?.delayMs, 0, 8000)
  })).filter((item) => item.text);
}

// Only the active live scene belongs in a live request. Keep the full plan in the save.
function livePromptContext(context = {}) {
  const plan = context.plan || {};
  const brief = context.businessBrief || {};
  const evidence = brief.workEvidence || {};
  const day = context.day || {};
  const unique = (...lists) => [...new Set(lists.flat().map(item => boundedText(item, 400)).filter(Boolean))].slice(0, 12);
  return {
    businessType: 'online_live', businessLevel: context.businessLevel || 1,
    idol: context.idol, round: context.round, dayIndex: context.dayIndex,
    day: { day: day.day, title: day.title, purpose: day.purpose, problem: day.problem, output: day.output },
    direction: {
      goal: plan.goal || context.goal, publicImage: plan.publicImage || context.publicImage,
      principle: plan.principle || context.principle, storyQuestion: plan.storyQuestion || context.storyQuestion,
      evidence: unique(plan.evidence), risks: unique(plan.risks)
    },
    businessBrief: {
      title: brief.title, targetImage: brief.targetImage, audience: brief.audience, approach: brief.approach,
      preparation: unique(brief.preparation, evidence.materials),
      risk: unique(brief.risk), boundaries: unique(brief.boundaries, evidence.terms),
      completedDocuments: unique(evidence.documents)
    }
  };
}

function livePromptSegmentCount(runtime) {
  if (runtime.segmentCount === 2 || runtime.segmentCount === 4) return runtime.segmentCount;
  return runtime.schemaVersion === 1 || Number(runtime.pendingSegmentIndex) > 2 ? 4 : 2;
}

export function buildNiaLiveSegmentPrompt(context, runtime = {}) {
  const segmentCount = livePromptSegmentCount(runtime);
  const index = clampInteger(runtime.pendingSegmentIndex, 1, segmentCount);
  const isIncident = index === segmentCount - 1;
  const isClosing = index === segmentCount;
  const businessLevel = clampInteger(context?.businessLevel, 1, 3) || 1;
  const baseDuties = {
    1: '直播开场：建立直播主题、偶像当前状态与观众的第一印象。不要提前制造核心事故。',
    2: '内容展开：承接开场，用具体互动推进企划主题并积累观众反应。不要提前制造核心事故。',
    3: '关键事故：只设置一个能够由制作人现场介入的问题，并给出恰好三个制作人处理方案；在等待选择处停下。',
    4: '处理与收尾：严格执行制作人指示，写清现场后果并自然收播。不得再制造新事故、悬念或选择。'
  };
  const specialDuties = {
    1: '特别企划开场：明确宣布本期特别企划的主题、规则、准备内容与看点，让观众知道这不是普通闲聊直播。不要提前制造核心事故。',
    2: '特别企划执行：围绕既定规则和道具完整推进核心环节，具体回收此前训练、营业成果或公众印象。不要提前制造核心事故。',
    3: '企划关联事故：只设置一个由本期特别企划的规则、道具或互动自然引发的问题，并给出恰好三个制作人处理方案；在等待选择处停下。',
    4: '特别企划收尾：严格执行制作人指示，把事故转化为本期企划独有的高光并正式收播。不得再制造新事故、悬念或选择。'
  };
  const headlineDuties = {
    1: '官方重点特别企划开场：明确本期由官方重点推广，介绍成套环节、规则和担当偶像此前积累的代表性成果。不要提前制造核心事故。',
    2: '重点企划连续执行：推进多个相互承接的准备环节，让成熟公众印象在更大观众规模下接受验证。不要提前制造核心事故。',
    3: '形象压力事故：只设置一个会冲击既有公众印象、且必须由制作人判断方向的问题，并给出恰好三个处理方案；在等待选择处停下。',
    4: '重点企划正式收尾：严格执行制作人指示，把压力转化为能代表本轮成果的直播高光并正式收播。不得再制造新事故、悬念或选择。'
  };
  const duties = businessLevel >= 3 ? headlineDuties : businessLevel >= 2 ? specialDuties : baseDuties;
  const combinedOpening = businessLevel >= 3
    ? '官方重点特别企划：在同一份回复内完成开场、成套环节的推进与转折，再出现一个冲击公众形象的问题。'
    : businessLevel >= 2 ? '特别企划：在同一份回复内完成开场、特别企划执行的推进与转折，再出现一个与规则、道具或互动相关的问题。'
      : '直播开场：在同一份回复内完成开场、内容推进与自然转折，再遇到一个需要制作人介入的问题。';
  const duty = segmentCount === 4 ? duties[index] : isIncident
    ? combinedOpening + '此前分段的内容与转折都在本次回复内写完；只留这一个核心问题，给出恰好三个制作人处理方案，在等待选择处停下。不得提前执行任何方案或收播。'
    : duties[4] + '这是本场最后一次生成，必须在本次回复内写完方案执行、具体结果、观众反馈和结束致意，不再索要继续生成。';
  const idol = String(context?.idol || '').trim();
  const actor = beatActorId(idol) || 'narrator';
  const exampleBeat = '<beat id="beat-1" speaker="' + actor + '" cue="talk" look="camera" position="center" shot="close" wait="text"><display lang="zh">大家好，今天也请多关照。</display><tts lang="ja">こんにちは。今日もよろしくお願いします。</tts></beat>';
  const visualCueRules = [
    '【直播 3D Beat 演出】',
    '本场主讲偶像：' + idol + '；对应 Beat speaker：' + actor + '。仅按实际剧情安排其他角色。',
    'beats[].speaker 写纯角色名；每条 beats[].text 写一个完整的 <beat>，内层 id 与外层 id 一致。',
    '每句包含 <display lang="zh">中文台词</display> 和 <tts lang="ja">同义日语</tts>。只将中文显示给玩家。',
    '直播使用固定近景机位，始终以主讲偶像为焦点。所有 Beat 填 shot="close"、position="center"，不切换景别、站位或焦点。',
    '动作与表情写入 Beat 的 cue、face、overlay、look 属性，按世界书的 Beat 演出规则选择。',
    '默认沿用直播画面的背景；background 仅在剧情确实换场时填写有效背景标签。',
    '不使用 stage-enter、stage-exit、stage-look、stage-action、dialogue、narration 或角色名后括号的旧演出格式。',
    '制作人方案只放在第' + (segmentCount - 1) + '段的 options 数组，Beat 内不生成选项。'
  ];
  const shape = {
    schemaVersion: segmentCount === 2 ? 2 : 1,
    segmentCount,
    businessId: String(context?.businessId || runtime.businessId || ''),
    segmentIndex: index,
    topic: '本段直播话题',
    beats: [{ id: 'beat-1', type: 'dialogue', speaker: idol || '偶像', text: exampleBeat, delayMs: 500 }],
    comments: [{ id: 'comment-1', text: '观众评论', tone: 'positive', triggerAfterBeatId: 'beat-1', delayMs: 300 }],
    audienceTrend: 'up',
    heatTrend: 'up',
    pressureTrend: 'flat',
    continuitySummary: '供下一段承接的已发生事实'
  };
  if (isIncident) Object.assign(shape, { incident: '现场发生的单一问题', options: ['方案一', '方案二', '方案三'] });
  if (isClosing) Object.assign(shape, {
    resolution: '制作人指示造成的具体结果', imageMatch: 'partial', bonusTier: 'small',
    bonusReason: '基于本场具体事实的判断', closingSummary: '观众最终形成的公开印象'
  });
  return [
    '[HATSU_OUTPUT_MODE:NIA_ONLINE_LIVE]',
    '你正在为《学园偶像大师》N.I.A篇生成同一场 online_live（网络直播）的第 ' + index + ' / ' + segmentCount + ' 段。',
    businessLevel >= 3
      ? '本场是 Lv3 官方重点特别企划直播：官方推广带来更大观众规模，必须用成套环节检验此前形成的公众印象与代表性成果，不得退化成普通闲聊或一般特别回。'
      : businessLevel >= 2 ? '本场是 Lv2 特别企划直播：必须围绕企划规则、准备内容和既有成果展开，不得退化成普通闲聊直播。' : '本场是 Lv1 基础主题直播。',
    duty,
    segmentCount === 2 ? (isIncident
      ? '篇幅：中文 display 正文共1200～1800字，20～32个Beat；不把日语tts、JSON、评论和选项算进字数。安排6～12条短评论随剧情推进，完整呈现主题互动、自然转折与问题的形成过程。'
      : '篇幅：中文 display 正文共800～1200字，14～24个Beat；不把日语tts、JSON和评论算进字数。安排4～8条短评论，充分呈现执行过程与结果，然后正式收播。') : '',
    '本场直播上下文：', JSON.stringify(livePromptContext(context)),
    '【权威 N.I.A. 日程】本场仅执行第' + (Number(context?.day?.day) || Number(context?.dayIndex || 0) + 1) + '日的当前网络直播；前面日程已完成，未来日程尚未发生，不在本场重演或提前推进。',
    '此前连续事实：' + JSON.stringify(runtime.continuity || []),
    isClosing ? '当前现场问题与待选方案：' + JSON.stringify({ incident: runtime.segments?.[segmentCount - 2]?.incident || '', options: runtime.segments?.[segmentCount - 2]?.options || [] }) : '',
    isClosing ? '制作人的现场指示：' + boundedText(runtime.producerInstruction, 1200) : '',
    '每个 beat 必须是可直接播放的具体动作、台词或叙述；comments 必须像正在观看直播的短评论。',
    ...visualCueRules,
    '趋势只作定性判断，禁止直接生成粉丝数、观看数、热度值或压力数值。',
    isClosing ? '最后一段的闭幕评价字段必须严格使用以下枚举：imageMatch 只能为 "off"、"partial"、"strong"；bonusTier 只能为 "none"、"small"、"medium"、"large"。不得自造或翻译枚举值；不要输出 "match"，应输出 "strong"；不要输出 "middle"，应输出 "medium"。' : '',
    '只输出最后这一块，不要 Markdown，不要解释：',
    '<NIA_LIVE_SEGMENT>', JSON.stringify(shape), '</NIA_LIVE_SEGMENT>'
  ].filter(Boolean).join('\n');
}

export function parseNiaLiveSegmentPayload(payload, expected = {}) {
  const candidates = typeof payload === 'string'
    ? [payload]
    : [payload?.rawText, payload?.text, payload?.renderedText].filter((value) => value != null);
  let parsed = { ok: false, reason: 'missing_nia_live_segment' };
  for (const candidate of candidates) {
    parsed = lastTaggedJson(candidate, 'NIA_LIVE_SEGMENT');
    if (parsed.ok) break;
  }
  if (!parsed.ok) return parsed;
  const source = parsed.data || {};
  const pressureTrend = source.pressureTrend === 'down' ? 'relief' : source.pressureTrend;
  const imageMatch = source.imageMatch === 'perfect' ? 'strong' : source.imageMatch;
  const businessId = boundedText(source.businessId, 160);
  const segmentCount = expected.segmentCount === 2 ? 2 : 4;
  const segmentIndex = Number(source.segmentIndex);
  if (!Number.isInteger(segmentIndex) || segmentIndex < 1 || segmentIndex > segmentCount) return { ok: false, reason: 'invalid_segment_index' };
  if (businessId !== boundedText(expected.businessId, 160)) return { ok: false, reason: 'business_id_mismatch' };
  if (segmentIndex !== clampInteger(expected.segmentIndex, 1, 4)) return { ok: false, reason: 'segment_index_mismatch' };
  const data = {
    schemaVersion: segmentCount === 2 ? 2 : 1,
    segmentCount,
    businessId,
    segmentIndex,
    topic: boundedText(source.topic, 180),
    beats: normalizeLiveBeats(source.beats),
    comments: normalizeLiveComments(source.comments),
    audienceTrend: enumValue(source.audienceTrend, ['down', 'flat', 'up', 'surge'], 'flat'),
    heatTrend: enumValue(source.heatTrend, ['down', 'flat', 'up'], 'flat'),
    pressureTrend: enumValue(pressureTrend, ['relief', 'flat', 'up', 'spike'], 'flat'),
    continuitySummary: boundedText(source.continuitySummary, 600)
  };
  if (!data.topic || !data.beats.length || !data.continuitySummary) return { ok: false, reason: 'invalid_live_segment_contract' };
  if (segmentIndex === segmentCount - 1) {
    data.incident = boundedText(source.incident, 500);
    data.options = boundedStrings(source.options, 3, 260);
    if (!data.incident || data.options.length !== 3) return { ok: false, reason: 'invalid_incident_contract' };
  }
  if (segmentIndex === segmentCount) {
    data.resolution = boundedText(source.resolution, 600);
    const normalizedImageMatch = { match: 'strong' }[String(imageMatch || '').trim().toLowerCase()] || imageMatch;
    const normalizedBonusTier = { middle: 'medium' }[String(source.bonusTier || '').trim().toLowerCase()] || source.bonusTier;
    data.imageMatch = enumValue(normalizedImageMatch, ['off', 'partial', 'strong'], '');
    data.bonusTier = enumValue(normalizedBonusTier, ['none', 'small', 'medium', 'large'], '');
    data.bonusReason = boundedText(source.bonusReason, 500);
    data.closingSummary = boundedText(source.closingSummary, 500);
    if (!data.resolution || !data.imageMatch || !data.bonusTier || !data.bonusReason || !data.closingSummary) {
      return { ok: false, reason: 'invalid_closing_contract' };
    }
  }
  if (parsed.repairs?.length && data.beats.some(beat => {
    if (!/<\/?(?:beat|display|tts)\b/i.test(beat.text)) return false;
    if (!isCompleteLiveBeatSource(beat.text)) return true;
    const script = parseBeatScript(beat.text, { allowOtherSpeakers: true });
    return script.beats.length !== 1 || script.choices.length || /<choice\b/i.test(beat.text)
      || script.errors.some(error => error.code === 'malformed-beat');
  })) return { ok: false, reason: 'invalid_live_beat' };
  return { ok: true, data, ...(parsed.repairs?.length ? { repairs: parsed.repairs } : {}) };
}

if (typeof globalThis !== 'undefined') {
  globalThis.HatsuNiaBusiness = Object.freeze({
    buildNiaBusinessOpeningPrompt,
    buildNiaBusinessResolutionPrompt,
    parseNiaBusinessOpening,
    parseNiaBusinessResolution,
    normalizeNiaBusinessResult,
    buildNiaLiveSegmentPrompt,
    parseNiaLiveSegmentPayload
  });
}
