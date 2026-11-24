import StudyCheckIn from '../../models/StudyCheckIn.js';
import { DAY, midnight, utcDay } from './study-rules.js';

// Shared by prefix and interactive check-ins. Compare-and-set prevents a
// simultaneous prefix/slash request from incrementing the same day twice.
export async function recordAttendance(userId, now = Date.now()) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const user = await StudyCheckIn.findOne({ userId });
    if (user?.lastAttendanceTimestamp && utcDay(user.lastAttendanceTimestamp) === utcDay(now)) {
      return { user, previous: user, already: true };
    }
    let freezePoint = user?.freezePoint ?? 0;
    let point = user?.point ?? 0;
    if (user?.expiredTimestamp < now) {
      freezePoint -= Math.ceil((now - user.expiredTimestamp) / DAY);
      if (freezePoint < 0) { freezePoint = 0; point = 0; }
    }
    point += 1;
    if (point % 7 === 0) freezePoint = Math.min(3, freezePoint + 1);
    const update = {
      point,
      freezePoint,
      highestPoint: Math.max(user?.highestPoint ?? 0, point),
      lastAttendanceTimestamp: now,
      // Preserve the existing expiry: tomorrow at 23:59:59 UTC.
      expiredTimestamp: midnight(utcDay(now)) + DAY * 2 - 1000,
    };
    if (!user) {
      try {
        const created = await StudyCheckIn.create({ userId, ...update });
        return { user: created, previous: null, already: false };
      } catch (error) {
        if (error.code === 11000) continue;
        throw error;
      }
    }
    const saved = await StudyCheckIn.findOneAndUpdate(
      { _id: user._id, lastAttendanceTimestamp: user.lastAttendanceTimestamp },
      update,
      { new: true },
    );
    if (saved) return { user: saved, previous: user, already: false };
  }
  throw new Error('Another check-in is being saved. Please try again.');
}
