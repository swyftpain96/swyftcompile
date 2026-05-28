import { Client } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { Event } from '../types/commands';

export function loadEvents(client: Client) {
  const eventsPath = path.join(__dirname, '../events');
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of eventFiles) {
      const event: Event = require(`../events/${file}`).default;
      if (event && event.name) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
      }
    }
  }
}
