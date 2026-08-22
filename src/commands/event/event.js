import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import createEvent from '../../service/interaction/is-chat-input-command/create-event.js';
import editEvent from '../../service/interaction/is-chat-input-command/edit-event.js';
import eventInfo from '../../service/interaction/is-chat-input-command/event-info.js';
import eventLeaderboard from '../../service/interaction/is-chat-input-command/event-leaderboard.js';
import eventExport from '../../service/interaction/is-chat-input-command/event-export.js';
import eventRemove from '../../service/interaction/is-chat-input-command/event-remove.js';
import {
  eventPointsAdd,
  eventPointsRemove,
} from '../../service/interaction/is-chat-input-command/event-points.js';
import {
  eventParticipantRemove,
  eventParticipantBan,
} from '../../service/interaction/is-chat-input-command/event-participant.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';
import { handleEventNameAutocomplete } from '../../service/interaction/is-autocomplete/event-name-autocomplete.js';

const EVENT_TYPES = [
  { name: 'Reading', value: 'Reading' },
  { name: 'Listening', value: 'Listening' },
  { name: 'Speaking', value: 'Speaking' },
  { name: 'Writing', value: 'Writing' },
  { name: 'Live Event', value: 'Live Event' },
  { name: 'Mixed', value: 'Mixed' },
  { name: 'Other', value: 'Other' },
];

// Reusable autocomplete event name option
const eventNameOption = (o) =>
  o.setName('event_name').setDescription('Event name').setRequired(true).setAutocomplete(true);

const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Event management commands')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)

  // ── /event create ──────────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('create')
      .setDescription('Create a new event')
      .addStringOption((o) =>
        o.setName('name').setDescription('Event name').setRequired(true).setMaxLength(100),
      )
      .addStringOption((o) =>
        o
          .setName('event_type')
          .setDescription('Type of event')
          .setRequired(true)
          .addChoices(...EVENT_TYPES),
      )
      .addStringOption((o) =>
        o
          .setName('hashtag')
          .setDescription('Hashtag used to identify submissions (e.g. #SummerReads)')
          .setRequired(true)
          .setMaxLength(100),
      )
      .addChannelOption((o) =>
        o
          .setName('submission_channel')
          .setDescription('Channel where submissions are tracked')
          .setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName('start_date')
          .setDescription('Start date/time in UTC (YYYY-MM-DDTHH:MM or YYYY-MM-DD HH:MM)')
          .setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName('end_date')
          .setDescription('End date/time in UTC (YYYY-MM-DDTHH:MM or YYYY-MM-DD HH:MM)')
          .setRequired(true),
      )
      .addIntegerOption((o) =>
        o
          .setName('points_per_submission')
          .setDescription('Points awarded per valid submission (leave empty for tracking-only)')
          .setRequired(false)
          .setMinValue(1),
      )
      .addIntegerOption((o) =>
        o
          .setName('max_points')
          .setDescription('Maximum points a participant can earn (required if points set)')
          .setRequired(false)
          .setMinValue(1),
      )
      .addIntegerOption((o) =>
        o
          .setName('creator_bonus')
          .setDescription('Additional points added to creator total on export (0 = none)')
          .setRequired(false)
          .setMinValue(0),
      )
      .addStringOption((o) =>
        o
          .setName('event_post_link')
          .setDescription('Optional link to the original event post')
          .setRequired(false),
      ),
  )

  // ── /event edit ────────────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('edit')
      .setDescription('Edit an existing event')
      .addStringOption(eventNameOption)
      .addStringOption((o) =>
        o.setName('name').setDescription('New event name').setRequired(false).setMaxLength(100),
      )
      .addStringOption((o) =>
        o
          .setName('event_type')
          .setDescription('New event type')
          .setRequired(false)
          .addChoices(...EVENT_TYPES),
      )
      .addStringOption((o) =>
        o.setName('hashtag').setDescription('New hashtag').setRequired(false).setMaxLength(100),
      )
      .addChannelOption((o) =>
        o.setName('submission_channel').setDescription('New submission channel').setRequired(false),
      )
      .addStringOption((o) =>
        o.setName('start_date').setDescription('New start date/time in UTC').setRequired(false),
      )
      .addStringOption((o) =>
        o.setName('end_date').setDescription('New end date/time in UTC').setRequired(false),
      )
      .addIntegerOption((o) =>
        o
          .setName('points_per_submission')
          .setDescription('New points per submission')
          .setRequired(false)
          .setMinValue(1),
      )
      .addIntegerOption((o) =>
        o
          .setName('max_points')
          .setDescription('New maximum points')
          .setRequired(false)
          .setMinValue(1),
      )
      .addIntegerOption((o) =>
        o
          .setName('creator_bonus')
          .setDescription('New creator bonus (0 = none)')
          .setRequired(false)
          .setMinValue(0),
      )
      .addStringOption((o) =>
        o
          .setName('event_post_link')
          .setDescription('New event post link (leave blank to clear)')
          .setRequired(false),
      ),
  )

  // ── /event info ────────────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('info')
      .setDescription('Show the details and status of an event')
      .addStringOption(eventNameOption),
  )

  // ── /event leaderboard ─────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('leaderboard')
      .setDescription("Post and pin the live leaderboard in the event's submission channel")
      .addStringOption(eventNameOption),
  )

  // ── /event export ──────────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('export')
      .setDescription('Generate t@scores point allocation commands for an event')
      .addStringOption(eventNameOption),
  )

  // ── /event remove ──────────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Permanently delete an event and all its data')
      .addStringOption(eventNameOption),
  )

  // ── /event points ──────────────────────────────────────────────────────────
  .addSubcommandGroup((group) =>
    group
      .setName('points')
      .setDescription('Manually adjust participant points')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Add points to a participant')
          .addStringOption(eventNameOption)
          .addUserOption((o) =>
            o.setName('user').setDescription('Target participant').setRequired(true),
          )
          .addIntegerOption((o) =>
            o
              .setName('amount')
              .setDescription('Number of points to add')
              .setRequired(true)
              .setMinValue(1),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Remove points from a participant')
          .addStringOption(eventNameOption)
          .addUserOption((o) =>
            o.setName('user').setDescription('Target participant').setRequired(true),
          )
          .addIntegerOption((o) =>
            o
              .setName('amount')
              .setDescription('Number of points to remove')
              .setRequired(true)
              .setMinValue(1),
          ),
      ),
  )

  // ── /event participant ─────────────────────────────────────────────────────
  .addSubcommandGroup((group) =>
    group
      .setName('participant')
      .setDescription('Manage event participants')
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Remove a participant and all their tracked event data')
          .addStringOption(eventNameOption)
          .addUserOption((o) =>
            o.setName('user').setDescription('Participant to remove').setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('ban')
          .setDescription('Prevent a participant from earning further points')
          .addStringOption(eventNameOption)
          .addUserOption((o) =>
            o.setName('user').setDescription('Participant to ban').setRequired(true),
          ),
      ),
  );

export default {
  data,

  async execute(interaction) {
    // Handle autocomplete for event_name across all subcommands
    if (interaction.isAutocomplete()) {
      return handleEventNameAutocomplete(interaction);
    }

    channelLog(generateInteractionCreateLogContent(interaction));

    const sub = interaction.options.getSubcommand(false);
    const group = interaction.options.getSubcommandGroup(false);

    if (group === 'points') {
      if (sub === 'add') return eventPointsAdd(interaction);
      if (sub === 'remove') return eventPointsRemove(interaction);
    }

    if (group === 'participant') {
      if (sub === 'remove') return eventParticipantRemove(interaction);
      if (sub === 'ban') return eventParticipantBan(interaction);
    }

    if (sub === 'create') return createEvent(interaction);
    if (sub === 'edit') return editEvent(interaction);
    if (sub === 'info') return eventInfo(interaction);
    if (sub === 'leaderboard') return eventLeaderboard(interaction);
    if (sub === 'export') return eventExport(interaction);
    if (sub === 'remove') return eventRemove(interaction);

    return interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });
  },
};
