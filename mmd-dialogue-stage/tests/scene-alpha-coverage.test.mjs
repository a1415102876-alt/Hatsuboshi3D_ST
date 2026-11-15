import test from 'node:test';
import assert from 'node:assert/strict';
import { usesAlphaCoverage } from '../gakumas-scene-core.js';

// Material data as exported for env_3d_adv_rooftop-00-00-noon.
const fence = { keywords: ['_ALPHATEST_ON'], floats: { _Cutoff: 0, _DstBlend: 0 }, alphaTest: 0, hasMap: true }; // m_shared_ground_00_std55
const plant = { keywords: ['_ALPHATEST_ON'], floats: { _Cutoff: 0.5, _DstBlend: 0 }, alphaTest: 0.5, hasMap: true }; // m_plant_common_00_vgt00_nowind
const deck = { keywords: [], floats: { _Cutoff: 0, _DstBlend: 0 }, alphaTest: 0, hasMap: true }; // m_rooftop_00_00_std02

test('alpha-tested materials with a zero cutoff are drawn with alpha coverage', () => {
    assert.equal(usesAlphaCoverage(fence), true);
});

test('normal cut-outs, opaque and blended materials keep their existing path', () => {
    assert.equal(usesAlphaCoverage(plant), false);
    assert.equal(usesAlphaCoverage(deck), false);
    assert.equal(usesAlphaCoverage({ ...fence, blended: true }), false);
    assert.equal(usesAlphaCoverage({ ...fence, hasMap: false }), false);
});
