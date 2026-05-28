import { Client, GatewayIntentBits } from 'discord.js';
import { ENV } from './config';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { initDockerDaemons } from './executor/docker';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

async function startBot() {
  await initDockerDaemons();
  
  // Load commands and events
  loadCommands();
  loadEvents(client);

  await client.login(ENV.DISCORD_TOKEN);
}

startBot().catch(console.error);
