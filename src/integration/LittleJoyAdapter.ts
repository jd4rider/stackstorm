/*
 * Little Joy Arcade integration.
 *
 * The platform's published contract is a drop-in client
 * (public/arcade-client.js) that mirrors this game's Web Storage keys into the
 * player's arcade account and offers a small imperative API. There is no
 * achievement or leaderboard endpoint in that client, so this adapter reports
 * the achievements that are stored in the save payload and never invents one.
 * Every method degrades to local-only play when the client is absent or the
 * player is offline.
 */

interface ArcadeUser {
  id?: string
  email?: string | null
}

interface ArcadeStatus {
  text: string
  signedIn: boolean
}

interface ArcadeClient {
  gameId: string
  configured: boolean
  signIn?: (email: string, password: string) => Promise<{ error: string | null }>
  signUp?: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>
  signOut?: () => Promise<void>
  syncNow?: (reason?: string) => Promise<void>
  push?: () => Promise<boolean>
  user?: () => ArcadeUser | null
  status?: () => ArcadeStatus
}

declare global {
  interface Window {
    LittleJoyArcade?: ArcadeClient
  }
}

export const ARCADE_URL = 'https://littlejoyarcade.site'
export const GAME_ID = 'stackstorm'

function client(): ArcadeClient | undefined {
  return typeof window === 'undefined' ? undefined : window.LittleJoyArcade
}

function entitlementList(): string[] {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem('lja:entitlements')
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

export const arcade = {
  available(): boolean {
    return Boolean(client()?.configured)
  },
  gameId(): string {
    return client()?.gameId ?? GAME_ID
  },
  signedIn(): boolean {
    return Boolean(client()?.status?.()?.signedIn)
  },
  userLabel(): string {
    const user = client()?.user?.()
    return user?.email ?? 'Guest player'
  },
  status(): string {
    return client()?.status?.()?.text ?? 'Playing locally'
  },
  async sync(reason = 'stackstorm'): Promise<void> {
    try {
      await client()?.syncNow?.(reason)
    } catch {
      // Offline is a supported state; the local save is already written.
    }
  },
  async push(): Promise<void> {
    try {
      await client()?.push?.()
    } catch {
      // ignore
    }
  },
  openArcade(): void {
    if (typeof window !== 'undefined') window.open(ARCADE_URL, '_blank', 'noopener,noreferrer')
  },
  /** Ads are not part of Stackstorm; this is the platform's readiness hook. */
  adsAllowed(): boolean {
    const entitlements = entitlementList()
    return !entitlements.includes('arcade.ad_free') && !entitlements.includes('stackstorm.ad_free')
  },
  premiumThemes(): boolean {
    const entitlements = entitlementList()
    return entitlements.includes('arcade.premium') || entitlements.includes('stackstorm.premium_themes')
  },
}
