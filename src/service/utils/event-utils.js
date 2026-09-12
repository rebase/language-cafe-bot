import { time } from 'discord.js';
import mongoose from 'mongoose';
import EventParticipant from '../../models/event-participant.js';
import EventLeaderboard from '../../models/event-leaderboard.js';
import Event from '../../models/event.js';
import client from '../../client/index.js';

// ─── Colour map by event type ───────────────────────────────────────────────

const EVENT_TYPE_COLORS = {
  Reading: 0x4a90d9,
  Listening: 0x9b59b6,
  Speaking: 0xe67e22,
  Writing: 0x2ecc71,
  'Live Event': 0xe74c3c,
  Mixed: 0xf39c12,
  Other: 0x95a5a6,
};

const EVENT_TYPE_EMOJIS = {
  Reading: '📚',
  Listening: '🎧',
  Speaking: '🗣️',
  Writing: '✍️',
  'Live Event': '🔴',
  Mixed: '🌐',
  Other: '📌',
};

// ─── Calendar embed builder ──────────────────────────────────────────────────

/**
 * Build a single Discord embed for an event (used by /calendar and /event info).
 */
export function buildCalendarEmbed(event) {
  const emoji = EVENT_TYPE_EMOJIS[event.eventType] ?? '📌';
  const color = EVENT_TYPE_COLORS[event.eventType] ?? 0x95a5a6;

  const statusLabel =
    event.status === 'active' ? '🟢 Active' : event.status === 'ended' ? '⚫ Ended' : '🕐 Upcoming';

  const fields = [
    { name: 'Type', value: `${emoji} ${event.eventType}`, inline: true },
    { name: 'Status', value: statusLabel, inline: true },
    { name: 'Channel', value: `<#${event.submissionChannelId}>`, inline: true },
    {
      name: 'Start',
      value: time(Math.floor(event.startDate.getTime() / 1000), 'F'),
      inline: true,
    },
    {
      name: 'End',
      value: time(Math.floor(event.endDate.getTime() / 1000), 'F'),
      inline: true,
    },
    { name: 'Hashtag', value: `\`${event.hashtag}\``, inline: true },
  ];

  if (event.eventPostLink) {
    fields.push({ name: 'Event Post', value: event.eventPostLink, inline: false });
  }

  return {
    color,
    title: event.name,
    fields,
    footer: { text: `Event ID: ${event._id}` },
    timestamp: new Date().toISOString(),
  };
}

// ─── Live leaderboard embed builder ─────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

/**
 * Build the pinned leaderboard embed showing top 10 participants.
 * Sorted by points descending, then by earliest submission (createdAt ascending)
 * to break ties in favour of whoever reached that score first.
 */
export async function buildLiveLeaderboardEmbed(event) {
  const color = EVENT_TYPE_COLORS[event.eventType] ?? 0x95a5a6;
  const emoji = EVENT_TYPE_EMOJIS[event.eventType] ?? '📌';
  const eventId = event._id.toString();

  const totalParticipants = await EventParticipant.countDocuments({ eventId });

  const top10 = await EventParticipant.find({ eventId })
    .sort({ points: -1, createdAt: 1 })
    .limit(10)
    .lean();

  const subtitle = event.pointsPerSubmission
    ? `Leaderboard · ${totalParticipants} participant${totalParticipants === 1 ? '' : 's'} · ${event.pointsPerSubmission} pts/submission · ${event.maxPoints} pt maximum`
    : `Leaderboard · ${totalParticipants} participant${totalParticipants === 1 ? '' : 's'}`;

  let description;
  if (top10.length === 0) {
    description = '*No submissions yet. Be the first!*';
  } else {
    const rows = top10.map((p, i) =>
      event.pointsPerSubmission
        ? `${MEDALS[i]} <@${p.userId}> **${p.points}**`
        : `${MEDALS[i]} <@${p.userId}> ${p.submissionCount} submission${p.submissionCount === 1 ? '' : 's'}`,
    );
    description = rows.join('\n');
  }

  return {
    color,
    title: `${emoji} ${event.name}`,
    description: `${subtitle}\n\n${description}`,
  };
}

// ─── Live leaderboard update ─────────────────────────────────────────────────

/**
 * Fetch the stored leaderboard record for an event, edit the pinned message,
 * and lock it if 3 participants have now reached max points.
 *
 * Safe to call on every submission — skips silently if no leaderboard is posted
 * or if already locked.
 */
export async function updateLiveLeaderboard(event) {
  try {
    const eventId = event._id.toString();
    const record = await EventLeaderboard.findOne({ eventId });
    if (!record || record.isLocked) return;

    const channel = await client.channels.fetch(record.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(record.messageId);
    if (!message) return;

    const embed = await buildLiveLeaderboardEmbed(event);
    await message.edit({ embeds: [embed] });

    // Lock once 10 participants have reached the max points cap
    const maxedCount = await EventParticipant.countDocuments({
      eventId,
      points: event.maxPoints,
    });

    if (maxedCount >= 10) {
      record.isLocked = true;
      await record.save();
    }
  } catch (err) {
    console.error('updateLiveLeaderboard error:', err);
  }
}

// ─── Event lookup helpers ────────────────────────────────────────────────────

/**
 * Find an active event that tracks the given channel.
 */
export async function findActiveEventForChannel(channelId) {
  return Event.findOne({
    status: 'active',
    submissionChannelId: channelId,
  });
}

/**
 * Normalise a hashtag so it always starts with #.
 */
export function normaliseHashtag(raw) {
  const trimmed = raw.trim();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function findByIdOrName(Model, selection) {
  const normalizedSelection = selection.replace(/\s+\[(?:Recurring|One-time)\s+·\s+[^\]]+\]$/, '');

  if (mongoose.isValidObjectId(normalizedSelection)) {
    const byId = await Model.findById(normalizedSelection);
    if (byId) return byId;
  }

  return Model.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(normalizedSelection)}$`, 'i') },
  });
}

export async function incrementParticipantTotals({
  eventId,
  userId,
  points = 0,
  submissionCount = 0,
}) {
  const filter = { eventId, userId };
  const update = { $inc: { points, submissionCount } };

  try {
    return await EventParticipant.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return EventParticipant.findOneAndUpdate(filter, update, { new: true });
  }
}

/**
 * Check whether a message contains a specific hashtag (case-insensitive).
 */
export function messageContainsHashtag(content, hashtag) {
  const normalised = normaliseHashtag(hashtag).toLowerCase();
  return content.toLowerCase().includes(normalised);
}
