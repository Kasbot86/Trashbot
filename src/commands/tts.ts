import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from 'discord.js';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { getAllAudioUrls, getAudioUrl } from 'google-tts-api';
import { Readable } from 'stream';

async function fetchAudioStream(url: string): Promise<Readable> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch TTS audio (${response.status})`);
  }
  return Readable.fromWeb(response.body as import('stream/web').ReadableStream);
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
      const urls =
        text.length > 200
          ? getAllAudioUrls(text, {
              lang: 'en',
              slow: false,
              host: 'https://translate.google.com',
            }).map((u) => u.url)
          : [
              getAudioUrl(text, {
                lang: 'en',
                slow: false,
                host: 'https://translate.google.com',
              }),
            ];

      let connection = getVoiceConnection(interaction.guildId!);
      if (!connection) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          selfDeaf: true,
        });
      }

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

      const player = createAudioPlayer();
      connection.subscribe(player);

      for (const url of urls) {
        const stream = await fetchAudioStream(url);
        const resource = createAudioResource(stream, {
          inputType: StreamType.Arbitrary,
        });
        player.play(resource);
        await entersState(player, AudioPlayerStatus.Playing, 5_000);
        await entersState(player, AudioPlayerStatus.Idle, 120_000);
      }

      await interaction.editReply(
        `🗣️ Spoke: "${text.length > 100 ? text.slice(0, 97) + '...' : text}"`,
      );
    } catch (error) {
      console.error('TTS error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      await interaction.editReply(`❌ TTS failed: ${message}`);
    }
  },
};
