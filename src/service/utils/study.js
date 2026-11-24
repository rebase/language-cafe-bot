import { randomUUID } from 'node:crypto';
import { escapeMarkdown, ChannelType, PermissionFlagsBits } from 'discord.js';
import { COMMUNITY_CHANNELS } from '../../constants/index.js';
import config from '../../config/index.js';
import Plan from '../../models/study-plan.js';
import Profile from '../../models/study-profile.js';
import StudyCheckIn from '../../models/StudyCheckIn.js';
import { recordAttendance } from './study-attendance.js';
import { DAY, utcDay, midnight, weekOf, studied, totals, goalProgress, validateGoal, validatePlan, freshActivities, assertEditable } from './study-rules.js';

const shortId = () => randomUUID().replaceAll('-', '').slice(0, 12);
const symbols = { unchecked: '⬜', done: '✅', abandoned: '🔘' };
const safe = (value) => escapeMarkdown(String(value || '')).replaceAll('@', '@\u200b');
const row = (...components) => ({ type: 1, components });
const button = (label, customId, style = 2) => ({ type: 2, label, custom_id: customId, style });
const payload = (description, components = [], title = 'Study Streak') => ({
  content: '',
  embeds: [{ title, description, color: 0xc3c3e5 }],
  components,
  allowedMentions: { parse: [] },
});
const key = (i) => ({ userId: i.user.id, guildId: i.guildId });
const cid = (owner, scope, doc, action, arg = '-', page = 0) => `study:${owner}:${scope}:${doc}:${action}:${arg}:${page}`;
const identity = (i, scope = 'm', doc = '-') => (action, arg, page) => cid(i.user.id, scope, doc, action, arg, page);
const itemChoices = (activities, standaloneOnly = false) => activities.flatMap((a) => [
  ...(!standaloneOnly || !a.tasks.length ? [{ label: `${a.icon} ${a.name}`, value: a.id }] : []),
  ...a.tasks.map((t) => ({ label: `${a.name} / ${t.name}`, value: `${a.id}~${t.id}` })),
]);

function picker(id, action, options, page = 0, multiple = false, arg = '-') {
  const total = Math.ceil(options.length / 25);
  const current = Math.max(0, Math.min(Number(page) || 0, Math.max(0, total - 1)));
  const slice = options.slice(current * 25, current * 25 + 25);
  if (!slice.length) return payload('There are no items to choose from.');
  const select = { type: 3,
    custom_id: id(action, arg, current),
    placeholder: 'Choose an item',
    min_values: 1,
    max_values: multiple ? slice.length : 1,
    options: slice.map((o) => ({ ...o, label: o.label.slice(0, 100) })) };
  const nav = [];
  if (current > 0) nav.push(button('Previous', id(`page-${action}`, arg, current - 1)));
  if (current + 1 < total) nav.push(button('Next', id(`page-${action}`, arg, current + 1)));
  return payload(`Choose below${total > 1 ? ` (page ${current + 1}/${total})` : ''}.`, [row(select), ...(nav.length ? [row(...nav)] : [])]);
}

async function profileFor(i) {
  try {
    return await Profile.findOneAndUpdate(
      key(i), { $setOnInsert: key(i) }, { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code === 11000) return Profile.findOne(key(i));
    throw error;
  }
}

function planView(plan, owner, title = 'Study Streak', goals = '') {
  const id = (action, arg, page) => cid(owner, 'p', String(plan._id), action, arg, page);
  const stateOpen = Date.now() < midnight(plan.day) + DAY * 1.5;
  const structureOpen = Date.now() < midnight(plan.day) + DAY;
  const text = plan.activities.map((a) => {
    const heading = `${a.tasks.length ? (studied(a) ? '✅ ' : '') : `${symbols[a.state]} `}${safe(a.icon)} **${safe(a.name)}**${a.link ? ` [link](https://discord.com/channels/${plan.guildId}/${a.link.threadId})` : ''}`;
    return [heading, ...a.tasks.map((t) => `${symbols[t.state]} ${safe(t.name)}${t.link ? ` [link](https://discord.com/channels/${plan.guildId}/${t.link.threadId})` : ''}`)].join('\n');
  }).join('\n\n') || 'Add Activities and optional Tasks to your plan.';
  const controls = [];
  const buttons = [];
  if (stateOpen) buttons.push(button('Update', id('update')));
  if (structureOpen) buttons.push(button('Manage', id('manage')));
  if (buttons.length) controls.push(row(...buttons));
  const close = `<t:${Math.floor((midnight(plan.day) + DAY * 1.5) / 1000)}:f>`;
  // Ten small embeds keep large plans within Discord's 4096/6000 text limits.
  const desc = `${safe(plan.day)} · <@${owner}>\n${stateOpen ? `Status updates close ${close}.` : 'Locked · unchecked items remain unchecked.'}\n\n${text}${goals ? `\n\n${goals}` : ''}`;
  const result = payload(desc.slice(0, 4000), controls, title);
  if (desc.length > 4000) {
    const lines = desc.split('\n');
    const pages = [''];
    for (const line of lines) {
      if (pages.at(-1).length + line.length + 1 > 3500) pages.push('');
      pages[pages.length - 1] += `${line}\n`;
    }
    if (desc.length > 5700) throw new Error('This plan is too long to display. Shorten the item names.');
    result.embeds = pages.map((description, n) => ({ title: n ? 'Continued' : title, description, color: 0xc3c3e5 }));
  }
  return result;
}

function templateView(template, i) {
  const id = identity(i, 't', template.id);
  const lines = template.activities.map((a) => `${safe(a.icon)} **${safe(a.name)}**\n${a.tasks.map((t) => `• ${safe(t.name)}`).join('\n')}`).join('\n\n');
  if (lines.length > 4000) throw new Error('This template is too long. Shorten the item names.');
  const data = payload(lines || 'Add Activities and optional Tasks.', [
    actionMenu(id, true),
    row(button('Save Template', id('saved'), 3), button('Cancel', id('cancel-template'))),
  ], `📋 ${template.name}`);
  data.backTo = ['m', '-', 'templates'];
  return data;
}

function actionMenu(id, template = false) {
  const options = [
    ['Add Activity / Tasks', 'add'], ['Edit name / Task', 'pick-edit'],
    ['Remove item', 'pick-remove'], ['Change icon', 'pick-icon'], ['Link AB / Challenge', 'pick-link'],
    ...(template ? [['Rename template', 'rename-template'], ['Delete template', 'delete-template']]
      : [['Save as template', 'save-template'], ['Templates', 'templates'], ['Weekly goals', 'goals'], ['My stats', 'stats']]),
  ];
  return row({ type: 3,
custom_id: id('menu'),
placeholder: 'Choose what to manage',
    options: options.map(([label, value]) => ({ label, value })) });
}

function postLink(plan) {
  if (!plan.messageId || plan.messageId.startsWith('pending-')) return null;
  return { type: 2,
style: 5,
label: 'Go to my post',
    url: `https://discord.com/channels/${plan.guildId}/${plan.channelId}/${plan.messageId}` };
}

function manageView(plan, i) {
  const id = identity(i, 'p', String(plan._id));
  const components = [];
  if (Date.now() < midnight(plan.day) + DAY) components.push(actionMenu(id));
  const buttons = [];
  if (Date.now() < midnight(plan.day) + DAY * 1.5) buttons.push(button('Update', id('update')));
  const link = postLink(plan);
  if (link) buttons.push(link);
  if (buttons.length) components.push(row(...buttons));
  const data = payload(`Your plan · **${plan.day}**`, components, 'Manage Study Streak');
  data.backTo = false;
  return data;
}

function updateView(plan, i, page = 0, selected = [], notice = '') {
  const id = identity(i, 'p', String(plan._id));
  const choices = itemChoices(plan.activities, true);
  const data = picker(id, 'select-items', choices, page, true);
  data.embeds[0].title = `Update · ${plan.day}`;
  data.embeds[0].description = `${notice ? `${notice}\n\n` : ''}Select items, then choose their status.`;
  if (choices.length) {
    for (const option of data.components[0].components[0].options) {
      option.default = selected.includes(option.value);
    }
    data.components.push(row(...['done', 'abandoned', 'unchecked'].map((state) => ({
      ...button({ done: 'Complete', abandoned: 'Abandon', unchecked: 'Uncheck' }[state], id(`apply-${state}`, '-', page)),
      disabled: !selected.length,
    }))));
  } else data.embeds[0].description = 'No items yet. Use Manage to add an Activity.';
  return data;
}

const privateSource = (i) => Boolean(i.message?.flags?.has(64));
async function acknowledge(i) {
  if (i.deferred || i.replied) return undefined;
  if (privateSource(i)) return i.deferUpdate();
  return i.deferReply({ ephemeral: true });
}

function returnPlan(i) {
  const parts = i.customId?.split(':');
  if (parts?.[2] === 'p') return parts[3];
  if (parts?.[5]?.startsWith('return~')) return parts[5].slice(7);
  const back = i.message?.components?.flatMap((r) => r.components)
    .find((c) => c.label === 'Back');
  const context = (back?.customId || back?.custom_id)?.split(':')[5];
  return context?.startsWith('return~') ? context.slice(7) : null;
}

async function reply(i, view) {
  const { backTo, ...data } = view;
  const parts = i.customId?.split(':');
  const parentPlan = returnPlan(i);
  let destination = backTo;
  if (destination === undefined && parts) {
    if (parts[2] === 't') destination = ['t', parts[3], 'back'];
    else if (parts[2] === 'p') destination = ['p', parts[3], 'back'];
    else if (parentPlan) destination = ['p', parentPlan, 'back'];
  }
  if (destination && data.components.length < 5 && !data.components.some((r) =>
    r.components.some((c) => c.custom_id?.split(':')[4] === 'back'))) {
    data.components.push(row(button('Back', cid(i.user.id, ...destination, parentPlan ? `return~${parentPlan}` : '-'))));
  }
  // Never change the public post while navigating a private editor.
  if (i.deferred || i.replied) return i.editReply(data);
  if (privateSource(i)) return i.update(data);
  return i.reply({ ...data, ephemeral: true });
}

async function showModal(i, id, title, inputs) {
  return i.showModal({ custom_id: id,
    title,
    components: inputs.map((input) => {
      const [customId, label, value = '', maxLength = 100, style = 1, required = true] = input;
      return row({
        type: 4,
        custom_id: customId,
        label,
        style,
        required,
        max_length: maxLength,
        ...(value ? { value } : {}),
      });
    }) });
}

async function startPlan(i, activities) {
  const now = Date.now();
  const day = utcDay(now);
  validatePlan(activities);
  let plan;
  try {
    plan = await Plan.findOneAndUpdate({ ...key(i), day }, {
      $setOnInsert: {
        ...key(i), day, activities: freshActivities(activities), channelId: i.channelId,
      },
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    plan = await Plan.findOne({ ...key(i), day });
  }
  // Retry /study start can recover an attendance or message delivery failure.
  const attendance = await recordAttendance(i.user.id, now);
  const postedId = await publish(i, plan);
  const text = `Your plan for ${day} is ready. Streak: **${attendance.user.point} days**.`;
  const linkedPlan = { ...(plan.toObject?.() || plan), messageId: postedId || plan.messageId };
  const data = manageView(linkedPlan, i);
  data.embeds[0].description = text;
  return reply(i, data);
}

async function publish(i, plan) {
  const profile = await profileFor(i);
  const goals = await publicGoals(i, profile, plan.day);
  const data = planView(plan, i.user.id, `${i.user.displayName || i.user.username}’s Study Streak`, goals);
  if (plan.messageId) {
    try {
      if (plan.messageId.startsWith('pending-')) {
        if (plan.deliveryUntil > Date.now()) return undefined;
        await Plan.updateOne({ _id: plan._id, messageId: plan.messageId }, { $unset: { messageId: '' } });
        const recovered = await Plan.findById(plan._id);
        return publish(i, recovered);
      }
      await i.channel.messages.edit(plan.messageId, data);
      return plan.messageId;
    } catch (error) { if (error.code !== 10008) throw error; }
  }
  // Claim delivery so simultaneous /start requests cannot publish two plans.
  const claim = `pending-${shortId()}`;
  const claimed = await Plan.findOneAndUpdate(
    { _id: plan._id, messageId: { $exists: false } },
    { $set: { messageId: claim, deliveryUntil: Date.now() + 30_000 } },
    { new: true },
  );
  if (!claimed && plan.messageId && !plan.messageId.startsWith('pending-')) {
    await Plan.updateOne({ _id: plan._id, messageId: plan.messageId }, { $unset: { messageId: '' } });
    const recovered = await Plan.findById(plan._id);
    return publish(i, recovered);
  }
  if (!claimed) return undefined;
  try {
    const message = await i.channel.send(data);
    await Plan.updateOne({ _id: plan._id, messageId: claim }, { $set: { messageId: message.id } });
    return message.id;
  } catch (error) {
    await Plan.updateOne({ _id: plan._id, messageId: claim }, { $unset: { messageId: '' } });
    throw error;
  }
}

async function refresh(i, scope, document, profile) {
  if (scope === 'p') {
    await publish(i, document);
    if (profile.goals.length) await syncPublicPlans(i, document._id);
    return reply(i, i.customId.split(':')[4].startsWith('apply-')
      ? updateView(document, i, Number(i.customId.split(':')[6]) || 0, [], 'Updated.')
      : manageView(document, i));
  }
  validatePlan(document.activities);
  templateView(document, i);
  profile.markModified('drafts');
  await profile.save();
  return reply(i, templateView(document, i));
}

async function accessibleThreads(i) {
  const parents = [config.STUDY_TABLE_CHANNEL_ID || COMMUNITY_CHANNELS['Study Table'], config.CHALLENGE_LOUNGE_CHANNEL_ID || COMMUNITY_CHANNELS.Challenger];
  const active = await i.guild.channels.fetchActiveThreads();
  const threads = new Map(active.threads);
  for (const parentId of parents) {
    const parent = await i.guild.channels.fetch(parentId).catch(() => null);
    if (!parent?.threads) continue;
    const archived = await parent.threads.fetchArchived({ type: parentId === parents[0] ? 'private' : 'public', limit: 100 }).catch(() => null);
    for (const [id, thread] of archived?.threads || []) threads.set(id, thread);
  }
  const member = await i.guild.members.fetch(i.user.id);
  const allowed = [];
  for (const thread of threads.values()) {
    if (!parents.includes(thread.parentId) || thread.locked) continue;
    if (!thread.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel)) continue;
    const ab = thread.parentId === parents[0];
    if (ab) {
      if (thread.type !== ChannelType.PrivateThread) continue;
      if (!await thread.members.fetch(i.user.id).catch(() => null)) continue;
    }
    if (!ab && thread.archived) continue;
    allowed.push({
      label: `${ab ? 'AB' : 'Challenge'}: ${thread.name}`,
      value: thread.id,
      threadId: thread.id,
      kind: ab ? 'ab' : 'challenge',
    });
  }
  return allowed.sort((a, b) => a.label.localeCompare(b.label));
}

function goalLine(goal, profile, plans, day) {
  const activity = profile.catalog.find((entry) => entry.id === goal.activityId);
  const label = goal.type === 'consistency' ? 'Study days'
    : `${activity?.icon || ''} ${activity?.name || 'Activity'} ${goal.type === 'tasks' ? 'Tasks' : 'days'}`;
  const progress = goalProgress(goal, plans, day);
  const filled = Math.min(5, Math.floor((progress / goal.target) * 5));
  return `${safe(label.slice(0, 60))} · **${progress}/${goal.target}** ${'▰'.repeat(filled)}${'▱'.repeat(5 - filled)}`;
}

async function publicGoals(i, profile, day) {
  if (!profile.goals.length) return '';
  const range = { $gte: weekOf(day), $lt: utcDay(midnight(weekOf(day)) + DAY * 7) };
  const plans = await Plan.find({ ...key(i), day: range }).lean();
  const lines = profile.goals.slice(0, 3).map((goal) => goalLine(goal, profile, plans, day));
  if (profile.goals.length > 3) lines.push(`+${profile.goals.length - 3} more · /study goals`);
  return `**Weekly goals · ${weekOf(day)}**\n${lines.join('\n')}`;
}

async function syncPublicPlans(i, exclude) {
  const range = { $gte: utcDay(Date.now() - DAY), $lte: utcDay() };
  const plans = await Plan.find({ ...key(i), day: range }).lean();
  for (const plan of plans) {
    if (plan.messageId && String(plan._id) !== String(exclude)) await publish(i, plan);
  }
}

function templatesView(i, profile, notice = '') {
  const id = identity(i);
  const names = profile.templates.map((t) => `📋 ${safe(t.name)}`).join('\n');
  const data = payload(`${notice ? `${notice}\n\n` : ''}${names || 'No templates yet.'}`,
    [row(button('Create', id('template-create')), button('Open / Edit', id('template-open')))],
    'Your study templates');
  const parentPlan = returnPlan(i);
  data.backTo = parentPlan ? ['p', parentPlan, 'back'] : false;
  return data;
}

async function findPostView(i, explicitDay) {
  const plan = explicitDay
    ? await Plan.findOne({ ...key(i), day: explicitDay })
    : await Plan.findOne(key(i)).sort({ day: -1 });
  if (!plan) return payload(explicitDay ? 'No plan exists for that day.' : 'No Study Streak posts yet. Use /study start to begin.');
  const data = manageView(plan, i);
  data.embeds[0].title = explicitDay ? 'Your Study Streak' : 'Your latest Study Streak';
  const alternatives = [];
  const today = utcDay();
  if (plan.day !== today) alternatives.push(button('Start / Open today', identity(i)('today')));
  if (Date.now() < midnight(today) + DAY / 2 && plan.day !== utcDay(Date.now() - DAY)) {
    const yesterday = await Plan.findOne({ ...key(i), day: utcDay(Date.now() - DAY) });
    if (yesterday) alternatives.push(button('Update yesterday', identity(i, 'p', String(yesterday._id))('update')));
  }
  if (alternatives.length) data.components.push(row(...alternatives));
  return data;
}

async function goalsView(i, profile, page = 0) {
  const plans = await Plan.find({ ...key(i), day: { $gte: weekOf(utcDay()) } }).lean();
  const lines = profile.goals.slice(page * 10, page * 10 + 10)
    .map((goal) => goalLine(goal, profile, plans, utcDay()));
  const id = identity(i);
  const navigation = [];
  if (page > 0) navigation.push(button('Previous goals', id('goals-page', '-', page - 1)));
  if ((page + 1) * 10 < profile.goals.length) navigation.push(button('Next goals', id('goals-page', '-', page + 1)));
  return payload(`Week of ${weekOf(utcDay())} · Monday–Sunday UTC\n\n${lines.join('\n') || 'No goals yet. Goals are optional and do not affect your streak.'}`, [row(button('➕ Create', id('goal-create')), button('✏️ Edit', id('goal-edit')), button('🗑️ Delete', id('goal-delete'))), ...(navigation.length ? [row(...navigation)] : [])], 'Weekly goals');
}

async function statsView(i, page = 0) {
  const [plans, profile, attendance] = await Promise.all([
    Plan.find(key(i)).sort({ day: -1 }).lean(),
    profileFor(i),
    StudyCheckIn.findOne({ userId: i.user.id }).lean(),
  ]);
  const result = totals(plans);
  const activities = result.activities.map((a) => ({
    ...a, ...(profile.catalog.find((entry) => entry.id === a.id) || {}),
  }));
  const missed = attendance?.expiredTimestamp < Date.now()
    ? Math.ceil((Date.now() - attendance.expiredTimestamp) / DAY) : 0;
  const point = missed > (attendance?.freezePoint || 0) ? 0 : attendance?.point || 0;
  const lines = activities.slice(page * 20, page * 20 + 20).map((a) => `${safe(a.icon)} **${safe(a.name)}** — studied ${a.days} days`);
  const goals = await goalsView(i, profile);
  return payload(`🔥 Current streak: **${point} days**\n🏆 Highest streak: **${attendance?.highestPoint || 0} days**\n✅ Tasks completed: **${result.tasks}**\n\n${lines.join('\n') || 'No Activities yet.'}\n\n${goals.embeds[0].description}\n\nActivity page ${page + 1}/${Math.max(1, Math.ceil(activities.length / 20))}`, [], `${i.user.displayName || i.user.username}’s Study statistics`);
}

function getItem(activities, value) {
  const [aid, tid] = value.split('~');
  const activity = activities.find((a) => a.id === aid);
  if (!activity) throw new Error('That Activity no longer exists. Reopen the plan.');
  const item = tid ? activity.tasks.find((t) => t.id === tid) : activity;
  if (!item) throw new Error('That Task no longer exists. Reopen the plan.');
  return { activity, item, tid };
}

async function handleAction(i) {
  const [, owner, scope, docId, originalAction, arg, pageText] = i.customId.split(':');
  if (owner !== i.user.id) throw new Error('These controls belong to another member. Use /study start for your own plan.');
  const page = Number(pageText) || 0;
  let action = originalAction.replace(/^page-/, '');
  if (['menu', 'add-choice', 'hub'].includes(action)) [action] = i.values;
  const selectedValues = action.startsWith('apply-')
    ? i.message?.components?.flatMap((r) => r.components)
      .find((c) => (c.customId || c.custom_id)?.split(':')[4] === 'select-items')?.options?.filter((o) => o.default).map((o) => o.value) || []
    : i.values || [];
  if (action.startsWith('apply-')) action = `set-${action.slice(6)}`;
  const opensModal = ['template-create', 'new-activity', 'edit', 'icon', 'tasks',
    'rename-template', 'save-template', 'goal-type', 'goal-activity', 'goal-target'].includes(action);
  if (!opensModal) await acknowledge(i);
  const profile = await profileFor(i);
  const id = identity(i, scope, docId);
  let document;
  if (scope === 'p') document = await Plan.findOne({ ...key(i), _id: docId });
  if (scope === 't') document = profile.drafts.find((t) => t.id === docId);
  if (scope !== 'm' && !document) throw new Error('That plan or template no longer exists.');
  const activities = document?.activities;
  if (action === 'back') {
    if (scope === 'p') return reply(i, manageView(document, i));
    if (scope === 't') return reply(i, templateView(document, i));
    return reply(i, await findPostView(i));
  }
  if (action === 'latest') return reply(i, await findPostView(i));
  if (action === 'templates') return reply(i, templatesView(i, profile));
  if (action === 'goals') return reply(i, await goalsView(i, profile));
  if (action === 'stats') return reply(i, await statsView(i));
  if (action === 'manage') {
    if (scope !== 'p') throw new Error('Open a daily plan first.');
    assertEditable(document.day, true);
    return reply(i, manageView(document, i));
  }
  if (action === 'update' || action === 'select-items') {
    if (scope !== 'p') throw new Error('Open a daily plan first.');
    assertEditable(document.day, false);
    return reply(i, updateView(document, i, page, action === 'select-items' ? i.values : []));
  }
  if (action === 'today') {
    const plan = await Plan.findOne({ ...key(i), day: utcDay() });
    if (plan) return reply(i, manageView(plan, i));
    return reply(i, payload('Start today’s plan.', [row(button('Use Template', identity(i)('use')), button('Start Fresh', identity(i)('fresh')))]));
  }
  if (action === 'goals-page') return reply(i, await goalsView(i, profile, page));

  if (originalAction.startsWith('page-')) {
    if (action === 'goal-activity') return reply(i, picker(id, action, profile.catalog.map((a) => ({ label: `${a.icon} ${a.name}`, value: a.id })), page, false, arg));
    if (action === 'thread') {
      if (scope === 'p') assertEditable(document.day, true);
      await acknowledge(i);
      const options = await accessibleThreads(i);
      return reply(i, picker(id, action, [{ label: 'Remove link', value: 'unlink' }, ...options.map(({ label, value }) => ({ label, value }))], page, false, arg));
    }
    if (action === 'goal-target' || action === 'goal-confirm') return reply(i, picker(id, action, profile.goals.map((g) => ({ label: `${g.type}: ${profile.catalog.find((a) => a.id === g.activityId)?.name || 'Study days'} / ${g.target}`, value: g.id })), page));
  }

  if (action === 'fresh') { await acknowledge(i); return startPlan(i, []); }
  if (action === 'use') return reply(i, picker(id, 'start-template', profile.templates.map((t) => ({ label: t.name, value: t.id }))));
  if (action === 'start-template') {
    const template = profile.templates.find((t) => t.id === i.values[0]);
    if (!template) throw new Error('That template no longer exists.');
    await acknowledge(i);
    return startPlan(i, template.activities);
  }
  if (action === 'template-create') return showModal(i, id('new-template'), 'Create template', [['name', 'Template name', '', 60]]);
  if (action === 'new-template') {
    const unsaved = profile.drafts.filter((draft) =>
      !profile.templates.some((template) => template.id === draft.id));
    if (profile.templates.length + unsaved.length >= 5) throw new Error('You can save up to five templates.');
    const template = { id: shortId(), name: i.fields.getTextInputValue('name').trim(), activities: [] };
    if (!template.name) throw new Error('Enter a template name.');
    profile.drafts.push(template);
    await profile.save();
    return reply(i, templateView(template, i));
  }
  if (action === 'template-open') {
    const options = [...profile.templates, ...profile.drafts.filter((draft) =>
      !profile.templates.some((template) => template.id === draft.id))];
    const data = picker(id, 'open-template', options.map((t) => ({ label: t.name, value: t.id })));
    data.backTo = ['m', '-', 'templates'];
    return reply(i, data);
  }
  if (action === 'open-template') {
    let template = profile.drafts.find((t) => t.id === i.values[0]);
    if (!template) {
      const saved = profile.templates.find((t) => t.id === i.values[0]);
      if (!saved) throw new Error('That template no longer exists.');
      template = structuredClone(saved);
      profile.drafts.push(template);
      await profile.save();
    }
    if (!template) throw new Error('That template no longer exists.');
    return reply(i, templateView(template, i));
  }
  if (action === 'saved') {
    validatePlan(document.activities);
    templateView(document, i);
    if (!document.name.trim()) throw new Error('Enter a template name.');
    const index = profile.templates.findIndex((template) => template.id === docId);
    if (index < 0 && profile.templates.length >= 5) throw new Error('You can save up to five templates.');
    if (index < 0) profile.templates.push(structuredClone(document));
    else profile.templates[index] = structuredClone(document);
    for (const activity of document.activities) {
      const entry = profile.catalog.find((a) => a.id === activity.id);
      if (entry) { entry.name = activity.name; entry.icon = activity.icon; }
    }
    profile.markModified('catalog');
    profile.markModified('templates');
    profile.drafts = profile.drafts.filter((draft) => draft.id !== docId);
    await profile.save();
    return reply(i, templatesView(i, profile, 'Template saved.'));
  }
  if (action === 'cancel-template') {
    profile.drafts = profile.drafts.filter((draft) => draft.id !== docId);
    await profile.save();
    return reply(i, templatesView(i, profile, 'Draft discarded.'));
  }
  if (action === 'delete-template') return reply(i, payload(`Delete ${safe(document.name)}? Past daily plans will remain.`, [row(button('Confirm deletion', id('confirm-delete-template'), 4))]));
  if (action === 'confirm-delete-template') {
    profile.templates = profile.templates.filter((t) => t.id !== docId);
    profile.drafts = profile.drafts.filter((t) => t.id !== docId);
    await profile.save();
    return reply(i, templatesView(i, profile, 'Template deleted.'));
  }
  if (action === 'rename-template') return showModal(i, id('template-name'), 'Rename template', [['name', 'Template name', document.name, 60]]);
  if (action === 'template-name') { document.name = i.fields.getTextInputValue('name').trim(); return refresh(i, scope, document, profile); }
  if (action === 'save-template') return showModal(i, id('copy-template'), 'Save daily plan as template', [['name', 'Template name', '', 60]]);
  if (action === 'copy-template') {
    if (profile.templates.length >= 5) throw new Error('You can save up to five templates.');
    const name = i.fields.getTextInputValue('name').trim();
    if (!name) throw new Error('Enter a template name.');
    const template = { id: shortId(), name, activities: freshActivities(activities) };
    validatePlan(template.activities);
    templateView(template, i);
    profile.templates.push(template);
    await profile.save();
    return reply(i, manageView(document, i));
  }

  if (action.startsWith('goal-') || action === 'set-goal' || action === 'confirm-goal-delete') {
    const goalOptions = profile.goals.map((g) => ({ value: g.id, label: `${g.type}: ${profile.catalog.find((a) => a.id === g.activityId)?.name || 'Study days'} / ${g.target}` }));
    if (action === 'goal-create') return reply(i, picker(id, 'goal-type', ['frequency', 'tasks', 'consistency'].map((type) => ({ label: { frequency: 'Activity: days per week', tasks: 'Activity: Tasks per week', consistency: 'Overall: study days per week' }[type], value: type }))));
    if (action === 'goal-type') {
      const type = i.values[0];
      if (type === 'consistency') return showModal(i, id('set-goal', 'consistency~-'), 'Weekly study days', [['target', 'Days per week (1–7)', '', 8]]);
      return reply(i, picker(id, 'goal-activity', profile.catalog.map((a) => ({ label: `${a.icon} ${a.name}`, value: a.id })), 0, false, type));
    }
    if (action === 'goal-activity') return showModal(i, id('set-goal', `${arg}~${i.values[0]}`), 'Weekly Activity goal', [['target', arg === 'tasks' ? 'Tasks per week' : 'Days per week (1–7)', '', 8]]);
    if (action === 'goal-edit' || action === 'goal-delete') return reply(i, picker(id, action === 'goal-edit' ? 'goal-target' : 'goal-confirm', goalOptions));
    if (action === 'goal-target') {
      const goal = profile.goals.find((g) => g.id === i.values[0]);
      if (!goal) throw new Error('That goal no longer exists.');
      return showModal(i, id('set-goal', `${goal.type}~${goal.activityId || '-'}`), 'Edit weekly target', [['target', 'Weekly target', String(goal.target), 8]]);
    }
    if (action === 'goal-confirm') return reply(i, payload('Delete this goal? Your study records will remain.', [row(button('Confirm deletion', id('confirm-goal-delete', i.values[0]), 4))]));
    if (action === 'confirm-goal-delete') profile.goals = profile.goals.filter((g) => g.id !== arg);
    if (action === 'set-goal') {
      const [type, activityId] = arg.split('~');
      const goal = { id: shortId(), type, activityId: activityId === '-' ? undefined : activityId, target: Number(i.fields.getTextInputValue('target')) };
      validateGoal(goal);
      if (goal.activityId && !profile.catalog.some((a) => a.id === goal.activityId)) throw new Error('That Activity no longer exists.');
      profile.goals = profile.goals.filter((g) =>
        !(g.type === type && g.activityId === goal.activityId));
      profile.goals.push(goal);
    }
    await profile.save();
    await syncPublicPlans(i);
    return reply(i, await goalsView(i, profile));
  }

  const structural = !['pick-done', 'pick-abandoned', 'pick-unchecked', 'set-done', 'set-abandoned', 'set-unchecked'].includes(action);
  if (scope === 'p') assertEditable(document.day, structural);
  if (action === 'add') {
 return reply(i, picker(id, 'add-choice', [
    { label: 'New Activity', value: 'new-activity' },
    { label: 'Reuse Activity', value: 'reuse-activity' },
    { label: 'Add Tasks to an Activity', value: 'pick-tasks' },
  ]));
}
  if (action === 'reuse-activity' || action === 'reuse-choice') {
    if (action === 'reuse-activity' || originalAction.startsWith('page-')) return reply(i, picker(id, 'reuse-choice', profile.catalog.filter((a) => !activities.some((entry) => entry.id === a.id)).map((a) => ({ label: `${a.icon} ${a.name}`, value: a.id })), page));
    const entry = profile.catalog.find((a) => a.id === i.values[0]);
    if (!entry) throw new Error('That Activity no longer exists.');
    activities.push({ ...entry, tasks: [], state: 'unchecked' });
  } else if (action === 'new-activity') {
    return showModal(i, id('create-activity'), 'New Activity', [['name', 'Activity name', '', 60], ['icon', 'Activity emoji', '', 80, 1, false], ['tasks', 'Optional Tasks, one per line', '', 1500, 2, false]]);
  } else if (action === 'create-activity') {
    const name = i.fields.getTextInputValue('name').trim();
    let entry = profile.catalog.find((a) =>
      a.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (!entry) {
      entry = { id: shortId(), name, icon: i.fields.getTextInputValue('icon').trim() || '📚' };
      profile.catalog.push(entry);
    }
    activities.push({
      ...entry, state: 'unchecked', tasks: parseTasks(i.fields.getTextInputValue('tasks')),
    });
  } else if (action.startsWith('pick-') || originalAction.startsWith('page-')) {
    let mode = action.replace(/^pick-/, '');
    if (action.startsWith('set-')) mode = action.slice(4);
    const output = { done: 'set-done', abandoned: 'set-abandoned', unchecked: 'set-unchecked', edit: 'edit', remove: 'remove', icon: 'icon', tasks: 'tasks', link: 'link' }[mode];
    if (!output) throw new Error('Reopen this editor to continue.');
    const onlyActivities = mode === 'icon' || mode === 'tasks';
    return reply(i, picker(id, output, onlyActivities ? activities.map((a) => ({ label: `${a.icon} ${a.name}`, value: a.id })) : itemChoices(activities, ['done', 'abandoned', 'unchecked'].includes(mode)), page, ['done', 'abandoned', 'unchecked'].includes(mode)));
  } else if (action.startsWith('set-')) {
    const state = action.slice(4);
    if (!['done', 'abandoned', 'unchecked'].includes(state)) throw new Error('Invalid state.');
    if (!selectedValues.length) throw new Error('Select at least one item first.');
    for (const value of selectedValues) {
      const { activity, item, tid } = getItem(activities, value);
      if (!tid && activity.tasks.length) throw new Error('Complete or abandon individual Tasks under this Activity.');
      item.state = state;
    }
  } else if (['edit', 'icon', 'tasks'].includes(action)) {
    const value = i.values[0];
    const { item } = getItem(activities, value);
    const field = action === 'icon' ? ['icon', 'Activity emoji', item.icon, 80] : action === 'tasks' ? ['tasks', 'New Tasks, one per line', '', 1500, 2] : ['name', 'Name', item.name, value.includes('~') ? 100 : 60];
    return showModal(i, id(`write-${action}`, value), 'Edit study plan', [field]);
  } else if (action.startsWith('write-')) {
    const { item, activity, tid } = getItem(activities, arg);
    const field = action.slice(6);
    if (field === 'tasks') { activity.tasks.push(...parseTasks(i.fields.getTextInputValue('tasks'))); activity.state = 'unchecked'; } else if (field === 'icon') item.icon = i.fields.getTextInputValue('icon').trim();
    else item.name = i.fields.getTextInputValue('name').trim();
    if (scope === 'p' && !tid && field !== 'tasks') {
      const entry = profile.catalog.find((a) => a.id === activity.id);
      if (entry) { entry.name = item.name; entry.icon = item.icon; profile.markModified('catalog'); }
    }
  } else if (action === 'remove') {
    return reply(i, payload('Remove this item from the plan?', [row(button('Confirm removal', id('confirm-remove', i.values[0]), 4))]));
  } else if (action === 'confirm-remove') {
    const { activity, tid } = getItem(activities, arg);
    if (tid) { activity.tasks = activity.tasks.filter((t) => t.id !== tid); if (!activity.tasks.length) activity.state = 'unchecked'; } else document.activities = activities.filter((a) => a.id !== activity.id);
  } else if (action === 'link') {
    await acknowledge(i);
    const options = await accessibleThreads(i);
    return reply(i, picker(id, 'thread', [{ label: 'Remove link', value: 'unlink' }, ...options.map(({ label, value }) => ({ label, value }))], 0, false, i.values[0]));
  } else if (action === 'thread') {
    const { item } = getItem(activities, arg);
    if (i.values[0] === 'unlink') delete item.link;
    else {
      await acknowledge(i);
      const thread = (await accessibleThreads(i)).find((t) => t.threadId === i.values[0]);
      if (!thread) throw new Error('That thread is no longer available to you.');
      item.link = { kind: thread.kind, threadId: thread.threadId };
    }
  } else throw new Error('Reopen /study to continue.');

  validatePlan(document.activities);
  if (scope === 'p') {
    assertEditable(document.day, structural);
    // Validate displayed limits before saving an edit.
    planView(document, i.user.id);
    document.markModified('activities');
    await profile.save();
    await document.save();
  }
  return refresh(i, scope, document, profile);
}

function parseTasks(text) {
  return text.split('\n').map((name) => name.trim()).filter(Boolean).map((name) => ({ id: shortId(), name, state: 'unchecked' }));
}

export async function handleStudy(i) {
  try {
    if (!i.guildId || i.channelId !== config.STUDY_CHECK_IN_CHANNEL_ID) {
      return reply(i, payload('Use Study Streak in the study-streak channel.'));
    }
    if (!i.isChatInputCommand()) return await handleAction(i);
    const command = i.options.getSubcommand();
    await i.deferReply({ ephemeral: command !== 'stats' });
    const profile = await profileFor(i);
    const id = identity(i);
    if (command === 'start') {
      const plan = await Plan.findOne({ ...key(i), day: utcDay() });
      if (plan) return await startPlan(i, plan.activities);
      return reply(i, payload('Start today’s Study Streak. Completing items is optional for your overall streak.', [row(button('📋 Use Template', id('use')), button('✨ Start Fresh', id('fresh')))]));
    }
    if (command === 'plan') {
      const day = i.options.getString('date');
      if (day && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(midnight(day)) || utcDay(midnight(day)) !== day)) throw new Error('Use a valid UTC date in YYYY-MM-DD format.');
      return reply(i, await findPostView(i, day));
    }
    if (command === 'template') return reply(i, templatesView(i, profile));
    if (command === 'goals') return reply(i, await goalsView(i, profile));
    if (command === 'stats') return reply(i, await statsView(i, (i.options.getInteger('page') || 1) - 1));
    return undefined;
  } catch (error) {
    const expected = !error.code && error.name !== 'VersionError' && error.name !== 'CastError';
    if (!expected) console.error('Study Streak interaction failed:', error);
    const content = error.name === 'VersionError' ? 'Another edit was saved first. Reopen the plan and try again.' : error.name === 'CastError' ? 'That plan is no longer available.' : error.code ? 'Could not save this change. Please reopen /study and try again.' : error.message;
    return reply(i, payload(content));
  }
}
