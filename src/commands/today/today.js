import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('today')
    .setDescription('Lists all scheduled events happening today.'),

  async execute({ interaction }) {
    channelLog(generateInteractionCreateLogContent(interaction));

    const guild = interaction.guild;

    const events = await guild.scheduledEvents.fetch();

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));


    const todaysEvents = events.filter((event) => {
      const start = new Date(event.scheduledStartTimestamp);
      return start >= startOfDay && start <= endOfDay;
    });

    if (!todaysEvents.size) {
      return interaction.reply('There are no scheduled events for today.');
    }

    const embed = new EmbedBuilder()
      .setTitle(`Events for ${new Date().toLocaleDateString()}`)
      .setColor(COLORS.PRIMARY);

    todaysEvents.forEach((event) => {
      const startTime = `<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:t>`;
      embed.addFields({
        name: event.name,
        value: `Starts at: ${startTime}`,
      });
    });

    await interaction.reply({ embeds: [embed] });
  },
};
