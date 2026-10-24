import { beatActorId } from '../mmd-dialogue-stage/beat-player-core.js?v=20261014-npc-portraits-v1';
import { parseBeatScript } from '../mmd-dialogue-stage/beat-protocol.js?v=20261014-npc-portraits-v1';

const clampInteger = (value, min, max) => Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
const text = (value, limit = 600) => String(value || '').trim().slice(0, limit);
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

function normalizeLines(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 48).map((item, index) => ({
    id: text(item?.id, 80) || `radio-line-${index + 1}`,
    type: ['dialogue', 'narration', 'sfx'].includes(item?.type) ? item.type : 'dialogue',
    speaker: text(item?.speaker, 80),
    text: text(item?.text, /<beat\b/i.test(String(item?.text || '')) ? 4000 : 600)
  })).filter((line) => line.text && (line.type !== 'dialogue' || line.speaker));
}

function normalizeOptions(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item, 260)).filter(Boolean).slice(0, 3);
}

function taggedJsonBodies(value, tag) {
  const source = String(value || '').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
  const opens = [...source.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'gi'))];
  const closes = [...source.matchAll(new RegExp('<\\/' + tag + '\\s*>', 'gi'))];
  const bodies = [];
  let openIndex = opens.length - 1;
  for (let closeIndex = closes.length - 1; closeIndex >= 0 && openIndex >= 0; closeIndex -= 1) {
    const close = closes[closeIndex];
    while (openIndex >= 0 && opens[openIndex].index > close.index) openIndex -= 1;
    if (openIndex < 0) break;
    const open = opens[openIndex];
    bodies.push(source.slice(open.index + open[0].length, close.index));
    openIndex -= 1;
  }
  return bodies;
}

function lastValidTaggedJson(value, tag) {
  const bodies = taggedJsonBodies(value, tag);
  for (const body of bodies) {
    try { return { ok: true, data: JSON.parse(body.trim()) }; }
    catch { /* Ignore leaked or incomplete planning examples. */ }
  }
  return { ok: false, reason: bodies.length ? 'invalid_json' : 'missing_nia_radio' };
}

function radioSegmentCount(runtime) {
  if (runtime.segmentCount === 2 || runtime.segmentCount === 4) return runtime.segmentCount;
  return runtime.schemaVersion === 1 || Number(runtime.pendingSegmentIndex) > 2 ? 4 : 2;
}

function radioSceneContext(context) {
  const plan = object(context.plan), day = object(context.day), radioPlan = object(context.radioPlan);
  return {
    programTitle: context.programTitle || radioPlan.programTitle, episodeTitle: context.episodeTitle || radioPlan.episodeTitle,
    goal: context.goal || radioPlan.goal, host: context.host || radioPlan.host || '真诚优',
    guest: context.guest || context.idol || radioPlan.guest, additionalGuest: context.additionalGuest || '',
    interviewFocus: context.interviewFocus || radioPlan.interviewFocus, strategy: context.strategy || context.strategyId,
    idol: context.idol, round: context.round, dayIndex: context.dayIndex,
    day: {day:day.day,title:day.title,purpose:day.purpose,problem:day.problem,output:day.output},
    direction: {publicImage:plan.publicImage,principle:plan.principle,storyQuestion:plan.storyQuestion,
      evidence:Array.isArray(plan.evidence) ? plan.evidence.slice(0,8) : [], risks:Array.isArray(plan.risks) ? plan.risks.slice(0,6) : []}
  };
}

export function buildNiaRadioSegmentPrompt(context = {}, runtime = {}) {
  const segmentCount = radioSegmentCount(runtime);
  const index = clampInteger(runtime.pendingSegmentIndex, 1, segmentCount);
  const isIncident = index === segmentCount - 1, isClosing = index === segmentCount;
  const businessLevel = clampInteger(context.businessLevel, 1, 3) || 1;
  const baseDuties = {
    1: '嘉宾入场：由主持人真诚优完成节目开场、介绍本期主题与嘉宾，让听众建立第一印象。不得提前出现计划外事件。',
    2: '主题访谈：围绕本期采访重点展开具体问答，让嘉宾的性格与本轮企划目标自然显现。不得提前出现计划外事件。',
    3: '听众来信：主持人读出一封具体来信，形成全场唯一的计划外话题。必须停在等待制作人指示，不能替制作人选择。',
    4: '回应与收播：严格执行制作人指示，让偶像把回应转化为节目高光，并由真诚优完整收播。不得提出新问题、追加来信或留下未完成对话。'
  };
  const multiGuestDuties = {
    1: '多嘉宾入场：由主持人真诚优完成节目开场，明确介绍担当偶像与第二嘉宾，并建立两人的关系和本期共同主题。不得提前出现计划外事件。',
    2: '多嘉宾采访：围绕同一采访重点进行具体问答，让两名嘉宾形成观点、经历或性格上的对照与互动。不得把第二嘉宾降为只说一句话的陪衬，也不得提前出现计划外事件。',
    3: '多嘉宾来信：主持人读出一封能同时牵动两名嘉宾的具体来信，让嘉宾互动形成全场唯一的计划外话题。必须停在等待制作人指示，不能替制作人选择。',
    4: '多嘉宾回应与收播：严格执行制作人指示，收束两名嘉宾的互动并形成这期独有的化学反应，再由真诚优完整收播。不得提出新问题或留下未完成对话。'
  };
  const headlineDuties = {
    1: '高关注圆桌特辑开场：由真诚优介绍两名固定嘉宾、公开争点和本期必须得到回应的核心问题，建立正式特辑规格。不得提前出现计划外事件。',
    2: '立场交锋采访：让两名嘉宾围绕核心问题给出有差异的具体观点，并由主持人追问理由与经历，最终推动出可供听众理解的共同焦点。不得提前出现计划外事件。',
    3: '压力来信圆桌：主持人读出一封会放大双方立场分歧或公众期待的具体来信，形成唯一计划外话题。必须停在等待制作人指示。',
    4: '圆桌结论与收播：严格执行制作人指示，让两名嘉宾在保留自身立场的前提下形成清楚结论和节目高光，再由真诚优完整收播。不得追加问题。'
  };
  const duties = businessLevel >= 3 ? headlineDuties : businessLevel >= 2 ? multiGuestDuties : baseDuties;
  const expectedStatus = isIncident ? 'awaiting_producer' : isClosing ? 'ended' : 'continue';
  const combinedOpening = businessLevel >= 3
    ? '广播开场、立场交锋访谈和压力来信圆桌在本次回复内连贯写完，明确公开争点，让两名嘉宾给出各自观点、理由和经历，再由来信引出唯一需要制作人介入的问题。'
    : businessLevel >= 2 ? '广播开场、多嘉宾采访和听众来信在本次回复内连贯写完，让两名嘉宾围绕同一主题形成观点、经历与性格上的对照；第二嘉宾必须充分参与，不得把第二嘉宾降为只说一句话的陪衬。'
      : '广播开场、主题访谈和听众来信在本次回复内连贯写完：介绍主题与嘉宾，通过具体问答和自然转折推进，再由一封来信引出唯一需要制作人介入的问题。';
  const duty = segmentCount === 4 ? duties[index] : isIncident
    ? combinedOpening + '此前分段的内容都在本次回复内完成，只保留这一次制作人介入。给出恰好三个预设指示，停在等待选择处，不提前执行方案或收播。'
    : duties[4] + '这是本场最后一次生成，必须在本次回复内写完执行过程、公开听众反馈、结束致意和正式收播，不再要求继续生成。';
  const host = text(context.host, 80) || '真诚优';
  const guest = text(context.guest || context.idol, 80);
  const beatExample = (id, speaker, display, tts) => '<beat id="' + id + '" speaker="' + speaker
    + '" cue="talk" look="camera" position="center" shot="medium" wait="text"><display lang="zh">'
    + display + '</display><tts lang="ja">' + tts + '</tts></beat>';
  const shape = {
    schemaVersion: segmentCount === 2 ? 2 : 1,
    segmentCount,
    businessId: text(context.businessId || runtime.businessId, 160),
    segmentIndex: index,
    status: expectedStatus,
    lines: [
      { id:'radio-line-1', type:'dialogue', speaker:host, text:beatExample('radio-line-1',host,'欢迎来到初星放送部。','初星放送部へようこそ。') },
      { id:'radio-line-2', type:'dialogue', speaker:guest, text:beatExample('radio-line-2',beatActorId(guest) || guest,'今天请多关照。','今日はよろしくお願いします。') }
    ],
    continuitySummary: '供下一段承接的已发生事实'
  };
  if (isIncident) Object.assign(shape, {
    listenerLetter: '听众来信原文或主持人转述',
    problem: '需要制作人介入的唯一计划外话题',
    options: ['预设指示一', '预设指示二', '预设指示三']
  });
  if (isClosing) Object.assign(shape, {
    highlight: '本场节目高光',
    audienceResponse: '节目结束时的公开听众反应',
    impressionChange: '本场形成或改变的公众印象',
    followupHook: '可供后续节目自然承接的事实',
    resultSummary: '本场广播的完整结果摘要',
    fanGain: 0
  });

  return [
    '[HATSU_OUTPUT_MODE:NIA_SCHOOL_RADIO]',
    `你正在为《学园偶像大师》N.I.A篇生成同一场《初星放送部》广播营业的第 ${index} / ${segmentCount} 段。`,
    businessLevel >= 3
      ? `本场是 Lv3 高关注圆桌特辑。主持人固定为${text(context.host, 80) || '真诚优'}，主嘉宾固定为${text(context.guest || context.idol, 80)}，第二嘉宾固定为${text(context.additionalGuest, 80)}；必须体现公开争点、立场交锋与清楚结论，三者在本场节目中不得增删或互换。`
      : businessLevel >= 2
      ? `本场是 Lv2 多嘉宾采访回。主持人固定为${text(context.host, 80) || '真诚优'}，主嘉宾固定为${text(context.guest || context.idol, 80)}，第二嘉宾固定为${text(context.additionalGuest, 80)}；三者在本场节目中不得增删或互换。`
      : '本场是 Lv1 单嘉宾广播。',
    duty,
    segmentCount === 2 ? (isIncident
      ? '篇幅：中文display正文共1200～1800字，20～32句Beat，充分呈现开场、主题访谈、自然转折与来信问题。日语tts、JSON和选项不算中文字数。'
      : '篇幅：中文display正文共800～1200字，14～24句Beat，充分呈现指示执行、嘉宾回应、结果和完整收播。日语tts和JSON不算中文字数。') : '',
    '以下本场信息由前端固定，不得改写节目、主持人、嘉宾、businessId 或段落编号：',
    JSON.stringify(radioSceneContext(context)),
    '【权威 N.I.A. 日程】当前为第' + (Number(context.day?.day) || Number(context.dayIndex || 0)+1) + '日广播；前面日程已完成，未来日程尚未发生，不在本场重演或提前推进。',
    '此前已发生事实：' + JSON.stringify((runtime.segments || []).map(item => text(item.continuitySummary,800)).filter(Boolean)),
    isClosing ? '本次来信与待处理问题：' + JSON.stringify({listenerLetter:runtime.segments?.[segmentCount-2]?.listenerLetter,problem:runtime.segments?.[segmentCount-2]?.problem}) : '',
    isClosing ? '制作人指示：' + text(runtime.producerInstruction, 1200) : '',
    '每一条 lines 都必须是广播字幕台可直接逐句播放的内容。主持人与嘉宾的具体互动、演播室反应和偶像表现由你创作。',
    '【广播3D Beat演出】lines[].speaker写纯角色名，lines[].text写一个完整Beat，内层id与外层id相同。',
    '每句都包含中文display和对应的日语tts；动作、表情、视线、站位和景别用Beat属性，按实际主持人与嘉宾互动选择。',
    '主持人真诚优没有3D模型，使用speaker="真诚优"和世界书规定的face差分，在当前3D镜头上显示对话立绘；偶像嘉宾使用各自Beat speaker。',
    '默认沿用演播室背景，不随每句重写background。制作人选项只放在options数组，Beat内不写choice或选项。',
    isIncident ? '本段status必须为awaiting_producer，必须给出恰好三个预设指示options，然后立即暂停。' : '',
    isClosing ? '最后一段status必须为ended，必须写清高光、听众反馈、印象变化、后续承接事实和结果摘要；禁止输出problem或options。fanGain为0～3000的整数，其他数值由前端结算。' : '',
    '只输出最后一个完整的 JSON 块，不要 Markdown、解释、思考文本或其他剧情契约：',
    '<NIA_RADIO>',
    JSON.stringify(shape),
    '</NIA_RADIO>'
  ].filter(Boolean).join('\n');
}

export function parseNiaRadioSegmentPayload(source, expected = {}) {
  const candidates = typeof source === 'string'
    ? [source]
    : [source?.rawText, source?.text, source?.renderedText].filter((item) => item != null);
  let parsed = { ok: false, reason: 'missing_nia_radio' };
  for (const candidate of candidates) {
    parsed = lastValidTaggedJson(candidate, 'NIA_RADIO');
    if (parsed.ok) break;
  }
  if (!parsed.ok) return parsed;

  const raw = object(parsed.data);
  const businessId = text(raw.businessId || raw.business_id, 160);
  const segmentCount = expected.segmentCount === 2 ? 2 : 4;
  const segmentIndex = Number(raw.segmentIndex || raw.segment_index);
  if (!Number.isInteger(segmentIndex) || segmentIndex < 1 || segmentIndex > segmentCount) return { ok:false, reason:'invalid_segment_index' };
  if (businessId !== text(expected.businessId, 160)) return { ok: false, reason: 'business_id_mismatch' };
  if (segmentIndex !== clampInteger(expected.segmentIndex, 1, 4)) return { ok: false, reason: 'segment_index_mismatch' };

  const data = {
    schemaVersion: segmentCount === 2 ? 2 : 1,
    segmentCount,
    businessId,
    segmentIndex,
    status: text(raw.status, 40),
    lines: normalizeLines(raw.lines),
    continuitySummary: text(raw.continuitySummary, 800)
  };
  if (!data.lines.length || !data.continuitySummary) return { ok: false, reason: 'invalid_radio_segment_contract' };

  if (data.lines.some(line => {
    if (!/<beat\b/i.test(line.text)) return false;
    const script = parseBeatScript(line.text, {allowOtherSpeakers:true});
    return script.beats.length !== 1 || script.choices.length || /<choice\b/i.test(line.text) || script.errors.some(error => error.code === 'malformed-beat');
  })) return {ok:false,reason:'invalid_radio_segment_contract'};

  if (segmentIndex < segmentCount - 1 && data.status !== 'continue') return { ok: false, reason: 'invalid_radio_segment_contract' };
  if (segmentIndex === segmentCount - 1) {
    data.listenerLetter = text(raw.listenerLetter, 800);
    data.problem = text(raw.problem, 600);
    data.options = normalizeOptions(raw.options);
    if (data.status !== 'awaiting_producer' || !data.listenerLetter || !data.problem || data.options.length !== 3) {
      return { ok: false, reason: 'invalid_incident_contract' };
    }
  }
  if (segmentIndex === segmentCount) {
    data.highlight = text(raw.highlight, 800);
    data.audienceResponse = text(raw.audienceResponse, 800);
    data.impressionChange = text(raw.impressionChange, 800);
    data.followupHook = text(raw.followupHook, 800);
    data.resultSummary = text(raw.resultSummary, 1000);
    data.fanGain = clampInteger(raw.fanGain, 0, 3000);
    const reopened = text(raw.problem, 600) || (Array.isArray(raw.options) && raw.options.length > 0);
    if (data.status !== 'ended' || reopened || !data.highlight || !data.audienceResponse || !data.impressionChange || !data.followupHook || !data.resultSummary) {
      return { ok: false, reason: 'invalid_closing_contract' };
    }
  }
  return { ok: true, data };
}

if (typeof globalThis !== 'undefined') {
  globalThis.HatsuNiaRadioApi = Object.freeze({
    buildNiaRadioSegmentPrompt,
    parseNiaRadioSegmentPayload
  });
}
