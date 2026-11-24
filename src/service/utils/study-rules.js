import { randomUUID } from 'node:crypto';

export const DAY = 86_400_000;
export const utcDay = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
export const midnight = (day) => Date.parse(`${day}T00:00:00.000Z`);
export function weekOf(day) {
  const date = new Date(midnight(day));
  return utcDay(date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY);
}
export function assertEditable(day, structural, now = Date.now()) {
  const start = midnight(day);
  const limit = start + DAY + (structural ? 0 : DAY / 2);
  if (!Number.isFinite(start) || now < start || now >= limit) {
    throw new Error(structural ? 'That day’s plan is closed to structural changes.' : 'That day is locked.');
  }
}
export const studied = (activity) => activity.tasks.length
  ? activity.tasks.some((task) => task.state === 'done') : activity.state === 'done';
export function totals(plans) {
  const activities = new Map();
  let tasks = 0;
  const studyDays = new Set();
  for (const plan of plans) {
    const seen = new Set();
    for (const activity of plan.activities) {
      if (!activities.has(activity.id)) {
        activities.set(activity.id, {
          id: activity.id, name: activity.name, icon: activity.icon, days: 0, tasks: 0,
        });
      }
      const entry = activities.get(activity.id);
      const complete = activity.tasks.filter((task) => task.state === 'done').length;
      tasks += complete;
      entry.tasks += complete;
      if (studied(activity)) {
        studyDays.add(plan.day);
        if (!seen.has(activity.id)) entry.days += 1;
        seen.add(activity.id);
      }
    }
  }
  return { tasks, days: studyDays.size, activities: [...activities.values()] };
}
export function goalProgress(goal, plans, day = utcDay()) {
  const week = weekOf(day);
  const result = totals(plans.filter((plan) => weekOf(plan.day) === week));
  const activity = result.activities.find((item) => item.id === goal.activityId);
  if (goal.type === 'consistency') return result.days;
  return goal.type === 'tasks' ? activity?.tasks || 0 : activity?.days || 0;
}
export function validateGoal(goal) {
  if (!['frequency', 'tasks', 'consistency'].includes(goal.type)) throw new Error('Choose a valid goal type.');
  if (!Number.isSafeInteger(goal.target) || goal.target < 1 || (goal.type !== 'tasks' && goal.target > 7)) {
    throw new Error('Use a positive whole-number target; day targets must be 1–7.');
  }
  if (goal.type !== 'consistency' && !goal.activityId) throw new Error('Choose an Activity.');
}
export function freshActivities(activities) {
  return activities.map((activity) => ({ ...structuredClone(activity),
    state: 'unchecked',
    tasks: activity.tasks.map((task) => ({ ...structuredClone(task), id: randomUUID().replaceAll('-', '').slice(0, 12), state: 'unchecked' })) }));
}
export function validatePlan(activities) {
  if (activities.length > 10) throw new Error('A plan supports up to 10 Activities.');
  const ids = new Set();
  let ab;
  for (const activity of activities) {
    if (ids.has(activity.id)) throw new Error('That Activity is already in this plan.');
    ids.add(activity.id);
    if (!activity.name?.trim() || activity.name.length > 60) throw new Error('Activity names must be 1–60 characters.');
    if (activity.icon.length > 80) throw new Error('Use one emoji for the icon.');
    if (activity.tasks.length > 15) throw new Error('An Activity supports up to 15 Tasks.');
    for (const item of [activity, ...activity.tasks]) {
      if (item !== activity && (!item.name?.trim() || item.name.length > 100)) throw new Error('Task names must be 1–100 characters.');
      if (!['unchecked', 'done', 'abandoned'].includes(item.state)) throw new Error('Invalid item state.');
      if (item.link?.kind === 'ab') {
        if (ab && ab !== item.link.threadId) throw new Error('Use only one Accountability Buddy thread in a plan.');
        ab = item.link.threadId;
      }
    }
  }
  const characters = JSON.stringify(activities).length;
  if (characters > 18_000) throw new Error('This plan is too large. Shorten or remove some items.');
}
