const EVENT_QUERY = '20261028-daily-event-v4';
const CLOSE_REASONS = new Set(['resolved', 'missed', 'withdrawn', 'expired', 'carried_over']);
const MECHANISMS = ['性格碰撞', '多层反差', '性格共振', '关系互补', '认知错位', '关系留白', '铺垫回扣', '生活式展示'];

function clip(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function asList(value, maxItems, maxLength) {
  const source = Array.isArray(value) ? value : [];
  const items = [];
  for (const item of source) {
    const text = clip(item, maxLength);
    if (!text || items.includes(text)) continue;
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}

function textList(value, maxItems, maxLength, separators = /\n+|；|;/) {
  const pieces = [];
  const addText = (text) => {
    String(text || '').split(separators).map((part) => clip(part, maxLength)).filter(Boolean).forEach((part) => {
      if (!pieces.includes(part) && pieces.length < maxItems) pieces.push(part);
    });
  };
  const addItem = (item) => {
    if (item == null) return;
    if (typeof item === 'string' || typeof item === 'number') {
      addText(item);
      return;
    }
    if (typeof item === 'object') {
      addText(item.label || item.summary || item.text || item.outcome || item.title || item.name || item.idol || item.purpose || item.value || item.intent || '');
    }
  };
  if (Array.isArray(value)) value.forEach(addItem);
  else if (value && typeof value === 'object') {
    const direct = value.label || value.summary || value.text || value.outcome || value.title;
    if (direct) addItem(direct);
    else Object.values(value).forEach(addItem);
  } else addItem(value);
  return pieces;
}

function firstClip(max, ...values) {
  for (const value of values) {
    if (value && typeof value === 'object') continue;
    const text = clip(value, max);
    if (text) return text;
  }
  return '';
}

function readIntents(raw) {
  const source = raw?.characterIntents || raw?.character_intents || raw?.intents || raw?.角色打算 || {};
  const intents = {};
  const add = (who, intent) => {
    const name = clip(who, 16);
    const text = clip(intent && typeof intent === 'object' ? (intent.intent || intent.value || intent.text || intent.summary) : intent, 60);
    if (!name || !text || Object.keys(intents).length >= 4) return;
    intents[name] = text;
  };
  if (Array.isArray(source)) {
    source.forEach((item) => add(item?.character || item?.name || item?.idol || item?.角色, item));
  } else if (source && typeof source === 'object') {
    Object.entries(source).forEach(([name, intent]) => add(name, intent));
  }
  return intents;
}

function readBeats(raw) {
  const source = Array.isArray(raw) ? raw : textList(raw, 3, 60);
  return source.slice(0, 3).map((beat, index) => ({
    id: clip(beat?.id, 24) || `b${index + 1}`,
    purpose: clip(typeof beat === 'string' ? beat : (beat?.purpose || beat?.summary || beat?.text || beat?.description), 60),
  })).filter((beat) => beat.purpose);
}

function emptyRecord() {
  return {
    status: 'planned',
    introduced: false,
    facts: [],
    intents: {},
    openThreads: [],
    beatHistory: [],
    appliedKeys: [],
    outcome: '',
    closeReason: '',
    lastSceneId: '',
    openingPlayed: false,
  };
}

export function emptyDailyEvent(day = 1) {
  return {
    day: Math.max(1, Math.round(Number(day) || 1)),
    planAttempted: false,
    planError: '',
    blueprint: null,
    record: emptyRecord(),
  };
}

function normalizeFact(raw, index) {
  const summary = clip(raw?.summary, 80);
  if (!summary) return null;
  return {
    id: clip(raw?.id, 24) || `fact-${index + 1}`,
    sceneId: clip(raw?.sceneId, 80),
    summary,
    participants: asList(raw?.participants, 4, 16),
  };
}

function normalizeThread(raw, index) {
  const summary = clip(raw?.summary ?? raw, 80);
  if (!summary) return null;
  return {
    id: clip(raw?.id, 24) || `thread-${index + 1}`,
    summary,
    resolved: Boolean(raw?.resolved),
  };
}

function normalizeBlueprint(raw, day) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const title = firstClip(16, raw.title, raw.name, raw.event_title, raw.eventTitle, raw.标题);
  let narrativeHook = firstClip(80, raw.narrativeHook, raw.narrative_hook, raw.hook, raw.player_hook, raw.intro, raw.钩子, raw.叙事钩子);
  let premise = firstClip(160, raw.premise, raw.summary, raw.setup, raw.introduction, raw.situation, raw.起因, raw.前提);
  if (!premise) premise = firstClip(160, narrativeHook);
  if (!narrativeHook) narrativeHook = firstClip(80, premise);
  if (!title || !narrativeHook || !premise) return null;
  return {
    id: clip(raw.id, 32) || `evt-day-${day}`,
    day,
    priority: 'main',
    format: 'continuous',
    title,
    premise,
    narrativeHook,
    dramaticQuestion: firstClip(80, raw.dramaticQuestion, raw.dramatic_question, raw.question, raw.conflict, raw.问题, raw.戏剧问题) || narrativeHook,
    participants: textList(raw.participants ?? raw.characters ?? raw.idols ?? raw.cast ?? raw.人物 ?? raw.参与者, 4, 16, /[\n；;、，,]/),
    coreMechanisms: textList(raw.coreMechanisms ?? raw.core_mechanisms ?? raw.机制, 2, 16, /[\n；;、]/),
    tone: firstClip(24, raw.tone, raw.语气),
    characterIntents: readIntents(raw),
    beats: readBeats(raw.beats ?? raw.节拍),
    possibleResolutions: textList(
      raw.possibleResolutions ?? raw.possible_resolutions ?? raw.resolutions ?? raw.endings ?? raw.outcomes ?? raw.possible_endings ?? raw.possible_resolution ?? raw.收束 ?? raw.可能的收束 ?? raw.结局,
      4,
      40,
      /[\n；;、]/,
    ),
    guardrails: textList(raw.guardrails ?? raw.边界, 4, 60),
    referenceIds: asList(raw.referenceIds ?? raw.reference_ids, 3, 40),
    locationId: clip(raw.locationId || raw.location_id, 40),
    locationLabel: firstClip(16, raw.locationLabel, raw.location_label),
  };
}

function normalizeRecord(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const status = ['planned', 'introduced', 'active', 'closed'].includes(source.status) ? source.status : 'planned';
  const facts = (Array.isArray(source.facts) ? source.facts : []).map(normalizeFact).filter(Boolean).slice(0, 12);
  const openThreads = (Array.isArray(source.openThreads) ? source.openThreads : []).map(normalizeThread).filter(Boolean).slice(0, 8);
  const intents = {};
  const sourceIntents = source.intents && typeof source.intents === 'object' ? source.intents : {};
  for (const [name, intent] of Object.entries(sourceIntents)) {
    const who = clip(name, 16);
    const text = clip(intent, 60);
    if (!who || !text || Object.keys(intents).length >= 4) continue;
    intents[who] = text;
  }
  return {
    status,
    introduced: Boolean(source.introduced) || status === 'introduced' || status === 'active',
    facts,
    intents,
    openThreads,
    beatHistory: asList(source.beatHistory, 6, 24),
    appliedKeys: asList(source.appliedKeys, 40, 120),
    outcome: clip(source.outcome, 80),
    closeReason: CLOSE_REASONS.has(source.closeReason) ? source.closeReason : '',
    lastSceneId: clip(source.lastSceneId, 80),
    openingPlayed: source.openingPlayed === true || (source.openingPlayed == null && (Boolean(source.introduced) || status === 'introduced' || status === 'active' || status === 'closed')),
  };
}

export function normalizeDailyEvent(raw, day = 1) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const eventDay = Math.max(1, Math.round(Number(source.day || source.blueprint?.day) || day || 1));
  const blueprint = normalizeBlueprint(source.blueprint, eventDay);
  const record = normalizeRecord(source.record);
  if (blueprint && !record.introduced && record.status === 'planned') {
    record.intents = { ...blueprint.characterIntents, ...record.intents };
  }
  return {
    day: eventDay,
    planAttempted: Boolean(source.planAttempted),
    planError: clip(source.planError, 80),
    blueprint,
    record,
  };
}

export function normalizeEventArchive(raw) {
  if (!Array.isArray(raw)) return [];
  const items = [];
  for (const item of raw) {
    const title = clip(item?.title, 16);
    const id = clip(item?.id, 32);
    const day = Math.max(1, Math.round(Number(item?.day) || 0));
    if (!title || !id || !day) continue;
    if (items.some((entry) => entry.id === id)) continue;
    items.push({
      day,
      id,
      title,
      mechanisms: asList(item?.mechanisms, 2, 16),
      closeReason: CLOSE_REASONS.has(item?.closeReason) ? item.closeReason : 'carried_over',
      outcome: clip(item?.outcome, 80),
      participants: asList(item?.participants, 4, 16),
      referenceIds: asList(item?.referenceIds, 3, 40),
    });
  }
  return items.slice(-8);
}

export function dailyEventNeedsPlan(event, day) {
  const normalized = normalizeDailyEvent(event, day);
  if (normalized.blueprint?.title && normalized.blueprint.day === Number(day)) return false;
  if (normalized.planAttempted && normalized.day === Number(day) && !normalized.blueprint?.title) return false;
  return true;
}

export function markEventPlanAttempted(event, day, error = '') {
  const normalized = normalizeDailyEvent(event, day);
  const sameDayBlueprint = normalized.blueprint?.day === Number(day) ? normalized.blueprint : null;
  return {
    ...normalized,
    day: Math.max(1, Math.round(Number(day) || 1)),
    planAttempted: true,
    planError: sameDayBlueprint ? '' : clip(error, 80),
    blueprint: sameDayBlueprint,
  };
}

export function eventPlanCanRetry(event, day) {
  const normalized = normalizeDailyEvent(event, day);
  if (normalized.blueprint?.title && normalized.blueprint.day === Number(day)) return false;
  return Boolean(normalized.planAttempted && normalized.day === Number(day));
}

function findJsonEnd(text, start) {
  const stack = [];
  let quoted = false;
  let escape = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === '{' || char === '[') stack.push(char);
    else if (char === '}' || char === ']') {
      stack.pop();
      if (!stack.length) return index;
    }
  }
  return -1;
}

function extractJsonValues(source) {
  const text = String(source || '');
  const values = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '{' && text[index] !== '[') continue;
    const end = findJsonEnd(text, index);
    if (end <= index) continue;
    values.push(text.slice(index, end + 1));
    index = end;
  }
  return values;
}

function repairJson(text) {
  return String(text || '')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)([A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*)\s*[:：]/g, '$1"$2":')
    .replace(/"\s*：/g, '":')
    .replace(/[“”]/g, '"');
}

function parseRepaired(chunk) {
  const attempts = [chunk, repairJson(chunk)];
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      // The next attempt repairs trailing commas, bare keys, and fullwidth punctuation.
    }
  }
  return null;
}

function parseJsonObject(source) {
  const text = String(source || '').replace(/^\uFEFF/, '').trim();
  const fenced = [...text.matchAll(/```(?:json|javascript)?\s*([\s\S]*?)```/gi)].map((match) => match[1]);
  const chunks = [];
  for (const block of [...fenced, text]) chunks.push(...extractJsonValues(block));
  const ordered = [...chunks].sort((left, right) => right.length - left.length);
  for (const chunk of ordered) {
    const parsed = parseRepaired(chunk);
    if (parsed && typeof parsed === 'object') return parsed;
  }
  return null;
}

function blueprintBodies(parsed) {
  if (!parsed || typeof parsed !== 'object') return [];
  if (Array.isArray(parsed)) return parsed.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
  const lists = [parsed.candidates, parsed.blueprints, parsed.events, parsed.options].filter(Array.isArray).flat();
  const nested = [parsed.blueprint, parsed.event, parsed.daily_event, parsed.蓝图].filter((item) => item && typeof item === 'object' && !Array.isArray(item));
  const bodies = [...nested, ...lists, parsed];
  return bodies.filter((item, index) => bodies.indexOf(item) === index);
}

function completeResolutions(resolutions) {
  const items = [...resolutions];
  for (const filler of ['顺着今天的问题做成', '今天先放下，以后还能再提']) {
    if (items.length >= 2) break;
    if (!items.includes(filler)) items.push(filler);
  }
  return items.slice(0, 4);
}

function placeEntries(places) {
  return (Array.isArray(places) ? places : []).map((place) => {
    if (place && typeof place === 'object') {
      return {
        id: clip(place.id, 40),
        label: clip(place.label || place.shortLabel || place.id, 16),
        shortLabel: clip(place.shortLabel, 16),
      };
    }
    const text = clip(place, 40);
    return { id: text, label: text, shortLabel: '' };
  }).filter((place) => place.id);
}

export function resolveEventLocation(value, places = [], fallbackId = '') {
  const entries = placeEntries(places);
  const text = clip(typeof value === 'object' ? (value?.id || value?.locationId || value?.label || value?.name) : value, 40);
  const found = entries.find((place) => place.id === text || place.label === text || (place.shortLabel && place.shortLabel === text))
    || entries.find((place) => text && place.label && (place.label.includes(text) || text.includes(place.label)));
  if (found) return found;
  return entries.find((place) => place.id === fallbackId) || entries[0] || null;
}

function blueprintFromBody(body, { day, idolName, referenceIds, places = [], fallbackLocationId = '' }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const blueprint = normalizeBlueprint({
    ...body,
    id: `evt-day-${day}`,
    referenceIds,
  }, day);
  if (!blueprint) return null;
  if (!blueprint.participants.length) blueprint.participants = asList([idolName], 1, 16);
  const place = resolveEventLocation(body.location || body.locationId || body.location_id || body.place || body.地点 || blueprint.locationId, places, fallbackLocationId);
  if (place) {
    blueprint.locationId = place.id;
    blueprint.locationLabel = place.label;
  }
  blueprint.possibleResolutions = completeResolutions(blueprint.possibleResolutions);
  return {
    day,
    planAttempted: true,
    planError: '',
    blueprint,
    record: {
      ...emptyRecord(),
      intents: { ...blueprint.characterIntents },
      openThreads: blueprint.dramaticQuestion ? [{ id: 'thread-1', summary: blueprint.dramaticQuestion, resolved: false }] : [],
    },
  };
}

export function parseEventBlueprint(source, { day = 1, idolName = '', referenceIds = [], places = [], fallbackLocationId = '' } = {}) {
  const bodies = blueprintBodies(parseJsonObject(source));
  for (const body of bodies) {
    const event = blueprintFromBody(body, { day, idolName, referenceIds, places, fallbackLocationId });
    if (event) return { ok: true, event };
  }
  return { ok: false, error: '事件蓝图缺少标题、钩子或起因。' };
}

export function introduceDailyEvent(event, { sceneId = 'day-start-notice' } = {}) {
  const normalized = normalizeDailyEvent(event, event?.day);
  if (!normalized.blueprint?.title || normalized.record.introduced) return normalized;
  const key = `${sceneId}|introduce`;
  if (normalized.record.appliedKeys.includes(key)) return normalized;
  const fact = {
    id: 'fact-intro',
    sceneId,
    summary: clip(`制作人已经知道：${normalized.blueprint.narrativeHook}`, 80),
    participants: asList(['制作人', ...normalized.blueprint.participants], 4, 16),
  };
  return {
    ...normalized,
    record: {
      ...normalized.record,
      status: 'introduced',
      introduced: true,
      facts: [fact, ...normalized.record.facts].slice(0, 12),
      appliedKeys: [...normalized.record.appliedKeys, key].slice(-40),
      lastSceneId: sceneId,
    },
  };
}

export function markEventOpeningPlayed(event, { sceneId = 'event-opening', placeLabel = '' } = {}) {
  const introduced = introduceDailyEvent(event, { sceneId });
  const place = clip(placeLabel, 16);
  return {
    ...introduced,
    record: {
      ...introduced.record,
      openingPlayed: true,
      facts: introduced.record.facts.map((fact) => (fact.id === 'fact-intro' && place
        ? { ...fact, summary: clip(`在${place}，${introduced.blueprint.narrativeHook}`, 80) }
        : fact)),
    },
  };
}

function withKey(record, key, sceneId, mutate) {
  if (record.appliedKeys.includes(key)) return record;
  const next = mutate({ ...record, appliedKeys: [...record.appliedKeys, key].slice(-40), lastSceneId: sceneId || record.lastSceneId });
  if ((next.status === 'planned' || next.status === 'introduced') && next !== record) next.status = 'active';
  return next;
}

function applyOperation(record, blueprint, operation, sceneId) {
  const op = String(operation?.op || '');
  if (op === 'append_fact') {
    const summary = clip(operation.summary, 80);
    if (!summary) return record;
    const key = `fact|${summary}`;
    return withKey(record, key, sceneId, (next) => ({
      ...next,
      facts: [...next.facts, {
        id: `fact-${next.facts.length + 1}`,
        sceneId,
        summary,
        participants: asList(operation.participants, 4, 16),
      }].slice(-12),
    }));
  }
  if (op === 'set_character_intent') {
    const who = clip(operation.character || operation.idol, 16);
    const value = clip(operation.value || operation.intent, 60);
    if (!who || !value) return record;
    if (!record.intents[who] && Object.keys(record.intents).length >= 4) return record;
    const key = `intent|${who}|${value}`;
    return withKey(record, key, sceneId, (next) => ({
      ...next,
      intents: { ...next.intents, [who]: value },
    }));
  }
  if (op === 'add_open_thread') {
    const summary = clip(operation.value || operation.summary, 80);
    if (!summary || record.openThreads.some((thread) => thread.summary === summary)) return record;
    const key = `thread|${summary}`;
    return withKey(record, key, sceneId, (next) => ({
      ...next,
      openThreads: [...next.openThreads, { id: `thread-${next.openThreads.length + 1}`, summary, resolved: false }].slice(-8),
    }));
  }
  if (op === 'resolve_open_thread') {
    const id = clip(operation.id, 24);
    const summary = clip(operation.summary || operation.value, 80);
    const index = record.openThreads.findIndex((thread) => (id && thread.id === id) || (summary && thread.summary === summary));
    if (index < 0 || record.openThreads[index].resolved) return record;
    const key = `resolve|${record.openThreads[index].id}`;
    return withKey(record, key, sceneId, (next) => ({
      ...next,
      openThreads: next.openThreads.map((thread, threadIndex) => (threadIndex === index ? { ...thread, resolved: true } : thread)),
    }));
  }
  if (op === 'mark_beat_observed') {
    const beatId = clip(operation.beat_id || operation.beatId, 24);
    if (!beatId || !(blueprint?.beats || []).some((beat) => beat.id === beatId)) return record;
    if (record.beatHistory.includes(beatId)) return record;
    const key = `beat|${beatId}`;
    return withKey(record, key, sceneId, (next) => ({
      ...next,
      beatHistory: [...next.beatHistory, beatId].slice(-6),
    }));
  }
  if (op === 'close_event') {
    const reason = CLOSE_REASONS.has(operation.close_reason || operation.closeReason) ? (operation.close_reason || operation.closeReason) : 'resolved';
    const outcome = clip(operation.outcome, 80);
    if (!outcome || record.status === 'closed') return record;
    const key = `close|${reason}|${outcome}`;
    if (record.appliedKeys.includes(key)) return record;
    return {
      ...record,
      status: 'closed',
      closeReason: reason,
      outcome,
      appliedKeys: [...record.appliedKeys, key].slice(-40),
      lastSceneId: sceneId || record.lastSceneId,
    };
  }
  return record;
}

export function applyDailyEventPatch(state, patch, { sceneId = '' } = {}) {
  const event = normalizeDailyEvent(state?.dailyEvent, state?.day);
  if (!event.blueprint?.title || event.record.status === 'closed') return state;
  const body = typeof patch === 'string' ? parseJsonObject(patch) : patch;
  if (!body || !Array.isArray(body.operations)) return state;
  if (body.event_id && body.event_id !== event.blueprint.id) return state;
  const scene = clip(sceneId || body.based_on_scene_id || '', 80);
  let record = event.record;
  for (const operation of body.operations.slice(0, 8)) {
    record = applyOperation(record, event.blueprint, operation, scene);
  }
  if (record === event.record) return state;
  return { ...state, dailyEvent: { ...event, record } };
}

export function closeDailyEvent(event, { reason = 'carried_over', outcome = '' } = {}) {
  const normalized = normalizeDailyEvent(event, event?.blueprint?.day || event?.day);
  if (!normalized.blueprint?.title || normalized.record.status === 'closed') return normalized;
  const closeReason = CLOSE_REASONS.has(reason) ? reason : 'carried_over';
  const fallback = closeReason === 'missed' ? '这件事还没被提起。' : '这件事先留到以后。';
  return {
    ...normalized,
    record: {
      ...normalized.record,
      status: 'closed',
      closeReason,
      outcome: clip(outcome || normalized.record.outcome || fallback, 80),
    },
  };
}

export function appendEventArchive(archive, event) {
  const normalized = normalizeDailyEvent(event, event?.day);
  if (!normalized.blueprint?.title) return normalizeEventArchive(archive);
  return normalizeEventArchive([
    ...normalizeEventArchive(archive).filter((item) => item.id !== normalized.blueprint.id),
    {
      day: normalized.blueprint.day,
      id: normalized.blueprint.id,
      title: normalized.blueprint.title,
      mechanisms: normalized.blueprint.coreMechanisms,
      closeReason: normalized.record.closeReason || 'carried_over',
      outcome: normalized.record.outcome,
      participants: normalized.blueprint.participants,
      referenceIds: normalized.blueprint.referenceIds,
    },
  ]);
}

export function splitEventPatch(source) {
  const raw = String(source || '');
  const match = raw.match(/<event_patch>([\s\S]*?)<\/event_patch>/i);
  const script = raw.replace(/<event_patch>[\s\S]*?<\/event_patch>/gi, '').trim();
  if (!match) return { script, patch: null };
  const patch = parseJsonObject(match[1]);
  if (!patch || !Array.isArray(patch.operations)) return { script, patch: null };
  return { script, patch };
}

function nextBeat(event) {
  const seen = new Set(event.record.beatHistory);
  return (event.blueprint.beats || []).find((beat) => !seen.has(beat.id)) || null;
}

export function buildEventWriterContext(state) {
  const event = normalizeDailyEvent(state?.dailyEvent, state?.day);
  if (!event.blueprint?.title || event.blueprint.day !== Number(state?.day) || event.record.status === 'closed') return '';
  const facts = event.record.facts.map((fact) => `- ${fact.summary}`).join('\n') || '- 还没有新的事实';
  const threads = event.record.openThreads.filter((thread) => !thread.resolved).map((thread) => `- ${thread.summary}`).join('\n') || '- 没有明摆着的问题';
  const intents = Object.entries(event.record.intents).map(([name, intent]) => `- ${name}：${intent}`).join('\n');
  const beat = nextBeat(event);
  const guardrails = event.blueprint.guardrails.map((line) => `- ${line}`).join('\n');
  return [
    '【今日事件】',
    `标题：${event.blueprint.title}`,
    event.blueprint.locationLabel || event.blueprint.locationId ? `开场地点：${event.blueprint.locationLabel || event.blueprint.locationId}。之后可以离开这里。` : '',
    `玩家已知：${event.blueprint.narrativeHook}`,
    '已发生，这些才是事实：',
    facts,
    '还没解决：',
    threads,
    intents ? `角色目前的打算：\n${intents}` : '',
    beat ? `若这场戏自然碰到这件事，眼下只适合：${beat.purpose}` : '',
    guardrails ? `不要：\n${guardrails}` : '',
    '先回应玩家这一次的行动。只有自然碰到这件事时才推进一小步，平常的上课、赶路和闲聊可以完全不提。不要复述钩子，不要写出可能的结局，不要替玩家决定，不要为了事件把不在场的人写进来。',
    `若碰到了，在其他标签之后另起一行写 <event_patch>{"event_id":"${event.blueprint.id}","operations":[]}</event_patch>。`,
    'operations 只能使用 append_fact、set_character_intent、add_open_thread、resolve_open_thread、mark_beat_observed、close_event。没有变化就让 operations 为空。不要在这里改时间、地点、金钱或课题。',
  ].filter(Boolean).join('\n');
}

export function buildEventPlanPrompt({
  day = 1,
  idolName = '',
  memories = [],
  quests = [],
  places = [],
  archive = [],
  references = [],
  occupied = [],
} = {}) {
  const recent = normalizeEventArchive(archive).map((item) => `第${item.day}日《${item.title}》机制：${item.mechanisms.join('、') || '未记'}。结果：${item.outcome || item.closeReason}`);
  const used = [...new Set(normalizeEventArchive(archive).flatMap((item) => item.mechanisms))];
  const referenceBlock = references.length
    ? references.map((item) => `# ${item.id}\n${item.text}`).join('\n\n')
    : '这次没有读到参考剧本。仍按这些人平时的说话方式来写，不要编造原作情节。';
  return [
    '你是初星学园的事件设计师。为一整天设计 1 个主 Event 蓝图，不要写完整故事正文，也不要写开场对白。',
    '人物性格要成为起因。给出玩家愿意接着问的短期诉求、约定或悬念。玩家可以不参与，也可以提前解决，不要替玩家写台词。',
    '开场会在你选定的一个地点直接演出来。location 必须是下面的地点 id。选一个今天说得通的地方。开场之后玩家可以离开，不要把之后的行程锁在那里。',
    '保持学园日常。不要写成色情、暴力，也不要复述参考剧本里的情节、活动和原句。',
    `可选机制：${MECHANISMS.join('、')}。选 1 到 2 个，不必凑齐。${used.length ? `最近用过：${used.join('、')}。今天换一种。` : ''}`,
    `第 ${day} 日。担当是${idolName || '藤田琴音'}。事件可以让担当参与，也可以是担当身边的人。`,
    `能去的地方：${placeEntries(places).map((place) => `${place.label}（${place.id}）`).join('、') || '学园里'}。`,
    `长期课题：${quests.join('；') || '无'}。`,
    `最近的日子：${memories.join(' / ') || '还没有跨日记忆'}。`,
    `今天别人之间已经安排的小事：${occupied.join(' / ') || '没有'}。主事件不要复述这些事，也不要把担当写进那些档期。`,
    `近期事件：${recent.join(' / ') || '没有'}。`,
    '【参考剧本】',
    '下面的短篇只用来学习这些人怎么说话、彼此怎么相处。不要复述情节。',
    referenceBlock,
    '只输出一个 JSON 对象，不要解释。字段：title、premise、narrative_hook、dramatic_question、location、participants、core_mechanisms、tone、character_intents、beats、possible_resolutions、guardrails。',
    'title 不超过 16 字。narrative_hook 是玩家今天一开始就能看见的一句话。location 只能填写上面的地点 id。beats 最多 3 个，每项只有 id 和 purpose。possible_resolutions 是字符串数组，至少 2 条，每条分开写，而且互不相同。guardrails 写不能破坏的人设边界。',
  ].join('\n');
}

function escapeBeatText(value) {
  return String(value || '').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
}

export function buildEventOpeningPrompt({
  idolName = '',
  placeLabel = '',
  background = '',
  title = '',
  hook = '',
  premise = '',
  participants = [],
} = {}) {
  const idol = clip(idolName, 16) || '藤田琴音';
  const people = (Array.isArray(participants) && participants.length ? participants : [idol]).join('、');
  const scene = clip(background, 80);
  return [
    '[HATSU_OUTPUT_MODE:BEAT_CHAT]',
    `你正在写今日事件《${clip(title, 16)}》的开场。这是这件事第一次被演出来，不是普通的到场招呼。`,
    `地点：${clip(placeLabel, 16) || '这里'}。background 固定为 ${scene}。`,
    `在场的人：${people}。只让这些人开口。${idol}在名单里时由她主要说话。`,
    `要演出来的钩子：${clip(hook, 80)}`,
    premise ? `起因：${clip(premise, 160)}` : '',
    '输出 4 到 6 个 <beat>。把钩子演成眼前的动作和对话，不要总结主题，不要写出结局，不要写成选项。',
    '每个偶像 Beat 同时写 <display lang="zh">中文</display><tts lang="ja">日语</tts>。制作人的 Beat 不要写 tts。不要输出 event_patch。',
    `样例：<beat speaker="${idol}" cue="说话" face="高兴" look="camera" position="center" background="${scene}" shot="medium"><display lang="zh">今天就从这件事说起。</display><tts lang="ja">今日はこの話から始めよ。</tts></beat>`,
  ].filter(Boolean).join('\n');
}

export function buildEventOpeningFallback({
  idolName = '',
  background = '',
  placeLabel = '',
  hook = '',
  participants = [],
} = {}) {
  const idol = clip(idolName, 16) || '藤田琴音';
  const speaker = (Array.isArray(participants) && participants.includes(idol)) ? idol : (participants?.[0] || idol);
  const scene = escapeBeatText(background);
  const line = escapeBeatText(clip(hook, 80) || `今天的事从${clip(placeLabel, 16) || '这里'}开始。`);
  const voiced = speaker !== '制作人' && speaker !== '旁白';
  return [
    `<beat speaker="${escapeBeatText(speaker)}" cue="说话" face="高兴" look="camera" position="center" background="${scene}" shot="medium"><display lang="zh">${line}</display>${voiced ? '<tts lang="ja">今日はこの話から始めよ。</tts>' : ''}</beat>`,
    `<beat speaker="制作人" cue="idle" face="neutral" look="camera" position="center" background="${scene}" shot="medium"><display lang="zh">嗯，我在听。</display></beat>`,
  ].join('\n');
}

export function selectCsprtStories(index, { idolName = '', day = 1, recentIds = [], count = 3 } = {}) {
  const stories = Array.isArray(index?.stories) ? index.stories : [];
  const recent = new Set(recentIds.filter(Boolean));
  const usable = stories.filter((story) => story?.id && !recent.has(story.id));
  const name = clip(idolName, 16);
  const preferred = usable.filter((story) => Array.isArray(story.idolNames) && name && story.idolNames.includes(name));
  const rest = usable.filter((story) => !preferred.some((item) => item.id === story.id));
  const picked = [];
  const take = (pool) => {
    if (!pool.length || picked.length >= count) return;
    const start = Math.abs(Math.round(Number(day) || 1)) % pool.length;
    for (let indexInPool = 0; indexInPool < pool.length && picked.length < count; indexInPool += 1) {
      picked.push(pool[(start + indexInPool) % pool.length]);
    }
  };
  take(preferred);
  take(rest);
  return picked;
}

export function recentCsprtIds(archive) {
  return normalizeEventArchive(archive).flatMap((item) => item.referenceIds).slice(-9);
}

export async function loadCsprtReferences(options, fetchImpl = globalThis.fetch) {
  const indexUrl = new URL(`../csprt-dialogue/index.json?v=${EVENT_QUERY}`, import.meta.url);
  const response = await fetchImpl(indexUrl);
  if (!response?.ok) throw new Error('没有读到参考剧本目录');
  const index = await response.json();
  const picked = selectCsprtStories(index, options);
  const references = [];
  for (const story of picked) {
    const fileUrl = new URL(`../csprt-dialogue/${encodeURIComponent(story.id)}.txt?v=${EVENT_QUERY}`, import.meta.url);
    const file = await fetchImpl(fileUrl);
    if (!file?.ok) continue;
    const text = String(await file.text()).split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).slice(0, 28).join('\n');
    if (!text) continue;
    references.push({ id: story.id, idolNames: story.idolNames || [], text });
  }
  return references;
}

export { MECHANISMS };
