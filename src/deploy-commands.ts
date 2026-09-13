import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { Command } from './types';

function isSourceModule(file: string): boolean {
  return (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts');
}

async function deploy() {
  const commands: object[] = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(isSourceModule);

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const command: Command = require(filePath).default ?? require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`[WARNING] Command at ${filePath} is missing "data" or "execute".`);
    }
  }

  const rest = new REST().setToken(config.token);

  try {
    console.log(`Refreshing ${commands.length} application (/) commands...`);

    if (config.guildId) {
      const data = (await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands },
      )) as unknown[];
      console.log(
        `Successfully reloaded ${data.length} guild commands for guild ${config.guildId}.`,
      );
    } else {
      const data = (await rest.put(Routes.applicationCommands(config.clientId), {
        body: commands,
      })) as unknown[];
      console.log(`Successfully reloaded ${data.length} global application commands.`);
    }
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    process.exit(1);
  }
}

deploy();
