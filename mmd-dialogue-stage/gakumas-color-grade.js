// Shared scene grading for direct rendering and the HDR post composite.
// Mirrors gradeColorReference() in gakumas-scene-core.js, which follows the
// game's LutBuilderHdr step for step and is tested against a captured LUT.
import { Matrix3, Vector3, Vector4 } from './vendor/three/build/three.module.js';

export const GRADE_GLSL = `
uniform float gkDeferGrade;
uniform float gkExposure;
uniform float gkContrast;
uniform float gkSaturation;
uniform vec3 gkColorFilter;
uniform vec4 gkTone;
uniform float gkToneEnabled;
uniform vec3 gkShadows;
uniform vec3 gkMidtones;
uniform vec3 gkHighlights;
uniform vec4 gkSmhLimits;
// 1 when white balance, split toning, channel mixer, lift/gamma/gain or hue
// shift differ from neutral; skips that work for the common case.
uniform float gkGradeExtras;
uniform vec3 gkWhiteBalance;
uniform vec4 gkSplitShadows;
uniform vec3 gkSplitHighlights;
uniform mat3 gkChannelMixer;
uniform vec3 gkLift;
uniform vec3 gkGammaInv;
uniform vec3 gkGain;
uniform float gkHueShift;

const mat3 GK_LIN_TO_LMS = mat3(0.390405, 0.070842, 0.023108, 0.549941, 0.963172, 0.128021, 0.008926, 0.001358, 0.936245);
const mat3 GK_LMS_TO_LIN = mat3(2.85847, -0.210182, -0.041812, -1.62879, 1.1582, -0.118169, -0.024891, 0.000324, 1.06867);
const vec3 GK_LUMA = vec3(0.212673, 0.715152, 0.072175);

vec3 gkLinearToLogC(vec3 x) {
    vec3 hi = 0.244161 * (log(5.555556 * x + 0.047996) / log(10.0)) + 0.386036;
    vec3 lo = 5.301883 * x + 0.092819;
    return mix(lo, hi, step(vec3(0.011361), x));
}

vec3 gkLogCToLinear(vec3 x) {
    vec3 hi = (pow(vec3(10.0), (x - 0.386036) / 0.244161) - 0.047996) / 5.555556;
    vec3 lo = (x - 0.092819) / 5.301883;
    return mix(lo, hi, step(vec3(5.301883 * 0.011361 + 0.092819), x));
}

// The game's GT: the shoulder starts at linearStart + linearLength.
vec3 gkUchimura(vec3 x, float a, float m, float l, float c) {
    float P = 1.0;
    float l0 = ((P - m) * l) / a;
    float S0 = m + l0;
    float S1 = m + a * l0;
    float C2 = (a * P) / (P - S1);
    float CP = -C2 / P;
    vec3 w0 = 1.0 - smoothstep(0.0, m, x);
    vec3 w2 = step(m + l, x);
    vec3 w1 = 1.0 - w0 - w2;
    vec3 T = m * pow(max(x, vec3(0.0)) / m, vec3(c));
    vec3 S = P - (P - S1) * exp(CP * (x - S0));
    vec3 L = m + a * (x - m);
    return T * w0 + L * w1 + S * w2;
}

vec3 gkSoftLight(vec3 c, vec3 s) {
    vec3 lo = 2.0 * c * s + c * c * (1.0 - 2.0 * s);
    vec3 hi = sqrt(c) * (2.0 * s - 1.0) + 2.0 * c * (1.0 - s);
    return mix(lo, hi, step(vec3(0.5), s));
}

vec3 gkRgbToHsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-4;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 gkHsvToRgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

vec3 gkGradeColor(vec3 color) {
    color *= gkExposure;
    if (gkGradeExtras > 0.5) color = GK_LMS_TO_LIN * ((GK_LIN_TO_LMS * color) * gkWhiteBalance);
    vec3 logc = gkLinearToLogC(max(color, vec3(0.0)));
    color = gkLogCToLinear((logc - ${0.4135884}) * gkContrast + ${0.4135884});
    color = max(color * gkColorFilter, vec3(0.0));
    if (gkGradeExtras > 0.5) {
        color = pow(color, vec3(1.0 / 2.2));
        float balance = clamp(dot(min(color, vec3(1.0)), GK_LUMA) + gkSplitShadows.w, 0.0, 1.0);
        color = gkSoftLight(color, (gkSplitShadows.rgb - 0.5) * (1.0 - balance) + 0.5);
        color = gkSoftLight(color, (gkSplitHighlights - 0.5) * balance + 0.5);
        color = pow(abs(color), vec3(2.2));
        color = gkChannelMixer * color;
    }
    float luma = dot(color, GK_LUMA);
    float shadowsFactor = 1.0 - smoothstep(gkSmhLimits.x, gkSmhLimits.y, luma);
    float highlightsFactor = smoothstep(gkSmhLimits.z, gkSmhLimits.w, luma);
    color *= gkShadows * shadowsFactor + gkMidtones * (1.0 - shadowsFactor - highlightsFactor) + gkHighlights * highlightsFactor;
    if (gkGradeExtras > 0.5) {
        vec3 lifted = color * gkGain + gkLift;
        color = sign(lifted) * pow(abs(lifted), gkGammaInv);
        if (abs(gkHueShift) > 0.0) {
            vec3 hsv = gkRgbToHsv(color);
            hsv.x = fract(hsv.x + gkHueShift + 1.0);
            color = gkHsvToRgb(hsv);
        }
    }
    luma = dot(color, GK_LUMA);
    color = max(vec3(luma) + (color - vec3(luma)) * gkSaturation, vec3(0.0));
    if (gkToneEnabled > 0.5) color = gkUchimura(color, gkTone.z, gkTone.x, gkTone.y, gkTone.w);
    return color;
}
vec3 gkGrade(vec3 color) {
    return gkDeferGrade > 0.5 ? color : gkGradeColor(color);
}
`;

/** Uniforms read by GRADE_GLSL (everything except gkDeferGrade). */
export function gradeUniforms() {
    return {
        gkExposure: { value: 1 },
        gkContrast: { value: 1 },
        gkSaturation: { value: 1 },
        gkColorFilter: { value: new Vector3(1, 1, 1) },
        gkTone: { value: new Vector4(0.22, 0.4, 1, 1.33) },
        gkToneEnabled: { value: 0 },
        gkShadows: { value: new Vector3(1, 1, 1) },
        gkMidtones: { value: new Vector3(1, 1, 1) },
        gkHighlights: { value: new Vector3(1, 1, 1) },
        gkSmhLimits: { value: new Vector4(0, 0.3, 0.55, 1) },
        gkGradeExtras: { value: 0 },
        gkWhiteBalance: { value: new Vector3(1, 1, 1) },
        gkSplitShadows: { value: new Vector4(0.5, 0.5, 0.5, 0) },
        gkSplitHighlights: { value: new Vector3(0.5, 0.5, 0.5) },
        gkChannelMixer: { value: new Matrix3() },
        gkLift: { value: new Vector3(0, 0, 0) },
        gkGammaInv: { value: new Vector3(1, 1, 1) },
        gkGain: { value: new Vector3(1, 1, 1) },
        gkHueShift: { value: 0 },
    };
}

const near = (a, b) => Math.abs(a - b) < 1e-4;
const allNear = (values, target) => values.every((v, i) => near(v, Array.isArray(target) ? target[i] : target));

/** True when the components beyond contrast/saturation/SMH are all neutral. */
export function gradeExtrasNeutral(grade) {
    const mixer = grade.channelMixer || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    return allNear(grade.whiteBalance || [1, 1, 1], 1)
        && allNear((grade.splitShadows || [0.5, 0.5, 0.5]).slice(0, 3), 0.5)
        && allNear(grade.splitHighlights || [0.5, 0.5, 0.5], 0.5)
        && allNear(mixer.flat(), [1, 0, 0, 0, 1, 0, 0, 0, 1])
        && allNear(grade.lift || [0, 0, 0], 0)
        && allNear(grade.gammaInv || [1, 1, 1], 1)
        && allNear(grade.gain || [1, 1, 1], 1)
        && near(grade.hueShift || 0, 0);
}

/** Copy a sceneGrade() result into uniforms made by gradeUniforms(). */
export function applyGradeUniforms(uniforms, grade) {
    uniforms.gkExposure.value = grade.exposure;
    uniforms.gkContrast.value = grade.contrast;
    uniforms.gkSaturation.value = grade.saturation;
    uniforms.gkColorFilter.value.fromArray(grade.colorFilter);
    uniforms.gkTone.value.set(grade.tone.linearStart, grade.tone.linearLength, grade.tone.contrast, grade.tone.black);
    uniforms.gkToneEnabled.value = grade.tone.enabled ? 1 : 0;
    uniforms.gkShadows.value.fromArray(grade.shadows);
    uniforms.gkMidtones.value.fromArray(grade.midtones);
    uniforms.gkHighlights.value.fromArray(grade.highlights);
    uniforms.gkSmhLimits.value.fromArray(grade.smhLimits);
    uniforms.gkGradeExtras.value = gradeExtrasNeutral(grade) ? 0 : 1;
    uniforms.gkWhiteBalance.value.fromArray(grade.whiteBalance || [1, 1, 1]);
    uniforms.gkSplitShadows.value.fromArray(grade.splitShadows || [0.5, 0.5, 0.5, 0]);
    uniforms.gkSplitHighlights.value.fromArray(grade.splitHighlights || [0.5, 0.5, 0.5]);
    const m = grade.channelMixer || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    // Matrix3.set takes row-major; GLSL mat3 * vec3 then gives row · colour.
    uniforms.gkChannelMixer.value.set(...m[0], ...m[1], ...m[2]);
    uniforms.gkLift.value.fromArray(grade.lift || [0, 0, 0]);
    uniforms.gkGammaInv.value.fromArray(grade.gammaInv || [1, 1, 1]);
    uniforms.gkGain.value.fromArray(grade.gain || [1, 1, 1]);
    uniforms.gkHueShift.value = grade.hueShift || 0;
}
