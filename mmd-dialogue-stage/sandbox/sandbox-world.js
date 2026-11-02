import { resolveBeatBackgroundAsset } from '../beat-background-assets.js?v=20261007-beat-scenes-v1';

/**
 * Stable sandbox map locations. The background values are existing Beat aliases
 * so the same 2D/3D resolver is used by every action and by idle playback.
 */
export const SANDBOX_LOCATIONS = Object.freeze([
  Object.freeze({ id: 'home_classroom', label: '制作人科教室', shortLabel: '主页', background: '3d-adv-classroom-00-00', shot: 'medium', description: '返回担当偶像所在的主页教室。', actionKinds: ['lesson', 'training', 'chat', 'rest', 'explore'] }),
  Object.freeze({ id: 'hall_exterior', label: '大堂', shortLabel: '大堂', background: '3d-adv-hallexterior-00-00-noon', shot: 'medium', description: '在大堂外与担当偶像会面，准备校内活动。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'club_building', label: '部室栋', shortLabel: '部室栋', background: '3d-adv-councilroom-00-00-noon', shot: 'medium', description: '确认社团活动、处理委托与校内事务。', actionKinds: ['commission', 'explore', 'chat'] }),
  Object.freeze({ id: 'gymnasium', label: '体育馆', shortLabel: '体育馆', background: 'env_2d_adv_school-sportshall-00-noon.png', shot: 'medium', description: '进行体育训练，或在馆内舞台附近交流。', actionKinds: ['lesson', 'training', 'chat', 'explore'] }),
  Object.freeze({ id: 'courtyard', label: '庭院', shortLabel: '庭院', background: '3d-adv-courtyard-00-00-noon', shot: 'medium', description: '在庭院散步、集合或课后交流。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'inner_garden', label: '中庭', shortLabel: '中庭', background: '3d-adv-schoolgarden-00-00', shot: 'medium', description: '中庭就是校园花园，在绿地里散步或休息。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'school_ground', label: '运动场', shortLabel: '运动场', background: 'school-ground-00', shot: 'medium', description: '到西侧运动场活动。', actionKinds: ['training', 'explore', 'chat'] }),
  Object.freeze({ id: 'dance_room', label: '舞蹈练习室', shortLabel: '舞蹈', background: '3d-adv-danceroom-00-00', shot: 'medium', description: '在特殊教室的舞蹈练习室排练。', actionKinds: ['training', 'chat'] }),
  Object.freeze({ id: 'vocal_room', label: '声乐练习室', shortLabel: '声乐', background: '3d-adv-vocalroom-00-00', shot: 'medium', description: '在特殊教室的声乐练习室练声。', actionKinds: ['lesson', 'training', 'chat'] }),
  Object.freeze({ id: 'broadcast_room', label: '广播室', shortLabel: '广播', background: 'school-recordingstudio-00', shot: 'medium', description: '在特殊教室的广播室录音、口播。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'school_entrance_hall', label: '学园入口大厅', shortLabel: '入口', background: 'school-entrance-00', shot: 'medium', description: '从特殊教室进入学园入口大厅。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'idol_classroom', label: '偶像科教室', shortLabel: '偶像科', background: 'school-classroom-00', shot: 'medium', description: '偶像科的学园教室。', actionKinds: ['lesson', 'chat', 'explore'] }),
  Object.freeze({ id: 'idol_corridor', label: '走廊', shortLabel: '走廊', background: '3d-adv-corridor-00-00', shot: 'medium', description: '偶像科校舍的走廊。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'idol_rooftop', label: '天台', shortLabel: '天台', background: '3d-adv-rooftop-00-00', shot: 'medium', description: '偶像科校舍的天台。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'student_council', label: '学生会室', shortLabel: '学生会', background: '学生会室（午）', shot: 'medium', description: '处理校内事务、确认活动和委托安排。', actionKinds: ['commission', 'chat'] }),
  Object.freeze({ id: 'toschool', label: '上学路', shortLabel: '上学路', background: '3d-adv-toschool-00-00', shot: 'medium', description: '从学园正门走上通学的坡道。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'dorm_terrace', label: '宿舍', shortLabel: '宿舍', background: '3d-adv-dormterrace-00-00', shot: 'medium', description: '回到宿舍露台。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'outing_street', label: '校外街道', shortLabel: '街道', background: '校外街道', shot: 'medium', description: '走到校外的市区街道。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_shopping_street', label: '商店街', shortLabel: '商店街', background: '拱廊商店街', shot: 'medium', description: '在拱廊商店街闲逛。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_mall', label: '购物中心', shortLabel: '商场', background: '商场入口', shot: 'medium', description: '从商场入口进去看看。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_themepark', label: '游乐园', shortLabel: '游乐园', background: '游乐园入口', shot: 'medium', description: '来到游乐园门口。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_sea', label: '海边', shortLabel: '海边', background: 'other-sea-00', shot: 'medium', description: '到海边走走。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'outing_restaurant', label: '餐厅', shortLabel: '餐厅', background: 'other-restaurant-00', shot: 'medium', description: '在餐厅坐下来吃饭。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'outing_cafe', label: '咖啡馆', shortLabel: '咖啡', background: '校外咖啡店', shot: 'medium', description: '在咖啡馆慢慢坐一会儿。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'outing_sweets', label: '甜品店', shortLabel: '甜品', background: '蛋糕店', shot: 'medium', description: '去蛋糕店看看甜点。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'outing_burger', label: '快餐店', shortLabel: '快餐', background: '汉堡店', shot: 'medium', description: '到汉堡店吃点东西。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_maid', label: '女仆咖啡厅', shortLabel: '女仆', background: '女仆咖啡店', shot: 'medium', description: '进女仆咖啡店坐一坐。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_convenience', label: '便利店', shortLabel: '便利店', background: '便利店', shot: 'medium', description: '顺路进便利店。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_anime', label: '动漫店', shortLabel: '动漫', background: 'other-animate-in-00', shot: 'medium', description: '到动漫店里看看。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_arcade', label: '游戏厅', shortLabel: '游戏厅', background: 'outschool-gamecenter-in-00', shot: 'medium', description: '进游戏厅玩一会儿。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_karaoke', label: '卡拉OK', shortLabel: '卡拉OK', background: 'outschool-karaoke-in-00', shot: 'medium', description: '到卡拉OK包厢里。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_park', label: '公园', shortLabel: '公园', background: '校外公园', shot: 'medium', description: '在校外公园散步。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'outing_radio', label: '地方电台', shortLabel: '电台', background: 'other-livehouse-00', shot: 'medium', description: '到小型演出场地做访谈和口播。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_tv', label: '电视台', shortLabel: '电视台', background: 'hall-inside-hall-00', shot: 'medium', description: '进入室内会场准备录制。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_event_hall', label: '活动会场', shortLabel: '会场', background: 'hall-outstage-00', shot: 'medium', description: '来到活动会场的户外舞台。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_festival', label: '音乐节会场', shortLabel: '音乐节', background: 'other-summerstage-00', shot: 'medium', description: '来到户外音乐节舞台。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_studio', label: '摄影棚', shortLabel: '摄影棚', background: 'school-recordingstudio-00', shot: 'medium', description: '进入室内棚做拍摄和录音。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_flagship', label: '服装店', shortLabel: '服装店', background: 'other-fashion-city-00', shot: 'medium', description: '到商场里的服装店看看。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_aquarium', label: '水族馆', shortLabel: '水族馆', background: '水族馆', shot: 'medium', description: '在水族馆里慢慢看。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_sports', label: '体育中心', shortLabel: '体育', background: 'outschool-sports-facilities-00', shot: 'medium', description: '到校外体育中心活动。', actionKinds: ['explore', 'chat', 'training'] }),
  Object.freeze({ id: 'outing_kcna_home', label: '仓本家', shortLabel: '仓本家', background: 'outschool-kcnahouse-out-00', shot: 'medium', description: '来到仓本家门口。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_hotspring', label: '初星温泉', shortLabel: '温泉', background: '3d-adv-hotspring-00-00', shot: 'medium', description: '仓本家敷地里的初星温泉。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'outing_river', label: '河原', shortLabel: '河原', background: '3d-adv-riverbed-00-00', shot: 'medium', description: '沿着河原走走。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'outing_station', label: '天川站', shortLabel: '天川站', background: 'outschool-station-00', shot: 'medium', description: '来到天川站。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_residential', label: '住宅街', shortLabel: '住宅街', background: 'outschool-residential-area-00', shot: 'medium', description: '走进安静的住宅街。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_producer_home', label: '制作人的家', shortLabel: '制作人家', background: 'outschool-proom-00', shot: 'medium', description: '回到制作人的房间。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'outing_busstop', label: '学园前', shortLabel: '学园前', background: 'school-busstop-01', shot: 'medium', description: '在初星学园前的公交站等车。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_cinema', label: '电影院', shortLabel: '电影院', background: 'outschool-mall-cinema-00', shot: 'medium', description: '到商场里的电影院。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_themepark_in', label: '园内', shortLabel: '园内', background: 'outschool-themepark-in-00', shot: 'medium', description: '走进游乐园里面。', actionKinds: ['explore', 'chat'] }),
  Object.freeze({ id: 'outing_themepark_rest', label: '园内休息区', shortLabel: '休息区', background: 'outschool-themepark-picnicarea-00', shot: 'medium', description: '到游乐园的休息区坐一会儿。', actionKinds: ['explore', 'chat', 'rest'] }),
  Object.freeze({ id: 'outing_themepark_stage', label: '园内舞台', shortLabel: '园内舞台', background: 'outschool-themepark-outstage-00', shot: 'medium', description: '来到游乐园里的舞台。', actionKinds: ['explore', 'chat'] }),
]);

export const FRONT_GATE_MENU = Object.freeze({
  title: '学园正门',
  prompt: '要前往正门，还是从这里外出？',
  choices: Object.freeze([
    Object.freeze({ id: 'gate', label: '前往正门', locationId: 'toschool' }),
    Object.freeze({ id: 'outing', label: '外出', menu: 'outing' }),
  ]),
});

export const OUTING_MENU = Object.freeze({
  title: '外出',
  prompt: '选择要去的地方。',
  choices: Object.freeze([
    ['dorm', '宿舍', 'dorm_terrace'],
    ['street', '校外街道', 'outing_street'],
    ['shopping_street', '商店街', 'outing_shopping_street'],
    ['mall', '购物中心', 'outing_mall'],
    ['themepark', '游乐园', 'outing_themepark'],
    ['sea', '海边', 'outing_sea'],
    ['restaurant', '餐厅', 'outing_restaurant'],
    ['cafe', '咖啡馆', 'outing_cafe'],
    ['sweets', '甜品店', 'outing_sweets'],
    ['burger', '快餐店', 'outing_burger'],
    ['maid', '女仆咖啡厅', 'outing_maid'],
    ['convenience', '便利店', 'outing_convenience'],
    ['anime', '动漫店', 'outing_anime'],
    ['arcade', '游戏厅', 'outing_arcade'],
    ['karaoke', '卡拉OK', 'outing_karaoke'],
    ['park', '公园', 'outing_park'],
    ['radio', '地方电台', 'outing_radio'],
    ['tv', '电视台', 'outing_tv'],
    ['event_hall', '活动会场', 'outing_event_hall'],
    ['festival', '音乐节会场', 'outing_festival'],
    ['studio', '摄影棚', 'outing_studio'],
    ['flagship', '服装店', 'outing_flagship'],
    ['aquarium', '水族馆', 'outing_aquarium'],
    ['sports', '体育中心', 'outing_sports'],
    ['kcna_home', '仓本家', 'outing_kcna_home'],
    ['hotspring', '初星温泉', 'outing_hotspring'],
    ['river', '河原', 'outing_river'],
    ['station', '天川站', 'outing_station'],
    ['residential', '住宅街', 'outing_residential'],
    ['producer_home', '制作人的家', 'outing_producer_home'],
    ['busstop', '学园前', 'outing_busstop'],
  ].map(([id, label, locationId]) => Object.freeze({ id, label, locationId }))),
});

function freezeArea(area) {
  const places = area.places.map((place) => Object.freeze({ ...place }));
  return Object.freeze({
    ...area,
    places: Object.freeze(places),
    memberIds: Object.freeze(area.memberIds || places.map((place) => place.locationId)),
  });
}

export const LOCATION_AREAS = Object.freeze([
  freezeArea({
    id: 'mall',
    label: '商场',
    button: '店内',
    prompt: '从商场前往里面的店铺。',
    places: [
      { id: 'entrance', locationId: 'outing_mall', label: '商场入口' },
      { id: 'karaoke', locationId: 'outing_karaoke' },
      { id: 'clothes', locationId: 'outing_flagship' },
      { id: 'convenience', locationId: 'outing_convenience' },
      { id: 'anime', locationId: 'outing_anime' },
      { id: 'arcade', locationId: 'outing_arcade' },
      { id: 'sweets', locationId: 'outing_sweets' },
      { id: 'burger', locationId: 'outing_burger' },
      { id: 'maid', locationId: 'outing_maid' },
      { id: 'cinema', locationId: 'outing_cinema' },
    ],
  }),
  freezeArea({
    id: 'shopping_street',
    label: '拱廊商店街',
    button: '店铺',
    prompt: '从商店街前往沿街的店。',
    places: [
      { id: 'street', locationId: 'outing_shopping_street', label: '商店街' },
      { id: 'cafe', locationId: 'outing_cafe' },
      { id: 'restaurant', locationId: 'outing_restaurant' },
    ],
  }),
  freezeArea({
    id: 'themepark',
    label: '游乐园',
    button: '园内',
    prompt: '从游乐园门口前往园内。',
    places: [
      { id: 'gate', locationId: 'outing_themepark', label: '游乐园门口' },
      { id: 'inside', locationId: 'outing_themepark_in' },
      { id: 'rest', locationId: 'outing_themepark_rest' },
      { id: 'stage', locationId: 'outing_themepark_stage' },
    ],
  }),
  freezeArea({
    id: 'campus',
    label: '初星学园',
    button: '校内',
    prompt: '',
    openMap: 'campus',
    memberIds: [
      'home_classroom', 'hall_exterior', 'club_building', 'gymnasium', 'courtyard',
      'inner_garden', 'school_ground', 'student_council', 'toschool',
    ],
    places: [],
  }),
  freezeArea({
    id: 'special_classroom',
    label: '特殊教室',
    button: '场景',
    prompt: '选择特殊教室里的场景。',
    campus: true,
    memberIds: ['school_entrance_hall', 'dance_room', 'vocal_room', 'broadcast_room'],
    places: [
      { id: 'hall', locationId: 'school_entrance_hall', label: '学园入口大厅' },
      { id: 'dance', locationId: 'dance_room', label: '舞蹈练习室' },
      { id: 'vocal', locationId: 'vocal_room', label: '声乐练习室' },
      { id: 'broadcast', locationId: 'broadcast_room', label: '广播室' },
    ],
  }),
  freezeArea({
    id: 'idol_class',
    label: '偶像科教室',
    button: '场景',
    prompt: '选择偶像科教室里的场景。',
    campus: true,
    memberIds: ['idol_classroom', 'idol_corridor', 'idol_rooftop'],
    places: [
      { id: 'classroom', locationId: 'idol_classroom', label: '学园教室' },
      { id: 'corridor', locationId: 'idol_corridor', label: '走廊' },
      { id: 'rooftop', locationId: 'idol_rooftop', label: '天台' },
    ],
  }),
]);

const LOCATION_MAP = new Map(SANDBOX_LOCATIONS.map((location) => [location.id, location]));

export function canonicalSandboxLocationId(id) {
  const key = String(id || '').trim();
  return key === 'school_garden' ? 'inner_garden' : key;
}

export function getSandboxLocation(id) {
  return LOCATION_MAP.get(canonicalSandboxLocationId(id)) || LOCATION_MAP.get('home_classroom');
}

const BACKGROUND_TIME = /-(morning|noon|evening|night|other)$/iu;

function backgroundFamily(value) {
  const asset = resolveBeatBackgroundAsset(value);
  return asset.matched && asset.family ? asset.family : '';
}

function backgroundAtTime(base, time) {
  const asset = resolveBeatBackgroundAsset(`${base}-${time}`);
  return asset.matched && asset.time === time ? asset.name : '';
}

/** Noon from 12:00, evening from 19:00. Morning uses a morning plate when one exists. */
export function sandboxLocationBackground(locationOrId, minutes = 8 * 60) {
  const location = typeof locationOrId === 'string' || !locationOrId
    ? getSandboxLocation(locationOrId)
    : locationOrId;
  const base = String(location.background || '').trim().replace(/\.png$/iu, '').replace(BACKGROUND_TIME, '');
  const clock = Math.max(0, Number(minutes) || 0);
  const slot = clock >= 19 * 60 ? 'evening' : clock >= 12 * 60 ? 'noon' : 'morning';
  const preferred = slot === 'evening' ? ['evening', 'night'] : slot === 'morning' ? ['morning', 'noon'] : ['noon'];
  for (const time of preferred) {
    const name = backgroundAtTime(base, time);
    if (name) return name;
  }
  const fallback = resolveBeatBackgroundAsset(`${base}-${slot === 'morning' ? 'noon' : slot}`);
  return fallback.matched ? fallback.name : location.background;
}

// Move retired scene ids forward, then match the plate to the clock.
// A background from another place is left untouched.
export function migrateSandboxLocationBackground(state) {
  if (!state || typeof state !== 'object') return state;
  if (state.currentLocationId === 'school_corridor') {
    const location = getSandboxLocation('toschool');
    return syncSandboxLocationBackground({ ...state, currentLocationId: location.id, currentBackground: location.background });
  }
  if (state.currentLocationId === 'school_garden') {
    const location = getSandboxLocation('inner_garden');
    return syncSandboxLocationBackground({ ...state, currentLocationId: location.id, currentBackground: location.background });
  }
  return syncSandboxLocationBackground(state);
}

export function syncSandboxLocationBackground(state) {
  if (!state || typeof state !== 'object') return state;
  const id = String(state.currentLocationId || '').trim();
  const location = getSandboxLocation(id);
  if (!id || location.id !== id) return state;
  let background = String(state.currentBackground || '');
  if (location.id === 'home_classroom' && /home_classroom|家·教室/u.test(background)) background = location.background;
  if (location.id === 'dance_room' && /lesson[-_]danceroom/u.test(background)) background = location.background;
  if (location.id === 'inner_garden' && /courtyard-bench/u.test(background)) background = location.background;
  const currentFamily = backgroundFamily(background);
  const locationFamily = backgroundFamily(location.background);
  const aligned = !background || (currentFamily && currentFamily === locationFamily);
  const nextBackground = aligned ? sandboxLocationBackground(location, state.time?.clockMinutes) : background;
  if (nextBackground === state.currentBackground) return state;
  return { ...state, currentBackground: nextBackground };
}

export function listSandboxLocations() {
  return SANDBOX_LOCATIONS.map((location) => ({ ...location, actionKinds: [...location.actionKinds] }));
}

export function resolveSandboxLocation(id, fallback = 'home_classroom') {
  return LOCATION_MAP.get(canonicalSandboxLocationId(id)) || LOCATION_MAP.get(fallback) || LOCATION_MAP.get('home_classroom');
}

export function locationAreaFor(locationId) {
  const id = canonicalSandboxLocationId(locationId);
  if (!LOCATION_MAP.has(id)) return null;
  return LOCATION_AREAS.find((area) => area.memberIds.includes(id)) || null;
}

export function locationAreaPlaces(area) {
  if (!area) return [];
  return area.places.map((place) => {
    const location = getSandboxLocation(place.locationId);
    return Object.freeze({
      id: place.id,
      locationId: location.id,
      label: place.label || location.label,
    });
  });
}

export function canLocationHostAction(locationId, kind) {
  const location = getSandboxLocation(locationId);
  return location.actionKinds.includes(String(kind || '').trim());
}

export function sandboxLocationCameraOptions() {
  return null;
}

/** Dialogue follows the beat script for shot, position and camera. */
export function sandboxCameraLocked() {
  return false;
}
