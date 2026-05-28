import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../types/commands';
import { handleCompileCommand } from '../sharedCompile';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('compile')
    .setDescription('Compile and run code')
    .addStringOption((option) => option.setName('language').setDescription('The programming language').setRequired(false))
    .addStringOption((option) => option.setName('code').setDescription('The code to run').setRequired(false))
    .addAttachmentOption((option) => option.setName('file').setDescription('A file to compile').setRequired(false)),
  async execute(interaction) {
    const language = interaction.options.getString('language') ?? undefined;
    const code = interaction.options.getString('code') ?? '';
    const attachment = interaction.options.getAttachment('file') ?? undefined;

    await interaction.deferReply();
    const reply = await handleCompileCommand(code, language, attachment, interaction.user.id);
    await interaction.editReply(reply);
  },
};

export default command;
