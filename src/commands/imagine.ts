import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { config } from '../config';

async function generateWithPollinations(prompt: string): Promise<Buffer> {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pollinations.ai returned ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateWithDalle(prompt: string, apiKey: string): Promise<Buffer> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    data: Array<{ b64_json?: string; url?: string }>;
  };
  const item = data.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, 'base64');
  }
  if (item?.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) throw new Error('Failed to download DALL-E image');
    return Buffer.from(await imgRes.arrayBuffer());
  }
  throw new Error('No image data returned from OpenAI');
}

export default {
  data: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Generate an image from a text prompt')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('Describe the image you want')
        .setRequired(true)
        .setMaxLength(1000),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const prompt = interaction.options.getString('prompt', true).trim();
    if (!prompt) {
      await interaction.reply({
        content: '❌ Please provide a prompt.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      let buffer: Buffer;
      let provider: string;

      if (config.openaiApiKey) {
        try {
          buffer = await generateWithDalle(prompt, config.openaiApiKey);
          provider = 'DALL·E 3';
        } catch (dalleError) {
          console.warn('DALL-E failed, falling back to Pollinations:', dalleError);
          buffer = await generateWithPollinations(prompt);
          provider = 'Pollinations.ai (DALL·E fallback)';
        }
      } else {
        buffer = await generateWithPollinations(prompt);
        provider = 'Pollinations.ai';
      }

      const attachment = new AttachmentBuilder(buffer, { name: 'imagine.png' });
      await interaction.editReply({
        content: `🖼️ **Prompt:** ${prompt}\n_Generated with ${provider}_`,
        files: [attachment],
      });
    } catch (error) {
      console.error('Imagine error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      await interaction.editReply(`❌ Image generation failed: ${message}`);
    }
  },
};
