// Signs the user out after 15 minutes without mouse, keyboard or
// touch activity. The last activity time is kept in localStorage, so
// all open tabs share it, and a browser left closed past the limit
// is signed out as soon as it opens again.

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { api } from "../api/api";
import { clearToken, LAST_ACTIVITY_KEY } from "../features/auth/auth.slice";

export const IDLE_LIMIT_MS = 15 * 60 * 1000;
const WARN_BEFORE_MS = 60 * 1000;

const ACTIVITY_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

function readLastActivity() {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastActivity(time: number) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(time));
  } catch {
    // Storage blocked: the timer still runs from this tab's activity
  }
}

// Returns the seconds left while the warning should show, else null
export function useIdleLogout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    // Signed in before this feature existed: start counting now
    if (!readLastActivity()) writeLastActivity(Date.now());

    const openedAt = Date.now();
    let lastWrite = 0;
    // This tab's own last activity, in case storage is blocked
    let localLast = 0;

    const markActive = () => {
      const now = Date.now();
      localLast = now;
      setSecondsLeft(null);
      // pointermove fires constantly; save at most once a second
      if (now - lastWrite > 1000) {
        lastWrite = now;
        writeLastActivity(now);
      }
    };

    const check = () => {
      // Latest activity in any tab; reloading the page does not count
      const last = Math.max(readLastActivity(), localLast) || openedAt;
      const left = IDLE_LIMIT_MS - (Date.now() - last);

      if (left <= 0) {
        window.clearInterval(timer);
        dispatch(clearToken());
        dispatch(api.util.resetApiState());
        navigate("/login?reason=idle", { replace: true });
        return;
      }

      setSecondsLeft(left <= WARN_BEFORE_MS ? Math.ceil(left / 1000) : null);
    };

    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, markActive, { passive: true, capture: true });
    }
    // Coming back to a tab that sat in the background
    document.addEventListener("visibilitychange", check);

    const timer = window.setInterval(check, 1000);
    check();

    return () => {
      window.clearInterval(timer);
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, markActive, { capture: true });
      }
      document.removeEventListener("visibilitychange", check);
    };
  }, [dispatch, navigate]);

  return secondsLeft;
}
