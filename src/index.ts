import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeExtractor } from 'discord-player-youtubei';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { Command } from './types';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection<string, Command>();

const player = new Player(client, {
  skipFFmpeg: false,
});
client.player = player;

function isSourceModule(file: string): boolean {
  return (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts');
}

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(isSourceModule);

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = require(filePath);
    const command: Command = commandModule.default ?? commandModule;
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: /${command.data.name}`);
    } else {
      console.warn(
        `[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`,
      );
    }
  }
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(isSourceModule);

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const eventModule = require(filePath);
    const event = eventModule.default ?? eventModule;
    if (event.once) {
      client.once(event.name, (...args: unknown[]) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args: unknown[]) => event.execute(...args, client));
    }
    console.log(`Loaded event: ${event.name}`);
  }
}

async function main() {
  await loadCommands();
  await loadEvents();

  // Default extractors (SoundCloud, Spotify metadata, etc.) + YouTube via discord-player-youtubei
  await player.extractors.loadMulti(DefaultExtractors);
  await player.extractors.register(YoutubeExtractor, {});

  player.events.on('playerStart', (queue, track) => {
    const channel = queue.metadata?.channel;
    if (channel && typeof (channel as { send?: unknown }).send === 'function') {
      (channel as { send: (c: string) => Promise<unknown> })
        .send(`🎶 Now playing: **${track.title}** by ${track.author}`)
        .catch(() => null);
    }
  });

  player.events.on('error', (_queue, error) => {
    console.error('[Player Error]', error);
  });

  player.events.on('playerError', (_queue, error) => {
    console.error('[Player Playback Error]', error);
  });

  await client.login(config.token);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
