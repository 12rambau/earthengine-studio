/** Represents the Google account details displayed by the application. */
export interface GoogleUserProfile {
  email: string
  name: string
  picture?: string
  subject: string
}

/** Receives the public profile claims associated with a Google OAuth access token. */
const googleUserInfoUrl = 'https://openidconnect.googleapis.com/v1/userinfo'

/** Fetches and validates the profile fields that the application may display for an authorized account. */
export async function fetchGoogleUserProfile (accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch(googleUserInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Google did not return account information.')
  }

  return parseGoogleUserProfile(await response.json())
}

/** Parses UserInfo defensively because users or organizations may omit optional OpenID claims. */
function parseGoogleUserProfile (payload: unknown): GoogleUserProfile {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Google returned an invalid account profile.')
  }

  const profile = payload as Record<string, unknown>
  const email = getProfileString(profile.email)
  const subject = getProfileString(profile.sub)

  if (!email || !subject) {
    throw new Error('Google returned an incomplete account profile.')
  }

  return {
    email,
    name: getProfileString(profile.name) ?? email,
    picture: getProfileString(profile.picture),
    subject,
  }
}

/** Accepts non-empty OpenID string claims while discarding malformed values. */
function getProfileString (value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}
