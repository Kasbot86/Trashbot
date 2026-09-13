import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { useMainPlayer, useQueue } from 'discord-player';
import { releaseDiscordJsVoice } from '../utils/voiceCleanup';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube (URL or search query)')
    .addStringOption((option) =>
      option
        .setName('query_or_url')
        .setDescription('YouTube URL or search terms')
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember | null;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: '❌ You need to be in a voice channel to play music.',
        ephemeral: true,
      });
      return;
    }

    const query = interaction.options.getString('query_or_url', true);
    const player = useMainPlayer();

    await interaction.deferReply();

    try {
      // Avoid fighting auto-TTS / @discordjs/voice for the same guild
      releaseDiscordJsVoice(interaction.guildId!);

      const result = await player.play(voiceChannel, query, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            requestedBy: interaction.user,
          },
          selfDeaf: true,
        },
        requestedBy: interaction.user,
      });

      const track = result.track;
      const queue = useQueue(interaction.guildId!);
      const position = queue ? queue.tracks.size : 0;

      if (position === 0 && result.queue.currentTrack?.id === track.id) {
        await interaction.editReply(
          `▶️ Now playing: **${track.title}** \`${track.duration}\``,
        );
      } else {
        await interaction.editReply(
          `➕ Added to queue: **${track.title}** \`${track.duration}\` (position ${position})`,
        );
      }
    } catch (error) {
      console.error('Play error:', error);
      const message =
        error instanceof Error ? error.message : 'Could not play that track.';
      await interaction.editReply(`❌ Failed to play: ${message}`);
    }
  },
};
