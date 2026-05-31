import { Events } from 'discord.js';
import { Event } from '../types/commands';
import { deployApplicationCommands } from '../deployCommands';

const event: Event = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user?.tag}!`);
    try {
      await deployApplicationCommands();
    } catch (error) {
      console.error(error);
    }
  },
};

export default event;
