import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current track'),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember | null;
    if (!member?.voice?.channel) {
      await interaction.reply({
        content: '❌ You need to be in a voice channel.',
        ephemeral: true,
      });
      return;
    }

    const queue = useQueue(interaction.guildId!);
    if (!queue || !queue.isPlaying()) {
      await interaction.reply({
        content: '❌ Nothing is playing right now.',
        ephemeral: true,
      });
      return;
    }

    if (queue.node.isPaused()) {
      await interaction.reply({
        content: '⏸️ Playback is already paused.',
        ephemeral: true,
      });
      return;
    }

    queue.node.pause();
    await interaction.reply('⏸️ Paused.');
  },
};
