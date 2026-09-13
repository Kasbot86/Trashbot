import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  demuxProbe,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { getAllAudioUrls, getAudioUrl } from 'google-tts-api';
import ffmpegPath from 'ffmpeg-static';
import { PassThrough, Readable } from 'stream';
import type { VoiceBasedChannel } from 'discord.js';

if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

const guildQueues = new Map<string, Promise<void>>();
const guildPlayers = new Map<string, AudioPlayer>();

async function fetchMp3Buffer(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
      Accept: '*/*',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch TTS audio (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function bufferToBinaryStream(buffer: Buffer): Readable {
  const stream = new PassThrough();
  stream.end(buffer);
  return stream;
}

async function createMp3Resource(buffer: Buffer) {
  const stream = bufferToBinaryStream(buffer);
  const { stream: probed, type } = await demuxProbe(stream);
  return createAudioResource(probed, { inputType: type });
}

function speakTextUrls(text: string): string[] {
  const options = {
    lang: 'en',
    slow: false,
    host: 'https://translate.google.com',
  };
  if (text.length > 200) {
    return getAllAudioUrls(text, options).map((u) => u.url);
  }
  return [getAudioUrl(text, options)];
}

function ensureConnection(voiceChannel: VoiceBasedChannel): VoiceConnection {
  const existing = getVoiceConnection(voiceChannel.guild.id);
  if (
    existing &&
    existing.state.status !== VoiceConnectionStatus.Destroyed &&
    existing.joinConfig.channelId === voiceChannel.id
  ) {
    return existing;
  }
  if (existing) {
    existing.destroy();
  }
  return joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });
}

async function playText(
  voiceChannel: VoiceBasedChannel,
  text: string,
): Promise<void> {
  const urls = speakTextUrls(text);
  const buffers: Buffer[] = [];
  for (const url of urls) {
    const buf = await fetchMp3Buffer(url);
    if (!buf.length) {
      throw new Error('TTS returned empty audio');
    }
    buffers.push(buf);
  }

  const connection = ensureConnection(voiceChannel);
  await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

  let player = guildPlayers.get(voiceChannel.guild.id);
  if (!player) {
    player = createAudioPlayer();
    guildPlayers.set(voiceChannel.guild.id, player);
  }
  connection.subscribe(player);

  for (const buffer of buffers) {
    const resource = await createMp3Resource(buffer);
    await new Promise<void>((resolve, reject) => {
      const onIdle = () => {
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        player!.off(AudioPlayerStatus.Idle, onIdle);
        player!.off('error', onError);
      };
      player!.once(AudioPlayerStatus.Idle, onIdle);
      player!.once('error', onError);
      player!.play(resource);
    });
  }
}

/** Queue TTS so overlapping chat messages speak in order per guild. */
export function enqueueSpeak(
  voiceChannel: VoiceBasedChannel,
  text: string,
): Promise<void> {
  const guildId = voiceChannel.guild.id;
  const previous = guildQueues.get(guildId) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => playText(voiceChannel, text));
  guildQueues.set(
    guildId,
    next.catch((err) => {
      console.error('TTS queue error:', err);
    }),
  );
  return next;
}
