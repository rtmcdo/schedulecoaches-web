/**
 * Authentication configuration for schedulecoaches API
 *
 * Uses Microsoft Entra External ID (CIAM) for authentication
 * Production tenant: pickleballcoach.onmicrosoft.com
 */

export const authConfig = {
    // Microsoft Entra External ID configuration (Production)
    tenantId: process.env.ENTRA_TENANT_ID || 'da976fe1-dd40-4c9d-a828-acfa45634f85',
    clientId: process.env.ENTRA_CLIENT_ID || 'e6c5b70f-e2d7-472d-a363-230a252ccbd5',
    tenantSubdomain: process.env.ENTRA_TENANT_SUBDOMAIN || 'pickleballcoach',

    // Computed values for Entra External ID
    get authority() {
        // External ID endpoint format
        return `https://${this.tenantSubdomain}.ciamlogin.com`;
    },

    get issuer() {
        // External ID issuer format
        return `https://${this.tenantSubdomain}.ciamlogin.com/${this.tenantSubdomain}.onmicrosoft.com/v2.0`;
    },

    get jwksUri() {
        // External ID JWKS URI format
        return `https://${this.tenantSubdomain}.ciamlogin.com/${this.tenantSubdomain}.onmicrosoft.com/discovery/v2.0/keys`;
    },

    // Validation settings
    validateIssuer: true,
    passReqToCallback: false,
    loggingLevel: 'info',

    // Scopes
    scopes: ['openid', 'profile', 'email'],

    // Google Sign-In configuration
    // Supports multiple client IDs (web, iOS, Android)
    googleClientIds: (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0),

    // Apple Sign-In - tokens verified by issuer
    appleIssuer: 'https://appleid.apple.com'
};
