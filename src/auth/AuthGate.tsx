import { useEffect } from "react"
import type { ReactNode } from "react"
import { useQuery } from "@concile/client/react"

import { api, authClient } from "@/lib/concile"
import { AuthScreen } from "@/auth/AuthScreen"
import { ProfileSetup } from "@/auth/ProfileSetup"
import { useAuth } from "@/auth/AuthProvider"

function LoadingScreen() {
  return (
    <div
      role="status"
      className="workspace-page flex min-h-svh items-center justify-center p-6"
    >
      <p className="text-sm text-muted-foreground">
        Opening your workspace...
      </p>
    </div>
  )
}

function ProfileGate({ children }: { children: ReactNode }) {
  const profile = useQuery(api.profiles.getMine, {})

  if (profile === undefined) {
    return <LoadingScreen />
  }

  if (profile === null) {
    return <ProfileSetup />
  }

  return <>{children}</>
}

function ServerSessionGate({
  expectedUserId,
  children,
}: {
  expectedUserId: string
  children: ReactNode
}) {
  const userId = useQuery(api.session.whoami, {})

  useEffect(() => {
    if (userId === null) {
      authClient.clearSession()
    }
  }, [userId])

  if (
    userId === undefined ||
    userId === null ||
    userId !== expectedUserId
  ) {
    return <LoadingScreen />
  }

  return <ProfileGate>{children}</ProfileGate>
}

export function AuthGate({
  children,
}: {
  children: ReactNode
}) {
  const { session } = useAuth()

  if (!session) {
    return <AuthScreen />
  }

  return (
    <ServerSessionGate
      key={session.userId}
      expectedUserId={session.userId}
    >
      {children}
    </ServerSessionGate>
  )
}