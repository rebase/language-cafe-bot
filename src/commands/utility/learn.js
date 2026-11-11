import { SlashCommandBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder } from 'discord.js';
import {
  LANGUAGE_ALIASES,
  WEBSITE_LANGUAGES_URL,
  WEBSITE_LANGUAGES_URL_TO_NAME,
  COLORS,
} from '../../constants/index.js';

const MAX_NUM_MATCHES_TO_SHOW = 3;

function createDisplayLink(languageUrl) {
  const websiteLink = 'https://www.languagecafe.world/languages/' + languageUrl;
  return `[${WEBSITE_LANGUAGES_URL_TO_NAME[languageUrl]}](<${websiteLink}>)`;
}

function normalizeLanguage(query) {
  const normalized = query.toLowerCase().replace(/-|_/g, ' ').replace(/[()]/g, '');
  if (normalized.length === 0) return 'XXX';

  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }

  return normalized;
}

const allLanguagesSearchable = [];
for (const language of WEBSITE_LANGUAGES_URL) {
  const urlName = language;
  const normalized = normalizeLanguage(language);
  const compact = normalized.replace(/ /g, '');
  const words = normalized.split(' ');
  allLanguagesSearchable.push({
    urlName,
    normalized,
    compact,
    words,
  });
}

/**
 * Returns an array of languages based on a normalized query.
 * Example matches (query -> match)
 * - "greek" -> "Greek (Modern), Ancient Greek"
 * - "ge" -> "Georgian, German"
 * - "germ" -> "German"
 * - "ma" -> "Macedonian, Malagasy, Malay-Indonesian, plus 4 more."
 * - "a g" -> "Ancient Greek"
 * - "m i" -> "Malay Indonesian"
 * - "o c s" -> "Old Church Slavonic"
 * - "fr" -> "French" (this matches since aliases were included in the normalizeString function)
 * - "francais" -> "French" (this matches the alias)
 */
function matchLanguages(query) {
  const scores = {};

  for (const language of allLanguagesSearchable) {
    const { urlName, normalized, compact, words } = language;
    scores[urlName] = 0;

    if (query === normalized || query === compact) {
      return [urlName];
    }

    if (normalized.startsWith(query) || compact.startsWith(query)) {
      scores[urlName] += 100;
      continue;
    }

    // This is designed in such a way that for a query `greek`, the languages
    // 'Ancient Greek' and 'Greek (Modern)' get the same score.
    const splitQuery = [...query.split(' '), query];
    // No reasonable query is more than four parts long including the word itself.
    if (splitQuery.length > 4) return [];
    for (const word of words) {
      for (const part of splitQuery) {
        if (word.startsWith(part)) {
          scores[urlName] += 50;
        }
      }
    }
  }

  let bestMatches = [];
  let bestScore = 0;
  for (const [language, score] of Object.entries(scores)) {
    if (score <= 0) {
      continue;
    }

    if (score === bestScore) {
      bestMatches.push(language);
    } else if (score > bestScore) {
      bestMatches = [language];
      bestScore = score;
    }
  }

  return bestMatches;
}

export default {
  data: new SlashCommandBuilder()
    .setName('learn')
    .setDescription('Show resources for learning languages.')
    .addStringOption((option) =>
      option.setName('language').setDescription('Search for a specific language in the website.'),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const rawQuery = interaction.options.getString('language');
    const resourcesText = `\
## 📚 Resources
Check out our **100+ language learning resources**, including websites, apps, study tools, dictionaries, and more!
🔗 <https://www.languagecafe.world/languages>
`;
    const faqText = `\
## 💡 Language Learning & Studying Tips
Not sure how to study effectively or looking for ways to improve your routine? **See our tips** to help you get started and make the most of your study time.
🔗 <https://www.languagecafe.world/faq>
`;

    const deleteLearnMessageButton = new ButtonBuilder()
      .setCustomId('learn-command-delete-message')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Secondary);
    const deleteLearnMessageButtonRow = new ActionRowBuilder().addComponents(
      deleteLearnMessageButton,
    );

    if (rawQuery == null) {
      const generalLanguagesGuideEmbed = {
        color: COLORS.PRIMARY,
        description: resourcesText + faqText,
      };
      await interaction.editReply({
        embeds: [generalLanguagesGuideEmbed],
        components: [deleteLearnMessageButtonRow],
      });
      return;
    }

    const query = normalizeLanguage(rawQuery);
    const matched = matchLanguages(query);
    let queryReply = '';

    const numMatches = matched.length;
    if (numMatches > 1) {
      queryReply = 'Links that match query: ';
      const numOfMatchesToShow =
        numMatches > MAX_NUM_MATCHES_TO_SHOW ? MAX_NUM_MATCHES_TO_SHOW : numMatches;
      for (let i = 0; i < numOfMatchesToShow; i++) {
        if (i > 0) queryReply += ', ';
        queryReply += createDisplayLink(matched[i]);
      }
      if (numMatches > MAX_NUM_MATCHES_TO_SHOW) {
        queryReply += `, plus ${numMatches - numOfMatchesToShow} more`;
      }
      queryReply += '.';
    } else if (numMatches === 1) {
      queryReply = `Here is the direct link for ${createDisplayLink(matched[0])}.`;
    } else {
      queryReply = 'No match found for query.';
    }

    const withQueryEmbed = {
      color: COLORS.PRIMARY,
      description: resourcesText + '\n' + queryReply + '\n' + faqText,
    };
    await interaction.editReply({
      embeds: [withQueryEmbed],
      components: [deleteLearnMessageButtonRow],
    });
  },
};
