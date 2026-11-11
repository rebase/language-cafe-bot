export default async (interaction) => {
  await interaction.deferUpdate().catch((error) => {
    const UNKNOWN_INTERACTION = 10062;
    const UNKNOWN_MESSAGE = 10008;
    if (error?.code !== UNKNOWN_INTERACTION && error?.code !== UNKNOWN_MESSAGE) throw error;
  });

  if (interaction.customId === 'learn-command-delete-message') {
    await interaction.message.delete();
  }
};
