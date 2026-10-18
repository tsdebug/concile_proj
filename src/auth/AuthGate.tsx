import { useEffect, type ReactNode } from "react"
import { useQuery } from "@concile/client/react"
import { api, authClient } from "@/lib/concile"
import { AuthScreen } from "@/auth/AuthScreen"
import { useAuth } from "@/auth/AuthProvider"

// Watches the server's view of our session. If the session is revoked or signed
// out in another tab or browser, the query flips to null and we sign out here too.
function SessionWatcher() {
  const userId = useQuery(api.session.whoami, {})
  useEffect(() => {
    if (userId === null) authClient.clearSession()
  }, [userId])
  return null
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  if (!session) return <AuthScreen />
  return (
    <>
      <SessionWatcher />
      {children}
    </>
  )
}