import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

export function useIdleLogout(idleMinutes = 30) {
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const countdownTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const warningShown = useRef(false);

  const doLogout = useCallback(() => {
    clearTimeout(idleTimer.current);
    clearInterval(countdownTimer.current);
    setShowWarning(false);
    warningShown.current = false;
    logout().catch(() => {}).finally(() => {
      window.location.href = '/session-expired';
    });
  }, [logout]);

  const continueSession = useCallback(() => {
    clearInterval(countdownTimer.current);
    setShowWarning(false);
    warningShown.current = false;
  }, []);

  const resetTimer = useCallback(() => {
    if (warningShown.current) return;

    clearTimeout(idleTimer.current);
    const warningAt = (idleMinutes * 60 - 60) * 1000; // show warning 1 min before expiry

    idleTimer.current = setTimeout(() => {
      warningShown.current = true;
      setShowWarning(true);
      setSecondsLeft(60);

      countdownTimer.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer.current);
            doLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningAt);
  }, [idleMinutes, doLogout]);

  useEffect(() => {
    if (localStorage.getItem('remember_me') === 'true') return;

    IDLE_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      IDLE_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
      clearTimeout(idleTimer.current);
      clearInterval(countdownTimer.current);
    };
  }, [resetTimer]);

  return { showWarning, secondsLeft, continueSession };
}
