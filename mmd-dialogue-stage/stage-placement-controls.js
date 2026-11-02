import * as THREE from 'three';
import { buildPlacementRecord, readPlacementRecords, savePlacementRecord } from './stage-placement.js?v=20261026-placement-v2';
import { createPlacementGizmo } from './stage-placement-gizmo.js?v=20261026-placement-gizmo-v1';
import { stageActivityBoundary, boundaryArea, insideBoundaryXZ } from './stage-activity-boundaries.js?v=20261026-placement-gizmo-v1';

export function createStagePlacementControls({ scene, stage, camera, canvas, orbit, scale, getActorInfo, selectScene, refreshScene, beforeEdit, onChange, frameActor, notify }) {
    const root = document.getElementById('stagePlacement');
    const $ = id => document.getElementById(id);
    const actorRoot = new THREE.Group();
    actorRoot.name = 'manual-actor-placement';
    scene.add(actorRoot);
    let actorPose = { positionMeters: [0, 0, 0], yawDegrees: 0 };
    let model = null, busy = false, records = [], storageError = '';
    const inputs = ['placementX', 'placementY', 'placementZ'].map($);
    const status = (message, error = false) => {
        $('placementStatus').textContent = message;
        $('placementStatus').classList.toggle('is-error', error);
    };
    const ready = () => Boolean(model?.parent === actorRoot && stage.loaded && !busy);
    const selected = () => records.find(record => record.id === $('placementRecords').value);
    let boundaryKey = '';
    const gizmo = createPlacementGizmo({
        camera, canvas, orbit, actorRoot, beforeEdit,
        onChange: () => {
            applyPose({ positionMeters: actorRoot.position.toArray().map(value => value / scale), yawDegrees: actorPose.yawDegrees });
        },
        onDragEnd: () => status('拖动结束，站位已更新；可继续记录或导出。'),
    });

    function refresh() {
        gizmo.setEnabled(ready() && $('placementGizmo').checked);
        for (const node of root.querySelectorAll('[data-placement-edit]')) node.disabled = !ready();
        for (const id of ['placementApply', 'placementCopy', 'placementExport']) $(id).disabled = !selected() || busy;
        $('placementApply').disabled = !model || !selected() || busy;
        $('placementRecords').disabled = !records.length || busy;
        if (ready() && stage.transform) {
            const coordinates = capture('当前站位').actor.position;
            $('placementCoordinates').textContent = `地图坐标（米）：${coordinates.map(n => n.toFixed(3)).join(' / ')}`;
            const boundary = stageActivityBoundary(stage.sidecar.scene);
            const key = JSON.stringify([stage.sidecar.scene, stage.transform]);
            if (key !== boundaryKey) { gizmo.setBoundary(boundary, stage.transform); boundaryKey = key; }
            $('placementBoundary').textContent = boundary
                ? `${boundary.label}：${boundaryArea(boundary.points).toFixed(1)} 平方米，当前站位在框${insideBoundaryXZ(boundary.points, coordinates) ? '内' : '外'}。黄色外框仅限定房间边界，桌椅仍需单独标注。`
                : '红 X、绿 Y（升降）、蓝 Z；拖动平面方块可同时移动两个方向。';
        } else $('placementCoordinates').textContent = busy ? '正在恢复记录…' : '先载入偶像和 3D 场景。';
    }

    function applyPose(pose, syncInputs = true) {
        actorPose = structuredClone(pose);
        actorRoot.position.fromArray(actorPose.positionMeters.map(value => value * scale));
        actorRoot.rotation.set(0, actorPose.yawDegrees * Math.PI / 180, 0);
        actorRoot.updateMatrixWorld(true);
        if (syncInputs) {
            inputs.forEach((input, i) => { input.value = Number(actorPose.positionMeters[i].toFixed(4)); });
            $('placementYaw').value = Number(actorPose.yawDegrees.toFixed(2));
        }
        onChange();
        refresh();
    }

    function capture(name) {
        const info = getActorInfo();
        return buildPlacementRecord({
            id: crypto.randomUUID(), name, capturedAt: new Date().toISOString(),
            sceneId: stage.sidecar.scene, sceneLibraryId: info.sceneLibraryId, layoutId: stage.layoutId,
            idolId: info.idolId, modelName: info.modelName, motionId: info.motionId,
            root: stage.transform, actor: actorPose,
            camera: { position: camera.position.toArray(), target: orbit.target.toArray(), up: camera.up.toArray(), fov: camera.fov, near: camera.near, far: camera.far, zoom: camera.zoom },
        });
    }

    function renderRecords(selectedId = '') {
        $('placementRecords').replaceChildren(...(records.length
            ? [...records].reverse().map(record => new Option(`${record.name} · ${new Date(record.capturedAt).toLocaleTimeString()}`, record.id))
            : [new Option('尚未记录机位', '')]));
        if (selectedId) $('placementRecords').value = selectedId;
        const record = selected();
        $('placementOutput').value = record ? JSON.stringify(record, null, 2) : '';
        refresh();
    }

    function updatePoseFromInputs(commit = false) {
        if (!ready()) return;
        const values = [...inputs, $('placementYaw')].map(node => node.value.trim() === '' ? NaN : Number(node.value));
        if (values.some(n => !Number.isFinite(n) || Math.abs(n) > 10000)) {
            if (commit) { status('请输入有效坐标。', true); applyPose(actorPose); }
            return;
        }
        beforeEdit();
        applyPose({ positionMeters: values.slice(0, 3), yawDegrees: values[3] }, commit);
        status('站位已更新；摄像机保持不动。');
    }
    $('placementGizmo').addEventListener('change', () => {
        refresh();
        status($('placementGizmo').checked ? '已显示脚下三轴箭头。看不到时可点“查看全身”；拖动箭头时镜头保持不动，Esc 取消本次拖动。' : '已隐藏三轴箭头。');
    });
    $('placementFrame').addEventListener('click', () => {
        if (!ready()) return;
        gizmo.cancel(); beforeEdit(); frameActor();
        status('已切到全身视角，可拖动脚下箭头调整站位。');
    });
    for (const input of [...inputs, $('placementYaw')]) {
        input.addEventListener('input', () => updatePoseFromInputs());
        input.addEventListener('change', () => updatePoseFromInputs(true));
    }
    root.querySelectorAll('[data-placement-nudge]').forEach(button => button.addEventListener('click', () => {
        if (!ready()) return;
        beforeEdit();
        const pose = structuredClone(actorPose), axis = Number(button.dataset.placementNudge);
        pose.positionMeters[axis] += Number(button.dataset.direction) * Number($('placementStep').value);
        applyPose(pose);
        status('站位已更新；摄像机保持不动。');
    }));
    $('placementReset').addEventListener('click', () => {
        beforeEdit(); reset(); status('已恢复所选布局的默认站位；摄像机保持不动。');
    });
    $('placementRecord').addEventListener('click', () => {
        if (!ready()) return;
        try {
            const name = $('placementName').value.trim() || `${getActorInfo().sceneLabel} · ${records.length + 1}`;
            const record = capture(name);
            // Show a copy even if storage is unavailable so it can be exported.
            $('placementOutput').value = JSON.stringify(record, null, 2);
            if (storageError) throw new Error(storageError);
            records = savePlacementRecord(localStorage, record);
            renderRecords(record.id);
            status(`已记录「${name}」，保存在当前浏览器。`);
            notify('机位与角色站位已记录');
        } catch (error) { status(`保存失败：${error.message}。可从下方文本框复制本次参数。`, true); }
    });
    $('placementRecords').addEventListener('change', () => {
        $('placementOutput').value = JSON.stringify(selected(), null, 2); refresh();
    });
    $('placementCopy').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText($('placementOutput').value); status('记录 JSON 已复制，可以直接发给我。'); }
        catch { $('placementOutput').focus(); $('placementOutput').select(); status('请复制已选中的记录文本。'); }
    });
    $('placementExport').addEventListener('click', () => {
        const record = selected(); if (!record) return;
        const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url; link.download = `${record.sceneId}-${record.id.slice(0, 8)}.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status('已导出所选记录 JSON。');
    });
    $('placementApply').addEventListener('click', async () => {
        const record = selected(); if (!record || !model || busy) return;
        beforeEdit(); busy = true; refresh();
        try {
            if (stage.sidecar?.scene !== record.sceneId) await selectScene(record.sceneLibraryId);
            if (stage.sidecar?.scene !== record.sceneId) throw new Error('记录对应场景未能载入');
            if (!stage.applyLayout(record.layoutId)) throw new Error('记录对应布局不存在');
            const savedRoot = record.stage.root;
            if (Math.abs(stage.transform.scale - savedRoot.scale) > 1e-6 || Math.abs(stage.transform.rotationY - savedRoot.rotationY) > 1e-6
                || stage.transform.position.some((n, i) => Math.abs(n - savedRoot.position[i]) > 1e-5)) throw new Error('场景默认布局已改变，请重新校准此记录');
            applyPose(record.stage.actor);
            const wasDamped = orbit.enableDamping;
            orbit.enableDamping = false; orbit.update();
            const saved = record.stage.camera;
            camera.position.fromArray(saved.position); camera.up.fromArray(saved.up);
            camera.fov = saved.fov; camera.near = saved.near; camera.far = saved.far; camera.zoom = saved.zoom;
            camera.updateProjectionMatrix(); orbit.target.fromArray(saved.target);
            orbit.maxDistance = Math.max(orbit.maxDistance, camera.position.distanceTo(orbit.target) * 1.5);
            orbit.update(); orbit.enableDamping = wasDamped;
            refreshScene(); onChange();
            status(`已恢复「${record.name}」的机位与站位（使用当前偶像）。`);
        } catch (error) { status(`恢复失败：${error.message}`, true); }
        finally { busy = false; refresh(); }
    });

    function reset() { gizmo.cancel(); applyPose({ positionMeters: [0, 0, 0], yawDegrees: 0 }); }
    try { records = readPlacementRecords(localStorage); }
    catch (error) { storageError = error.message; status(`无法读取本机记录：${storageError}`, true); }
    renderRecords();
    return {
        reset, refresh,
        attachModel(next) { model = next; actorRoot.add(next); reset(); },
        renderOverlay(renderer) { gizmo.setEnabled(ready() && $('placementGizmo').checked); gizmo.render(renderer); },
    };
}
