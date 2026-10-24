import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
await import('../nia-tv-business-core.js');

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');

function functionBody(name, nextName) {
  const start = app.indexOf(`function ${name}(`);
  const end = app.indexOf(`function ${nextName}(`, start + 1);
  assert.notEqual(start, -1, `${name} should exist`);
  assert.notEqual(end, -1, `${nextName} should follow ${name}`);
  return app.slice(start, end);
}

function renderTvFixture(segmentCount = 2) {
  const nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,style:{},dataset:{},textContent:'',classes:new Set(),classList:{add(v){node(id).classes.add(v);},remove(v){node(id).classes.delete(v);}},replaceChildren(){this.children=[];}});return nodes.get(id);};
  const ctx={niaTvBusinessCore:globalThis.HatsuNiaTvBusiness,niaRadioBeatPlayer:null,niaRadioBeatPlayerLoad:null,niaTvBusinessSession:{context:{idol:'秦谷美铃',programName:'电视访谈'}},state:{idol:'秦谷美铃'},niaRadioEl:node,ensureNiaRadioOverlayRoot:()=>node('overlay'),appendNiaRadioHistory(){},document:{querySelector:node}};
  vm.runInNewContext(functionBody('renderNiaTvBusiness','playNiaTvSegment'),ctx);
  ctx.renderNiaTvBusiness({schemaVersion:segmentCount===2?2:1,segmentCount,status:'playing_1',segmentIndex:1,segments:[{}],playedLines:[]});
  return node;
}

test('TV mode retains its programme layout and hides old standees for the 3D stage',()=>{
  const node=renderTvFixture();
  assert.equal(node('#niaRadioOverlay .nia-radio-stage').classes.has('nia-tv-mode'),true);
  for(const id of ['niaRadioHostStandee','niaRadioAdditionalGuestStandee','niaRadioGuestStandee'])assert.equal(node(id).hidden,true);
  assert.equal(node('niaRadioEpisodeTitle').textContent,'电视访谈');
  assert.equal(node('#niaRadioOverlay .nia-radio-stage-sign').textContent,'HATSUBOSHI TV STUDIO');
  assert.equal(node('niaRadioResultConfirmBtn').textContent,'确认电视节目结果');
  assert.equal(node('niaRadioSegmentLabel').textContent,'01 / 02');
  assert.equal(renderTvFixture(4)('niaRadioSegmentLabel').textContent,'01 / 04');
});

test('TV stage can display its Beat canvas instead of suppressing it with a TV-only rule',()=>{
  assert.doesNotMatch(css,/\.nia-radio-stage\.nia-tv-mode \.nia-radio-beat-stage[^}]*display:none/);
});

test('TV mode uses its dedicated studio background asset', () => {
  assert.equal(fs.existsSync(new URL('../assets/scenes/TV_Studio.png', import.meta.url)), true);
  assert.match(css, /\.nia-radio-stage\.nia-tv-mode\{[^}]*TV_Studio\.png/);
});

test('radio mode restores its host, stage branding, and guest layout', () => {
  const body = functionBody('renderNiaRadioBusiness', 'stopNiaRadioPlayback');

  assert.match(body, /stage\.classList\.remove\("nia-tv-mode"\)/);
  assert.match(body, /host\.hidden = false/);
  assert.match(body, /stageSign\.textContent = "HATSUBOSHI RADIO CLUB"/);
  assert.match(body, /brand\.textContent = "初星放送部"/);
  assert.match(body, /guest\.style\.left = ""/);
  assert.match(body, /confirm\.textContent = "确认广播结果"/);
  assert.doesNotMatch(body, /确认电视节目结果/);
});
