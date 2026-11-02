// User-marked outer perimeter only. It does not certify furniture or camera
// paths inside it as clear, and the placement editor does not clamp movement.
const COUNCILROOM = {
    sceneFamily: 'env_3d_adv_councilroom-00-00',
    label: '学生会室四角外框',
    groundY: 0,
    points: [
        [-2.2588948526367276, 0, -6.162462644269919],
        [6.3376719520833, 0, -5.992053806512856],
        [6.575203154712509, 0, 4.295248022819154],
        [-1.6980952283817308, 0, 4.4534689578757725],
    ],
    sourceRecordIds: [
        '2eceaa11-cb0c-42cf-8514-7b84ed3a1ec6',
        '16d38495-2baf-40ad-b14b-063c41e4dc23',
        'eef94c31-c305-426e-9d73-ce807c3d4b7a',
        '2c1a3008-f187-4bf3-adef-ff922c3a2f00',
    ],
};

export function stageActivityBoundary(sceneId) {
    return /^env_3d_adv_councilroom-00-00-(noon|evening|night)$/.test(String(sceneId || ''))
        ? structuredClone(COUNCILROOM) : null;
}

export function boundaryArea(points) {
    return Math.abs(points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[2] - q[0] * p[2];
    }, 0)) / 2;
}

export function insideBoundaryXZ(points, [x, , z]) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[j], b = points[i];
        const cross = (x - a[0]) * (b[2] - a[2]) - (z - a[2]) * (b[0] - a[0]);
        if (Math.abs(cross) < 1e-8 && x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0])
            && z >= Math.min(a[2], b[2]) && z <= Math.max(a[2], b[2])) return true;
        if ((a[2] > z) !== (b[2] > z) && x < (b[0] - a[0]) * (z - a[2]) / (b[2] - a[2]) + a[0]) inside = !inside;
    }
    return inside;
}
