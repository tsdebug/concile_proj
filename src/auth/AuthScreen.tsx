import { useRef, useState } from "react"
import { LayoutDashboard } from "lucide-react"

import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"
import { useAuth } from "@/auth/AuthProvider"

export function AuthScreen() {
  const { signIn, signUp } = useAuth()

  const [mode, setMode] = useState<"login" | "signup">("login")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submitting = useRef(false)

  async function run(action: () => Promise<void>) {
    if (submitting.current) return

    submitting.current = true
    setError(null)
    setPending(true)

    try {
      await action()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong.",
      )
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  function switchTo(next: "login" | "signup") {
    if (submitting.current) return

    setError(null)
    setMode(next)
  }

  return (
    <div className="workspace-page flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2.5 self-center font-semibold">
          <div className="workspace-brand-mark flex size-9 items-center justify-center rounded-xl border">
            <LayoutDashboard
              className="size-4"
              aria-hidden="true"
            />
          </div>
          Concile
        </div>

        {mode === "login" ? (
          <LoginForm
            error={error}
            pending={pending}
            onSubmit={(email, password) =>
              run(() => signIn(email, password))
            }
            onSwitch={() => switchTo("signup")}
          />
        ) : (
          <SignupForm
            error={error}
            pending={pending}
            onSubmit={(displayName, email, password) =>
              run(() =>
                signUp(displayName, email, password),
              )
            }
            onSwitch={() => switchTo("login")}
          />
        )}
      </div>
    </div>
  )
}