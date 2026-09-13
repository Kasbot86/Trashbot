import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track'),

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

    const current = queue.currentTrack;
    queue.node.skip();
    await interaction.reply(`⏭️ Skipped **${current?.title ?? 'current track'}**.`);
  },
};
