const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        error_callback?: (error: { type?: string; message?: string }) => void;
        use_fedcm_for_button?: boolean;
        use_fedcm_for_prompt?: boolean;
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
      disableAutoSelect(): void;
    };
  };
}

type WindowWithGoogle = Window & { google?: GoogleIdentity };

let loader: Promise<GoogleIdentity> | null = null;

/**
 * Loads Google's Identity Services script, once.
 *
 * Deliberately lazy: the script is only fetched when a visitor actually opens
 * sign-in, so nobody pays for it on a first visit to the booth. Google's script
 * is the only supported way to obtain an ID token in the browser.
 */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (loader) return loader;

  loader = new Promise<GoogleIdentity>((resolve, reject) => {
    const existing = (window as WindowWithGoogle).google;
    if (existing?.accounts?.id) {
      resolve(existing);
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const google = (window as WindowWithGoogle).google;
      if (google?.accounts?.id) resolve(google);
      else reject(new Error('Google sign-in loaded but is unavailable.'));
    };
    script.onerror = () => {
      // Allow a later retry rather than caching the failure forever.
      loader = null;
      reject(new Error('Google sign-in could not be loaded.'));
    };
    document.head.appendChild(script);
  });

  return loader;
}

export interface RenderSignInOptions {
  parent: HTMLElement;
  clientId: string;
  onCredential: (credential: string) => void;
  /** Reports a failure Google would otherwise swallow. */
  onError?: (message: string) => void;
}

/**
 * Human-readable reason for a failed sign-in attempt.
 *
 * Google reports these through error_callback and otherwise does nothing visible,
 * so without translating them a blocked sign-in looks like a dead button.
 */
export function describeSignInError(type: string | undefined): string {
  switch (type) {
    case 'popup_closed':
      return 'Sign-in was closed before it finished. Try again.';
    case 'popup_failed_to_open':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.';
    default:
      return 'Your browser blocked Google sign-in. Try an incognito window, or allow third-party sign-in for this site.';
  }
}

/** Renders Google's own sign-in button, which is required by their terms. */
export async function renderGoogleSignIn({
  parent,
  clientId,
  onCredential,
  onError
}: RenderSignInOptions): Promise<void> {
  const google = await loadGoogleIdentity();
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response.credential) onCredential(response.credential);
      else onError?.(describeSignInError(undefined));
    },
    error_callback: (error) => onError?.(describeSignInError(error?.type)),
    // Chrome's FedCM button flow fails silently in a profile where the browser
    // has suppressed third-party sign-in -- the click produces no credential, no
    // error and no network request. Google documents this opt-out; it is
    // temporary on their roadmap, so revisit when FedCM becomes mandatory.
    use_fedcm_for_button: false,
    use_fedcm_for_prompt: false
  });
  google.accounts.id.renderButton(parent, {
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'signin_with'
  });
}

/** Stops Google silently re-selecting the same account after a sign-out. */
export async function forgetGoogleSelection(): Promise<void> {
  const google = (window as WindowWithGoogle).google;
  google?.accounts?.id?.disableAutoSelect?.();
}

export function resetGoogleIdentityForTests() {
  loader = null;
}
