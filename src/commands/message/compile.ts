import { Message, TextChannel } from 'discord.js';
import { MessageCommand } from '../../types/commands';
import { handleCompileCommand } from '../sharedCompile';
import { CODE_BLOCK_REGEX } from '../compileHelpers';

const command: MessageCommand = {
  name: 'compile',
  trigger: '.compile',
  type: 'prefix',
  async execute(message: Message, content: string) {
    // Show typing indicator immediately so the user knows we received the command
    if (message.channel instanceof TextChannel || 'sendTyping' in message.channel) {
      message.channel.sendTyping().catch(() => {});
    }

    let argsString = '';
    if (content.startsWith('.compile')) {
      argsString = content.slice('.compile'.length).trim();
    } else if (message.client.user) {
      const mention1 = `<@${message.client.user.id}>`;
      const mention2 = `<@!${message.client.user.id}>`;
      if (content.startsWith(mention1)) {
        argsString = content.slice(mention1.length).trim();
      } else if (content.startsWith(mention2)) {
        argsString = content.slice(mention2.length).trim();
      }
    }
    const attachment = message.attachments.first() ?? undefined;

    // If the user is replying to another message, pull code from that message
    // if no code/attachment was provided in the current message.
    const referencedMessage = message.reference
      ? await message.fetchReference().catch(() => null)
      : null;

    if (referencedMessage && !attachment) {
      const refContent = referencedMessage.content;
      const refAttachment = referencedMessage.attachments.first() ?? undefined;

      // Check if the referenced message has a codeblock
      const hasCodeBlock = CODE_BLOCK_REGEX.test(refContent);

      if (hasCodeBlock || refAttachment) {
        // argsString here is potentially an explicit language override (e.g. ".compile js")
        // If there's an explicit word in argsString, treat it as the language override
        const langOverride = argsString.trim() || undefined;

        // Build combined content: if user provided a language override, inject it
        // so that parseCompileInput can pick it up as explicitLang
        const codeSource = hasCodeBlock ? refContent : '';
        const reply = await handleCompileCommand(
          codeSource,
          langOverride,
          refAttachment,
          message.author.id
        );
        await message.reply(reply);
        return;
      }
    }

    const reply = await handleCompileCommand(argsString, undefined, attachment, message.author.id);
    await message.reply(reply);
  },
};

export default command;
