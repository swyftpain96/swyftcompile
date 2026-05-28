import { Events, Message } from 'discord.js';
import { Event } from '../types/commands';
import { messageCommands, prefixCommands } from '../handlers/commandHandler';

const event: Event = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return;
    const content = message.content.trim();

    // exact matches
    const exact = messageCommands.get(content);
    if (exact) {
      await exact.execute(message, content);
      return;
    }

    // prefix matches
    for (const cmd of prefixCommands) {
      if (content.startsWith(cmd.trigger)) {
        await cmd.execute(message, content);
        return;
      }
    }
  },
};

export default event;
