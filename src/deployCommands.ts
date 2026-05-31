import { ApplicationIntegrationType, InteractionContextType, REST, Routes } from 'discord.js';
import { ENV } from './config';
import { contextCommands, loadCommands, slashCommands } from './handlers/commandHandler';

const commandIntegrationTypes = [
  ApplicationIntegrationType.GuildInstall,
  ApplicationIntegrationType.UserInstall,
];

const commandContexts = [
  InteractionContextType.Guild,
  InteractionContextType.BotDM,
  InteractionContextType.PrivateChannel,
];

function toUserInstallableCommandJson(command: { data: { toJSON: () => object } }) {
  return {
    ...command.data.toJSON(),
    integration_types: commandIntegrationTypes,
    contexts: commandContexts,
  };
}

export async function deployApplicationCommands() {
  const toRegister = [
    ...slashCommands.map(toUserInstallableCommandJson),
    ...contextCommands.map(toUserInstallableCommandJson),
  ];

  const rest = new REST({ version: '10' }).setToken(ENV.DISCORD_TOKEN);
  console.log(`Started refreshing application commands for ${ENV.DISCORD_CLIENT_ID}.`);
  await rest.put(Routes.applicationCommands(ENV.DISCORD_CLIENT_ID), { body: toRegister });
  console.log(`Successfully reloaded ${toRegister.length} application command(s).`);
}

if (require.main === module) {
  loadCommands();
  deployApplicationCommands().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
