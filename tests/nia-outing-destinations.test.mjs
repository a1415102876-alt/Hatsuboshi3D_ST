import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { parseExpressionAt } from 'acorn';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const coreSource = await readFile(new URL('../nia-round-transition-core.js', import.meta.url), 'utf8');
const coreScope = {};
vm.runInNewContext(coreSource, coreScope);
const core = coreScope.HatsuNiaRoundTransition;
function constant(name) {
    const start = app.indexOf('const ' + name + ' = ') + ('const ' + name + ' = ').length;
    assert.ok(start >= name.length, name);
    return 'const ' + name + ' = ' + app.slice(start, parseExpressionAt(app, start, { ecmaVersion: 'latest' }).end) + ';';
}
function fn(name) {
    const start = app.indexOf('function ' + name + '(');
    assert.notEqual(start, -1, name);
    return app.slice(start, parseExpressionAt(app, start, { ecmaVersion: 'latest' }).end);
}
function fixture(niaActive = true) {
    const nodes = new Map(), entries = [], toasts = [];
    function element(id) {
        if (!nodes.has(id)) nodes.set(id, { value: '', hidden: false, innerHTML: '', children: [], dataset: {}, handlers: {},
            querySelectorAll: () => [], addEventListener(type, handler) { this.handlers[type] = handler; },
            appendChild(child) { this.children.push(child); } });
        return nodes.get(id);
    }
    const scope = { niaRoundTransitionCore: core, isNiaInterRoundOutingActive: () => niaActive, isFreeModeActive: () => true,
        escapePhoneText: value => String(value), setElementHidden: (id, hidden) => { element(id).hidden = hidden; },
        document: { getElementById: element, querySelector: element, createElement: () => element('button-' + nodes.size) },
        state: { nia: { interRoundOuting: core.beginDestinationSelection(core.prepareInterRoundOuting({})) }, freeMode: {} },
        normalizeNiaState: value => value, ensureFreeModeTimeDefaults() {}, saveState() {},
        openFreeModeOutingScene: (id, mode) => { entries.push({ type: 'venue', id, mode }); },
        startFreeModeOuting: (id, mode) => { entries.push({ type: 'explore', id, mode }); },
        showToast: (...args) => toasts.push(args) };
    vm.createContext(scope);
    vm.runInContext(['outingDestinations', 'FREE_MODE_OUTING_DESTINATIONS', 'OFF_CAMPUS_TRANSIT_STATIONS', 'FREE_MODE_OUTING_VENUES'].map(constant).join('\n') + '\nglobalThis.destinations = FREE_MODE_OUTING_DESTINATIONS; globalThis.stations = OFF_CAMPUS_TRANSIT_STATIONS;', scope);
    for (const name of ['offCampusStationByDestination', 'renderOffCampusTransitMap', 'openFreeModeOutingOverlay', 'getFreeModeOutingVenueByDestination', 'startNiaInterRoundOutingAtDestination']) vm.runInContext(fn(name), scope);
    scope.confirmFreeModeOutingDestination = name => scope.startNiaInterRoundOutingAtDestination(name);
    return { scope, element, entries, toasts };
}

test('every regular preset can start, reload and finish an NIA outing without resetting its clock', () => {
    const { scope } = fixture();
    const destinations = Array.from(scope.destinations, item => item.name);
    assert.equal(destinations.length, 24);
    for (const destination of destinations) {
        const first = core.startInterRoundOuting(core.prepareInterRoundOuting({}), { destination: '商店街' }).runtime;
        const advanced = core.advanceInterRoundClock(first, 45).runtime;
        const next = core.startInterRoundOuting(advanced, { destination });
        assert.equal(next.ok, true, destination);
        const reloaded = core.normalizeInterRoundOuting(JSON.parse(JSON.stringify(next.runtime)));
        assert.equal(reloaded.destination, destination);
        assert.equal(reloaded.clockMinutes, 645);
        const ending = core.beginInterRoundCompletion(reloaded, 'finish').runtime;
        const completed = core.completeInterRoundOuting(ending, { requestId: 'finish', summary: destination + '外出完成' });
        assert.equal(completed.completed, true, destination);
        assert.equal(completed.applySettlement, true);
        assert.equal(core.completeInterRoundOuting(completed.runtime, { requestId: 'finish' }).applySettlement, false);
    }
    assert.equal(core.startInterRoundOuting(core.prepareInterRoundOuting({}), { destination: '不存在的地点' }).ok, false);
});

test('NIA and regular outing show the same preset list and clicking each preset enters its current location', () => {
    const nia = fixture(), regular = fixture(false);
    nia.scope.openFreeModeOutingOverlay(); regular.scope.openFreeModeOutingOverlay();
    const list = nia.element('freeModeOutingDestinationList').children, regularList = regular.element('freeModeOutingDestinationList').children;
    assert.deepEqual(list.map(button => button.innerHTML), regularList.map(button => button.innerHTML));
    assert.equal(list.length, 24);
    for (let index = 0; index < list.length; index++) {
        const destination = nia.scope.destinations[index].name;
        list[index].handlers.click();
        assert.equal(nia.scope.state.nia.interRoundOuting.destination, destination);
        assert.equal(nia.entries.at(-1).mode, 'with_idol');
        assert.equal(nia.entries.at(-1).type, nia.scope.getFreeModeOutingVenueByDestination(destination) ? 'venue' : 'explore');
    }
    assert.equal(nia.element('#freeModeOutingOverlay .outing-custom-field').hidden, true);
    assert.equal(regular.element('#freeModeOutingOverlay .outing-custom-field').hidden, false);
});

test('NIA uses the regular transit stations and preserves the locked home marker', () => {
    const nia = fixture(), regular = fixture(false);
    nia.scope.renderOffCampusTransitMap(); regular.scope.renderOffCampusTransitMap();
    const niaMap = nia.element('offCampusTransitMap').innerHTML, regularMap = regular.element('offCampusTransitMap').innerHTML;
    assert.equal(niaMap, regularMap);
    for (const id of ['sports_center', 'local_radio', 'tv_station', 'event_hall', 'photo_studio', 'brand_store', 'music_festival', 'china_home']) assert.ok(niaMap.includes('data-off-campus-station="' + id + '"'), id);
    assert.match(niaMap, /is-locked[\s\S]*?data-off-campus-station="saki_home"/);
});
