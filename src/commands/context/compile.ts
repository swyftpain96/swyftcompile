import { ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';
import { ContextCommand } from '../../types/commands';
import { handleCompileCommand } from '../sharedCompile';

const command: ContextCommand = {
  data: new ContextMenuCommandBuilder()
    .setName('Compile Message')
    .setType(ApplicationCommandType.Message),
  async execute(interaction) {
    const targetMessage = interaction.targetMessage;
    await interaction.deferReply();
    const attachment = targetMessage.attachments.first() ?? undefined;
    const reply = await handleCompileCommand(targetMessage.content, undefined, attachment, interaction.user.id);
    await interaction.editReply(reply);
  },
};

export default command;
