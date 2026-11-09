import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const GOOGLE_SRC = "https://accounts.google.com/gsi/client";

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
  clientId?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            itp_support?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon" | "signin";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rect" | "pill" | "circle" | "square";
              width?: number;
              locale?: string;
              click_listener?: () => void;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
    __nomnomGoogleInit?: () => void;
  }
}

interface UseGoogleIdentityOptions {
  clientId: string | undefined;
  onCredential: (idToken: string) => void;
}

interface UseGoogleIdentityResult {
  ready: boolean;
  /** True nếu client id được cấu hình — false thì UI phải tự ẩn/disable nút. */
  configured: boolean;
}

// Module-level singleton state để tránh gọi initialize() nhiều lần khi React 18 remount
let activeCredentialCallback: ((idToken: string) => void) | null = null;
let initializedClientId: string | null = null;

/**
 * Load Google Identity Services (GIS) script động và bind callback trả về id_token.
 * - Nếu thiếu VITE_GOOGLE_CLIENT_ID -> trả `configured: false` để FE không render nút.
 * - Script và GIS initialization được đảm bảo singleton (chỉ gọi initialize 1 lần duy nhất).
 */
export function useGoogleIdentity({
  clientId,
  onCredential,
}: UseGoogleIdentityOptions): UseGoogleIdentityResult {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    activeCredentialCallback = onCredential;
    return () => {
      if (activeCredentialCallback === onCredential) {
        activeCredentialCallback = null;
      }
    };
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) return;

    const init = () => {
      try {
        if (window.google?.accounts?.id) {
          // Chỉ gọi initialize 1 lần duy nhất với clientId này
          if (initializedClientId !== clientId) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: (resp) => {
                if (resp.credential && activeCredentialCallback) {
                  activeCredentialCallback(resp.credential);
                }
              },
              cancel_on_tap_outside: true,
              use_fedcm_for_prompt: true,
            });
            initializedClientId = clientId;
          }
          setReady(true);
        }
      } catch (err) {
        console.error("[GoogleIdentity] init failed", err);
      }
    };

    if (window.google?.accounts?.id) {
      init();
      return;
    }

    // Avoid double-inject
    if (document.getElementById(GOOGLE_SCRIPT_ID)) {
      window.__nomnomGoogleInit = init;
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SRC;
    script.async = true;
    script.defer = true;
    window.__nomnomGoogleInit = init;
    script.onload = () => window.__nomnomGoogleInit?.();
    script.onerror = () =>
      console.error("[GoogleIdentity] failed to load script from", GOOGLE_SRC);
    document.head.appendChild(script);
  }, [clientId]);

  return { ready, configured: Boolean(clientId && clientId.length > 0) };
}
