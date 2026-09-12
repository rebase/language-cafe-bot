import MatchMatchTopic from '../../models/match-match-topic.js';

const getCurrentMatchMatchTopic = (matchMatchTopicModel = MatchMatchTopic) =>
  matchMatchTopicModel.findOne().sort({ createdAt: 1, _id: 1 });

export default getCurrentMatchMatchTopic;
