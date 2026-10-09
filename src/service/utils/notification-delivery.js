// Recover an acknowledged Discord send whose database checkpoint was interrupted.
async function findPreviousMessage(channel, record, botId) {
  let before;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const messages = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!messages.size) return null;
    const match = messages.find((message) => message.author.id === botId
      && message.content === record.content
      && message.createdTimestamp >= record.attemptedAt.getTime() - 1000);
    if (match) return match;
    const oldest = messages.last();
    if (oldest.createdTimestamp < record.attemptedAt.getTime() - 1000) return null;
    before = oldest.id;
  }
}

export default async function deliverNotification(Model, key, channel, content, botId) {
  let record;
  try {
    record = await Model.findOneAndUpdate(key, { $setOnInsert: key }, { upsert: true, new: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    record = await Model.findOne(key);
  }
  if (record.sentAt) return false;

  const now = new Date();
  record = await Model.findOneAndUpdate({
    _id: record._id,
    sentAt: null,
    $or: [{ leaseUntil: null }, { leaseUntil: { $lte: now } }],
  }, { $set: { leaseUntil: new Date(now.getTime() + 5 * 60 * 1000) } }, { new: true });
  if (!record) return false;

  try {
    let message;
    if (record.attemptedAt && record.destinationId === channel.id) {
      message = await findPreviousMessage(channel, record, botId);
    }
    if (!message) {
      record.attemptedAt = new Date();
      record.destinationId = channel.id;
      record.content = content;
      await record.save();
      message = await channel.send({ content, allowedMentions: { parse: ['users'] } });
    }
    record.sentAt = new Date();
    record.messageId = message.id;
    record.leaseUntil = null;
    await record.save();
    return true;
  } catch (error) {
    await Model.updateOne({ _id: record._id }, { $set: { leaseUntil: null } });
    throw error;
  }
}
