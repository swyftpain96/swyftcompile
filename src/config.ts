import { config } from 'dotenv';
config();

export const ENV = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
};

if (!ENV.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}
