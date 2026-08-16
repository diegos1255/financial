import { api } from './api';

type TtsStatus = { enabled: boolean };

export const ttsService = {
  async isEnabled(): Promise<boolean> {
    try {
      const { data } = await api.get<TtsStatus>('/api/tts/status');
      return data.enabled;
    } catch {
      return false;
    }
  },

  /**
   * Chama o backend pra sintetizar via ElevenLabs. Retorna Blob (audio/mpeg) ou null se falhar.
   */
  async speak(text: string): Promise<Blob | null> {
    try {
      const response = await api.post('/api/tts/speak', { text }, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch {
      return null;
    }
  },
};

/**
 * Toca um Blob audio/mpeg. Retorna Promise que resolve quando termina de tocar
 * (ou rejeita se o browser bloqueou o autoplay).
 */
export function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = (e) => {
      console.warn('[TTS] audio element error', e);
      URL.revokeObjectURL(url);
      reject(new Error('audio element error'));
    };
    audio.play().catch((err) => {
      console.warn('[TTS] audio.play() blocked ou falhou:', err);
      URL.revokeObjectURL(url);
      reject(err);
    });
  });
}
