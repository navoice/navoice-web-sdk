/**
 * Minimal Navoice init – loads spec, creates SDK, and initializes.
 * Text routing goes through routeNavoiceText(). UI must not access window.__navoiceSdk.
 */
declare const NavoiceSDK: any;

const DEBUG = process.env.NEXT_PUBLIC_NAVOICE_DEBUG === "1";

let __sdk: any;
let __defaultLocale: string = "en-US";

export interface InitNavoiceParams {
  /** Next.js router.push for navigation (client-side) */
  navigate?: (path: string) => void;
  /** Called when result.kind === "present"; host shows modal, no navigation */
  onPresent?: (payload: { presentationId: string; params: Record<string, string>; say?: string }) => void;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Navoice SDK failed to load"));
      return;
    }
    const w = window as unknown as { NavoiceSDK?: { createNavoice?: unknown } };
    if (typeof w.NavoiceSDK?.createNavoice === "function") {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.remove();
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      const g = window as unknown as { NavoiceSDK?: { createNavoice?: unknown } };
      if (typeof g.NavoiceSDK?.createNavoice === "function") {
        resolve();
      } else {
        reject(new Error("Navoice SDK failed to load"));
      }
    };
    script.onerror = () => reject(new Error("Navoice SDK failed to load"));

    document.head.appendChild(script);
  });
}

/** Options for routeNavoiceText (e.g. locale override). */
export interface RouteNavoiceTextOptions {
  locale?: string;
}

/**
 * Route text through the Navoice pipeline. Use this for text input (no mic).
 * Ensures the same onResult pipeline (navigate/present) as voice.
 * Sets mic UI state to "thinking" then "idle" for parity with voice flow.
 */
export async function routeNavoiceText(
  text: string,
  options?: RouteNavoiceTextOptions
): Promise<void> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return;

  const mic = typeof document !== "undefined" ? document.querySelector<HTMLButtonElement>("#navoice-mic") : null;
  mic?.setAttribute("data-navoice-mic-state", "thinking");

  try {
    if (!__sdk?.navoice) {
      console.error("[NAVOICE][TEXT] SDK not ready: initNavoice not completed");
      return;
    }
    const result = await __sdk.navoice.route(trimmed);
    __sdk.navoice.onResult?.(result);
  } catch (e) {
    console.error("[NAVOICE][TEXT] routeNavoiceText failed", e);
  } finally {
    mic?.setAttribute("data-navoice-mic-state", "idle");
  }
}

/**
 * Expose SDK on window only for debugging (e.g. console inspection).
 * UI must NOT use window.__navoiceSdk; use routeNavoiceText() instead.
 */
declare global {
  interface Window {
    __navoiceSdk?: any;
    __navoiceDefaultLocale?: string;
    __navoiceInitialized?: boolean;
    __navoiceInitPromise?: Promise<void>;
  }
}

export async function initNavoice(params?: InitNavoiceParams, skipGuard = false): Promise<void> {
  if (typeof window !== "undefined" && !skipGuard) {
    if ((window as any).__navoiceInitialized) return;
    if ((window as any).__navoiceInitPromise) {
      await (window as any).__navoiceInitPromise;
      return;
    }

    (window as any).__navoiceInitPromise = (async () => {
      if (!(window as any).NavoiceSDK) {
        await loadScript("/navoice.min.js");
      }
      if (!(window as any).NavoiceSDK?.createNavoice) {
        throw new Error("Navoice SDK failed to load");
      }
      await initNavoice(params, true);
      (window as any).__navoiceInitialized = true;
    })();

    try {
      await (window as any).__navoiceInitPromise;
    } catch (e) {
      (window as any).__navoiceInitialized = false;
      throw e;
    } finally {
      (window as any).__navoiceInitPromise = undefined;
    }
    return;
  }
  const publishableKey =
    (process.env.NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY ||
      "").trim();

  const backendBaseUrl =
    (process.env.NEXT_PUBLIC_NAVOICE_BACKEND_BASE_URL || "").trim() ||
    "https://api.navoice.io";

  const sdkVersion =
    (process.env.NEXT_PUBLIC_NAVOICE_SDK_VERSION || "").trim() ||
    "1.0.0";

  const origin = typeof window !== "undefined" ? window.location.origin : undefined;

  const specRes = await fetch("/spec.json");
  if (!specRes.ok) {
    throw new Error(`Failed to load spec: ${specRes.status}`);
  }
  const spec = await specRes.json();
  console.log("[SPEC][STOPWORDS en-US]", {
    routingStopwords: spec?.routing?.stopwords?.slice(0, 30),
    thresholdsStopwords: spec?.routing?.thresholds?.stopwordsByLocale?.["en-US"]?.slice(0, 30),
  });

  const tasks = (spec as { tasks?: unknown[] }).tasks ?? [];
  const tasksOrderTop10 = (tasks as { id?: string; action?: { type?: string; id?: string } }[])
    .slice(0, 10)
    .map((t) => `${t.id}:${t.action?.type ?? "navigate"}:${t.action?.id ?? "-"}`);

  const localeFromSpec =
    typeof spec === "object" && spec !== null && "app" in spec && typeof (spec as { app?: { default_locale?: string } }).app?.default_locale === "string"
      ? (spec as { app: { default_locale: string } }).app.default_locale
      : undefined;

  if (DEBUG) {
    console.log("[NAVOICE][INIT]", {
      publishableKeyPresent: publishableKey.length > 0,
      backendBaseUrl,
      sdkVersion,
      origin,
      localeFromSpec,
      sttConfig: "cloudOnly",
      tasksCount: tasks.length,
      tasksOrderTop10,
    });
  }

  const routes: Record<string, string> = {
    education: "/education",
    events: "/events",
    recycle: "/recycle",
    taxes: "/taxes",
  };

  // ✅ Keep previous behavior: if missing key, still init with demo-placeholder
  if (!publishableKey) {
    console.warn(
      "[NAVOICE] Missing env var: NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY. Using demo-placeholder."
    );
  }

  const sdkApi = typeof window !== "undefined" ? (window as any).NavoiceSDK : NavoiceSDK;
  const sdk = sdkApi.createNavoice({
    spec,
    publishableKey: publishableKey || "demo-placeholder",
    backendBaseUrl,
    sdkVersion,
    origin,
    sttConfig: sdkApi.NavoiceSTTConfig.cloudOnly,
    debug: DEBUG,
    mount: {
      micButton: "#navoice-mic",
      badge: "#navoice-badge",
      licenseBanner: "#navoice-license-banner",
    },
    navigation: {
      mode: "history",
      routes,
      navigate: params?.navigate,
    },
  });

  __sdk = sdk;
  __defaultLocale = localeFromSpec ?? "en-US";

  if (typeof window !== "undefined" && DEBUG) {
    window.__navoiceSdk = sdk;
    window.__navoiceDefaultLocale = __defaultLocale;
    console.log("[NAVOICE][INIT] debug: exposed window.__navoiceSdk", { defaultLocale: __defaultLocale });
  }

  const navigate = params?.navigate;
  const onPresent = params?.onPresent;
  const prev = sdk.navoice.onResult;
  sdk.navoice.onResult = (result: unknown) => {
    try {
      prev?.(result as Parameters<NonNullable<typeof prev>>[0]);
    } catch (e) {
      console.warn("[APP] prev onResult crashed", e);
    }
    const r = result as {
      kind?: string;
      presentationId?: string;
      screenId?: string;
      taskId?: string;
      confidence?: number | null;
      say?: string;
      params?: Record<string, string>;
      traceId?: string;
    };
    if (DEBUG) {
      const traceId = r.traceId ?? "";
      console.log(`[${traceId}] [NAVOICE][RESULT]`, {
        kind: r.kind,
        screenId: r.kind === "execute" ? r.screenId : undefined,
        presentationId: r.kind === "present" ? r.presentationId : undefined,
        taskId: r.taskId,
        confidence: r.confidence,
        say: r.say != null ? r.say.slice(0, 80) : undefined,
        params: r.params,
      });
    }
    console.log("[APP][NAVOICE RESULT]", result);
    if (r?.kind === "present") {
      if (DEBUG) {
        console.log(`[${r.traceId ?? ""}] [NAVOICE][PRESENT]`, {
          presentationId: r.presentationId,
          params: r.params,
          say: r.say != null ? r.say.slice(0, 80) : undefined,
        });
      }
      onPresent?.({
        presentationId: r.presentationId ?? "",
        params: r.params ?? {},
        say: r.say,
      });
      return;
    }
    if (r?.kind === "execute" && navigate) {
      const id = (r.screenId ?? "").trim().toLowerCase();
      const path = routes[id];
      if (path) {
        const qs = (r.params && Object.keys(r.params).length > 0) ? "?" + new URLSearchParams(r.params).toString() : "";
        const fullPath = path + qs;
        if (DEBUG) {
          console.log(`[${r.traceId ?? ""}] [NAVOICE][NAVIGATE]`, { path: fullPath });
        }
        navigate(fullPath);
      }
    }
  };

  console.log("[NAVOICE] routes =", routes);
  console.log("[NAVOICE] navigate exists?", !!params?.navigate);
  console.log("[NAVOICE] onPresent exists?", !!params?.onPresent);
  console.log("[NAVOICE] publishableKey exists?", !!publishableKey);
  console.log("[NAVOICE] backendBaseUrl =", backendBaseUrl);
  console.log("[NAVOICE] sdkVersion =", sdkVersion);
  console.log("[NAVOICE] origin =", origin);

  await sdk.init();

  if (typeof window !== "undefined" && DEBUG) {
    window.__navoiceSdk = sdk;
    window.__navoiceDefaultLocale = __defaultLocale;
    console.log("[NAVOICE][INIT] post-init debug: window.__navoiceSdk ready");
  }

  // Real audio recording + built-in STT: capture mic, then sdk.navoice.routeAudio(blob)
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
    const sttLocale = localeFromSpec ?? "en-US";
    const micButton = document.querySelector<HTMLButtonElement>("#navoice-mic");
    if (micButton) {
      const btn = micButton;
      let recorder: MediaRecorder | null = null;
      let currentStream: MediaStream | null = null;
      let audioChunks: BlobPart[] = [];
      let isRecording = false;

      const startMicRecording = () => {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            currentStream = stream;
            recorder = new MediaRecorder(stream);
            audioChunks = [];

            recorder.ondataavailable = (event) => {
              if (event.data && event.data.size > 0) audioChunks.push(event.data);
            };

            recorder.onstop = async () => {
              currentStream?.getTracks().forEach((t) => t.stop());
              currentStream = null;

              const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
              console.log("[STT] Recording stopped");
              console.log("[STT] Transcription request sent, blob size:", audioBlob.size);

              btn.setAttribute("data-navoice-mic-state", "thinking");
              try {
                const result = await sdk.navoice.routeAudio(audioBlob, { locale: sttLocale });
                console.log("[STT] Route completed", {
                  kind: result.kind,
                  sttUsed: result.sttUsed,
                  timingsStt: result.timings?.stt,
                });
                sdk.navoice.onResult?.(result);
              } catch (err) {
                console.error("[STT] Recording/STT failed", err);
              } finally {
                btn.setAttribute("data-navoice-mic-state", "idle");
              }
            };

            recorder.start();
            isRecording = true;
            btn.setAttribute("data-navoice-mic-state", "listening");
            console.log("[STT] Recording started");
          })
          .catch((err) => {
            console.error("[STT] getUserMedia failed", err);
          });
      };

      const stopMicRecording = () => {
        if (recorder && isRecording) {
          recorder.stop();
          isRecording = false;
        }
      };

      btn.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (!isRecording) {
            startMicRecording();
          } else {
            stopMicRecording();
          }
        },
        { capture: true }
      );

      btn.setAttribute("data-navoice-mic-state", "idle");
    }
  }
}