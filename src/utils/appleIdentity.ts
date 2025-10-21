const APPLE_SCRIPT_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init(options: Record<string, unknown>): void
        signIn(): Promise<any>
      }
    }
  }
}

let appleScriptPromise: Promise<void> | null = null

async function loadAppleScript() {
  if (appleScriptPromise) {
    return appleScriptPromise
  }

  appleScriptPromise = new Promise<void>((resolve, reject) => {
    if (window.AppleID?.auth) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = APPLE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Apple Sign In script'))
    document.head.appendChild(script)
  })

  await appleScriptPromise
}

export async function requestAppleIdToken(): Promise<string> {
  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID
  const redirectUri = import.meta.env.VITE_APPLE_REDIRECT_URI || `${window.location.origin}/auth/callback`

  if (!clientId) {
    throw new Error('Apple Sign-In is not configured. Missing VITE_APPLE_CLIENT_ID.')
  }

  await loadAppleScript()

  if (!window.AppleID?.auth) {
    throw new Error('Apple Sign-In is not available in this browser.')
  }

  window.AppleID.auth.init({
    clientId,
    scope: 'name email',
    redirectURI: redirectUri,
    usePopup: true
  })

  try {
    const response = await window.AppleID.auth.signIn()
    const idToken = response?.authorization?.id_token

    if (!idToken) {
      throw new Error('Apple sign-in did not return an identity token.')
    }

    return idToken as string
  } catch (error: any) {
    const message = error?.message || error?.error || 'Apple sign-in failed.'
    throw new Error(typeof message === 'string' ? message : 'Apple sign-in failed.')
  }
}
