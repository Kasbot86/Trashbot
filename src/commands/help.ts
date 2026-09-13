import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all Trashbot commands'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0xeb459e)
      .setTitle('🗑️ Trashbot — Commands')
      .setDescription('Slash commands available in this server:')
      .addFields(
        {
          name: '🎵 Music',
          value: [
            '`/play query_or_url` — Play from YouTube URL or search',
            '`/skip` — Skip the current track',
            '`/pause` — Pause playback',
            '`/resume` — Resume playback',
            '`/stop` — Stop and clear the queue',
            '`/queue` — Show the queue',
            '`/nowplaying` — Show the current track',
          ].join('\n'),
        },
        {
          name: '🗣️ Speech',
          value: [
            '`/tts text` — Speak text once in your voice channel',
            '`/autotts here` — Enable auto-TTS in this text channel only',
            '`/autotts channel` — Pick a specific auto-TTS channel',
            '`/autotts off` — Disable auto-TTS',
            '`/autotts status` — Show the auto-TTS channel',
          ].join('\n'),
        },
        {
          name: '🖼️ Images',
          value:
            '`/imagine prompt` — Generate an image (Pollinations.ai, or DALL·E if `OPENAI_API_KEY` is set)',
        },
        {
          name: 'ℹ️ Other',
          value: '`/help` — Show this help message',
        },
      )
      .setFooter({ text: 'Join a voice channel for music, /tts, or auto-TTS chat.' });

    await interaction.reply({ embeds: [embed] });
  },
};
