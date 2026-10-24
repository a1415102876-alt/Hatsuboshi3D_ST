import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { buildNiaFanMilestonePrompt } from '../nia-fan-milestone-api.js';
import { parseBeatScript } from '../../mmd-dialogue-stage/beat-protocol.js';
import * as protocol from '../../mmd-dialogue-stage/beat-protocol.js';
import * as beatCore from '../../mmd-dialogue-stage/beat-player-core.js';
import { BEAT_BACKGROUND_NAMES } from '../../mmd-dialogue-stage/beat-backgrounds.js';

const root = new URL('../', import.meta.url);
const dataSource = await readFile(new URL('nia/episode-backgrounds.js', root), 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '';
  throw error;
});
if (dataSource) vm.runInThisContext(dataSource);
const backgrounds = globalThis.HatsuNiaEpisodeBackgrounds;
const routesContext = {};
vm.createContext(routesContext);
for (const file of ['registry', 'hanami-saki', 'fujita-kotone', 'hataya-misuzu', 'hanami-ume', 'shinosawa-hiro']) {
  vm.runInContext(await readFile(new URL('nia/routes/' + file + '.js', root), 'utf8'), routesContext);
}
const routes = routesContext.HatsuNiaRoutes.list();
const app = await readFile(new URL('app.js', root), 'utf8');
function loadFunctions(context, names) {
  vm.createContext(context);
  for (const name of names) {
    const start = app.indexOf('  function ' + name + '(');
    assert.ok(start >= 0, name + ' must exist');
    const tail = app.slice(start);
    const next = tail.slice(3).search(/^  (?:async )?function /m);
    vm.runInContext(next < 0 ? tail : tail.slice(0, next + 3), context);
  }
  return context;
}
const optional = ['niaEpisodeBeatBackgroundSelection'].filter(name => app.includes('  function ' + name + '('));
function shape(prompt) {
  return JSON.parse(prompt.match(/<NIA_FAN_MILESTONE_EVENT>\s*({[\s\S]*?})\s*<\/NIA_FAN_MILESTONE_EVENT>/)[1]);
}

test('official episode plans cover all 13 idols and every emitted background compiles in Beat', () => {
  assert.ok(backgrounds, 'the official NIA episode background data must be installed');
  const names = ['花海咲季','月村手毬','藤田琴音','姬崎莉波','有村麻央','仓本千奈','紫云清夏','葛城莉莉娅','筱泽广','花海佑芽','十王星南','秦谷美铃','雨夜燕'];
  let count = 0;
  for (const idolName of names) for (let episode = 11; episode <= 20; episode++) {
    const plan = backgrounds.get(idolName, episode);
    assert.ok(plan, idolName + ' ' + episode);
    assert.ok(plan.backgrounds.length);
    for (const background of plan.backgrounds) {
      const parsed = parseBeatScript('<beat speaker="producer" background="' + background + '"><display lang="zh">核对场景。</display></beat>', { backgrounds: BEAT_BACKGROUND_NAMES, backgroundCategory: 'bond', backgroundContext: 'bond' });
      assert.deepEqual(parsed.errors, [], idolName + ' ' + episode + ' ' + background);
      assert.ok(parsed.beats[0].background);
    }
    count++;
  }
  assert.equal(count, 130);
});

test('Misuzu episode 12 starts inside Gokugetsu before its corridor and episode 13 keeps the shared room at night', () => {
  const route = routes.find(route => route.idolName === '秦谷美铃');
  const prompt = buildNiaFanMilestonePrompt({ idolName: route.idolName, route, eventId: 'nia-misuzu-fans-5000' });
  assert.match(prompt, /BEAT_BACKGROUND_EVENT=bond/);
  assert.match(prompt, /BEAT_BACKGROUND_PLAN=nia-hmsz-12/);
  assert.match(shape(prompt).story, /background="other-gokugetsugakuen-room-00-noon"/);
  assert.match(prompt, /other-gokugetsugakuen-room-00-noon.*→.*other-gokugetsugakuen-corridor-00-noon/);
  assert.doesNotMatch(prompt, /school-pclassroom-00-noon|other-sky/);
  const next = buildNiaFanMilestonePrompt({ idolName: route.idolName, route, eventId: 'nia-misuzu-fans-10000' });
  assert.match(shape(next).story, /background="dormitory-ttmr-hmszroom-00-night"/);
  assert.doesNotMatch(next, /gokugetsugakuen/);
});

test('Kotone episode 14 uses Sena room rather than the old generic sample', () => {
  const route = routes.find(route => route.idolName === '藤田琴音');
  const prompt = buildNiaFanMilestonePrompt({ idolName: route.idolName, route, eventId: 'nia-kotone-round2-audition-eve' });
  assert.match(shape(prompt).story, /background="outschool-jsnahouse-jsnaroom-00-noon"/);
  assert.match(prompt, /BEAT_BACKGROUND_PLAN=nia-fktn-14/);
  assert.doesNotMatch(prompt, /school-pclassroom-00-noon/);
});

for (const route of routes) test(route.idolName + ' every milestone prompt carries only its current episode background plan', () => {
  for (const entry of route.episodes) {
    const prompt = buildNiaFanMilestonePrompt({ idolName: route.idolName, route, eventId: entry.eventId });
    assert.match(prompt, /BEAT_BACKGROUND_CONTEXT=bond/, entry.eventId);
    assert.ok(backgrounds, 'episode data must be present');
    const plan = backgrounds.get(route.idolName, entry.episode);
    assert.ok(shape(prompt).story.includes('background="' + plan.backgrounds[0] + '"'), entry.eventId);
    assert.equal((prompt.match(/^BEAT_BACKGROUND_PLAN=/gm) || []).length, 1);
    assert.match(prompt, /只有.*换场|换场.*才/);
    assert.ok(prompt.length < 11000, 'one episode must not inject the whole catalog');
  }
});

test('NIA opening sends episode 11 backgrounds instead of the affinity-zero meeting scene', () => {
  const route = routes.find(route => route.idolName === '秦谷美铃');
  const context = { state: { idol: route.idolName }, idols: {}, HatsuNiaEpisodeBackgrounds: backgrounds,
    getCurrentNiaRoute: () => route, buildProducerPromptSection: () => '', isKotoneBeatIdol: () => false,
    beatBondBackgroundSelection: () => ({ category: 'bond', planId: '0', fixedBackgrounds: ['school-tearoom-00-noon'] }),
    outputContract: (_length, selection) => JSON.stringify(selection) };
  loadFunctions(context, [...optional, 'buildNiaOpeningPrompt']);
  const prompt = context.buildNiaOpeningPrompt();
  assert.match(prompt, /school-pclassroom-00-noon/);
  assert.doesNotMatch(prompt, /school-tearoom-00-noon/);
});

test('restoring milestone playback recovers the same episode background scope from the saved event ID', () => {
  const route = routes.find(route => route.idolName === '秦谷美铃');
  const context = { state: { idol: route.idolName, lastPrompt: 'BEAT_BACKGROUND_CONTEXT=communication.general', pendingActionContext: { action: 'nia_fan_milestone', actionContext: { eventId: 'nia-misuzu-fans-10000' } } },
    HatsuNiaEpisodeBackgrounds: backgrounds, getCurrentNiaRoute: () => route };
  loadFunctions(context, [...optional, 'currentBeatBackgroundSelection', 'currentBeatBackgroundEventCategory']);
  const selected = context.currentBeatBackgroundSelection();
  assert.equal(selected.context, 'bond');
  assert.equal(selected.planId, 'nia-hmsz-13');
  assert.equal(selected.defaultBackground, 'dormitory-ttmr-hmszroom-00-night');
});

test('conditional scene alternatives remain alternatives rather than repeated sequential trips', () => {
  assert.ok(backgrounds, 'official episode data must be installed');
  const selection = backgrounds.select({ idolName: '月村手毬', episode: 13 });
  const prompt = backgrounds.prompt(selection);
  assert.match(prompt, /分支/);
  assert.match(prompt, /other-outstage-00-noon/);
  assert.doesNotMatch(prompt, /other-outstage-00-noon → school-pclassroom-00-noon → other-outstage/);
  assert.equal(backgrounds.select({ idolName: '秦谷美铃', eventId: 'nia-kotone-round2-audition-eve', route: routes.find(route => route.idolName === '藤田琴音') }), null);
});


test('the SillyTavern classic loader produces the same episode-specific prompt as the module entry', async () => {
  const bridge = await readFile(new URL('st.html', root), 'utf8');
  const api = await readFile(new URL('nia-fan-milestone-api.js', root), 'utf8');
  const start = bridge.indexOf('  function convertNiaBusinessModuleToClassic(');
  assert.ok(start >= 0);
  const tail = bridge.slice(start);
  const next = tail.slice(3).search(/^  (?:async )?function /m);
  const context = { HatsuBeatPlayerCore: beatCore, HatsuBeatProtocol: protocol };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(dataSource, context);
  vm.runInContext(tail.slice(0, next + 3), context);
  vm.runInContext('(function () {\n' + context.convertNiaBusinessModuleToClassic(api) + '\n})();', context);
  const route = routes.find(route => route.idolName === '秦谷美铃');
  const input = { idolName: route.idolName, route, eventId: 'nia-misuzu-fans-5000' };
  const prompt = context.HatsuNiaFanMilestoneApi.buildNiaFanMilestonePrompt(input);
  assert.equal(prompt, buildNiaFanMilestonePrompt(input));
  assert.match(shape(prompt).story, /background="other-gokugetsugakuen-room-00-noon"/);
});
