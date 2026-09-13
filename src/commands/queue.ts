import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),

  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guildId!);
    if (!queue || (!queue.currentTrack && queue.tracks.size === 0)) {
      await interaction.reply({
        content: '❌ The queue is empty.',
        ephemeral: true,
      });
      return;
    }

    const current = queue.currentTrack;
    const upcoming = queue.tracks.toArray().slice(0, 10);

    const lines: string[] = [];
    if (current) {
      lines.push(`**Now playing:** [${current.title}](${current.url}) \`${current.duration}\``);
    }

    if (upcoming.length > 0) {
      lines.push('');
      lines.push('**Up next:**');
      upcoming.forEach((track, i) => {
        lines.push(`\`${i + 1}.\` [${track.title}](${track.url}) \`${track.duration}\``);
      });
    }

    const remaining = queue.tracks.size - upcoming.length;
    if (remaining > 0) {
      lines.push(`\n_...and ${remaining} more_`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎵 Music Queue')
      .setDescription(lines.join('\n'))
      .setFooter({ text: `${queue.tracks.size} track(s) in queue` });

    await interaction.reply({ embeds: [embed] });
  },
};
