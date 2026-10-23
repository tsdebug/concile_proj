import { useState } from "react"
import type { ComponentProps, FormEvent } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type SignupFormProps = Omit<
  ComponentProps<"div">,
  "onSubmit"
> & {
  onSubmit: (
    displayName: string,
    email: string,
    password: string,
  ) => void
  onSwitch: () => void
  error?: string | null
  pending?: boolean
}

export function SignupForm({
  className,
  onSubmit,
  onSwitch,
  error,
  pending = false,
  ...props
}: SignupFormProps) {
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (pending) return

    const data = new FormData(event.currentTarget)

    const displayName = String(data.get("displayName") ?? "")
      .trim()
      .replace(/\s+/g, " ")

    const email = String(data.get("email") ?? "").trim()
    const password = String(data.get("password") ?? "")
    const confirmation = String(
      data.get("confirm-password") ?? "",
    )

    if (!displayName || displayName.length > 60) {
      setLocalError("Please enter a name between 1 and 60 characters.")
      return
    }

    if (password !== confirmation) {
      setLocalError("Passwords do not match.")
      return
    }

    setLocalError(null)
    onSubmit(displayName, email, password)
  }

  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            Make yourself at home
          </CardTitle>
          <CardDescription>
            Create an account for your own little workspace.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="signup-name">
                  Your name
                </FieldLabel>
                <Input
                  id="signup-name"
                  name="displayName"
                  autoComplete="name"
                  placeholder="What should we call you?"
                  maxLength={60}
                  disabled={pending}
                  required
                />
                <FieldDescription>
                  This name will appear in your workspace.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="signup-email">
                  Email
                </FieldLabel>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={pending}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="signup-password">
                  Password
                </FieldLabel>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  disabled={pending}
                  required
                />
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="signup-confirm-password">
                  Confirm password
                </FieldLabel>
                <Input
                  id="signup-confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  disabled={pending}
                  required
                />
              </Field>

              <Field>
                {localError && (
                  <FieldError>{localError}</FieldError>
                )}

                {error && <FieldError>{error}</FieldError>}

                <Button type="submit" disabled={pending}>
                  {pending ? "Creating account..." : "Create account"}
                </Button>

                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onSwitch}
                    className="underline underline-offset-4 disabled:opacity-50"
                  >
                    Sign in
                  </button>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}