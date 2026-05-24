import { ButtonStyle, ButtonBuilder, ActionRowBuilder } from 'discord.js';
import NewMember from '../../../models/NewMember.js';
import config from '../../../config/index.js';

const { SERVER_ID: serverId } = config;

export default async (interaction) => {
  await interaction.deferUpdate().catch((error) => {
    const UNKNOWN_INTERACTION = 10062;
    const UNKNOWN_MESSAGE = 10008;
    if (error?.code !== UNKNOWN_INTERACTION && error?.code !== UNKNOWN_MESSAGE) throw error;
  });

  const member = await NewMember.findOne({ id: interaction.user.id });
  if (!member) return;

  const { tutorialDmId } = member;
  let { tutorialStep } = member;

  if (interaction.customId === 'dm-server-tutorial-complete') {
    await NewMember.updateOne({ id: interaction.user.id }, { tutorialDmId: null, tutorialStep: 0 });
    await interaction.message.delete();
    return;
  }

  if (interaction.customId === 'dm-server-tutorial-start' && tutorialDmId != null) {
    const temp = await interaction.user.send(
      'Tutorial in progress. Please complete the current tutorial first.',
    );
    setTimeout(() => temp.delete(), 2000);
    return;
  }

  const nextStepButton = new ButtonBuilder()
    .setCustomId('dm-server-tutorial-next-step')
    .setLabel('Next')
    .setStyle(ButtonStyle.Primary);
  const prevStepButton = new ButtonBuilder()
    .setCustomId('dm-server-tutorial-prev-step')
    .setLabel('Previous')
    .setStyle(ButtonStyle.Secondary);
  const completeButton = new ButtonBuilder()
    .setCustomId('dm-server-tutorial-complete')
    .setLabel('Complete Tutorial')
    .setStyle(ButtonStyle.Primary);
  const buttonsRow = new ActionRowBuilder();

  const stepContent = [
    `First, choose your target and fluent/native languages [here](https://discord.com/channels/${serverId}/customize-community). If the link doesn't work, please select the server and click "Customize Community" at the top of the server.`,
    'Step 2',
    'Step 3',
    'Step 4',
    `Tutorial complete!

Have fun, be respectful, and enjoy your time in the community!
You may restart this tutorial at any time by pressing the start button again.
`,
  ];

  if (interaction.customId === 'dm-server-tutorial-next-step') {
    const maxStep = stepContent.length - 1;
    tutorialStep = Math.min(tutorialStep + 1, maxStep);
  } else if (interaction.customId === 'dm-server-tutorial-prev-step') {
    tutorialStep = Math.max(tutorialStep - 1, 0);
  }
  await NewMember.updateOne({ id: interaction.user.id }, { tutorialStep });

  const content = `Step ${tutorialStep + 1} of ${stepContent.length}\n` + stepContent[tutorialStep];
  if (tutorialStep === 0) {
    buttonsRow.addComponents(nextStepButton);
    if (tutorialDmId == null) {
      const startDm = await interaction.user.send({
        content,
        components: [buttonsRow],
      });
      await NewMember.updateOne({ id: interaction.user.id }, { tutorialDmId: startDm.id });
      return;
    }
  } else if (tutorialStep === stepContent.length - 1) {
    buttonsRow.addComponents(prevStepButton, completeButton);
  } else {
    buttonsRow.addComponents(prevStepButton, nextStepButton);
  }
  await interaction.message.edit({
    content,
    components: [buttonsRow],
  });
};
