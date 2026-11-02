// Placement records use exported glTF scene coordinates (metres, Unity X
// reflected), not Unity coordinates or the enlarged MMD stage units.
export const PLACEMENT_STORAGE_KEY = 'gakumas.stage.placements.v1';
const vec3 = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const rotateY = (point, angle) => {
    const [x, y, z] = point, c = Math.cos(angle), s = Math.sin(angle);
    return [x * c + z * s, y, -x * s + z * c];
};
const normalized = point => {
    const length = Math.hypot(...point);
    return length > 1e-9 ? point.map(value => value / length) : [0, 0, 1];
};

export function stagePointToScene(point, root) {
    return rotateY(point.map((value, i) => (value - root.position[i]) / root.scale), -root.rotationY);
}

export function scenePointToStage(point, root) {
    return rotateY(point, root.rotationY).map((value, i) => value * root.scale + root.position[i]);
}

export function buildPlacementRecord({ id, name, capturedAt, sceneId, sceneLibraryId, layoutId, idolId = '', modelName = '', motionId = '', root, actor, camera }) {
    if (!vec3(actor.positionMeters) || !Number.isFinite(actor.yawDegrees)) throw new Error('角色站位数值无效');
    if (!vec3(root.position) || !Number.isFinite(root.rotationY) || !Number.isFinite(root.scale) || root.scale <= 0) throw new Error('场景变换无效');
    const angle = actor.yawDegrees * Math.PI / 180;
    const forward = rotateY([Math.sin(angle), 0, Math.cos(angle)], -root.rotationY);
    const cameraPosition = stagePointToScene(camera.position, root);
    const cameraTarget = stagePointToScene(camera.target, root);
    const record = {
        format: 'gakumas-stage-placement', version: 1, id, name, capturedAt,
        sceneId, sceneLibraryId, layoutId, idolId, modelName, motionId,
        coordinateSystem: 'glTF; reflected Unity X; metres',
        actor: {
            position: stagePointToScene(actor.positionMeters.map(value => value * root.scale), root),
            forward, up: [0, 1, 0],
        },
        camera: {
            position: cameraPosition, target: cameraTarget,
            forward: normalized(cameraTarget.map((value, i) => value - cameraPosition[i])),
            up: rotateY(camera.up, -root.rotationY), fov: camera.fov,
            near: camera.near / root.scale, far: camera.far / root.scale, zoom: camera.zoom,
        },
        stage: { root: structuredClone(root), actor: structuredClone(actor), camera: structuredClone(camera) },
    };
    if (!isPlacementRecord(record)) throw new Error('机位记录不完整，请等待角色和场景载入完成');
    // Canonical JSON also normalizes negative zero in root transforms.
    return JSON.parse(JSON.stringify(record));
}

export function isPlacementRecord(record) {
    const camera = record?.stage?.camera, actor = record?.stage?.actor, root = record?.stage?.root;
    return record?.format === 'gakumas-stage-placement' && record.version === 1
        && ['id', 'name', 'sceneId', 'sceneLibraryId', 'layoutId'].every(key => typeof record[key] === 'string' && record[key].length > 0)
        && vec3(root?.position) && Number.isFinite(root.rotationY) && Number.isFinite(root.scale) && root.scale > 0
        && vec3(actor?.positionMeters) && Number.isFinite(actor.yawDegrees)
        && vec3(record.actor?.position) && vec3(record.actor?.forward) && Math.hypot(...record.actor.forward) > 1e-9
        && vec3(record.camera?.position) && vec3(record.camera?.target) && vec3(record.camera?.up)
        && vec3(camera?.position) && vec3(camera?.target) && vec3(camera?.up)
        && Number.isFinite(camera.fov) && camera.fov > 0 && camera.fov < 180
        && Number.isFinite(camera.near) && camera.near > 0 && Number.isFinite(camera.far) && camera.far > camera.near
        && Number.isFinite(camera.zoom) && camera.zoom > 0;
}

export function readPlacementRecords(storage) {
    const value = storage.getItem(PLACEMENT_STORAGE_KEY);
    if (!value) return [];
    const records = JSON.parse(value);
    if (!Array.isArray(records) || !records.every(isPlacementRecord)) throw new Error('本机机位记录格式损坏，未覆盖已有数据');
    return records;
}

export function savePlacementRecord(storage, record) {
    if (!isPlacementRecord(record)) throw new Error('机位记录格式无效');
    const records = readPlacementRecords(storage);
    // Every click creates a named snapshot; never replace an earlier snapshot.
    const next = [...records.filter(item => item.id !== record.id), record];
    storage.setItem(PLACEMENT_STORAGE_KEY, JSON.stringify(next));
    return next;
}
