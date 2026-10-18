import { useState } from "react"
import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"
import { useAuth } from "@/auth/AuthProvider"

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<void>) {
    setError(null)
    setPending(true)
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.")
    } finally {
      setPending(false)
    }
  }

  function switchTo(next: "login" | "signup") {
    setError(null)
    setMode(next)
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Concile Board
        </div>
        {mode === "login" ? (
          <LoginForm
            error={error}
            pending={pending}
            onSubmit={(email, password) => run(() => signIn(email, password))}
            onSwitch={() => switchTo("signup")}
          />
        ) : (
          <SignupForm
            error={error}
            pending={pending}
            onSubmit={(email, password) => run(() => signUp(email, password))}
            onSwitch={() => switchTo("login")}
          />
        )}
      </div>
    </div>
  )
}