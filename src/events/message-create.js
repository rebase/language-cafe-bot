import { Events } from 'discord.js';
import studyCheckIn from '../service/messageCreate/study-check-in.js';
import suggestionBoxMessageCreate from '../service/messageCreate/suggestion-box.js';
import passTheCoffeeCup from '../service/messageCreate/pass-the-coffee-cup.js';
import passTheEmoji from '../service/messageCreate/emoji-blend.js';
import trackerCheckin from '../service/messageCreate/tracker-checkin.js';
import config from '../config/index.js';
import categories from '../service/messageCreate/categories.js';
import counting from '../service/messageCreate/counting.js';
import shiritori from '../service/messageCreate/shiritori.js';
import letterChange from '../service/messageCreate/letterChange.js';

const {
  SUGGESTION_BOX_CHANNEL_ID: suggestionBoxChannelId,
  PASS_THE_COFFEE_CUP_CHANNEL_ID: passTheCoffeeCupChannelId,
  EMOJI_BLEND_CHANNEL_ID: emojiBlendChannelId,
  STUDY_CHECK_IN_CHANNEL_ID: studyCheckInChannelId,
  CATEGORIES_CHANNEL_ID: categoriesChannelId,
  COUNTING_CHANNEL_ID: countingChannelId,
  LETTER_CHANGE_CHANNEL_ID: letterChangeChannelId,
  SHIRITORI_CHANNEL_ID: shiritoriChannelId,
} = config;

export default {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;

    // Handle !checkin commands in forum threads
    if (message.content.startsWith('!checkin')) {
      trackerCheckin(message);
      return;
    }

    // #study-check-in
    if (message.channel.id === studyCheckInChannelId) {
      studyCheckIn(message);
    }

    // #suggention-box
    if (message.channel.id === suggestionBoxChannelId) {
      suggestionBoxMessageCreate(message);
    }

    // ⁠#pass-the-coffee-cup
    if (message.channel.id === passTheCoffeeCupChannelId) {
      passTheCoffeeCup(message);
    }

    // #emoji-blend
    if (message.channel.id === emojiBlendChannelId) {
      passTheEmoji(message);
    }

    // #categories
    if (message.channel.id === categoriesChannelId) {
      categories(message);
    }

    // #counting
    if (message.channel.id === countingChannelId) {
      counting(message);
    }

    // #letter-change
    if (message.channel.id === letterChangeChannelId) {
      letterChange(message);
    }

    // #shiritori
    if (message.channel.id === shiritoriChannelId) {
      shiritori(message);
    }
  },
};
