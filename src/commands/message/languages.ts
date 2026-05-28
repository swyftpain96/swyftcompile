import { MessageCommand } from '../../types/commands';
import { LANGUAGES_MESSAGE } from '../../constants/messages';

const command: MessageCommand = {
  name: 'languages',
  trigger: '.languages',
  type: 'equals',
  async execute(message, content) {
    await message.reply(LANGUAGES_MESSAGE);
  },
};

export default command;
