import { ConcileClient, anyApi, createAuthClient, webSocketTransport } from "@concile/client"
import type { Api } from "../../concile/_generated/api"

const wsProtocol = location.protocol === "https:" ? "wss" : "ws"
const url = import.meta.env.VITE_CONCILE_URL ?? `${wsProtocol}://${location.host}/api/sync`

export const client = new ConcileClient(webSocketTransport(url))

// Created once at module level, as in the official docs.
const signOutListeners = new Set<() => void>()
export const authClient = createAuthClient(client, {
  onSignedOut: () => signOutListeners.forEach((l) => l()),
})
export function subscribeToSignOut(listener: () => void) {
  signOutListeners.add(listener)
  return () => {
    signOutListeners.delete(listener)
  }
}

export type Session = ReturnType<typeof authClient.getSessionInfo>

export const api = anyApi as Api // your own functions (typed)
export const authApi = (anyApi as any).auth // the auth component's functions