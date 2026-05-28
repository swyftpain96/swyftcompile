import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../types/commands';
import { LANGUAGES_MESSAGE } from '../../constants/messages';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('languages')
    .setDescription('Show supported languages'),
  async execute(interaction) {
    await interaction.reply(LANGUAGES_MESSAGE);
  },
};

export default command;
