import test from 'node:test';
import assert from 'node:assert/strict';
import { bloomLevels, bloomStrength, hdrLinearColor, linearColor, srgbToLinear } from '../gakumas-scene-core.js';
import { downscaleTextureSources } from '../portrait-texture-budget.js';

const near = (actual, expected, tolerance = 1e-4) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} vs ${expected}`);

// Constants read from the changing-room capture (2162x3840, VLBloom diffusion 6).
test('bloom levels and upsample radius match the captured frame', () => {
    const { iterations, sampleScale } = bloomLevels(2162, 3840, 6);
    assert.equal(iterations, 6); // 1081x1920 prefilter + 5 downsamples
    near(sampleScale, 1.406891);
});

test('bloom intensity and threshold arrive as the game uploads them', () => {
    near(bloomStrength(1), 0.071773, 1e-6);
    near(srgbToLinear(0.96), 0.911408, 2e-4);
});

test('HDR colours at or above 1 convert with pow 2.2, as in Unity', () => {
    near(srgbToLinear(1.2), 1.493478, 1e-5);
    near(srgbToLinear(1), 1);
    near(srgbToLinear(8), 8 ** 2.2);
});

test('downscaled textures keep raw alpha and colour bytes', async () => {
    let options = null;
    await downscaleTextureSources([{ isTexture: true, image: { width: 4096, height: 2048 } }], {
        maxDimension: 2048,
        createBitmap: async (_image, value) => { options = value; return { width: value.resizeWidth, height: value.resizeHeight }; },
    });
    assert.equal(options.premultiplyAlpha, 'none');
    assert.equal(options.colorSpaceConversion, 'none');
});

test('HDR material colours keep the picker intensity as a linear multiplier', () => {
    // Vocal room lamps: white x 2^3 and a warm colour x 73.35.
    hdrLinearColor([8, 8, 8]).forEach(v => near(v, 8));
    const warm = hdrLinearColor([73.35374, 57.544464, 38.40691]);
    near(warm[0], 73.35374, 1e-3);
    near(warm[1], srgbToLinear(57.544464 / 73.35374) * 73.35374, 1e-3);
    assert.deepEqual(hdrLinearColor([0.5, 0.25, 1]), linearColor([0.5, 0.25, 1]));
});
