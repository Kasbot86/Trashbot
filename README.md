# Trashbot

Discord bot with YouTube music playback, text-to-speech, and AI image generation.

## Features

- **Music** — Join a voice channel and play from YouTube URL or search (`discord-player` + extractors)
- **TTS** — Speak text in voice via free Google TTS (`google-tts-api`)
- **Images** — Generate images from prompts via Pollinations.ai (optional DALL·E with `OPENAI_API_KEY`)
- **Help** — `/help` lists all slash commands

## Requirements

- Node.js 18+
- **FFmpeg** (required for music / voice)
  - System install: `sudo apt install ffmpeg` / `brew install ffmpeg` / Windows: add `ffmpeg` to PATH
  - Or rely on the bundled `ffmpeg-static` dependency (included)
- A Discord application + bot token

## Discord Developer Portal setup

1. Create an application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Under **Bot**, create a bot and copy the token → `DISCORD_TOKEN`
3. Enable privileged intents if prompted; for this bot enable:
   - **Server Members Intent** (optional)
   - **Message Content Intent** (if you use message-based features; slash commands do not require it, but the client requests `MessageContent`)
4. Under **OAuth2 → General**, copy **Application ID** → `CLIENT_ID`
5. Under **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: **Connect**, **Speak**, **Send Messages**, **Attach Files**, **Use Voice Activity**, **Embed Links**
6. Open the generated invite URL and add the bot to your server

### Gateway intents used

| Intent | Why |
|--------|-----|
| Guilds | Slash commands & guild cache |
| GuildVoiceStates | Join / leave voice for music & TTS |
| GuildMessages | Message context |
| MessageContent | Message content access if needed |

## Install

```bash
cd Trashbot
cp .env.example .env
# Edit .env with DISCORD_TOKEN and CLIENT_ID
npm install
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Bot token |
| `CLIENT_ID` | Yes | Application (client) ID |
| `GUILD_ID` | No | Guild ID for instant command deploy (recommended while developing) |
| `OPENAI_API_KEY` | No | If set, `/imagine` prefers DALL·E 3 and falls back to Pollinations.ai |

## Deploy slash commands

```bash
npm run deploy-commands
```

With `GUILD_ID` set, commands appear in that guild immediately. Without it, commands are registered globally (can take up to ~1 hour).

## Run

```bash
# Production
npm run build
npm start

# Development (tsx watch)
npm run dev
```

## Scripts

| Script | Command |
|--------|---------|
| `build` | `tsc` — compile TypeScript to `dist/` |
| `start` | `node dist/index.js` — run compiled bot |
| `deploy-commands` | `tsx src/deploy-commands.ts` — register slash commands |
| `dev` | `tsx watch src/index.ts` — run with live reload |

## Commands

| Command | Description |
|---------|-------------|
| `/play query_or_url` | Play YouTube URL or search |
| `/skip` | Skip current track |
| `/pause` | Pause |
| `/resume` | Resume |
| `/stop` | Stop and clear queue |
| `/queue` | Show queue |
| `/nowplaying` | Current track |
| `/tts text` | Speak text in voice channel |
| `/imagine prompt` | Generate an image |
| `/help` | List commands |

## Project layout

```
Trashbot/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── index.ts              # Entry: client, player, loaders
    ├── config.ts             # Env config
    ├── types.ts              # Shared types / Client augmentation
    ├── deploy-commands.ts    # Slash command registration
    ├── commands/             # One file per slash command
    └── events/               # ready, interactionCreate
```

## Notes

- Music uses **discord-player** with **@discord-player/extractor** plus **discord-player-youtubei** (`YoutubeExtractor`) for YouTube URL/search (YouTube is not in DefaultExtractors in v7). FFmpeg must be available (system or `ffmpeg-static`).
- YouTube streaming can be flaky on some VPS IPs; self-hosting usually works better.
- TTS uses **google-tts-api** (no API key). Long text is chunked automatically.
- Images default to `https://image.pollinations.ai/prompt/{encoded}` (free, no key).
- Never commit `.env` — it is gitignored.

## License

MIT
