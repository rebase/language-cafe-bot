import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import StudyBuddy from '../../../models/study-buddy.js';

export default async (interaction) => {
  const studyBuddy = await StudyBuddy.findOne({
    id: interaction.user.id,
  });

  const modal = new ModalBuilder()
    .setCustomId('register-my-study-buddy-listing')
    .setTitle('Register study buddy listing');

  const targetLanguage = new TextInputBuilder()
    .setCustomId('targetLanguage')
    .setLabel('Put target languages')
    .setPlaceholder('ex: Korean, Japanese (Put comma to separate languages)')
    .setValue(studyBuddy?.targetLanguage || '')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500);

  const level = new TextInputBuilder()
    .setCustomId('level')
    .setLabel('Put language levels')
    .setPlaceholder('ex: B1, A2 (use CEFR, put all levels even if same)')
    .setValue(studyBuddy?.level || '')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100);

  const introduction = new TextInputBuilder()
    .setCustomId('introduction')
    .setLabel('Put your introduction.')
    .setPlaceholder(
      'About you, Study Buddy, Time (hours/week), Communication method (voice calls, texting, etc.)',
    )
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(20)
    .setMaxLength(1000);

  if (studyBuddy?.introduction) {
    introduction.setValue(studyBuddy?.introduction);
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(targetLanguage),
    new ActionRowBuilder().addComponents(level),
    new ActionRowBuilder().addComponents(introduction),
  );

  await interaction.showModal(modal);
};
