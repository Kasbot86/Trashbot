import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing track'),

  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guildId!);
    const track = queue?.currentTrack;

    if (!queue || !track) {
      await interaction.reply({
        content: '❌ Nothing is playing right now.',
        ephemeral: true,
      });
      return;
    }

    const progress = queue.node.createProgressBar() ?? '';
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🎶 Now Playing')
      .setDescription(`[${track.title}](${track.url})`)
      .addFields(
        { name: 'Artist', value: track.author || 'Unknown', inline: true },
        { name: 'Duration', value: track.duration || 'Unknown', inline: true },
        { name: 'Requested by', value: track.requestedBy?.toString() ?? 'Unknown', inline: true },
      )
      .setThumbnail(track.thumbnail || null);

    if (progress) {
      embed.addFields({ name: 'Progress', value: progress });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
