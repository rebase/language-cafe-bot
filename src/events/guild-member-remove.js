import { Events } from 'discord.js';
import NewMember from '../models/NewMember.js';

export default {
  name: Events.GuildMemberRemove,
  execute: async (member) => {
    await NewMember.deleteOne({ id: member.id });
  },
};
