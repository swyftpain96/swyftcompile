import {
  ChatInputCommandInteraction,
  Message,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  Client,
} from 'discord.js';

export interface SlashCommand {
  data: any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface MessageCommand {
  name: string;
  trigger: string;
  type: 'equals' | 'prefix';
  execute: (message: Message, content: string) => Promise<void>;
}

export interface ContextCommand {
  data: ContextMenuCommandBuilder;
  execute: (interaction: MessageContextMenuCommandInteraction) => Promise<void>;
}

export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => void | Promise<void>;
}
