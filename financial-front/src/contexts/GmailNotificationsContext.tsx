import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { gmailService } from '../services/gmailService';
import { ttsService, playAudioBlob } from '../services/ttsService';
import { useAuth } from '../hooks/useAuth';

const POLL_INTERVAL_MS = 30_000;
const VOICE_ENABLED_KEY = 'gmail_voice_notifications_enabled';

type GmailNotificationsValue = {
  totalUnread: number;
  isConnected: boolean | null;
  refreshTick: number;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
};

const GmailNotificationsContext = createContext<GmailNotificationsValue>({
  totalUnread: 0,
  isConnected: null,
  refreshTick: 0,
  voiceEnabled: true,
  setVoiceEnabled: () => {},
});

function buildSpeechText(fromName: string, subject: string | null): string {
  return subject
    ? `Novo email de ${fromName}. Assunto: ${subject}`
    : `Novo email de ${fromName}`;
}

function speakViaWindows(text: string): void {
  try {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang.toLowerCase().startsWith('pt'));
    if (ptVoice) utter.voice = ptVoice;

    window.speechSynthesis.speak(utter);
  } catch {
    // silencia falhas de TTS
  }
}

/**
 * Tenta ElevenLabs (voz Jarvis) primeiro. Se backend nao tem config ou call falha,
 * cai para speechSynthesis nativo do browser (voz do Windows).
 */
async function speakNewEmail(
  fromName: string,
  subject: string | null,
  elevenlabsAvailable: boolean,
): Promise<void> {
  const text = buildSpeechText(fromName, subject);
  if (elevenlabsAvailable) {
    const blob = await ttsService.speak(text);
    if (blob && blob.size > 0) {
      try {
        await playAudioBlob(blob);
        return;
      } catch (err) {
        console.warn('[TTS] fallback pra Windows TTS por causa de:', err);
      }
    }
  }
  speakViaWindows(text);
}

function showOsNotification(fromName: string, subject: string | null): void {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification('Novo email', {
      body: subject ? `${fromName} — ${subject}` : `De: ${fromName}`,
      icon: '/favicon.svg',
      tag: 'gmail-new-email',
    });
  } catch {
    // silencia falhas de notificacao
  }
}

function extractName(from: string | null): string {
  if (!from) return 'remetente desconhecido';
  const match = from.match(/^"?([^"<]+?)"?\s*<.+>$/);
  return match ? match[1].trim() : from;
}

export function GmailNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [voiceEnabled, setVoiceEnabledState] = useState<boolean>(
    () => localStorage.getItem(VOICE_ENABLED_KEY) !== 'false',
  );
  const [elevenlabsAvailable, setElevenlabsAvailable] = useState(false);

  useEffect(() => {
    if (!user) return;
    ttsService.isEnabled().then(setElevenlabsAvailable);
  }, [user]);

  function setVoiceEnabled(enabled: boolean) {
    setVoiceEnabledState(enabled);
    localStorage.setItem(VOICE_ENABLED_KEY, String(enabled));
  }

  useEffect(() => {
    if (!user) {
      setIsConnected(null);
      setTotalUnread(0);
      return;
    }

    let cancelled = false;
    let previousTotal: number | null = null;

    async function tick() {
      try {
        const summary = await gmailService.getUnreadSummary();
        if (cancelled) return;
        if (summary === null) {
          setIsConnected(false);
          setTotalUnread(0);
          previousTotal = null;
          return;
        }
        setIsConnected(true);
        setTotalUnread(summary.totalUnread);

        if (
          previousTotal !== null
          && summary.totalUnread > previousTotal
        ) {
          const fromName = summary.latestUnreadFrom
            ? extractName(summary.latestUnreadFrom)
            : 'remetente desconhecido';

          toast.success(`Novo email de: ${fromName}`, {
            duration: 5000,
            icon: '📧',
          });

          if (voiceEnabled) {
            void speakNewEmail(fromName, summary.latestUnreadSubject, elevenlabsAvailable);
          }

          showOsNotification(fromName, summary.latestUnreadSubject);

          setRefreshTick((prev) => prev + 1);
        }
        previousTotal = summary.totalUnread;
      } catch {
        // erros transitorios ignorados
      }
    }

    tick();
    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user, voiceEnabled, elevenlabsAvailable]);

  return (
    <GmailNotificationsContext.Provider
      value={{ totalUnread, isConnected, refreshTick, voiceEnabled, setVoiceEnabled }}
    >
      {children}
    </GmailNotificationsContext.Provider>
  );
}

export function useGmailNotifications() {
  return useContext(GmailNotificationsContext);
}
