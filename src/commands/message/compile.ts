import { MessageCommand } from '../../types/commands';
import { handleCompileCommand } from '../sharedCompile';

const command: MessageCommand = {
  name: 'compile',
  trigger: '.compile',
  type: 'prefix',
  async execute(message, content) {
    const argsString = content.slice('.compile'.length).trim();
    const attachment = message.attachments.first() ?? undefined;
    const reply = await handleCompileCommand(argsString, undefined, attachment, message.author.id);
    await message.reply(reply);
  },
};

export default command;
