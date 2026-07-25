import axios from 'axios';
import { SlashCommandBuilder, escapeMarkdown } from 'discord.js';
import { JSDOM } from 'jsdom';
import { COLORS } from '../../constants/index.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';
import { checkMaxContentLength } from '../../utils/index.js';

const API_URL = 'https://en.wiktionary.org/w/api.php';
const HEADERS = {
  'User-Agent': 'LanguageCafeBot/1.0 (https://github.com/rebase/language-cafe-bot)',
};
const REQUEST_TIMEOUT_MS = 8000;

const wikiApi = axios.create({
  baseURL: API_URL,
  headers: HEADERS,
  timeout: REQUEST_TIMEOUT_MS,
});

const data = new SlashCommandBuilder()
  .setName('etymology')
  .setDescription('Get the etymology of a word')
  .addStringOption((option) =>
    option
      .setName('input')
      .setMaxLength(20)
      .setDescription('The word to get the etymology of')
      .setRequired(true),
  );

// Fetch the section list for a page (cheap - no rendered content).
async function getSections(word) {
  const { data: sectionsResponse } = await wikiApi.get('', {
    params: { action: 'parse', page: word, prop: 'sections', format: 'json' },
  });
  return sectionsResponse;
}

// Fetch the rendered HTML for a single section.
async function getSectionHtml(word, sectionIndex) {
  const { data: textResponse } = await wikiApi.get('', {
    params: { action: 'parse', page: word, section: sectionIndex, prop: 'text', format: 'json' },
  });
  return textResponse?.parse?.text?.['*'] ?? '';
}

// Turns the small rendered HTML fragment for one section into plain-ish text.
function extractTextFromSectionHtml(html) {
  const dom = new JSDOM(`<div>${html}</div>`);
  const { document } = dom.window;

  document.querySelectorAll('sup, style, script, .mw-editsection').forEach((el) => el.remove());

  return [...document.querySelectorAll('p')]
    .map((p) => p.textContent.trim())
    .filter(Boolean)
    .join('\n');
}

// Single pass: track the current language heading as we walk the sections,
// and tag each Etymology section with whichever language it falls under.
function findEtymologySections(sections) {
  let currentLanguage = 'Unknown';
  const etymologySections = [];

  sections.forEach((section) => {
    if (section.toclevel === 1) {
      currentLanguage = section.line;
    }
    if (/^Etymology(?:\s+\d+)?$/.test(section.line)) {
      etymologySections.push({ ...section, language: currentLanguage });
    }
  });

  return etymologySections;
}

function createMissingEtymologyEmbed(input, pageUrl) {
  return {
    color: COLORS.PRIMARY,
    title: `Etymology for ${input}`,
    description:
      "It looks like the Wiktionary page for the word you entered doesn't have an etymology available.\n\n" +
      `However, you can visit the word's Wiktionary page by clicking [here](${pageUrl}) for additional information.`,
  };
}

export default {
  data,
  async execute(interaction) {
    await interaction.deferReply();

    const input = interaction.options.getString('input');
    channelLog(generateInteractionCreateLogContent(interaction, `input: ${input}`));

    const pageUrl = `https://en.wiktionary.org/wiki/${input.replace(/ /g, '_')}`;

    try {
      const sectionsRes = await getSections(input);

      if (sectionsRes.error) {
        if (sectionsRes.error.code === 'missingtitle') {
          await interaction.editReply({
            embeds: [
              {
                color: COLORS.PRIMARY,
                title: 'No etymology found.',
                description: 'Please check your spelling and try again.',
              },
            ],
          });
          return;
        }
        throw new Error(sectionsRes.error.info || 'Unknown MediaWiki API error');
      }

      const sections = sectionsRes?.parse?.sections ?? [];
      const etymologySections = findEtymologySections(sections);

      if (etymologySections.length === 0) {
        await interaction.editReply({ embeds: [createMissingEtymologyEmbed(input, pageUrl)] });
        return;
      }

      const etymologySettled = await Promise.allSettled(
        etymologySections.map(async (section) => {
          const html = await getSectionHtml(input, section.index);
          return { language: section.language, text: extractTextFromSectionHtml(html) };
        }),
      );

      const etymologyResults = etymologySettled
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);

      const languageGroups = new Map();
      etymologyResults
        .filter((result) => result.text)
        .forEach(({ language, text }) => {
          const existing = languageGroups.get(language) ?? [];
          existing.push(text);
          languageGroups.set(language, existing);
        });

      let content = [...languageGroups.entries()]
        .map(
          ([language, etymologies]) =>
            `**${escapeMarkdown(language)}**\n${etymologies.map((e) => escapeMarkdown(e)).join('\n\n')}`,
        )
        .join('\n\n');

      if (content === '') {
        await interaction.editReply({ embeds: [createMissingEtymologyEmbed(input, pageUrl)] });
        return;
      }

      const additionalContent = `\n[See more on Wiktionary](${pageUrl})`;
      content = checkMaxContentLength({
        length: 4096,
        content: `${content}${additionalContent}`,
        additionalContent,
      });

      await interaction.editReply({
        embeds: [{ color: COLORS.PRIMARY, title: `Etymology for ${input}`, description: content }],
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            title: 'Something went wrong.',
            description: `I couldn't fetch the etymology right now. You can check manually [here](${pageUrl}).`,
          },
        ],
      });
    }
  },
};
