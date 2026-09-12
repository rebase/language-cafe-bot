import { userMention } from 'discord.js';
import client from '../../client/index.js';
import config from '../../config/index.js';
import { COLORS } from '../../constants/index.js';
import MatchMatchMessage from '../../models/match-match-message.js';
import MatchMatchTopic from '../../models/match-match-topic.js';
import Point from '../../models/point.js';
import { normalizeMatchMatchText } from '../utils/match-match-text.js';
import getCurrentMatchMatchTopic from '../utils/match-match-topic.js';

const { MATCH_MATCH_CHANNEL_ID: matchMatchChannelId, MATCH_MATCH_COMMAND_ID: matchMatchCommandId } =
  config;

// `submission` is the normalized grouping key; `label` is a real spelling from
// one of the submissions, so the results embed reads "waterfall" rather than the
// stripped, upper-cased "WATERFALL".
const processMatchedSubmissions = (submissionsArr, matchMatchMessages) =>
  submissionsArr.map((submission) => {
    const matchedMessages = matchMatchMessages.filter(
      (msg) => normalizeMatchMatchText(msg.submission) === submission,
    );
    return {
      submission,
      label: matchedMessages[0]?.submission ?? submission,
      items: matchedMessages,
    };
  });

const createBulkWriteOperations = (matchedArr, points) =>
  matchedArr.reduce((acc, cur) => {
    cur.items.forEach((item) => {
      acc.push({
        updateOne: {
          filter: { id: item.id },
          update: { $inc: { matchMatch: points } },
          upsert: true,
        },
      });
    });
    return acc;
  }, []);

const createDescriptionSection = (matchedArr, points, title, emoji) => {
  if (matchedArr.length === 0) return '';
  return `\n### ${title} ${emoji} (${points} points)\n${matchedArr
    .map(
      (e) =>
        `**${e.label}**\n${e.items
          .map(
            (item) =>
              `${userMention(item.id)} ${item.submission} (${item.submissionInTargetLanguage})`,
          )
          .join('\n')}`,
    )
    .join('\n\n')}\n`;
};

const noTopicsDescription =
  "There's no match-match topic left.\nPlease ping the moderator to create a new topic.";

const sendCurrentTopicStickyMessage = async (channel) => {
  const stickyMessageTitle = 'Match-match';
  const currentMessages = await channel.messages.fetch(20);
  const stickyMessages = currentMessages.filter(
    (msg) => msg?.author?.id === config.CLIENT_ID && msg?.embeds[0]?.title === stickyMessageTitle,
  );

  await Promise.all(stickyMessages.map((msg) => msg.delete().catch(() => {})));

  const currentMatchMatchTopic = await getCurrentMatchMatchTopic();
  const numberOfSubmissions = currentMatchMatchTopic
    ? await MatchMatchMessage.countDocuments({ topicId: currentMatchMatchTopic._id })
    : 0;

  const description = currentMatchMatchTopic
    ? `Topic\n\`\`\`\n${
        currentMatchMatchTopic.topic
      }\n\`\`\`\nNumber of participants: \`${numberOfSubmissions}\`\n\n**Submission period ends **<t:${Math.floor(
        (() => {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          if (now.getTime() <= Date.now()) now.setDate(now.getDate() + 1);
          return now;
        })().getTime() / 1000,
      )}:R>\n\nClick </match-match:${matchMatchCommandId}> here and send it to participate\n\nHow to Play: https://discord.com/channels/739911855795077282/1244836542036443217/1244923513199005758\nPoint Leaderboard: </word-games-point-leaderboard:${
        config.POINTS_LEADERBOARD_COMMAND_ID
      }>`
    : noTopicsDescription;

  await channel.send({
    embeds: [
      {
        color: COLORS.PRIMARY,
        title: stickyMessageTitle,
        description,
      },
    ],
  });

  return currentMatchMatchTopic;
};

// `consume` decides whether the round is actually finished: submissions cleared
// and the topic retired. Defaults to the daily cron's production-only behavior;
// tests override it to exercise a full round without touching NODE_ENV.
const sendANewMatchMatchMessage = async ({
  consume = process.env.NODE_ENV === 'production',
} = {}) => {
  try {
    const channel = await client.channels.fetch(matchMatchChannelId);
    const matchMatchTopic = await getCurrentMatchMatchTopic();

    if (!matchMatchTopic) {
      await sendCurrentTopicStickyMessage(channel);
      return { ok: true, outcome: 'no-topic' };
    }

    // Only this round's submissions. Anything stamped with another topic belongs
    // to a different round and must not be scored here.
    const matchMatchMessages = await MatchMatchMessage.find({ topicId: matchMatchTopic._id });

    if (matchMatchMessages.length === 0) {
      await channel.send({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description: `There are no users participating in the current match-match topic: ${matchMatchTopic.topic}.`,
          },
        ],
      });

      if (consume) {
        await MatchMatchTopic.deleteOne({ _id: matchMatchTopic._id });
      }

      const nextTopic = await sendCurrentTopicStickyMessage(channel);
      return {
        ok: true,
        outcome: 'no-participants',
        topic: matchMatchTopic.topic,
        participants: 0,
        consumed: consume,
        nextTopic: nextTopic?.topic ?? null,
      };
    }

    const submissionWithCountObj = {};

    matchMatchMessages.forEach((matchMatchMessage) => {
      const normalizedSubmission = normalizeMatchMatchText(matchMatchMessage.submission);
      submissionWithCountObj[normalizedSubmission] =
        submissionWithCountObj[normalizedSubmission] + 1 || 1;
    });

    const [
      matchedTwoSubmissionArr,
      matchedThreeSubmissionArr,
      matchedFourSubmissionArr,
      overMatchedSubmissionArr,
    ] = Object.keys(submissionWithCountObj)
      .reduce(
        (acc, key) => {
          const count = submissionWithCountObj[key];
          if (count === 2) acc[0].push(key);
          else if (count === 3) acc[1].push(key);
          else if (count === 4) acc[2].push(key);
          else if (count > 4) acc[3].push(key);
          return acc;
        },
        [[], [], [], []],
      )
      .map((arr) => arr.sort());

    const matchedTwoDescriptionArr = processMatchedSubmissions(
      matchedTwoSubmissionArr,
      matchMatchMessages,
    );
    const matchedThreeDescriptionArr = processMatchedSubmissions(
      matchedThreeSubmissionArr,
      matchMatchMessages,
    );
    const matchedFourDescriptionArr = processMatchedSubmissions(
      matchedFourSubmissionArr,
      matchMatchMessages,
    );
    const overMatchedDescriptionArr = processMatchedSubmissions(
      overMatchedSubmissionArr,
      matchMatchMessages,
    );

    const notMachedParticipants = matchMatchMessages.filter((msg) => {
      const normalized = normalizeMatchMatchText(msg.submission);
      return (
        !matchedTwoSubmissionArr.includes(normalized) &&
        !matchedThreeSubmissionArr.includes(normalized) &&
        !matchedFourSubmissionArr.includes(normalized) &&
        !overMatchedSubmissionArr.includes(normalized)
      );
    });

    const bulkWriteArr = [
      ...createBulkWriteOperations(matchedTwoDescriptionArr, 50),
      ...createBulkWriteOperations(matchedThreeDescriptionArr, 25),
      ...createBulkWriteOperations(matchedFourDescriptionArr, 10),
      ...createBulkWriteOperations(overMatchedDescriptionArr, 5),
      ...notMachedParticipants.map((item) => ({
        updateOne: {
          filter: { id: item.id },
          update: { $inc: { matchMatch: 3 } },
          upsert: true,
        },
      })),
    ];

    // Points must land before anything destructive happens. `ordered: false` so a
    // single bad operation cannot skip every award after it in the batch.
    let pointsWritten = false;
    try {
      const bulkWriteRes = await Point.bulkWrite(bulkWriteArr, { ordered: false });
      const writeErrors = bulkWriteRes?.getWriteErrors?.() ?? bulkWriteRes?.writeErrors ?? [];
      if (writeErrors.length > 0) {
        // eslint-disable-next-line no-console
        console.error('match-match point write reported errors:', writeErrors);
      } else {
        pointsWritten = true;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('match-match point write failed:', error);
    }

    if (!pointsWritten) {
      await channel.send({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description: `Could not award points for the topic \`${matchMatchTopic.topic}\`, so the round was left open.\nPlease ping the moderator — submissions are kept and the round can be run again.`,
          },
        ],
      });
      return { ok: false, outcome: 'point-write-failed', topic: matchMatchTopic.topic };
    }

    const description = `# Topic: ${matchMatchTopic.topic}
    ${createDescriptionSection(
      matchedTwoDescriptionArr,
      50,
      'Matching Users',
      '😆',
    )}${createDescriptionSection(
      matchedThreeDescriptionArr,
      25,
      'Matches with 3 Users',
      '😁',
    )}${createDescriptionSection(
      matchedFourDescriptionArr,
      10,
      'Matches with 4 Users',
      '😄',
    )}${createDescriptionSection(
      overMatchedDescriptionArr,
      5,
      'Matches with More Than 4 Users',
      '😀',
    )}${
      notMachedParticipants.length > 0
        ? `\n### Users With No Match 🙂 (3 points)\n${notMachedParticipants
            .map(
              (item) =>
                `${userMention(item.id)} ${item.submission} (${item.submissionInTargetLanguage})`,
            )
            .join('\n')}`
        : ''
    }`;

    await channel.send({
      embeds: [
        {
          color: COLORS.PRIMARY,
          description,
        },
      ],
    });

    if (consume) {
      // Scoped to this round; the second clause sweeps rows written before
      // submissions carried a topic, which could otherwise never be cleared.
      await MatchMatchMessage.deleteMany({
        $or: [{ topicId: matchMatchTopic._id }, { topicId: { $exists: false } }],
      });
      await MatchMatchTopic.deleteOne({ _id: matchMatchTopic._id });
    }

    const nextTopic = await sendCurrentTopicStickyMessage(channel);

    return {
      ok: true,
      outcome: 'scored',
      topic: matchMatchTopic.topic,
      participants: matchMatchMessages.length,
      consumed: consume,
      nextTopic: nextTopic?.topic ?? null,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return { ok: false, error };
  }
};

export default sendANewMatchMatchMessage;
