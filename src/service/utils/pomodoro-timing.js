import { randomUUID } from 'node:crypto';

export const PRESETS = ['25/5', '50/10', '37/5/37/5/37/20'];

export function parsePattern(pattern) {
  const parts = pattern.split('/');
  if (parts.length < 2 || parts.length > 12 || parts.length % 2 !== 0
    || !parts.every((part) => /^\d+$/.test(part) && +part >= 1 && +part <= 100)) {
    throw new Error('Use 2–12 alternating study/break durations, each 1–100 whole minutes (for example 25/5).');
  }
  return parts;
}

export function startStage(group, index, now) {
  Object.assign(group, {
    stageId: randomUUID(),
    stageIndex: index,
    stageStartedAt: now,
    stageEndsAt: now + Number(group.timeOption[index]) * 60000,
    announcementPending: true,
    awaitingResponse: false,
    respondedMembers: [],
  });
}

export function attendanceFor(group) {
  return group.members.map((userId) => {
    const joinedAt = group.joinedAt.get(userId) ?? group.stageEndsAt;
    const milliseconds = Math.max(0, group.stageEndsAt
      - Math.max(group.stageStartedAt, joinedAt));
    return {
      userId,
      milliseconds,
      completed: milliseconds === group.stageEndsAt - group.stageStartedAt,
      confirmed: false,
    };
  }).filter((row) => row.milliseconds > 0);
}
