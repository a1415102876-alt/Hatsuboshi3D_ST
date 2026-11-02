// Reuse the original frontend's roster, weights and seeded timetable. These
// modules only register pure helpers; they do not load the old app or save.
import '../../hatsu-produce-local/world/events-pool.js';
import '../../hatsu-produce-local/world/campus-behavior.js';
import { canonicalSandboxLocationId, getSandboxLocation, locationAreaFor } from './sandbox-world.js?v=20261028-field-garden-v1';
import { idolVisible } from './sandbox-orders.js';
import { canonicalCastIdol, mergeSandboxCampusPresence, normalizeSceneCast, sameCastIdol } from './sandbox-cast.js?v=20261028-presence-phase-v1';
import { storyGuidePlacements } from './sandbox-story-guide.js?v=20261028-story-guide-v1';

const LOCATION_IDS = Object.freeze({
  school_entrance: 'toschool', club_room: 'club_building', auditorium: 'hall_exterior',
  gymnasium: 'gymnasium', producer_classroom: 'home_classroom', courtyard: 'inner_garden',
});
const ACTIVITY_LABELS = Object.freeze({
  group_lesson: '上课或课后复习', solo_training: '自主练习', rest_tea: '休息片刻',
  part_time: '打工后的短暂停留', student_council: '处理学生会事务',
  rehearsal: '准备排练', wandering: '在附近走动',
});
const canonicalPlace = id => id === 'student_council' ? 'club_building' : canonicalSandboxLocationId(id);
export const isSandboxCampusLocation = id => {
  const area = locationAreaFor(id);
  return area?.id === 'campus' || area?.campus === true;
};

export function resolveSandboxCampusPresence(state = {}) {
  const day = Math.max(1, Math.round(Number(state.day) || 1));
  const minutes = Math.max(0, Math.min(1440, Number(state.time?.clockMinutes) || 480));
  const idolName = String(state.idolId || '藤田琴音');
  const phase = minutes < 12 * 60 ? 'morning' : minutes < 14 * 60 ? 'midday' : minutes < 18 * 60 ? 'afternoon' : 'evening';
  const slotKey = `${day}@${phase}`;
  const api = globalThis.HatsuWorld.campusBehavior;
  const campus = api.resolveProfileCampus({
    idol: idolName, freeMode: { clockMinutes: minutes, postLiveDay: day },
  }, { getPresenceSlotKey: () => slotKey });
  const visitors = Object.entries(campus.slots)
    .filter(([name]) => name !== idolName)
    .map(([name, slot]) => {
      const primary = api.CAMPUS_PROFILES[name]?.slots?.[campus.timePhase]?.locationId;
      return {
        name,
        sourceLocationId: slot.locationId,
        // Unknown/closed buildings deliberately stay off the accessible map.
        locationId: LOCATION_IDS[slot.locationId] || null,
        activityId: slot.activityId,
        activity: slot.locationId === primary ? slot.publicLabel : ACTIVITY_LABELS[slot.activityId] || '在附近活动',
        isProducedIdol: false,
      };
    });
  return { day, minutes, slotKey, timePhase: campus.timePhase, visitors };
}

function knownPlace(locationId) {
  const id = canonicalPlace(String(locationId || '').trim());
  if (!id || getSandboxLocation(id).id !== id) return '';
  return id;
}

function presenceLocationIds(locationId) {
  const id = knownPlace(locationId);
  if (!id) return [];
  const area = locationAreaFor(id);
  const entry = area?.places?.[0]?.locationId;
  if (entry && knownPlace(entry) === id && area.memberIds.length > 1) {
    return [...new Set(area.memberIds.map((member) => knownPlace(member)).filter(Boolean))];
  }
  return [id];
}

function visitorsWithStoryGuide(state) {
  const placed = storyGuidePlacements(state);
  const visitors = resolveSandboxCampusPresence(state).visitors.map((row) => {
    const story = placed.get(row.name);
    if (!story) return row;
    return { ...row, locationId: story.locationId, activity: story.premise, activityId: 'story' };
  });
  const present = new Set(visitors.map((row) => row.name));
  for (const [name, story] of placed) {
    if (present.has(name)) continue;
    visitors.push({
      name,
      sourceLocationId: story.locationId,
      locationId: story.locationId,
      activity: story.premise,
      activityId: 'story',
      isProducedIdol: false,
    });
  }
  return visitors;
}

/** Other idols at a map place. The produced idol is omitted. */
export function sandboxIdolsAt(state = {}, locationId = '') {
  const places = new Set(presenceLocationIds(locationId));
  if (!places.size) return [];
  const produced = String(state.idolId || '藤田琴音');
  const cast = normalizeSceneCast(state.sceneCast, { day: state.day, minutes: state.time?.clockMinutes });
  const rows = [];
  const seen = new Set();
  const push = (row) => {
    const key = canonicalCastIdol(row?.name) || row?.name;
    if (!row?.name || row.name === produced || seen.has(key) || !places.has(knownPlace(row.locationId))) return;
    seen.add(key);
    rows.push(row);
  };
  const castEntry = (name) => {
    if (cast[name]) return cast[name];
    const found = Object.entries(cast).find(([key]) => sameCastIdol(key, name));
    return found ? found[1] : null;
  };
  for (const row of visitorsWithStoryGuide(state)) {
    const override = castEntry(row.name);
    if (override) {
      if (override.status === 'absent' || override.status === 'leaving') continue;
      push({
        ...row,
        locationId: override.locationId,
        activity: override.intent || (override.status === 'approaching' ? '正在赶来' : override.status === 'waiting' ? '在这里等候' : row.activity),
      });
      continue;
    }
    push(row);
  }
  for (const [name, entry] of Object.entries(cast)) {
    if (entry.status === 'absent' || entry.status === 'leaving') continue;
    push({
      name,
      locationId: entry.locationId,
      activity: entry.intent || (entry.status === 'approaching' ? '正在赶来' : entry.status === 'waiting' ? '在这里等候' : '在这里活动'),
      activityId: entry.status,
      isProducedIdol: false,
    });
  }
  return rows;
}

export function formatSandboxPresenceLine(people) {
  const rows = Array.isArray(people) ? people.filter((person) => person?.name) : [];
  if (!rows.length) return '没有其他偶像';
  const shown = rows.slice(0, 3).map((person) => {
    const activity = String(person.activity || '').trim();
    return activity ? `${person.name} · ${activity}` : person.name;
  });
  if (rows.length > 3) shown.push(`还有 ${rows.length - 3} 人`);
  return shown.join('，');
}

export function sandboxPeopleHere(state = {}) {
  const locationId = state.currentLocationId || 'home_classroom';
  if (!knownPlace(locationId)) return [];
  if (isSandboxCampusLocation(locationId)) return sandboxIdolsHere(state);
  const rows = sandboxIdolsAt(state, locationId);
  if (idolVisible(state.idolOrder, locationId)) {
    rows.unshift({
      name: String(state.idolId || '藤田琴音'),
      locationId: knownPlace(locationId),
      activity: state.idolOrder?.mode === 'stay' ? '按约定留在这里' : '与制作人同行',
      activityId: 'with_producer',
      isProducedIdol: true,
    });
  }
  return rows;
}

export function sandboxIdolsHere(state = {}) {
  const here = state.currentLocationId || 'home_classroom';
  if (!isSandboxCampusLocation(here)) return [];
  const baseline = visitorsWithStoryGuide(state)
    .filter(row => row.locationId === canonicalPlace(here));
  const visitors = mergeSandboxCampusPresence(baseline, state)
    .filter((row) => row.name !== String(state.idolId || '藤田琴音'));
  if (idolVisible(state.idolOrder, here)) visitors.unshift({
    name: String(state.idolId || '藤田琴音'), locationId: canonicalPlace(here),
    activity: state.idolOrder?.mode === 'stay' ? '按约定留在这里' : '与制作人同行',
    activityId: 'with_producer', isProducedIdol: true,
  });
  return visitors;
}

export function buildSandboxPresencePrompt(state) {
  const locationId = state?.currentLocationId || 'home_classroom';
  if (!knownPlace(locationId)) return '';
  const people = sandboxPeopleHere(state);
  const others = people.filter((person) => !person.isProducedIdol);
  return [
    `【当前在场 · ${getSandboxLocation(locationId).label}】（前端已确认）`,
    people.length ? people.map(person => `- ${person.name}${person.isProducedIdol ? '（担当）' : ''}：${person.activity}。`).join('\n') : '目前没有偶像在场。',
    '只把上述名单视为现场人员；活动说明中提及的同伴不代表也在场。不要新增未列出的偶像到场，除非本轮明确输出了受限 scene_cast 标签；也不要把 Beat 的 left/center/right 当成地图位置。',
    others.length
      ? `名单里的其他偶像要用她自己的名字做 speaker，写出她本人的台词，并带上中文 display 和日语 tts。不要用旁白或 narrator 转述她们说的话。不必每个人都开口。`
      : '现在没有其他偶像。不要让名单以外的偶像开口。',
    '担当在场时用担当的名字写角色 Beat。担当不在时不要让担当出场或说话。',
    buildSandboxCastOverridePrompt(state),
  ].join('\n');
}

export function buildSandboxCastOverridePrompt(state = {}) {
  const cast = state.sceneCast && typeof state.sceneCast === 'object' ? state.sceneCast : {};
  const requests = Array.isArray(state.contactRequests) ? state.contactRequests.filter((item) => item.status === 'pending' || item.status === 'delayed') : [];
  const castLines = Object.entries(cast)
    .filter(([, entry]) => entry && entry.status !== 'absent')
    .map(([name, entry]) => `- ${name}：${entry.status}，地点 ${entry.locationId}，锚点 ${entry.anchor}，意愿 ${entry.intent || '未说明'}。`);
  const requestLines = requests.map((item) => `- 联络请求 ${item.id}：${item.idolId} 前往 ${item.destinationLocationId}，当前状态 ${item.status}。`);
  return [
    castLines.length ? `【剧情覆盖的行踪】\n${castLines.join('\n')}` : '',
    requestLines.length ? `【待处理联络请求】\n${requestLines.join('\n')}\n你可以在本轮剧情中让请求 accepted、delayed 或 rejected。` : '',
    '只有确实改变在场、地点、锚点或联络结果时，才在全部 beat 后另起一行输出一次 <scene_cast>{"cast":[...],"requests":[...]}</scene_cast>。id 使用已知偶像名，locationId 使用已知地点 ID，anchor 只能是 door、desk、window、center、left、right、back、front、bench、counter、stage、unknown；不要输出任意坐标。',
  ].filter(Boolean).join('\n');
}
