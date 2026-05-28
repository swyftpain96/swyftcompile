import { Collection } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { SlashCommand, MessageCommand, ContextCommand } from '../types/commands';

export const slashCommands = new Collection<string, SlashCommand>();
export const messageCommands = new Collection<string, MessageCommand>();
export const prefixCommands: MessageCommand[] = [];
export const contextCommands = new Collection<string, ContextCommand>();

export function loadCommands() {
  // Load Slash Commands
  const slashPath = path.join(__dirname, '../commands/slash');
  if (fs.existsSync(slashPath)) {
    const slashFiles = fs.readdirSync(slashPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of slashFiles) {
      const command: SlashCommand = require(`../commands/slash/${file}`).default;
      if (command && command.data && command.data.name) {
        slashCommands.set(command.data.name, command);
      }
    }
  }

  // Load Message Commands
  const messagePath = path.join(__dirname, '../commands/message');
  if (fs.existsSync(messagePath)) {
    const messageFiles = fs.readdirSync(messagePath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of messageFiles) {
      const command: MessageCommand = require(`../commands/message/${file}`).default;
      if (command && command.name && command.trigger) {
        if (command.type === 'equals') {
          messageCommands.set(command.trigger, command);
        } else if (command.type === 'prefix') {
          prefixCommands.push(command);
        }
      }
    }
  }

  // Load Context Menu Commands
  const contextPath = path.join(__dirname, '../commands/context');
  if (fs.existsSync(contextPath)) {
    const contextFiles = fs.readdirSync(contextPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of contextFiles) {
      const command: ContextCommand = require(`../commands/context/${file}`).default;
      if (command && command.data && command.data.name) {
        contextCommands.set(command.data.name, command);
      }
    }
  }
}
