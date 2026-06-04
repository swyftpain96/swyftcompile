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

    // mention matches (act as .compile)
    if (message.client.user) {
      const mention1 = `<@${message.client.user.id}>`;
      const mention2 = `<@!${message.client.user.id}>`;
      if (content.startsWith(mention1) || content.startsWith(mention2)) {
        const compileCmd = prefixCommands.find(c => c.name === 'compile');
        if (compileCmd) {
          await compileCmd.execute(message, content);
          return;
        }
      }
    }

    // If the message is a reply to another message that starts with .compile,
    // treat the replied-to message as the full compile command
    if (message.reference) {
      const ref = await message.fetchReference().catch(() => null);
      if (ref && !ref.author.bot) {
        const refContent = ref.content.trim();
        for (const cmd of prefixCommands) {
          if (refContent.startsWith(cmd.trigger)) {
            await cmd.execute(message, refContent);
            return;
          }
        }
      }
    }
  },
};

export default event;
