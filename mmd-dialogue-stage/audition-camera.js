// Match the installed UnityGLTF exporter's (-1, 1, 1) position basis.
// Cameras also invert their local look direction: Unity uses +Z, Three -Z.
function validateTrack(track) {
    if (track?.schemaVersion !== 1 || !Number.isFinite(track.duration) || track.duration <= 0
        || !Array.isArray(track.frames) || track.frames.length < 2) throw new Error('镜头轨道格式不完整');
    let previous = -Infinity;
    for (const frame of track.frames) {
        if (!Number.isFinite(frame.time) || frame.time < 0 || frame.time <= previous
            || frame.time > track.duration + 0.001
            || !Array.isArray(frame.position) || frame.position.length !== 3
            || !Array.isArray(frame.quaternion) || frame.quaternion.length !== 4
            || ![...frame.position, ...frame.quaternion, frame.fov].every(Number.isFinite)
            || Math.hypot(...frame.quaternion) < 0.001 || frame.fov <= 1 || frame.fov >= 179) {
            throw new Error('镜头轨道包含无效帧');
        }
        previous = frame.time;
    }
    if (track.frames[0].time !== 0 || Math.abs(previous - track.duration) > 0.001) {
        throw new Error('镜头轨道的时间范围不完整');
    }
}

export class AuditionCameraPlayer {
    constructor(camera, controls, { onCut = () => {} } = {}) {
        this.camera = camera;
        this.controls = controls;
        this.onCut = onCut;
        this.active = false;
    }

    start(track, anchor) {
        validateTrack(track);
        this.stop();
        const { camera, controls } = this;
        const damping = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        this.saved = {
            position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(),
            fov: camera.fov, near: camera.near, far: camera.far,
            target: controls.target.clone(), enabled: controls.enabled, damping,
        };
        this.track = track;
        this.anchor = anchor.clone();
        this.anchorRotation = camera.quaternion.clone().setFromRotationMatrix(anchor.clone().extractRotation(anchor));
        this.lastTime = -1;
        this.lastIndex = -1;
        this.active = true;
        controls.enabled = false;
        camera.near = Math.min(camera.near, 0.1);
        this.update(0);
    }

    update(time) {
        if (!this.active) return;
        const { track, camera } = this;
        time = Math.max(0, Math.min(track.duration, Number.isFinite(time) ? time : 0));
        let index = 0;
        while (index + 1 < track.frames.length && track.frames[index + 1].time <= time) index += 1;
        const first = track.frames[index];
        const next = track.frames[index + 1] || first;
        const ratio = next === first || next.cut ? 0 : (time - first.time) / (next.time - first.time);
        const cut = this.lastTime < 0 || time < this.lastTime
            || track.frames.slice(this.lastIndex + 1, index + 1).some(frame => frame.cut);
        const position = first.position.map((value, axis) => value + (next.position[axis] - value) * ratio);
        const rotation = camera.quaternion.clone().fromArray(first.quaternion).normalize()
            .slerp(camera.quaternion.clone().fromArray(next.quaternion).normalize(), ratio);
        camera.position.set(-position[0], position[1], position[2]).applyMatrix4(this.anchor);
        camera.quaternion.set(rotation.x, -rotation.y, -rotation.z, rotation.w)
            .multiply(camera.quaternion.clone().set(0, 1, 0, 0)).premultiply(this.anchorRotation).normalize();
        camera.fov = first.fov + (next.fov - first.fov) * ratio;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        this.lastTime = time;
        this.lastIndex = index;
        if (cut) this.onCut();
    }

    stop() {
        if (!this.active) return false;
        const { camera, controls, saved } = this;
        controls.enableDamping = false;
        controls.update();
        camera.position.copy(saved.position);
        camera.quaternion.copy(saved.quaternion);
        camera.up.copy(saved.up);
        camera.fov = saved.fov;
        camera.near = saved.near;
        camera.far = saved.far;
        controls.target.copy(saved.target);
        controls.enabled = saved.enabled;
        controls.enableDamping = saved.damping;
        camera.updateProjectionMatrix();
        this.active = false;
        this.track = null;
        this.onCut();
        return true;
    }
}
