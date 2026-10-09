import { Events } from 'discord.js';
import getExchangeListing from '../service/interaction/is-button/get-exchange-listing.js';
import getStudyBuddyListing from '../service/interaction/is-button/get-study-buddy-listing.js';
import pomodoro from '../service/utils/pomodoro.js';
import cooldown from '../service/interaction/is-chat-input-command/cooldown.js';
import createNewCategory from '../service/interaction/is-modal-submit/create-new-category.js';
import GeneratePollModalSubmit from '../service/interaction/is-modal-submit/generate-poll.js';
import RegisterExchangePartnerListModalSubmit from '../service/interaction/is-modal-submit/register-my-exchange-listing.js';
import registerMyStudyBuddyListing from '../service/interaction/is-modal-submit/register-my-study-buddy-listing.js';
import channelLog, { generateInteractionCreateLogContent } from '../service/utils/channel-log.js';
import createANewMatchMatchTopic from '../service/interaction/is-modal-submit/create-a-new-match-match-topic.js';
import participateMatchMatch from '../service/interaction/is-modal-submit/participate-match-match.js';
import trackerJoinEmojiAutocomplete from '../service/interaction/is-autocomplete/tracker-join-emoji-autocomplete.js';
import dmServerTutorial from '../service/interaction/is-button/dm-server-tutorial.js';
import {
  handleEventRemoveConfirm,
  handleEventRemoveCancel,
} from '../service/interaction/is-chat-input-command/event-remove.js';
import { handleLiveEventCreateModalSubmit } from '../service/interaction/is-chat-input-command/live-event-create.js';
import { handleLiveEventEditModalSubmit } from '../service/interaction/is-chat-input-command/live-event-edit.js';
import {
  handleLiveEventRemoveConfirm,
  handleLiveEventRemoveCancel,
} from '../service/interaction/is-chat-input-command/live-event-remove.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // ── Autocomplete ──────────────────────────────────────────────────────────
    if (interaction.isAutocomplete()) {
      channelLog(
        generateInteractionCreateLogContent(
          interaction,
          `commandName: ${interaction.commandName}\ninteraction.isAutocomplete() is true`,
        ),
      );

      if (interaction.commandName === 'tracker-join') {
        trackerJoinEmojiAutocomplete(interaction);
        return;
      }
      if (interaction.commandName === 'event') {
        const { handleEventNameAutocomplete } =
          await import('../service/interaction/is-autocomplete/event-name-autocomplete.js');
        handleEventNameAutocomplete(interaction);
        return;
      }
      if (interaction.commandName === 'channel') {
        const { handleChannelEmojiAutocomplete } =
          await import('../service/interaction/is-autocomplete/channel-emoji-autocomplete.js');
        handleChannelEmojiAutocomplete(interaction);
        return;
      }
      if (interaction.commandName === 'live-event') {
        const { handleLiveEventNameAutocomplete } =
          await import('../service/interaction/is-autocomplete/live-event-name-autocomplete.js');
        handleLiveEventNameAutocomplete(interaction);
        return;
      }
    }

    if (interaction.isChatInputCommand()) {
      const cooldownRes = await cooldown(interaction);
      if (cooldownRes?.shouldReturn) return;
    }

    // ── Modal submits ─────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      channelLog(
        generateInteractionCreateLogContent(
          interaction,
          `customId: ${interaction.customId}\ninteraction.isModalSubmit() is true`,
        ),
      );

      if (interaction.customId.startsWith('live-event-create-modal\x00')) {
        handleLiveEventCreateModalSubmit(interaction);
        return;
      }
      if (interaction.customId.startsWith('live-event-edit-modal\x00')) {
        handleLiveEventEditModalSubmit(interaction);
        return;
      }
      if (interaction.customId === 'generate-poll') {
        GeneratePollModalSubmit(interaction);
        return;
      }
      if (interaction.customId === 'register-my-exchange-listing') {
        RegisterExchangePartnerListModalSubmit(interaction);
        return;
      }
      if (interaction.customId === 'register-my-study-buddy-listing') {
        registerMyStudyBuddyListing(interaction);
        return;
      }
      if (interaction.customId === 'create-new-category') {
        createNewCategory(interaction);
        return;
      }
      if (interaction.customId === 'create-a-new-match-match-topic') {
        createANewMatchMatchTopic(interaction);
        return;
      }
      if (interaction.customId === 'participate-match-match') {
        participateMatchMatch(interaction);
        return;
      }
    }

    // ── Buttons ───────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      channelLog(
        generateInteractionCreateLogContent(
          interaction,
          `customId: ${interaction.customId}\ninteraction.isButton() is true`,
        ),
      );

      if (interaction.customId.startsWith('get-exchange-partner')) {
        getExchangeListing(interaction);
        return;
      }
      if (interaction.customId.startsWith('get-study-buddy')) {
        getStudyBuddyListing(interaction);
        return;
      }
      if (interaction.customId.startsWith('pomodoro:')) {
        await pomodoro.handle(interaction);
        return;
      }
      if (interaction.customId.startsWith('join-pomodoro-group')) {
        await interaction.reply({ content: 'Use /pomodoro join for the updated group list.', ephemeral: true });
        return;
      }
      if (interaction.customId.startsWith('dm-server-tutorial')) {
        dmServerTutorial(interaction);
        // eslint-disable-next-line no-useless-return
        return;
      }
      if (interaction.customId.startsWith('event-remove-confirm:')) {
        handleEventRemoveConfirm(interaction);
        return;
      }
      if (interaction.customId.startsWith('event-remove-cancel:')) {
        handleEventRemoveCancel(interaction);
        return;
      }
      if (interaction.customId.startsWith('live-event-remove-confirm:')) {
        handleLiveEventRemoveConfirm(interaction);
        return;
      }
      if (interaction.customId.startsWith('live-event-remove-cancel:')) {
        handleLiveEventRemoveCancel(interaction);
      }
    }
  },
};
