import { Events } from 'discord.js';
import getExchangeListing from '../service/interaction/is-button/get-exchange-listing.js';
import getStudyBuddyListing from '../service/interaction/is-button/get-study-buddy-listing.js';
import joinPomodoroGroup from '../service/interaction/is-button/join-pomodoro-group.js';
import cooldown from '../service/interaction/is-chat-input-command/cooldown.js';
import createNewCategory from '../service/interaction/is-modal-submit/create-new-category.js';
import GeneratePollModalSubmit from '../service/interaction/is-modal-submit/generate-poll.js';
import RegisterExchangePartnerListModalSubmit from '../service/interaction/is-modal-submit/register-my-exchange-listing.js';
import registerMyStudyBuddyListing from '../service/interaction/is-modal-submit/register-my-study-buddy-listing.js';
import channelLog, { generateInteractionCreateLogContent } from '../service/utils/channel-log.js';
import createANewMatchMatchTopic from '../service/interaction/is-modal-submit/create-a-new-match-match-topic.js';
import participateMatchMatch from '../service/interaction/is-modal-submit/participate-match-match.js';
import trackerJoinEmojiAutocomplete from '../service/interaction/is-autocomplete/tracker-join-emoji-autocomplete.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
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
    }

    if (interaction.isChatInputCommand()) {
      const cooldownRes = await cooldown(interaction);
      if (cooldownRes?.shouldReturn) return;
    }

    if (interaction.isModalSubmit()) {
      channelLog(
        generateInteractionCreateLogContent(
          interaction,
          `customId: ${interaction.customId}\ninteraction.isModalSubmit() is true`,
        ),
      );

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

      if (interaction.customId.startsWith('join-pomodoro-group')) {
        joinPomodoroGroup(interaction);
        // eslint-disable-next-line no-useless-return
        return;
      }
    }
  },
};
