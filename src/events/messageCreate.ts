import { Events, Message, OmitPartialGroupDMChannel } from 'discord.js';
import { getAutoTtsChannelId } from '../utils/autoTtsConfig';
import { enqueueSpeak } from '../utils/ttsSpeak';

const MAX_LEN = 500;

function shouldAutoSpeak(message: OmitPartialGroupDMChannel<Message>): boolean {
  if (message.author.bot) return false;
  if (!message.guild) return false;
  if (!message.content?.trim()) return false;

  const configuredChannelId = getAutoTtsChannelId(message.guild.id);
  if (!configuredChannelId) return false;
  if (message.channelId !== configuredChannelId) return false;

  const text = message.content.trim();
  if (text.length > MAX_LEN) return false;
  if (text.startsWith('/') || text.startsWith('!') || text.startsWith('.')) {
    return false;
  }
  if (/^(https?:\/\/\S+|<#\d+>|<@!?\d+>|<@&\d+>)+$/i.test(text)) {
    return false;
  }

  const member = message.member;
  const voice = member?.voice?.channel;
  if (!voice) return false;
  if (!voice.joinable) return false;
  if ('speakable' in voice && !voice.speakable) return false;

  return true;
}

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: OmitPartialGroupDMChannel<Message>) {
    if (!shouldAutoSpeak(message)) return;

    const voiceChannel = message.member!.voice.channel!;
    const text = message.content.trim();

    try {
      await enqueueSpeak(voiceChannel, text);
    } catch (error) {
      console.error('Auto-TTS error:', error);
    }
  },
};
