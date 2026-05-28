import { MessageCommand } from '../../types/commands';
import { HELP_MESSAGE } from '../../constants/messages';

const command: MessageCommand = {
  name: 'help',
  trigger: '.help',
  type: 'equals',
  async execute(message, content) {
    await message.reply(HELP_MESSAGE);
  },
};

export default command;
