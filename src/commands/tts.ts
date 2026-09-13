import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from 'discord.js';
import { enqueueSpeak } from '../utils/ttsSpeak';

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
      await enqueueSpeak(voiceChannel, text);
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
