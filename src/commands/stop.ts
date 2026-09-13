import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),

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
        content: '❌ Nothing is playing.',
        ephemeral: true,
      });
      return;
    }

    queue.delete();
    await interaction.reply('⏹️ Stopped playback and cleared the queue.');
  },
};
