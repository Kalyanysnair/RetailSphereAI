declare global {
  interface Window {
    google?: any;
  }
}

export interface GoogleUserInfo {
  email: string;
  name: string;
  sub?: string;
  picture?: string;
}

export function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function triggerRealGoogleSignIn(
  onSuccess: (userInfo: GoogleUserInfo) => void,
  onError: (errorMsg: string) => void
) {
  if (typeof window === 'undefined' || !window.google) {
    onError('Google Identity Services SDK is loading. Please try again in a moment.');
    return;
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1088492040989-samplegoogleclientid.apps.googleusercontent.com';

  try {
    // 1. Initialize Google Identity Services
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (response?.credential) {
          const payload = parseJwt(response.credential);
          if (payload && payload.email) {
            onSuccess({
              email: payload.email,
              name: payload.name || payload.email.split('@')[0],
              sub: payload.sub,
              picture: payload.picture,
            });
            return;
          }
        }
        onError('Could not extract Google account details.');
      },
    });

    // 2. Initialize OAuth2 Token Client for official Google OAuth Popup window
    if (window.google.accounts.oauth2) {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              if (res.ok) {
                const info = await res.json();
                onSuccess({
                  email: info.email,
                  name: info.name || info.given_name || info.email.split('@')[0],
                  sub: info.sub,
                  picture: info.picture,
                });
                return;
              }
            } catch (e) {
              console.warn('Error fetching Google userinfo:', e);
            }
          }
        },
        error_callback: (err: any) => {
          console.warn('Google OAuth popup closed or error:', err);
        },
      });

      tokenClient.requestAccessToken();
    } else {
      // Prompt Google One Tap
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          onError('Google prompt dismissed. Please verify VITE_GOOGLE_CLIENT_ID in .env');
        }
      });
    }
  } catch (err: any) {
    console.error('Error triggering Google Sign-In:', err);
    onError(err?.message || 'Failed to open Google authentication window.');
  }
}
