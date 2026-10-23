import { useRef, useState } from "react"
import type { FormEvent } from "react"
import { useMutation } from "@concile/client/react"
import { LayoutDashboard } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/concile"
import { useAuth } from "@/auth/AuthProvider"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ProfileSetup() {
  const saveProfile = useMutation(api.profiles.save)
  const { signOut } = useAuth()

  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submitting = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting.current) return

    const cleanName = displayName.trim().replace(/\s+/g, " ")

    if (!cleanName || cleanName.length > 60) {
      setError("Please enter a name between 1 and 60 characters.")
      return
    }

    submitting.current = true
    setPending(true)
    setError(null)

    try {
      await saveProfile({
        displayName: cleanName,
      })

      // AuthGate's live profile query will open the workspace.
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save your name. Please try again.",
      )
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <div className="workspace-page flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm rounded-2xl">
        <CardHeader className="space-y-3 text-center">
          <div className="workspace-brand-mark mx-auto flex size-10 items-center justify-center rounded-xl border">
            <LayoutDashboard
              className="size-5"
              aria-hidden="true"
            />
          </div>

          <CardTitle className="text-xl">
            One little introduction
          </CardTitle>

          <CardDescription>
            What should we call you? Your existing board is right
            where you left it.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Your name</Label>
              <Input
                id="profile-name"
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                placeholder="Enter your name"
                autoComplete="name"
                maxLength={60}
                disabled={pending}
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={pending || !displayName.trim()}
            >
              {pending ? "Saving..." : "Open my workspace"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              disabled={pending}
              onClick={() =>
                signOut().catch(() => {
                  toast.error("Sign out failed.")
                })
              }
            >
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}