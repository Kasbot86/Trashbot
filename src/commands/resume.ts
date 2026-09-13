import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused track'),

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
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is in the queue.',
        ephemeral: true,
      });
      return;
    }

    if (!queue.node.isPaused()) {
      await interaction.reply({
        content: '▶️ Playback is not paused.',
        ephemeral: true,
      });
      return;
    }

    queue.node.resume();
    await interaction.reply('▶️ Resumed.');
  },
};
