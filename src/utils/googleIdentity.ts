const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize(options: Record<string, unknown>): void
          prompt(callback?: (notification: any) => void): void
          cancel(): void
        }
      }
    }
  }
}

let googleScriptPromise: Promise<void> | null = null

async function loadGoogleScript() {
  if (googleScriptPromise) {
    return googleScriptPromise
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'))
    document.head.appendChild(script)
  })

  await googleScriptPromise
}

export async function requestGoogleIdToken(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID

  if (!clientId) {
    throw new Error('Google Sign-In is not configured. Missing VITE_GOOGLE_WEB_CLIENT_ID.')
  }

  await loadGoogleScript()

  return new Promise<string>((resolve, reject) => {
    if (!window.google?.accounts?.id) {
      reject(new Error('Google Identity Services not available'))
      return
    }

    let handled = false

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (handled) return
        handled = true
        if (response?.credential) {
          resolve(response.credential as string)
        } else {
          reject(new Error('Google sign-in did not return a credential'))
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true
    })

    window.google.accounts.id.prompt((notification: any) => {
      if (handled) return

      if (notification.isNotDisplayed?.()) {
        handled = true
        reject(new Error(`Google sign-in was not displayed: ${notification.getNotDisplayedReason?.() || 'unknown reason'}`))
      } else if (notification.isSkippedMoment?.()) {
        handled = true
        reject(new Error(`Google sign-in was skipped: ${notification.getSkippedReason?.() || 'unknown reason'}`))
      }
    })
  })
}
