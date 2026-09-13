import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const configPath = path.join(dataDir, 'autotts.json');

type GuildConfig = { channelId: string };
type Store = Record<string, GuildConfig>;

function ensureStore(): Store {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, '{}', 'utf8');
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as Store;
  } catch {
    return {};
  }
}

function saveStore(store: Store): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(store, null, 2), 'utf8');
}

export function getAutoTtsChannelId(guildId: string): string | null {
  const store = ensureStore();
  return store[guildId]?.channelId ?? null;
}

export function setAutoTtsChannelId(guildId: string, channelId: string): void {
  const store = ensureStore();
  store[guildId] = { channelId };
  saveStore(store);
}

export function clearAutoTtsChannelId(guildId: string): void {
  const store = ensureStore();
  delete store[guildId];
  saveStore(store);
}
