import assert from 'node:assert/strict';
import {
  isSubmissionForTopic,
  normalizeMatchMatchText,
} from '../src/service/utils/match-match-text.js';
import getCurrentMatchMatchTopic from '../src/service/utils/match-match-topic.js';

assert.equal(normalizeMatchMatchText(' Air  craft '), 'AIRCRAFT');
assert.equal(normalizeMatchMatchText('air-craft'), 'AIRCRAFT');
assert.equal(isSubmissionForTopic('aircraft', 'air'), true);
assert.equal(isSubmissionForTopic('aircraft', 'craft'), true);
assert.equal(isSubmissionForTopic('air traffic', 'air'), true);
assert.equal(isSubmissionForTopic('AIR-CRAFT', 'craft'), true);
assert.equal(isSubmissionForTopic('water bottle', 'air'), false);
assert.equal(normalizeMatchMatchText('aircraft'), normalizeMatchMatchText('air craft'));
assert.equal(normalizeMatchMatchText('aircraft'), normalizeMatchMatchText('air-craft'));

let appliedSort;
const expectedTopic = { topic: 'air' };
const matchMatchTopicModel = {
  findOne: () => ({
    sort: async (sort) => {
      appliedSort = sort;
      return expectedTopic;
    },
  }),
};
const currentTopic = await getCurrentMatchMatchTopic(matchMatchTopicModel);

assert.deepEqual(appliedSort, { createdAt: 1, _id: 1 });
assert.equal(currentTopic, expectedTopic);

console.info('Match-match text tests passed.');
