import { Events } from 'discord.js';
import config from '../config/index.js';
import { refreshStudyHelp } from '../service/utils/study-help.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.info(`Ready! Logged in as ${client.user.tag}`);
    if (config.STUDY_CHECK_IN_CHANNEL_ID) {
      const channel = await client.channels.fetch(config.STUDY_CHECK_IN_CHANNEL_ID)
        .catch((error) => { console.error('Could not fetch Study Streak channel:', error.message); return null; });
      await refreshStudyHelp(channel, client.user.id, config);
    }
  },
};
