import { Quaternion, Vector3 } from "../../examples/15-embodied-sim/vendor/three.module.js";

export const cornSlotPose = {
  start: [0.161, 0.53, -0.056],
  goal: [0.35, 0.50, -0.048],
  half: [0.052, 0.023, 0.0255],
};

export function setupCornSlot(spec, { tableHeightCm, rimHeightCm, slotWidthCm }, { liftExtraCm, rotationTicks, gripperGapMm }) {
  const tableTop = tableHeightCm / 100;
  const rimHeight = rimHeightCm / 100;
  const slotHalfWidth = slotWidthCm / 200;
  const goal = [...cornSlotPose.goal];
  goal[1] = tableTop;
  const start = cornSlotPose.start.slice();
  start[1] += tableTop - 0.50;
  const prop = spec.scene.props[0];
  prop.shape = { kind: "cuboid", half: cornSlotPose.half };
  prop.placement = { fixed: start };
  const table = spec.scene.fixtures.find(({ name }) => name === "table");
  table.half[1] = tableTop / 2;
  table.center[1] = tableTop / 2;

  const fixture = (name, center, half) => ({ name, center, half, friction: 0.9 });
  const rim = fixture("basket-rim", [0.26, tableTop + rimHeight / 2, -0.04], [0.008, rimHeight / 2, 0.131]);
  spec.scene.fixtures.push(
    rim,
    fixture("basket-side-near", [0.165, rim.center[1], 0.084], [0.095, rim.half[1], 0.007]),
    fixture("basket-side-far", [0.165, rim.center[1], -0.164], [0.095, rim.half[1], 0.007]),
    fixture("basket-back", [0.076, rim.center[1], -0.04], [0.007, rim.half[1], 0.131]),
  );
  const railHalf = 0.006;
  const slotHalfLength = 0.083;
  const railHeight = tableTop + railHalf;
  for (const side of [-1, 1]) {
    spec.scene.fixtures.push(
      fixture("slot-rail", [goal[0] + side * (slotHalfWidth + railHalf), railHeight, goal[2]],
        [railHalf, railHalf, slotHalfLength + railHalf]),
      fixture("slot-end", [goal[0], railHeight, goal[2] + side * (slotHalfLength + railHalf)],
        [slotHalfWidth, railHalf, railHalf]),
    );
  }

  spec.task.params.goal = { fixed: goal };
  spec.task.params.terminate_on_success = false;
  spec.max_steps = 1200;
  spec.robot.gripper.gap_closed = gripperGapMm / 1000;
  const transportY = tableTop + rimHeight + liftExtraCm / 100 + 0.055;
  const place = [goal[0], tableTop + cornSlotPose.half[1] + 0.037, goal[2]];
  const hover = (object) => [object[0], object[1] + 0.12, object[2]];
  const grasp = (object) => [object[0], object[1] + 0.006, object[2]];
  const lift = (height) => (object) => [object[0], height, object[2]];
  const aboveSlot = () => [goal[0], transportY, goal[2]];
  const stage = (name, ticks, grip, target, { pin = false, turn = 0, turnFrom = turn } = {}) =>
    ({ name, ticks, grip, target, pin, turn, turnFrom });
  const phases = [
    stage("approach", 90, 0, hover),
    stage("approach", 80, 0, grasp),
    stage("grasp", 80, 1, grasp, { pin: true }),
    stage("lift", 45, 1, lift(tableTop + 0.062), { pin: true }),
    stage("lift", 45, 1, lift(tableTop + 0.093), { pin: true }),
    stage("lift", 70, 1, lift(transportY), { pin: true }),
    stage("cross", 185, 1, (_object, _goal, progress) => [
      start[0] + (goal[0] - start[0]) * progress,
      transportY,
      start[2] + (goal[2] - start[2]) * progress,
    ]),
    stage("turn", rotationTicks, 1, aboveSlot, { turn: 1, turnFrom: 0 }),
    stage("turn", 35, 1, aboveSlot, { turn: 1 }),
    stage("lower", 55, 1, () => [goal[0], tableTop + 0.083, goal[2]], { turn: 1 }),
    stage("lower", 70, 1, () => place, { turn: 1 }),
    stage("release", 60, 0, () => place, { turn: 1 }),
    stage("settle", 45, 0, () => [goal[0], tableTop + 0.085, goal[2]], { turn: 1 }),
    stage("settle", 105, 0, aboveSlot, { turn: 1 }),
  ];
  let startTick = 0;
  for (const phase of phases) {
    phase.startTick = startTick;
    const target = phase.target;
    phase.target = (object, goal, step) => {
      const progress = (step - phase.startTick) / (phase.ticks - 1);
      return target(object, goal, progress * progress * (3 - 2 * progress));
    };
    startTick += phase.ticks;
  }
  return { phases, steps: startTick, rim, goal, tableTop, slotHalfWidth, slotHalfLength };
}

export function gapForPhase(phases, index, step) {
  const phase = phases[index];
  const elapsed = step - phase.startTick;
  const turn = phase.turnFrom + (phase.turn - phase.turnFrom) * elapsed / phase.ticks;
  const yaw = Math.PI / 2 * turn;
  return [Math.sin(yaw), 0, Math.cos(yaw)];
}

const cornerOffsets = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) =>
  new Vector3(...[x, y, z].map((sign, i) => sign * cornSlotPose.half[i])))));

function cornPose(prop) {
  const orientation = new Quaternion(...prop.rot);
  const center = new Vector3(...prop.pos);
  const corners = cornerOffsets.map((corner) => corner.clone().applyQuaternion(orientation).add(center));
  const min = ["x", "y", "z"].map((axis) => Math.min(...corners.map((v) => v[axis])));
  const max = ["x", "y", "z"].map((axis) => Math.max(...corners.map((v) => v[axis])));
  const tip = new Vector3(1, 0, 0).applyQuaternion(orientation);
  return { center, min, max, tip };
}

export function observeCornSlot(task) {
  let crossed = false;
  let held = false;
  let releasedInSlot = false;
  let minClearance = Infinity;
  const restWindow = [];
  const rimTop = task.rim.center[1] + task.rim.half[1];
  const rimNear = task.rim.center[0] - task.rim.half[0];
  const rimFar = task.rim.center[0] + task.rim.half[0];
  const fits = ({ min, max }) =>
    min[0] >= task.goal[0] - task.slotHalfWidth && max[0] <= task.goal[0] + task.slotHalfWidth &&
    min[2] >= task.goal[2] - task.slotHalfLength && max[2] <= task.goal[2] + task.slotHalfLength;
  const angle = (p) => Math.acos(Math.max(-1, Math.min(1, -p.tip.z))) * 180 / Math.PI;
  return {
    sample(poses, stage) {
      const p = cornPose(poses.props[0]);
      held ||= poses.holding && stage === "lift" && p.min[1] > task.tableTop + 0.01;
      if (!crossed) {
        const overRim = p.min[0] <= rimFar && p.max[0] >= rimNear &&
          p.min[2] >= task.rim.center[2] - task.rim.half[2] &&
          p.max[2] <= task.rim.center[2] + task.rim.half[2];
        if (overRim) minClearance = Math.min(minClearance, p.min[1] - rimTop);
        crossed = p.min[0] > rimFar && Number.isFinite(minClearance);
      }
      releasedInSlot ||= stage === "release" && !poses.holding && fits(p) && angle(p) <= 12;
      restWindow.push({ ...p, holding: poses.holding });
      if (restWindow.length > 30) restWindow.shift();
    },
    result() {
      const final = restWindow.at(-1);
      const stable = restWindow.length === 30 && restWindow.every((frame) =>
        !frame.holding && fits(frame) && Math.abs(frame.min[1] - task.tableTop) < 0.004 &&
        frame.center.distanceTo(final.center) < 0.002 && frame.tip.angleTo(final.tip) < 0.04);
      return {
        grasped: held,
        clearedRim: crossed && minClearance > 0,
        rimClearanceCm: minClearance === Infinity ? null : Number((minClearance * 100).toFixed(1)),
        tipLeft: angle(final) <= 12,
        tipErrorDegrees: Number(angle(final).toFixed(1)),
        releasedInSlot,
        stableInSlot: stable,
      };
    },
  };
}
