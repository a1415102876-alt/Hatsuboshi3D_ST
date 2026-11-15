import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { colorBalanceToLMS, gradeColorReference, gtTonemap, liftGammaGain, sceneGrade } from '../gakumas-scene-core.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/changing-room-lut-samples.json', import.meta.url), 'utf8'));

test('reference grade matches the game LUT captured in the changing room', () => {
    const grade = sceneGrade({
        ColorAdjustments: { contrast: 5.5, saturation: 8 },
        VLTonemapping: { mode: 5, gtLinearSectionStart: 0.9, gtLinearSelectionLength: 0.5, gtContrast: 1, gtBlackBrightness: 1 },
    });
    assert.equal(grade.contrast, 1.055);
    assert.equal(grade.saturation, 1.08);
    let worst = 0;
    let total = 0;
    for (const { input, game } of fixture.samples) {
        const ours = gradeColorReference(input, { ...grade, exposure: 1 });
        const err = Math.max(...ours.map((v, i) => Math.abs(v - game[i])));
        worst = Math.max(worst, err);
        total += err;
    }
    // R11G11B10 storage rounds the game's values to ~1/64 near 1.
    assert.ok(total / fixture.samples.length < 0.01, `mean ${total / fixture.samples.length}`);
    assert.ok(worst < 0.05, `worst ${worst}`);
});

test('the GT shoulder starts at linearStart + linearLength, as in the game', () => {
    const tone = { linearStart: 0.9, linearLength: 0.5, contrast: 1, black: 1 };
    assert.ok(Math.abs(gtTonemap(1.2, tone) - 1.2) < 1e-9);
    assert.ok(gtTonemap(1.5, tone) < 1);
});

test('neutral volume components leave colour unchanged before tonemapping', () => {
    const grade = sceneGrade({});
    for (const input of [[0.18, 0.18, 0.18], [0.9, 0.2, 0.05], [2, 1, 0.5]]) {
        const out = gradeColorReference(input, grade);
        out.forEach((v, i) => assert.ok(Math.abs(v - input[i]) < 1e-3, `${input} -> ${out}`));
    }
});

test('URP conversions for lift/gamma/gain and white balance', () => {
    assert.deepEqual(liftGammaGain({}), { lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1] });
    const warmer = liftGammaGain({ gain: { x: 1.1, y: 1, z: 0.9, w: 0.2 } });
    assert.ok(warmer.gain[0] > warmer.gain[2]);
    colorBalanceToLMS(0, 0).forEach(v => assert.ok(Math.abs(v - 1) < 2e-3, String(v)));
    const warm = colorBalanceToLMS(30, 0);
    assert.ok(warm[0] > 1 && warm[2] < 1, String(warm)); // warmer: more long-wave, less short-wave
});
