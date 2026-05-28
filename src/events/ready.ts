import { Events, REST, Routes } from 'discord.js';
import { Event } from '../types/commands';
import { slashCommands, contextCommands } from '../handlers/commandHandler';
import { ENV } from '../config';

const event: Event = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user?.tag}!`);
    try {
      const toRegister = [
        ...slashCommands.map(c => c.data.toJSON()),
        ...contextCommands.map(c => c.data.toJSON())
      ];
      const rest = new REST({ version: '10' }).setToken(ENV.DISCORD_TOKEN);
      console.log('Started refreshing application (/) commands.');
      await rest.put(Routes.applicationCommands(client.user!.id), { body: toRegister });
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error(error);
    }
  },
};

export default event;
