import { randomUUID } from 'node:crypto';
import PomodoroGroup from '../../models/pomodoro-group.js';
import PomodoroStage from '../../models/pomodoro-stage.js';
import { PRESETS, parsePattern, startStage, attendanceFor, recoverTiming } from './pomodoro-timing.js';

const button = (label, action, id, style = 2) => ({
  type: 2, label, custom_id: `pomodoro:${action}:${id}`, style,
});
const row = (components) => ({ type: 1, components });
const labelOf = (group) => group.displayName || group.name;

export function subscribedDuration(joinedAt, endedAt) {
  const seconds = Math.max(0, Math.floor((endedAt - joinedAt) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, '0')).join(':');
}

export function controllerOf(group) {
  if (group.members.includes(group.controllerId)) return group.controllerId;
  return [...group.members].sort((a, b) =>
    (group.joinedAt.get(a) ?? 0) - (group.joinedAt.get(b) ?? 0))[0];
}

export function sessionView(group) {
  return {
    content: `## 🍅 ${labelOf(group)}\n`
      + `-# ${group.timeOption.map((minutes, index) =>
        `${index % 2 === 0 ? 'Study' : 'Break'} ${minutes} min`).join(' → ')}\n\n`
      + (group.stageEndsAt
        ? `${group.stageIndex % 2 === 0 ? '📚 Study' : '☕ Break'} · **Round ${group.studyRound || 1}** · ends <t:${Math.floor(group.stageEndsAt / 1000)}:R>`
        : 'Ready when you are — join to start.')
      + `\n-# ${group.members.length} joined · ${group.completedRounds || 0} rounds completed`
      + (controllerOf(group) ? ` · Controller: <@${controllerOf(group)}>` : ''),
    allowedMentions: { parse: [] },
    components: [row([
      button('Join', 'join', group._id),
      button('Leave', 'leave', group._id),
      button('Skip stage', 'skip', `${group._id}:${group.stageId}`),
      button('Stop timer', 'stop', `${group._id}:${group.stageId}`, 4),
    ])],
  };
}

// All interactions and ticks share one queue, including membership checks across
// groups. Run one bot process for a Discord token (as with the existing schedules).
export class PomodoroService {
  constructor({ groups = PomodoroGroup, stages = PomodoroStage, now = Date.now } = {}) {
    this.groups = groups;
    this.stages = stages;
    this.now = now;
    this.tail = Promise.resolve();
  }

  serial(work) {
    const result = this.tail.then(work);
    this.tail = result.catch(() => {});
    return result;
  }

  async ensurePresets(guildId, channelId) {
    for (const pattern of PRESETS) {
      await this.groups.updateOne({ name: `${guildId}:preset:${pattern}` }, {
        $setOnInsert: {
          guildId,
          displayName: pattern,
          permanent: true,
          timeOption: pattern.split('/'),
          members: [],
          channelId,
          startTimeStamp: 0,
        },
      }, { upsert: true });
    }
  }

  async finish(group) {
    const departures = group.members.map((userId) => ({
      userId, joinedAt: group.joinedAt.get(userId),
    }));
    const rounds = group.completedRounds || 0;
    const summary = { content: `## 🍅 ${labelOf(group)}\nSession ended\n-# ${rounds} study ${rounds === 1 ? 'round' : 'rounds'} completed`,
      components: [],
allowedMentions: { parse: [] } };
    if (group.checkIn) {
      try { await this.publishCheckIn(group, true); } catch (error) { console.error('Pomodoro final check-in update:', error); }
    }
    Object.assign(group, { checkIn: undefined, members: [], controllerId: undefined });
    if (group.permanent) {
      Object.assign(group, {
        members: [],
        joinedAt: new Map(),
        stageId: undefined,
        stageStartedAt: undefined,
        stageEndsAt: undefined,
        announcementPending: false,
        awaitingResponse: false,
        respondedMembers: [],
      });
      await group.save();
    } else {
      await this.groups.deleteOne({ _id: group._id });
    }
    await this.sayGoodbye(group, departures, 'The session ended.');
    if (group.statusMessageId) {
      try {
        const channel = await this.client.channels.fetch(group.channelId);
        await channel.messages.edit(group.statusMessageId, summary);
      } catch (error) { console.error('Pomodoro final status update failed:', error); }
    }
  }

  async sayGoodbye(group, participants, reason, endedAt = this.now()) {
    if (!participants.length) return;
    try {
      const channel = await this.client.channels.fetch(group.channelId);
      // Keep each goodbye well within Discord's message and mention limits.
      for (const { userId, joinedAt } of participants) {
        await channel.send({
          content: `## 👋 Goodbye <@${userId}>\n`
            + `-# ${labelOf(group)} · ${subscribedDuration(joinedAt ?? endedAt, endedAt)} subscribed · ${reason}`,
          allowedMentions: { parse: [], users: [userId] },
        });
      }
    } catch (error) { console.error('Pomodoro goodbye delivery:', error); }
  }

  // eslint-disable-next-line class-methods-use-this
  initialCheckIn(group) {
    Object.assign(group, { checkIn: {
      id: randomUUID(),
initial: true,
study: false,
      deadline: group.stageEndsAt,
      participants: group.members.map((userId) => ({
        userId, joinedAt: group.joinedAt.get(userId),
      })),
      responded: [],
delivered: false,
dirty: true,
    } });
  }

  async publish(group) {
    const channel = await this.client.channels.fetch(group.channelId);
    const view = sessionView(group);
    if (group.statusMessageId) {
      try {
        await channel.messages.edit(group.statusMessageId, view);
      } catch (error) {
        // Only replace a message that was actually deleted, never on a transient error.
        if (error.code !== 10008) throw error;
        Object.assign(group, { statusMessageId: undefined });
      }
    }
    if (!group.statusMessageId) {
      const message = await channel.send(view);
      Object.assign(group, { statusMessageId: message.id });
    }
    Object.assign(group, { announcementPending: false });
    await group.save();
  }

  // Membership timestamps exclude people who left and rejoined during this window.
  // eslint-disable-next-line class-methods-use-this
  checkInMembers(group) {
    return (group.checkIn?.participants || []).filter((entry) =>
      group.members.includes(entry.userId) && group.joinedAt.get(entry.userId) === entry.joinedAt);
  }

  checkInView(group, closed = false) {
    const check = group.checkIn;
    const participants = this.checkInMembers(group);
    const checked = participants.filter((entry) => check.responded.includes(entry.userId));
    const pending = participants.filter((entry) => !check.responded.includes(entry.userId));
    const done = closed || !pending.length;
    return {
      content: (done ? '## ✅ Check-in closed'
        : `## ${group.stageIndex % 2 === 0 ? '📚 Study' : '☕ Break'} · Round ${group.studyRound || 1}`)
        + `\n-# ${labelOf(group)}`
        + (done ? ` · Round ${group.studyRound || 1}`
          : ` · ${group.timeOption[group.stageIndex]} min · ends <t:${Math.floor(check.deadline / 1000)}:R>`)
        + (!done ? `\n\n${pending.map((entry) => `<@${entry.userId}>`).join(' ')}\n`
          + '-# Tap **I\'m here** or be unsubscribed at the next stage.' : '')
        + `\n-# ✓ ${checked.length}/${participants.length} checked in`,
      allowedMentions: { parse: [] },
      components: done ? [] : [row([button("I'm here", 'confirm', check.id, 3)])],
    };
  }

  async publishCheckIn(group, closed = false) {
    if (!group.checkIn) return;
    const check = group.checkIn;
    const channel = await this.client.channels.fetch(group.channelId);
    const view = this.checkInView(group, closed);
    if (check.messageId) {
      await channel.messages.edit(check.messageId, view);
    } else if (!closed && this.now() < check.deadline) {
      // New messages deliver real notifications; edits only maintain check-in progress.
      const users = this.checkInMembers(group).map((entry) => entry.userId);
      const message = await channel.send({ ...view,
        allowedMentions: { parse: [], users },
      });
      check.messageId = message.id;
      check.delivered = true;
    }
    check.dirty = false;
    await group.save();
  }

  async closeCheckIn(group, removeAbsent = true) {
    if (!group.checkIn) return;
    // Do not remove people for a notification Discord never accepted.
    const absent = removeAbsent && group.checkIn.delivered
      ? this.checkInMembers(group)
        .filter((entry) => !group.checkIn.responded.includes(entry.userId))
        .map((entry) => entry.userId) : [];
    const departures = absent.map((userId) => ({ userId, joinedAt: group.joinedAt.get(userId) }));
    const endedAt = group.checkIn.deadline;
    try { await this.publishCheckIn(group, true); } catch (error) { console.error('Pomodoro check-in close:', error); }
    Object.assign(group, {
      members: group.members.filter((id) => !absent.includes(id)),
      checkIn: undefined,
      announcementPending: true,
    });
    absent.forEach((id) => group.joinedAt.delete(id));
    Object.assign(group, { controllerId: controllerOf(group) });
    if (!group.members.length) {
      // No advance() follows when the group empties. Include the study stage
      // that just elapsed in the session summary, without granting study credit.
      if (absent.length && group.stageIndex % 2 === 0 && group.stageEndsAt <= this.now()) {
        Object.assign(group, { completedRounds: (group.completedRounds || 0) + 1 });
      }
      await this.finish(group);
      await this.sayGoodbye(group, departures, 'You missed the check-in deadline.', endedAt);
      return;
    }
    await group.save();
    await this.sayGoodbye(group, departures, 'You missed the check-in deadline.', endedAt);
  }

  async advance(group, skipped = false) {
    if (group.checkIn) await this.closeCheckIn(group, false);
    const endedId = group.stageId;
    const study = group.stageIndex % 2 === 0;
    if (study && !skipped) {
      await this.stages.updateOne({ _id: endedId }, { $setOnInsert: {
        guildId: group.guildId,
        channelId: group.channelId,
        groupName: labelOf(group),
        endedAt: group.stageEndsAt,
        attendance: attendanceFor(group),
      } }, { upsert: true });
      Object.assign(group, { completedRounds: (group.completedRounds || 0) + 1 });
    }
    const nextIndex = (group.stageIndex + 1) % group.timeOption.length;
    if (nextIndex % 2 === 0) {
      Object.assign(group, { studyRound: (group.studyRound || 1) + 1 });
    }
    startStage(group, nextIndex, skipped ? this.now() : group.stageEndsAt);
    if (!skipped) {
      Object.assign(group, { checkIn: {
        id: endedId,
        study,
        // Participants have this entire stage to respond before the next begins.
        deadline: group.stageEndsAt,
        participants: group.members.map((userId) => ({
          userId, joinedAt: group.joinedAt.get(userId),
        })),
        responded: [],
        delivered: false,
        dirty: true,
      } });
    }
    await group.save();
  }

  async settle(group) {
    if (!group) return null;
    if (group.checkIn && group.checkIn.deadline <= this.now()) {
      await this.closeCheckIn(group);
      if (!group.members.length) return null;
    }
    if (group.members.length && group.stageEndsAt <= this.now()) await this.advance(group);
    return group;
  }

  async current(userId) {
    return this.groups.findOne({ members: userId });
  }

  async create(interaction) {
    const name = interaction.options.getString('group-name').trim();
    const timeOption = parsePattern(interaction.options.getString('timer-pattern'));
    if (!name || name.length > 40) throw new Error('Use a group name of 1–40 characters.');
    if (await this.current(interaction.user.id)) throw new Error('Leave your current Pomodoro group first.');
    const customCount = await this.groups.countDocuments({
      guildId: interaction.guildId, permanent: false,
    });
    if (customCount >= 20) {
      throw new Error('This server already has 20 custom groups. Join one or stop an existing group.');
    }
    const key = `${interaction.guildId}:custom:${name.toLowerCase()}`;
    if (await this.groups.findOne({ name: key })) {
      throw new Error('That group name is already in use.');
    }
    const now = this.now();
    const Group = this.groups;
    const group = new Group({
      name: key,
      displayName: name,
      guildId: interaction.guildId,
      ownerId: interaction.user.id,
      controllerId: interaction.user.id,
      timeOption,
      startTimeStamp: now,
      studyRound: 1,
      completedRounds: 0,
      channelId: interaction.channelId,
      members: [interaction.user.id],
      joinedAt: new Map([[interaction.user.id, now]]),
    });
    startStage(group, 0, now);
    this.initialCheckIn(group);
    await group.save();
    return sessionView(group);
  }

  async join(interaction, id) {
    if (await this.current(interaction.user.id)) throw new Error('Leave your current Pomodoro group first.');
    const group = await this.groups.findOne({ _id: id, guildId: interaction.guildId });
    if (!group) throw new Error('This group has ended. Use /pomodoro join to choose another.');
    if (!await this.settle(group) && !group.permanent) throw new Error('This group has ended.');
    if (group.members.length >= 50) throw new Error('This group is full (50 participants).');
    const now = this.now();
    const starting = !group.members.length;
    if (starting) {
      if (group.channelId !== interaction.channelId) group.statusMessageId = undefined;
      group.channelId = interaction.channelId;
      group.ownerId = interaction.user.id;
      group.controllerId = interaction.user.id;
      group.startTimeStamp = now;
      group.studyRound = 1;
      group.completedRounds = 0;
      startStage(group, 0, now);
    }
    group.controllerId = controllerOf(group) || interaction.user.id;
    group.members.push(interaction.user.id);
    group.joinedAt.set(interaction.user.id, now);
    if (starting) this.initialCheckIn(group);
    group.announcementPending = true;
    await group.save();
    return sessionView(group);
  }

  async leave(interaction, id) {
    const group = await this.current(interaction.user.id);
    if (!group || group.guildId !== interaction.guildId || (id && String(group._id) !== id)) {
      throw new Error('You are not in this Pomodoro group.');
    }
    if (!await this.settle(group)) return { content: 'This session has ended.', components: [] };
    const departure = {
      userId: interaction.user.id, joinedAt: group.joinedAt.get(interaction.user.id),
    };
    group.members = group.members.filter((userId) => userId !== interaction.user.id);
    group.joinedAt.delete(interaction.user.id);
    Object.assign(group, { controllerId: controllerOf(group) });
    group.respondedMembers = (group.respondedMembers || [])
      .filter((userId) => userId !== interaction.user.id);
    if (!group.members.length) await this.finish(group);
    else {
      group.announcementPending = true;
      await group.save();
      if (group.checkIn) { group.checkIn.dirty = true; await group.save(); }
    }
    await this.sayGoodbye(group, [departure], 'You left the group.');
    return { content: `You left ${labelOf(group)}.`, components: [], allowedMentions: { parse: [] } };
  }

  async control(interaction, action, id, stageId) {
    const group = await this.groups.findOne({ _id: id, guildId: interaction.guildId });
    if (!group?.members.length) throw new Error('This session has ended.');
    if (!await this.settle(group)) throw new Error('This session has ended.');
    if (controllerOf(group) !== interaction.user.id) {
      throw new Error('Only the current controller can skip or stop this timer.');
    }
    if (group.stageId !== stageId) throw new Error('This control is from an older stage. Use /pomodoro status for fresh controls.');
    if (action === 'skip') {
      await this.advance(group, true);
      return sessionView(group);
    }
    await this.finish(group);
    return { content: 'Timer stopped for everyone. No credit is awarded for the interrupted stage.', components: [] };
  }

  async confirm(interaction, stageId) {
    const group = await this.current(interaction.user.id);
    if (!group || group.guildId !== interaction.guildId || group.checkIn?.id !== stageId
      || group.checkIn.deadline <= this.now() || !group.checkIn.delivered
      || !this.checkInMembers(group).some((entry) => entry.userId === interaction.user.id)) {
      throw new Error('This check-in has closed or does not include you. Use /pomodoro join to rejoin.');
    }
    if (group.checkIn.study) {
      await this.stages.updateOne({
        _id: stageId,
        guildId: interaction.guildId,
        attendance: { $elemMatch: { userId: interaction.user.id, confirmed: false } },
      }, { $set: { 'attendance.$.confirmed': true } });
    }
    if (!group.checkIn.responded.includes(interaction.user.id)) {
      group.checkIn.responded.push(interaction.user.id);
      group.checkIn.dirty = true;
      await group.save();
    }
    await this.publishCheckIn(group);
    return null;
  }

  async leaderboard(interaction) {
    const metric = interaction.options.getString('metric') || 'minutes';
    const rows = await this.stages.aggregate([
      { $match: { guildId: interaction.guildId } },
      { $unwind: '$attendance' },
      { $match: { 'attendance.confirmed': true } },
      { $group: {
        _id: '$attendance.userId',
        milliseconds: { $sum: '$attendance.milliseconds' },
        completed: { $sum: { $cond: ['$attendance.completed', 1, 0] } },
      } },
      { $sort: metric === 'stages'
        ? { completed: -1, milliseconds: -1, _id: 1 }
        : { milliseconds: -1, completed: -1, _id: 1 } },
      { $limit: 10 },
    ]);
    return { content: `**Pomodoro leaderboard — ${metric}**\n` + (rows.map((entry, index) =>
      `${index + 1}. <@${entry._id}> — ${(entry.milliseconds / 60000).toFixed(2)} minutes`
        + ` · ${entry.completed} stages`).join('\n')
      || 'No confirmed study sessions yet.'),
    allowedMentions: { parse: [] } };
  }

  async list(interaction, page = 0) {
    await this.ensurePresets(interaction.guildId, interaction.channelId);
    const groups = await this.groups.find({ guildId: interaction.guildId })
      .sort({ permanent: -1, name: 1 });
    const pageSize = groups.length > 5 ? 4 : 5;
    const selected = groups.slice(page * pageSize, page * pageSize + pageSize);
    const components = selected.map((group) => row([button(
      `${labelOf(group)} (${group.members.length})`.slice(0, 80), 'join', group._id,
    )]));
    // Four groups per page leave a row for navigation when needed.
    if (groups.length > 5) {
      const nav = [];
      if (page > 0) nav.push(button('Previous', 'page', page - 1));
      if ((page + 1) * 4 < groups.length) nav.push(button('Next', 'page', page + 1));
      if (nav.length) components.push(row(nav));
    }
    return { content: '## 🍅 Join a Pomodoro\n-# Pick a group below. Empty presets start in this channel.', components };
  }

  async status(interaction) {
    const groups = await this.groups.find({ guildId: interaction.guildId }).sort({ name: 1 });
    const pages = [];
    let content = '## 🍅 Active Pomodoros';
    for (const group of groups) {
      if (!group.members.length || !group.stageEndsAt || !await this.settle(group)) continue;
      // Keep the linked controls current and recover a missing/deleted message.
      await this.publish(group);
      const url = `https://discord.com/channels/${group.guildId}/${group.channelId}/${group.statusMessageId}`;
      const entry = `\n\n**${labelOf(group)}**\n`
        + `${group.stageIndex % 2 === 0 ? '📚 Study' : '☕ Break'} · Round ${group.studyRound || 1}`
        + ` · ends <t:${Math.floor(group.stageEndsAt / 1000)}:R>\n`
        + `-# ${group.members.length} joined · [Open timer controls](${url})`;
      if (content.length + entry.length > 1900) {
        pages.push(content);
        content = '## 🍅 Active Pomodoros (continued)';
      }
      content += entry;
    }
    if (content === '## 🍅 Active Pomodoros') content += '\nNo active sessions in this server.';
    pages.push(content);
    await interaction.editReply({
      content: pages[0], components: [], allowedMentions: { parse: [] },
    });
    for (const page of pages.slice(1)) {
      await interaction.followUp({ content: page, components: [], allowedMentions: { parse: [] } });
    }
    return null;
  }

  async handle(interaction) {
    const isButton = interaction.isButton();
    if (isButton) await interaction.deferUpdate();
    else await interaction.deferReply({ ephemeral: false });
    try {
      const result = await this.serial(async () => {
        if (!interaction.guildId) throw new Error('Use Pomodoro in a server channel.');
        if (isButton) {
          const [, action, id, stageId] = interaction.customId.split(':');
          if (action === 'page') {
            await interaction.editReply(await this.list(interaction, Math.max(0, Number(id) || 0)));
            return null;
          }
          if (action === 'confirm') await this.confirm(interaction, id);
          else if (action === 'join') await this.join(interaction, id);
          else if (action === 'leave') await this.leave(interaction, id);
          else if (action === 'skip' || action === 'stop') await this.control(interaction, action, id, stageId);
          else throw new Error('This Pomodoro button is no longer supported.');
          await this.tick();
          return null;
        }
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'create') {
          const view = await this.create(interaction);
          const group = await this.current(interaction.user.id);
          // Register the public slash reply before releasing the worker queue.
          const message = await interaction.editReply(view);
          group.statusMessageId = message.id;
          group.announcementPending = false;
          await group.save();
          return null;
        }
        if (subcommand === 'join') return this.list(interaction);
        if (subcommand === 'leave') return this.leave(interaction);
        if (subcommand === 'leaderboard') return this.leaderboard(interaction);
        return this.status(interaction);
      });
      if (result) await interaction.editReply(result);
    } catch (error) {
      console.error('Pomodoro interaction:', error);
      const reply = { content: error.name === 'Error' ? error.message : 'Unable to update Pomodoro. Please try again.', components: [], allowedMentions: { parse: [] } };
      // A deferred public slash reply cannot be made private by editing it.
      if (!isButton) await interaction.deleteReply();
      await interaction.followUp({ ...reply, ephemeral: true });
    }
  }

  async tick() {
    const groups = await this.groups.find({ guildId: { $exists: true } });
    for (const group of groups) {
      try {
        if (!group.members.length) {
          if (!group.permanent || group.stageEndsAt) await this.finish(group);
          continue;
        }
        if (!await this.settle(group)) continue;
        if (group.checkIn?.dirty) await this.publishCheckIn(group);
        if (group.announcementPending || !group.statusMessageId) await this.publish(group);
      } catch (error) { console.error(`Pomodoro session ${group._id}:`, error); }
    }
  }

  async recover(client) {
    this.client = client;
    // Migrate existing groups in place without guessing attendance before upgrade.
    const legacy = await this.groups.find({ guildId: { $exists: false } });
    for (const group of legacy) {
      try {
        const channel = await client.channels.fetch(group.channelId);
        group.guildId = channel.guildId;
        group.displayName = group.name;
        [group.ownerId] = group.members;
        group.joinedAt = new Map(group.members.map((id) => [id, this.now()]));
        if (group.members.length) {
          const durations = group.timeOption.map((value) => Number(value) * 60000);
          const invalid = !durations.length
            || durations.some((value) => !Number.isFinite(value) || value <= 0);
          if (invalid) {
            await this.finish(group);
            continue;
          }
          const cycle = durations.reduce((sum, value) => sum + value, 0);
          let elapsed = Math.max(0, this.now() - group.startTimeStamp) % cycle;
          let index = 0;
          while (elapsed >= durations[index]) { elapsed -= durations[index]; index += 1; }
          startStage(group, index, this.now() - elapsed);
        }
        await group.save();
      } catch (error) { console.error(`Could not migrate Pomodoro ${group._id}:`, error); }
    }
    const active = await this.groups.find({ guildId: { $exists: true } });
    for (const group of active) {
      if (!group.members.length) continue;
      // Outstanding prompts cannot fairly enforce attendance across downtime.
      // Close them without removals or automatically confirming any ledger rows.
      if (group.checkIn) await this.closeCheckIn(group, false);
      Object.assign(group, { controllerId: controllerOf(group) });
      recoverTiming(group, this.now());
      await group.save();
    }
    await this.tick();
  }
}

export default new PomodoroService();
