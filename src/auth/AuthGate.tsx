import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { FunctionReturnType } from "@concile/client"
import {
  useConcileClient,
  useQuery,
} from "@concile/client/react"

import { api, authClient } from "@/lib/concile"
import { AuthScreen } from "@/auth/AuthScreen"
import { ProfileSetup } from "@/auth/ProfileSetup"
import { useAuth } from "@/auth/AuthProvider"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ProfileResult = FunctionReturnType<
  typeof api.profiles.getMine
>

type ProfileState =
  | { status: "loading" }
  | {
      status: "success"
      profile: ProfileResult
    }
  | { status: "error" }

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

function ProfileErrorScreen({
  onRetry,
}: {
  onRetry: () => void
}) {
  const { signOut } = useAuth()

  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] =
    useState<string | null>(null)

  async function handleSignOut() {
    if (signingOut) return

    setSigningOut(true)
    setSignOutError(null)

    try {
      await signOut()
    } catch {
      setSignOutError(
        "Could not sign out. Check your connection and try again.",
      )
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="workspace-page flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            A little trouble opening your space
          </CardTitle>

          <CardDescription>
            We couldn’t load your profile. Please try again.
            This doesn’t mean your profile is missing.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p role="alert" className="text-sm text-muted-foreground">
            Your workspace can open once the profile check succeeds.
          </p>

          {signOutError && (
            <p role="alert" className="text-sm text-destructive">
              {signOutError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              disabled={signingOut}
              onClick={onRetry}
            >
              Retry
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={signingOut}
              onClick={handleSignOut}
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileSubscription({
  children,
  onRetry,
}: {
  children: ReactNode
  onRetry: () => void
}) {
  const client = useConcileClient()

  const [state, setState] = useState<ProfileState>({
    status: "loading",
  })

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined

    try {
      unsubscribe = client.subscribe(
        api.profiles.getMine,
        {},
        (profile) => {
          if (!active) return

          setState({
            status: "success",
            profile,
          })
        },
        (error) => {
          if (!active) return

          console.error("Profile subscription failed:", error)
          setState({ status: "error" })
        },
      )
    } catch (error) {
      // Also handle errors thrown while establishing the subscription.
      console.error("Could not subscribe to profile:", error)
      setState({ status: "error" })
    }

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [client])

  if (state.status === "loading") {
    return <LoadingScreen />
  }

  if (state.status === "error") {
    return <ProfileErrorScreen onRetry={onRetry} />
  }

  if (state.profile === null) {
    return <ProfileSetup />
  }

  return <>{children}</>
}

function ProfileGate({
  children,
}: {
  children: ReactNode
}) {
  const [attempt, setAttempt] = useState(0)

  return (
    <ProfileSubscription
      key={attempt}
      onRetry={() => setAttempt((current) => current + 1)}
    >
      {children}
    </ProfileSubscription>
  )
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