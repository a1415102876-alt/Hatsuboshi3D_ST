const durations = { a: 6.4, b: 185 / 30, c: 7.5, d: 215 / 30 };
const presets = Object.freeze(Object.fromEntries(Object.entries(durations).map(([variant, duration]) => [variant, Object.freeze({
    variant,
    label: `试镜成功 ${variant.toUpperCase()}`,
    duration,
    id: `audition-success-${variant}`,
    bodyMotion: `mot-aud-chr-cmmn-cmmn-result-success-${variant}-001-in`,
    sourceClip: `mot_aud_cmmn-result-success-${variant}-001_in_c`,
    cameraUrl: `./camera-tracks/audition-success-${variant}.json`,
})])));

export function auditionSuccessPreset(variant = 'a') {
    if (typeof variant !== 'string' || !/^[abcd]$/.test(variant)) throw new Error('不支持的试镜成功版本');
    return presets[variant];
}

export function validateAuditionSuccessTrack(preset, track) {
    if (track?.schemaVersion !== 1 || track.id !== preset.id || track.bodyMotion !== preset.bodyMotion
        || track.sourceClip !== preset.sourceClip || !Number.isFinite(track.duration)
        || Math.abs(track.duration - preset.duration) > 0.001) {
        throw new Error('镜头轨道与试镜成功版本不匹配');
    }
    return track;
}

export function auditionSuccessScene(scenes, selectedId = '') {
    const ids = ['00', '01', '02', '03'].map(id => `prod-audition-${id}-00-noon`);
    const candidates = (Array.isArray(scenes) ? scenes : []).filter(entry => ids.includes(entry.id) && entry.auditionSuccessLayout);
    const selected = candidates.find(entry => entry.id === selectedId) || candidates.find(entry => entry.id === ids[0]);
    if (!selected) throw new Error('N.I.A 试镜场地未配置');
    return selected;
}
