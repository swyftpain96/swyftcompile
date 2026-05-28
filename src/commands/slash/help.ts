import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../types/commands';
import { HELP_MESSAGE } from '../../constants/messages';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help message'),
  async execute(interaction) {
    await interaction.reply(HELP_MESSAGE);
  },
};

export default command;
