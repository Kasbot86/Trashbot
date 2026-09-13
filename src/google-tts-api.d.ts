declare module 'google-tts-api' {
  export interface AudioUrlOptions {
    lang?: string;
    slow?: boolean;
    host?: string;
  }

  export interface AudioUrlPart {
    url: string;
    shortText: string;
  }

  export function getAudioUrl(text: string, options?: AudioUrlOptions): string;
  export function getAllAudioUrls(text: string, options?: AudioUrlOptions): AudioUrlPart[];

  const googleTTS: {
    getAudioUrl: typeof getAudioUrl;
    getAllAudioUrls: typeof getAllAudioUrls;
  };

  export default googleTTS;
}
