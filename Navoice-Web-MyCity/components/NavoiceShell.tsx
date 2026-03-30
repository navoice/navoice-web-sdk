'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getNavoiceDisabledMessage,
  initNavoice,
  isNavoiceDisabled,
  routeNavoiceText,
} from '@/app/navoiceInit';

/** Derive modal title and body from present payload (app-only content rules) */
function presentModalContent(presentationId: string, say?: string): { title: string; body: string } {
  if (presentationId === 'subscriber_number') return { title: 'Subscriber Number', body: '123456789' };
  if (presentationId === 'id_number') return { title: 'ID Number', body: '987654321' };
  return { title: presentationId, body: say ?? '' };
}

export function NavoiceShell() {
  const router = useRouter();
  const initDone = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [presentationId, setPresentationId] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [say, setSay] = useState<string | undefined>(undefined);
  const [configError, setConfigError] = useState<string | null>(null);
  const isDisabled = !!configError;
  // ✅ Text panel state (pencil + input + send)
  const [textPanelOpen, setTextPanelOpen] = useState(false);
  const [textValue, setTextValue] = useState('');

  const openModal = (p: { presentationId: string; params: Record<string, string>; say?: string }) => {
    setPresentationId(p.presentationId);
    setParams(p.params ?? {});
    setSay(p.say);
    setIsOpen(true);
  };

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

initNavoice({
  navigate: (path: string) => router.push(path),
  onPresent: (p) => openModal(p),
}).catch((e: any) => {
  console.error(e);

  if (isNavoiceDisabled()) {
    setConfigError(getNavoiceDisabledMessage());
    return;
  }

  setConfigError("Domain not registered. Add it in Navoice Portal.");
});
  }, [router]);

  const closeModal = () => {
    setIsOpen(false);
    setPresentationId('');
    setParams({});
    setSay(undefined);
  };

  const closeTextPanel = () => {
    setTextPanelOpen(false);
    setTextValue('');
  };

  const sendText = async () => {
    const t = textValue.trim();
    if (!t) return;

    await routeNavoiceText(t);
    closeTextPanel();
  };

  const { title, body } = presentModalContent(presentationId, say);

  return (
    <>
      {/* License banner (hidden by default; SDK shows on failure) */}
      <div
        id="navoice-license-banner"
        className="hidden fixed top-0 left-0 right-0 bg-amber-500 text-black text-center py-2 text-sm font-medium z-50"
        aria-live="polite"
      >
        License not active
      </div>

      {/* Present overlay modal – only opened when result.kind === "present" */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="present-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
            onKeyDown={(e) => e.key === 'Escape' && closeModal()}
            tabIndex={0}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-[90%] z-50 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 id="present-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                {title}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="shrink-0 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 text-slate-700 dark:text-slate-300">
              {body ? <p className="font-mono text-lg">{body}</p> : null}
            </div>
          </div>
        </div>
      )}

      {configError && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        Configuration Error
      </h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        {configError}
      </p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => setConfigError(null)}
          className="bg-primary text-white font-semibold px-4 py-2 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {/* ✅ Floating controls: mic + pencil + panel (same container) */}
      <div className="fixed bottom-24 right-6 md:bottom-8 z-50 flex flex-col-reverse items-end gap-3">
        {/* MIC */}
        <div className="relative">
          <button
            id="navoice-mic"
            type="button"
            className="w-16 h-16 bg-primary text-white rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            data-navoice-mic-state="idle"
            aria-label="Tap to start listening"
            onClick={() => {
              if (isNavoiceDisabled()) {
                alert(getNavoiceDisabledMessage());
              }
            }}
          >
            <MicIcon />
          </button>
          {/* Badge – SDK updates data-navoice-badge (success/fail) via globals.css */}
          <span
            id="navoice-badge"
            aria-hidden="true"
            className="absolute -top-2 -right-2 w-3 h-3 rounded-full border-2 border-white opacity-0 transition-opacity"
          />
        </div>

        {/* PENCIL */}
        <button
          id="navoice-text-btn"
          type="button"
          className="w-16 h-16 bg-white text-slate-800 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
          aria-label="Type a request"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isNavoiceDisabled()) {
              alert(getNavoiceDisabledMessage());
              return;
            }
            setTextPanelOpen((v) => !v);
          }}
        >
          <PencilIcon />
        </button>

        {/* PANEL */}
        {textPanelOpen && (
          <div
            id="navoice-text-panel"
            className="w-[360px] max-w-[85vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="flex gap-2">
              <input
                id="navoice-text-input"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                autoFocus
                placeholder="Type what you want…"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendText();
                  if (e.key === 'Escape') closeTextPanel();
                }}
              />
              <button
                id="navoice-text-send"
                type="button"
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  sendText();
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Mic/Stop/Loading icon – visibility controlled by data-navoice-mic-state via globals.css */
function MicIcon() {
  return (
    <span className="relative block w-6 h-6">
      <svg className="navoice-mic-idle absolute inset-0 w-full h-full" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
      <svg className="navoice-mic-listening absolute inset-0 w-full h-full" fill="currentColor" viewBox="0 0 24 24">
        <rect x="6" y="6" width="12" height="12" rx="1" />
      </svg>
      <span className="navoice-mic-thinking absolute inset-0 flex items-center justify-center">
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </span>
    </span>
  );
}

function PencilIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16.862 3.487a2.1 2.1 0 012.97 2.97L8.25 18.04 4 19l.96-4.25L16.862 3.487z"
      />
    </svg>
  );
}