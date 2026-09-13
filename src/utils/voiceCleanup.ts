import { getVoiceConnection } from '@discordjs/voice';
import { useQueue } from 'discord-player';

/** discord-player uses discord-voip; /tts uses @discordjs/voice — only one can own a guild. */
export function releaseDiscordJsVoice(guildId: string): void {
  const conn = getVoiceConnection(guildId);
  if (conn) {
    try {
      conn.destroy();
    } catch (err) {
      console.warn('Failed to destroy @discordjs/voice connection', err);
    }
  }
}

export function releaseDiscordPlayerVoice(guildId: string): void {
  try {
    const queue = useQueue(guildId);
    if (queue) {
      queue.delete();
    }
  } catch (err) {
    console.warn('Failed to clear discord-player queue', err);
  }
}
