import { config } from 'dotenv';
config();

export const ENV = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '1330646552217129020',
};

if (!ENV.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

if (!ENV.DISCORD_CLIENT_ID) {
  console.error("Missing DISCORD_CLIENT_ID in .env");
  process.exit(1);
}
