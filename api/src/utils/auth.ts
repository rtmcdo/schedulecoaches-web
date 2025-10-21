import { HttpRequest, InvocationContext } from '@azure/functions';
import * as jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { OAuth2Client } from 'google-auth-library';
import { authConfig } from '../config/auth';
import { AuthenticatedUser } from '../types/user';

/**
 * Authentication utilities for schedulecoaches API
 *
 * Supports:
 * - Microsoft Entra External ID (primary)
 * - Google Sign-In
 * - Apple Sign-In
 */

// JWKS client for Entra ID token verification
const entraJwksClient = jwksRsa({
    jwksUri: authConfig.jwksUri,
    cache: true,
    cacheMaxAge: 86400000 // 24 hours
});

// Google OAuth client
const googleClient = new OAuth2Client();

/**
 * Get signing key for JWT verification
 */
function getSigningKey(jwksClient: jwksRsa.JwksClient) {
    return (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
        jwksClient.getSigningKey(header.kid as string, (err, key) => {
            if (err) {
                callback(err, undefined);
            } else {
                const signingKey = key?.getPublicKey();
                callback(null, signingKey);
            }
        });
    };
}

const getEntraSigningKey = getSigningKey(entraJwksClient);

/**
 * Verify Entra ID token
 */
async function verifyEntraToken(token: string): Promise<jwt.JwtPayload> {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            getEntraSigningKey,
            {
                audience: authConfig.clientId,
                issuer: authConfig.issuer,
                algorithms: ['RS256']
            },
            (err: jwt.VerifyErrors | null, decoded: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded as jwt.JwtPayload);
                }
            }
        );
    });
}

/**
 * Verify Google ID token
 */
async function verifyGoogleToken(token: string): Promise<any> {
    if (!authConfig.googleClientIds.length) {
        throw new Error('Google Sign-In not configured');
    }

    const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: authConfig.googleClientIds
    });

    return ticket.getPayload();
}

/**
 * Verify Apple ID token
 *
 * SECURITY: Apple Sign-In is currently NOT SUPPORTED
 * Proper signature verification using Apple's public keys must be implemented
 * before Apple authentication can be enabled.
 *
 * TODO: Implement Apple public key verification:
 * 1. Fetch Apple's public keys from https://appleid.apple.com/auth/keys
 * 2. Verify JWT signature using the appropriate key
 * 3. Validate issuer (https://appleid.apple.com)
 * 4. Validate audience (our Apple client ID)
 * 5. Validate token expiration
 */
async function verifyAppleToken(token: string): Promise<any> {
    // REJECT Apple tokens until proper verification is implemented
    throw new Error(
        'Apple Sign-In is not currently supported. ' +
        'Signature verification must be implemented before this feature can be enabled.'
    );
}

/**
 * Verify token based on issuer
 */
export async function verifyToken(token: string): Promise<any> {
    const decoded = jwt.decode(token) as jwt.JwtPayload | null;
    const issuer = decoded?.iss || '';

    if (issuer.includes('accounts.google.com')) {
        return verifyGoogleToken(token);
    }

    if (issuer.includes('appleid.apple.com')) {
        return verifyAppleToken(token);
    }

    // Default to Entra ID verification
    return verifyEntraToken(token);
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractToken(request: HttpRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}

/**
 * Authenticate request and extract user information
 */
export async function authenticate(
    request: HttpRequest,
    context: InvocationContext
): Promise<{ authenticated: boolean; user?: AuthenticatedUser; error?: string }> {
    try {
        const token = extractToken(request);
        if (!token) {
            return { authenticated: false, error: 'No token provided' };
        }

        const decoded = jwt.decode(token) as jwt.JwtPayload | null;
        const issuer = decoded?.iss || '';

        // Google Sign-In
        if (issuer.includes('accounts.google.com')) {
            const googlePayload = await verifyGoogleToken(token);

            if (!googlePayload) {
                throw new Error('Unable to verify Google ID token');
            }

            const firstName = googlePayload.given_name || (googlePayload.name ? googlePayload.name.split(' ')[0] : '');
            const lastName = googlePayload.family_name || (googlePayload.name ? googlePayload.name.split(' ').slice(1).join(' ') : '');

            const user: AuthenticatedUser = {
                id: googlePayload.sub,
                email: googlePayload.email,
                name: googlePayload.name || `${firstName} ${lastName}`.trim(),
                firstName,
                lastName,
                role: 'coach',
                provider: 'google'
            };

            return { authenticated: true, user };
        }

        // Apple Sign-In
        if (issuer.includes('appleid.apple.com')) {
            const applePayload = await verifyAppleToken(token);

            const email = applePayload.email;
            // Apple doesn't always provide name in the token after initial signup
            const firstName = '';
            const lastName = '';

            const user: AuthenticatedUser = {
                id: applePayload.sub,
                email,
                name: email ? email.split('@')[0] : 'User',
                firstName,
                lastName,
                role: 'coach',
                provider: 'apple'
            };

            return { authenticated: true, user };
        }

        // Entra ID (default)
        const entraPayload = await verifyEntraToken(token);

        context.log('[Auth] Entra token verified');
        context.log('[Auth] Token claims:', {
            oid: entraPayload.oid,
            sub: entraPayload.sub,
            email: entraPayload.email || entraPayload.emails?.[0],
            name: entraPayload.name
        });

        // Extract user information from Entra token
        // Custom attributes from Entra External ID come with 'extension_' prefix
        const firstName = entraPayload.extension_FirstName
            || entraPayload.given_name
            || (entraPayload.name ? entraPayload.name.split(' ')[0] : '');

        const lastName = entraPayload.extension_LastName
            || entraPayload.family_name
            || (entraPayload.name ? entraPayload.name.split(' ').slice(1).join(' ') : '');

        const user: AuthenticatedUser = {
            id: entraPayload.oid || entraPayload.sub,
            email: entraPayload.emails?.[0] || entraPayload.email,
            name: entraPayload.name || `${firstName} ${lastName}`.trim(),
            firstName,
            lastName,
            role: entraPayload.extension_Role || 'coach',
            provider: 'entra',
            groups: entraPayload.groups || []
        };

        context.log('[Auth] Extracted user:', {
            id: user.id,
            email: user.email,
            name: user.name
        });

        return { authenticated: true, user };
    } catch (error: any) {
        context.error('[Auth] Authentication error:', error);

        let errorMessage = 'Authentication failed';
        if (error instanceof Error) {
            if (error.name === 'TokenExpiredError') {
                errorMessage = 'Token has expired';
            } else if (error.name === 'JsonWebTokenError') {
                errorMessage = 'Invalid token';
            } else {
                errorMessage = error.message;
            }
        }

        return {
            authenticated: false,
            error: errorMessage
        };
    }
}
