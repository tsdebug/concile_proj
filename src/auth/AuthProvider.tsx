import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import {
  api,
  authApi,
  authClient,
  client,
  subscribeToSignOut,
} from "@/lib/concile"
import type { Session } from "@/lib/concile"

type AuthValue = {
  session: Session
  signUp: (
    displayName: string,
    email: string,
    password: string,
  ) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [session, setSession] = useState<Session>(() =>
    authClient.getSessionInfo(),
  )

  useEffect(
    () =>
      subscribeToSignOut(() => {
        setSession(authClient.getSessionInfo())
      }),
    [],
  )

  async function signUp(
    displayName: string,
    email: string,
    password: string,
  ) {
    const cleanName = displayName.trim().replace(/\s+/g, " ")

    if (!cleanName || cleanName.length > 60) {
      throw new Error("Please enter a name between 1 and 60 characters.")
    }

    const result = await client.mutation(authApi.signUp, {
      email: email.trim(),
      password,
    })

    authClient.setSession(result)

    try {
      await client.mutation(api.profiles.save, {
        displayName: cleanName,
      })
    } catch {
      // The account already exists. Continue into the authenticated
      // app, where ProfileSetup lets the user retry saving their name.
      toast.warning(
        "Your account was created. Please finish setting up your name.",
      )
    }

    setSession(authClient.getSessionInfo())
  }

  async function signIn(email: string, password: string) {
    const result = await client.mutation(authApi.signIn, {
      email: email.trim(),
      password,
    })

    authClient.setSession(result)
    setSession(authClient.getSessionInfo())
  }

  async function signOut() {
    const info = authClient.getSessionInfo()

    if (info) {
      await client.mutation(authApi.signOut, {
        token: info.token,
      })
    }

    authClient.clearSession()
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.")
  }

  return value
}