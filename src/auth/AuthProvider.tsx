import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { authApi, authClient, client, subscribeToSignOut, type Session } from "@/lib/concile"

type AuthValue = {
  session: Session
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read the saved session immediately so a signed-in user never sees a login flash.
  const [session, setSession] = useState<Session>(() => authClient.getSessionInfo())

  useEffect(() => subscribeToSignOut(() => setSession(authClient.getSessionInfo())), [])

  async function signUp(email: string, password: string) {
    const result = await client.mutation(authApi.signUp, { email, password })
    authClient.setSession(result)
    setSession(authClient.getSessionInfo())
  }

  async function signIn(email: string, password: string) {
    const result = await client.mutation(authApi.signIn, { email, password })
    authClient.setSession(result)
    setSession(authClient.getSessionInfo())
  }

  async function signOut() {
    const info = authClient.getSessionInfo()
    if (info) await client.mutation(authApi.signOut, { token: info.token })
    authClient.clearSession()
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside AuthProvider.")
  return value
}