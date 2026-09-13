import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from 'discord.js';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  demuxProbe,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { getAllAudioUrls, getAudioUrl } from 'google-tts-api';
import ffmpegPath from 'ffmpeg-static';
import { PassThrough, Readable } from 'stream';

if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

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
  // Readable.from(Buffer) iterates bytes as numbers (objectMode) — demuxProbe rejects that.
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

export default {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Speak text in your voice channel (free Google TTS)')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('Text to speak (max ~200 characters per chunk)')
        .setRequired(true)
        .setMaxLength(500),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember | null;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: '❌ You need to be in a voice channel to use TTS.',
        ephemeral: true,
      });
      return;
    }

    const text = interaction.options.getString('text', true).trim();
    if (!text) {
      await interaction.reply({
        content: '❌ Please provide some text to speak.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const urls = speakTextUrls(text);
      const buffers: Buffer[] = [];
      for (const url of urls) {
        const buf = await fetchMp3Buffer(url);
        if (!buf.length) {
          throw new Error('TTS returned empty audio');
        }
        buffers.push(buf);
      }

      let connection = getVoiceConnection(interaction.guildId!);
      if (
        !connection ||
        connection.state.status === VoiceConnectionStatus.Destroyed
      ) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          selfDeaf: true,
        });
      } else if (connection.joinConfig.channelId !== voiceChannel.id) {
        connection.destroy();
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          selfDeaf: true,
        });
      }

      connection.on('stateChange', (oldState, newState) => {
        console.log(`[TTS voice] ${oldState.status} -> ${newState.status}`);
      });
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      const player = createAudioPlayer();
      const subscription = connection.subscribe(player);
      if (!subscription) {
        throw new Error('Could not subscribe to the voice connection');
      }

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
            player.off(AudioPlayerStatus.Idle, onIdle);
            player.off('error', onError);
          };
          player.once(AudioPlayerStatus.Idle, onIdle);
          player.once('error', onError);
          player.play(resource);
        });
      }

      await interaction.editReply(
        `🗣️ Spoke: "${text.length > 100 ? text.slice(0, 97) + '...' : text}"`,
      );
    } catch (error) {
      console.error('TTS error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      const friendly =
        message.includes('aborted') || message.includes('Abort')
          ? 'Voice playback timed out — try again, or leave/rejoin voice and retry.'
          : message;
      await interaction.editReply(`❌ TTS failed: ${friendly}`);
    }
  },
};
