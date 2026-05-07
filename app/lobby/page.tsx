'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

// Custom landing page (rewritten from "/" by middleware.ts).
// Fetches a LiveKit JWT from WebClientApi directly from the browser,
// then navigates to the upstream /custom/?liveKitUrl=...&token=... page.
//
// No env vars required: defaults are derived from the page's own host
// (assuming this app is reverse-proxied alongside the WebClientApi and
// the LiveKit server, as in the C4B XPhone Connect deployment). Users
// can override the URLs via the "Server configuration" panel and the
// overrides are persisted in localStorage.
//
// WebClientApi must allow CORS from this app's origin since the call
// runs in the browser.

const STORAGE_USER_ID = 'meet:userId';
const STORAGE_LIVEKIT_URL = 'meet:livekitUrl';
const STORAGE_WEBCLIENT_BASE = 'meet:webclientApiBase';

function defaultLiveKitUrl(): string {
  if (typeof window === 'undefined') return '';
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${window.location.host}/XPhoneConnect/ReverseProxy/MediaServer`;
}

function defaultWebclientApiBase(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/XPhoneConnect/WebClientApi`;
}

export default function LobbyPage() {
  const router = useRouter();
  const [room, setRoom] = useState('demo');
  const [userId, setUserId] = useState('');
  const [livekitUrl, setLivekitUrl] = useState('');
  const [webclientBase, setWebclientBase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load remembered values on mount; fall back to host-derived defaults.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = localStorage.getItem(STORAGE_USER_ID);
    setUserId(storedUser && storedUser.length > 0 ? storedUser : crypto.randomUUID());
    setLivekitUrl(localStorage.getItem(STORAGE_LIVEKIT_URL) ?? defaultLiveKitUrl());
    setWebclientBase(localStorage.getItem(STORAGE_WEBCLIENT_BASE) ?? defaultWebclientApiBase());
  }, []);

  const livekitDefault = useMemo(defaultLiveKitUrl, []);
  const webclientDefault = useMemo(defaultWebclientApiBase, []);
  const livekitCustomized = livekitUrl !== '' && livekitUrl !== livekitDefault;
  const webclientCustomized = webclientBase !== '' && webclientBase !== webclientDefault;
  const anyCustomized = livekitCustomized || webclientCustomized;

  const onResetUrls = () => {
    setLivekitUrl(livekitDefault);
    setWebclientBase(webclientDefault);
    localStorage.removeItem(STORAGE_LIVEKIT_URL);
    localStorage.removeItem(STORAGE_WEBCLIENT_BASE);
  };

  const onJoin = async () => {
    setError(null);
    setBusy(true);

    const trimmedRoom = room.trim() || 'demo';
    const trimmedUserId = userId.trim();
    const trimmedLivekit = livekitUrl.trim();
    const trimmedWebclient = webclientBase.trim().replace(/\/+$/, '');
    if (!trimmedUserId) {
      setError('User ID required');
      setBusy(false);
      return;
    }
    if (!trimmedLivekit || !trimmedWebclient) {
      setError('LiveKit URL and WebClientApi base URL must be set');
      setBusy(false);
      return;
    }

    let tokenUrl: URL;
    try {
      tokenUrl = new URL('/api/v10.2/meeting/getAnonymousMediaServerToken', trimmedWebclient + '/');
    } catch {
      setError('WebClientApi base URL is not a valid URL');
      setBusy(false);
      return;
    }
    tokenUrl.searchParams.set('meetingGuid', trimmedRoom);
    tokenUrl.searchParams.set('userId', trimmedUserId);

    try {
      const res = await fetch(tokenUrl.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error(`WebClientApi ${res.status}`);
      const body = (await res.json()) as { result: string; token: string };
      if (!body.token) throw new Error(`WebClientApi result=${body.result}`);

      // Persist on successful join only. Only write override entries if
      // they differ from the host-derived defaults, so a deployment
      // change (different host, different reverse-proxy path) keeps
      // following the new defaults instead of getting stuck on stale
      // localStorage.
      localStorage.setItem(STORAGE_USER_ID, trimmedUserId);
      if (trimmedLivekit !== livekitDefault) {
        localStorage.setItem(STORAGE_LIVEKIT_URL, trimmedLivekit);
      } else {
        localStorage.removeItem(STORAGE_LIVEKIT_URL);
      }
      if (trimmedWebclient !== webclientDefault) {
        localStorage.setItem(STORAGE_WEBCLIENT_BASE, trimmedWebclient);
      } else {
        localStorage.removeItem(STORAGE_WEBCLIENT_BASE);
      }

      const target = new URL('/custom/', window.location.origin);
      target.searchParams.set('liveKitUrl', trimmedLivekit);
      target.searchParams.set('token', body.token);
      router.push(target.pathname + target.search);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <main data-lk-theme="default" className={styles.shell}>
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <img src="/images/livekit-meet-home.svg" alt="LiveKit Meet" />
          <span className={styles.kicker}>Lobby</span>
        </div>

        <h1 className={styles.title}>Join a meeting</h1>
        <p className={styles.subtitle}>
          Pick a room and your User ID. Your ID is remembered on this device after a successful
          join, so you keep the same participant identity next time.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="room-input">
            Room
          </label>
          <div className={styles.inputWrap}>
            <input
              id="room-input"
              className={styles.input}
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
              autoFocus
              placeholder="demo"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="userid-input">
            User ID <span style={{ opacity: 0.55, textTransform: 'none' }}>(Guid)</span>
          </label>
          <div className={styles.inputWrap}>
            <input
              id="userid-input"
              className={`${styles.input} ${styles.inputMono}`}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              spellCheck={false}
              placeholder="loading…"
            />
            <button
              type="button"
              className={styles.regenButton}
              onClick={() => setUserId(crypto.randomUUID())}
              aria-label="Generate a new User ID"
              title="Generate a new User ID"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
              </svg>
            </button>
          </div>
          <p className={styles.help}>
            Persists locally after join. Use the refresh icon to start a fresh participant identity.
          </p>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="button" className={styles.joinButton} onClick={onJoin} disabled={busy}>
          {busy ? (
            <>
              <span className={styles.spinner} />
              Connecting…
            </>
          ) : (
            'Join meeting'
          )}
        </button>

        <details className={styles.config}>
          <summary className={styles.configSummary}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Server configuration
            {anyCustomized && <span className={styles.configBadge}>Customised</span>}
          </summary>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="lk-url">
              LiveKit URL
            </label>
            <div className={styles.inputWrap}>
              <input
                id="lk-url"
                className={`${styles.input} ${styles.inputMono} ${
                  livekitCustomized ? styles.inputCustomized : ''
                }`}
                value={livekitUrl}
                onChange={(e) => setLivekitUrl(e.target.value)}
                spellCheck={false}
                placeholder={livekitDefault}
              />
            </div>
            <p className={styles.help}>
              Default: <code>{livekitDefault}</code>
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="wc-url">
              WebClientApi base URL
            </label>
            <div className={styles.inputWrap}>
              <input
                id="wc-url"
                className={`${styles.input} ${styles.inputMono} ${
                  webclientCustomized ? styles.inputCustomized : ''
                }`}
                value={webclientBase}
                onChange={(e) => setWebclientBase(e.target.value)}
                spellCheck={false}
                placeholder={webclientDefault}
              />
            </div>
            <p className={styles.help}>
              Default: <code>{webclientDefault}</code>
            </p>
          </div>

          {anyCustomized && (
            <button type="button" className={styles.resetLink} onClick={onResetUrls}>
              Reset to host defaults
            </button>
          )}
        </details>
      </div>
    </main>
  );
}
