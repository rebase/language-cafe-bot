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
    creditStartedAt: now,
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
      - Math.max(group.stageStartedAt, group.creditStartedAt ?? group.stageStartedAt, joinedAt));
    return {
      userId,
      milliseconds,
      completed: milliseconds === group.stageEndsAt - group.stageStartedAt,
      confirmed: false,
    };
  }).filter((row) => row.milliseconds > 0);
}

// Catch up without creating attendance receipts for stages elapsed offline.
export function recoverTiming(group, now) {
  const durations = group.timeOption.map((value) => Number(value) * 60000);
  const cycle = durations.reduce((sum, value) => sum + value, 0);
  let index = group.stageIndex;
  let startedAt = group.stageStartedAt;
  let completed = group.completedRounds || 0;
  let round = group.studyRound || 1;
  const cycles = Math.floor(Math.max(0, now - startedAt) / cycle);
  startedAt += cycles * cycle;
  completed += cycles * (durations.length / 2);
  round += cycles * (durations.length / 2);
  while (startedAt + durations[index] <= now) {
    if (index % 2 === 0) completed += 1;
    startedAt += durations[index];
    index = (index + 1) % durations.length;
    if (index % 2 === 0) round += 1;
  }
  if (startedAt !== group.stageStartedAt) startStage(group, index, startedAt);
  Object.assign(group, {
    completedRounds: completed,
    studyRound: round,
    // Conservatively count only time after recovery, and only after confirmation.
    creditStartedAt: now,
    announcementPending: true,
  });
}
