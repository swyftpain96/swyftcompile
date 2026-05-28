import { Events, Interaction } from 'discord.js';
import { Event } from '../types/commands';
import { slashCommands, contextCommands } from '../handlers/commandHandler';

const event: Event = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      const command = slashCommands.get(interaction.commandName);
      if (command) {
        try {
          await command.execute(interaction);
        } catch (error) {
          console.error(`Error executing ${interaction.commandName}`, error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
          } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
          }
        }
      }
    } else if (interaction.isMessageContextMenuCommand()) {
      const command = contextCommands.get(interaction.commandName);
      if (command) {
        try {
          await command.execute(interaction);
        } catch (error) {
          console.error(`Error executing ${interaction.commandName}`, error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
          } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
          }
        }
      }
    }
  },
};

export default event;
