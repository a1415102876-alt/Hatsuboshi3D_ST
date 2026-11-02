import { beatStageHint, suggestedActionPrompt } from '../beat-chat.js?v=20261028-suggest-v1';
import { canonicalSandboxLocationId, getSandboxLocation, listSandboxLocations, sandboxLocationBackground } from './sandbox-world.js?v=20261028-field-garden-v1';

const ORDER_MODES = new Set(['follow', 'stay', 'travel']);

function knownLocation(id) {
  const key = canonicalSandboxLocationId(id);
  return listSandboxLocations().find((location) => location.id === key) || null;
}

export function normalizeIdolOrder(raw) {
  const mode = ORDER_MODES.has(raw?.mode) ? raw.mode : 'follow';
  if (mode === 'follow') return { mode: 'follow', locationId: '' };
  const location = knownLocation(raw?.locationId);
  if (!location) return { mode: 'follow', locationId: '' };
  return { mode, locationId: location.id };
}

export function idolVisible(order, locationId) {
  const normalized = normalizeIdolOrder(order);
  if (normalized.mode === 'follow') return true;
  if (normalized.mode === 'stay') return normalized.locationId === String(locationId || '');
  return false;
}

export function arriveIdolOrder(order, locationId) {
  const normalized = normalizeIdolOrder(order);
  const place = knownLocation(locationId);
  if (normalized.mode === 'travel' && place && normalized.locationId === place.id) {
    return { mode: 'stay', locationId: place.id };
  }
  return normalized;
}

export function describeIdolOrder(state) {
  const order = normalizeIdolOrder(state?.idolOrder);
  if (order.mode === 'follow') return '琴音会跟随前往各个地点。';
  const label = getSandboxLocation(order.locationId).label;
  if (order.mode === 'travel') return `琴音正在前往${label}，到达前不会出现。`;
  return state?.currentLocationId === order.locationId
    ? `琴音停留在${label}。`
    : `琴音留在${label}，不会跟随。`;
}

function locationBeat(location, { speaker, cue, text }) {
  return `<beat id="sandbox-location-${location.id}" speaker="${speaker}" cue="${cue}" face="neutral" look="camera" position="center" background="${location.background}" shot="${location.shot || 'medium'}" wait="none"><display lang="zh">${text}</display></beat>`;
}

function timedLocation(state, location) {
  const place = getSandboxLocation(location?.id || location);
  return { ...place, background: sandboxLocationBackground(place, state?.time?.clockMinutes) };
}

export function resolveArrival(state, location) {
  const place = timedLocation(state, location);
  const previous = normalizeIdolOrder(state?.idolOrder);
  const order = arriveIdolOrder(previous, place.id);
  const visible = idolVisible(order, place.id);
  const arriving = previous.mode === 'travel' && order.mode === 'stay';
  const returning = !arriving && previous.mode === 'stay' && previous.locationId === place.id
    && getSandboxLocation(state?.currentLocationId).id !== place.id;
  if (!visible) {
    const target = getSandboxLocation(order.locationId);
    const text = order.mode === 'travel'
      ? `制作人来到${place.label}。琴音还在前往${target.label}。`
      : `制作人来到${place.label}。琴音留在${target.label}。`;
    return { order, visible: false, enter: false, talk: false, script: locationBeat(place, { speaker: '旁白', cue: 'idle', text }) };
  }
  const text = arriving
    ? `琴音已经到了${place.label}。`
    : returning
      ? `琴音还在${place.label}，看到制作人回来了。`
      : order.mode === 'stay'
        ? `琴音在${place.label}。`
        : `琴音来到${place.label}，准备开始今天的安排。`;
  return {
    order,
    visible: true,
    enter: arriving,
    returning,
    talk: true,
    script: locationBeat(place, { speaker: 'kotone', cue: arriving ? 'enter' : 'idle', text }),
  };
}

export function presenceOpening(state) {
  const arrival = resolveArrival(state, state?.currentLocationId);
  if (!arrival.visible || arrival.enter) return arrival;
  const place = timedLocation(state, state?.currentLocationId);
  return {
    ...arrival,
    script: locationBeat(place, { speaker: 'kotone', cue: 'idle', text: '……' }),
  };
}

export function orderCommandFromChoice({ orderKind = '', orderPlace = '' } = {}) {
  if (orderPlace) return { kind: 'go', locationId: orderPlace };
  if (orderKind === 'places') return { menu: 'places' };
  if (orderKind === 'follow' || orderKind === 'stay') return { kind: orderKind };
  return null;
}

export function planIdolOrder(state, command = {}) {
  const here = getSandboxLocation(state?.currentLocationId);
  const present = idolVisible(state?.idolOrder, here.id);
  if (command.kind === 'follow') {
    return {
      ok: true,
      shouldExit: false,
      presentForReply: true,
      revealAfter: !present,
      nextOrder: { mode: 'follow', locationId: '' },
      playerLine: '跟着我。',
      directive: '指令：从现在起跟随制作人。之后前往其他地点时一起出现。先口头答应。',
    };
  }
  if (command.kind !== 'go') {
    if (!present) return { ok: false, reason: 'absent' };
    return {
      ok: true,
      shouldExit: false,
      presentForReply: true,
      revealAfter: false,
      nextOrder: { mode: 'stay', locationId: here.id },
      playerLine: `留在${here.label}，不要跟着去别的地方。`,
      directive: `指令：停留在当前地点${here.label}。之后只在这里出现，制作人去别的地方时不要跟随。`,
    };
  }
  const dest = knownLocation(command.locationId);
  if (!dest) return { ok: false, reason: 'unknown_location' };
  if (dest.id === here.id && present) {
    return {
      ok: true,
      shouldExit: false,
      presentForReply: true,
      revealAfter: false,
      nextOrder: { mode: 'stay', locationId: here.id },
      playerLine: `留在${here.label}。`,
      directive: `指令：就留在${here.label}。`,
    };
  }
  if (dest.id === here.id) {
    return {
      ok: true,
      shouldExit: false,
      presentForReply: true,
      revealAfter: true,
      nextOrder: { mode: 'stay', locationId: here.id },
      playerLine: `到${here.label}来，并留在这里。`,
      directive: `指令：前来${here.label}并停留。先口头答应，到达由画面处理。`,
    };
  }
  return {
    ok: true,
    shouldExit: present,
    presentForReply: present,
    revealAfter: false,
    nextOrder: { mode: 'travel', locationId: dest.id },
    playerLine: `前往${dest.label}。`,
    directive: `指令：前往${dest.label}。先用一两句口头答应。不要描写已经离开或已经到达，离开动作由画面播放。`,
  };
}

export function buildIdolOrderPrompt({ idolName = '藤田琴音', background = '', context = '', directive = '', playerLine = '' } = {}) {
  const idol = String(idolName || '藤田琴音').trim();
  const scene = String(background || '').trim();
  return [
    '[HATSU_OUTPUT_MODE:BEAT_CHAT]',
    '你正在写藤田琴音对制作人指令的一句短回复，不是长剧情。',
    `当前偶像：${idol}`,
    scene ? `当前场景：${scene}。background 固定为这个场景。` : '',
    '只输出 1 到 2 个 <beat>...</beat>，不要输出解释或 Markdown。',
    beatStageHint(),
    `每个 ${idol} 的 Beat 都要同时写中文和日语：<display lang="zh">玩家看到的中文</display><tts lang="ja">给 Fish 朗读的日语</tts>。`,
    '短回复只表示她听见并答应这个指令。',
    `样例：<beat speaker="${idol}" cue="说话" face="高兴" look="camera" position="center" background="${scene}" shot="medium"><display lang="zh">好，我知道了。</display><tts lang="ja">うん、わかった。</tts></beat>`,
    String(context || '').trim(),
    String(directive || '').trim(),
    suggestedActionPrompt(),
    `玩家说：${String(playerLine || '').trim()}`,
  ].filter(Boolean).join('\n');
}

export function buildArrivalPrompt({ idolName = '藤田琴音', background = '', placeLabel = '', context = '', arriving = false, returning = false, outing = false } = {}) {
  const idol = String(idolName || '藤田琴音').trim();
  const place = String(placeLabel || '这里').trim();
  const scene = String(background || '').trim();
  const situation = returning
    ? `琴音一直留在${place}。制作人离开过，现在回到这里。她是在原地看到制作人回来。`
    : arriving
      ? `琴音刚到达${place}，制作人也到了。`
      : `制作人和琴音一起到了${place}。`;
  const length = returning
    ? '只输出 2 到 3 个 <beat>...</beat>。至少两句由藤田琴音对制作人说出，可以有一句制作人的短回应。'
    : '输出 8 到 12 个 <beat>...</beat>，大约 10 个。顺着这个地点往下聊，可以走动、张望、挑选或坐下，不要只说“到了”就结束。在场的人至少说出六句。藤田琴音在场时由她主要开口，名单里的其他偶像用自己的 speaker 插话。制作人可以有两三句短回应。';
  const sample = returning
    ? `你回来了。我还在${place}。`
    : `到${place}了。今天就从这里开始吧？`;
  const sampleSpeech = returning ? 'おかえり。まだここにいるよ。' : '着いたね。今日はここから始めよっか。';
  const playerLine = returning ? '我回来了。' : `我们到${place}了。`;
  return [
    '[HATSU_OUTPUT_MODE:BEAT_CHAT]',
    returning
      ? '你正在写藤田琴音看到制作人回到她停留的地方时的短对话。不要写成刚到达，也不要写她才来到这里。'
      : `你正在写藤田琴音和制作人到达${outing ? '外出地点' : '这个地点'}后的一段相处，大约 10 个 Beat，不是一句到场招呼。`,
    `当前偶像：${idol}`,
    scene ? `当前场景：${scene}。background 保持这个场景，除非剧情确实换了地点。` : '',
    situation,
    beatStageHint(),
    '写成面对面的自然闲聊，要提到这个地点。琴音在场时由她开口，名单里的其他偶像用自己的名字说话。不要用旁白代替人物开口，不要写“琴音来到了某地”。',
    length,
    `每个 ${idol} 的 Beat 都要同时写中文和日语：<display lang="zh">玩家看到的中文</display><tts lang="ja">给 Fish 朗读的日语</tts>。制作人的 Beat 不要写 tts。`,
    `样例：<beat speaker="${idol}" cue="说话" face="高兴" look="camera" position="center" background="${scene}" shot="medium"><display lang="zh">${sample}</display><tts lang="ja">${sampleSpeech}</tts></beat>`,
    '<beat speaker="制作人" cue="idle" face="neutral" look="camera" position="center" background="' + scene + '" shot="medium"><display lang="zh">嗯，先在这儿待一会儿。</display></beat>',
    String(context || '').trim(),
    suggestedActionPrompt(),
    `玩家说：${playerLine}`,
  ].filter(Boolean).join('\n');
}

export function fallbackOrderScript({ idolName = '藤田琴音', background = '', playerLine = '' } = {}) {
  const lineText = String(playerLine || '');
  const following = lineText.includes('跟着');
  const going = !following && (lineText.includes('前往') || lineText.includes('到'));
  const line = following ? '好，我跟着你。' : going ? '好，我这就过去。' : '好，我就留在这里。';
  const speech = following ? 'うん、ついていくね。' : going ? 'うん、行ってくるね。' : 'うん、ここにいるね。';
  return `<beat speaker="${idolName}" cue="说话" face="高兴" look="camera" position="center" background="${background}" shot="medium"><display lang="zh">${line}</display><tts lang="ja">${speech}</tts></beat>`;
}

export function withoutIdolCast(script) {
  return String(script || '').replace(/\bspeaker\s*=\s*(["'])(?:kotone|藤田琴音)\1/gi, 'speaker=$1旁白$1');
}
