import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import {
  clearAutoTtsChannelId,
  getAutoTtsChannelId,
  setAutoTtsChannelId,
} from '../utils/autoTtsConfig';

export default {
  data: new SlashCommandBuilder()
    .setName('autotts')
    .setDescription('Configure channel-specific auto-TTS')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName('here')
        .setDescription('Enable auto-TTS in this text channel only'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Enable auto-TTS in a specific text channel')
        .addChannelOption((option) =>
          option
            .setName('target')
            .setDescription('Text channel for auto-TTS')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('off').setDescription('Disable auto-TTS for this server'),
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show the current auto-TTS channel'),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: '❌ This can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'here') {
      setAutoTtsChannelId(guildId, interaction.channelId);
      await interaction.reply({
        content: `✅ Auto-TTS is on for <#${interaction.channelId}> only. Join a voice channel and type there to be spoken.`,
      });
      return;
    }

    if (sub === 'channel') {
      const target = interaction.options.getChannel('target', true);
      setAutoTtsChannelId(guildId, target.id);
      await interaction.reply({
        content: `✅ Auto-TTS is on for <#${target.id}> only. Join a voice channel and type there to be spoken.`,
      });
      return;
    }

    if (sub === 'off') {
      clearAutoTtsChannelId(guildId);
      await interaction.reply({
        content: '✅ Auto-TTS is off for this server.',
      });
      return;
    }

    if (sub === 'status') {
      const channelId = getAutoTtsChannelId(guildId);
      await interaction.reply({
        content: channelId
          ? `Auto-TTS channel: <#${channelId}>`
          : 'Auto-TTS is off. Use `/autotts here` in a channel to enable it.',
        ephemeral: true,
      });
    }
  },
};
