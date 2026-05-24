import { Events, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import NewMember from '../models/NewMember.js';

export default {
  name: Events.GuildMemberAdd,
  execute: async (member) => {
    const newMember = await NewMember.findOne({ id: member.id });

    if (newMember) {
      return;
    }

    const startButton = new ButtonBuilder()
      .setCustomId('dm-server-tutorial-start')
      .setLabel('Start Tutorial')
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(startButton);
    await member.send({
      content: `# Welcome to the Language Cafe discord server!

To help you get started, I can guide you through a short tutorial covering the server's channels, rules, features, and how everything works.
To start the tutorial, please press the button below.
To skip it, simply ignore this message.`,
      components: [row],
    });

    await NewMember.create({
      id: member.id,
      tutorialStep: 0,
    });
  },
};
