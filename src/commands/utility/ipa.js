import axios from 'axios';
import { SlashCommandBuilder } from 'discord.js';
import { JSDOM } from 'jsdom';
import { COLORS } from '../../constants/index.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';
import { checkMaxContentLength } from '../../utils/index.js';

const data = new SlashCommandBuilder()
  .setName('ipa')
  .setDescription('Get the Transcription of a word')
  .addStringOption((option) =>
    option
      .setName('input')
      .setMaxLength(20)
      .setDescription('The word to get the Transcription of')
      .setRequired(true),
  );

export default {
  data,
  async execute(interaction) {
    await interaction.deferReply();
    const input = interaction.options.getString('input');

    channelLog(generateInteractionCreateLogContent(interaction, `input: ${input}`));

    const inputForUrl = input.replace(/ /g, '_');

    try {
      const url = `https://en.wiktionary.org/wiki/${inputForUrl}`;

      const wiktionaryRes = await axios.get(url);

      const dom = new JSDOM(wiktionaryRes.data);

      const { window } = dom;
      const { document } = window;

      const h2Elements = document.querySelector('.mw-parser-output').querySelectorAll('H2');

      const h2Parents = [];

      h2Elements.forEach((h2) => {
        h2Parents.push(h2.parentElement);
      });

      const extractedGroups = [];

      h2Parents.forEach((h2Parent, index) => {
        const nextH2Parent = h2Parents[index + 1];

        let currentElement = h2Parent.nextElementSibling;
        const groupFragment = document.createDocumentFragment();

        while (currentElement !== nextH2Parent && currentElement !== null) {
          if (currentElement.nodeType === window.Node.ELEMENT_NODE) {
            groupFragment.appendChild(currentElement.cloneNode(true));
          }
          currentElement = currentElement.nextSibling;
        }

        if (groupFragment.childNodes.length > 0) {
          extractedGroups.push(groupFragment);
        }
      });

      const languageGroup = [];

      extractedGroups.forEach((group, index) => {
        if (group.querySelector('.IPA')) {
          const ipaElements = group.querySelectorAll('.IPA');

          const ipaArray = [];
          const dialect = [];

          for (let i = 0; i < ipaElements.length; i++) {
            if (ipaElements[i].textContent) {
              ipaArray.push(ipaElements[i].textContent);
              dialect.push(ipaElements[i].parentElement.getElementsByClassName('extiw'));
            }
          }

          const dialectContent = dialect.map((e) => {
            if (e?.length) {
              const tempArray = [];
              for (let i = 0; i < e.length; i++) {
                if (e[i].textContent !== 'key') tempArray.push(e[i].textContent);
              }
              return tempArray.join(', ');
            }
            return '';
          });

          const ipaContent = ipaArray
            .filter((ipa) => ipa.startsWith('/') || ipa.startsWith('['))
            .map((ipa, i) => {
              if (dialectContent[i] === '') return `${ipa}`;
              return `${ipa} (${dialectContent[i]})`;
            });

          languageGroup.push({
            language: h2Elements[index].textContent,
            ipa: ipaContent,
          });
        }
      });

      const filteredLanguageGroup = languageGroup.filter((group) => group.ipa.length);

      let content = filteredLanguageGroup
        .map((group) => `**${group.language}**\n${group.ipa.join('\n')}`)
        .join('\n\n');

      if (content === '') {
        content +=
          "It looks like the Wiktionary page for the word you entered doesn't have an IPA transcription available.\n\n";
        content += `However, you can visit the word's Wiktionary page by clicking [here](${url}) for additional information.`;
      }

      const additionalContent = `\n[See more on Wiktionary](${url})`;
      content += additionalContent;

      content = checkMaxContentLength({ length: 4096, content, additionalContent });

      const embed = {
        color: COLORS.PRIMARY,
        title: `Transcription for ${input}`,
        description: content,
      };

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      if (error.response && error.response.status === 404) {
        await interaction.editReply({
          embeds: [
            {
              color: COLORS.PRIMARY,
              title: 'No IPA found.',
              description: 'Please check your spelling and try again.',
            },
          ],
          ephemeral: true,
        });
        return;
      }
      console.error(error);
    }
  },
};
