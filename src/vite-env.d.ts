/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENTRA_TENANT_ID?: string
  readonly VITE_ENTRA_TENANT_SUBDOMAIN?: string
  readonly VITE_ENTRA_CLIENT_ID?: string
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string
  readonly VITE_APPLE_CLIENT_ID?: string
  readonly VITE_APPLE_REDIRECT_URI?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
