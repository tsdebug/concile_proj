import { useEffect, useRef } from "react"
import { useMutation, useQuery } from "@concile/client/react"
import {
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  LogOut,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/auth/AuthProvider"
import { Board } from "@/board/Board"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/concile"

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return "?"

  if (parts.length === 1) {
    return Array.from(parts[0]!)[0]!.toLocaleUpperCase()
  }

  const first = Array.from(parts[0]!)[0] ?? ""
  const last = Array.from(parts[parts.length - 1]!)[0] ?? ""

  return `${first}${last}`.toLocaleUpperCase()
}

export function App() {
  const { signOut } = useAuth()

  const ensureDefault = useMutation(api.boards.ensureDefault)
  const board = useQuery(api.boards.getMine, {})
  const profile = useQuery(api.profiles.getMine, {})

  const boardSurface = useRef<HTMLDivElement>(null)
  const creatingBoard = useRef(false)

  useEffect(() => {
    if (board !== null || creatingBoard.current) return

    creatingBoard.current = true

    void ensureDefault({})
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not create your board.",
        )
      })
      .finally(() => {
        creatingBoard.current = false
      })
  }, [board, ensureDefault])

  function scrollBoard(direction: "left" | "right") {
    const viewport =
      boardSurface.current?.querySelector<HTMLElement>(
        "[data-radix-scroll-area-viewport]",
      )

    if (!viewport) return

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    viewport.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    })
  }

  const displayName = profile?.displayName ?? "you"

  return (
    <div className="workspace-page min-h-svh text-foreground">
      <header className="workspace-header border-b">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="workspace-brand-mark flex size-9 items-center justify-center rounded-xl border">
              <LayoutDashboard
                className="size-4"
                aria-hidden="true"
              />
            </div>

            <span className="text-sm font-semibold tracking-tight">
              Concile
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div
                aria-hidden="true"
                className="workspace-brand-mark flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
              >
                {getInitials(displayName)}
              </div>

              <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:block">
                {displayName}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 gap-2 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() =>
                signOut().catch(() => {
                  toast.error("Sign out failed.")
                })
              }
            >
              <LogOut
                className="size-3.5"
                aria-hidden="true"
              />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
        <section aria-labelledby="workspace-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <p className="break-words text-sm text-muted-foreground">
                Hey, {displayName} 
              </p>

              <h1
                id="workspace-title"
                className="break-words text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                {board?.name ?? "My Board"}
              </h1>

              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Your little space for plans, progress, and things
                worth finishing.
              </p>
            </div>

            <div
              role="group"
              aria-label="Scroll board"
              className="flex items-center gap-2"
            >
              <span className="mr-1 hidden text-xs text-muted-foreground sm:inline">
                Make room for what’s next
              </span>

              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Scroll board left"
                title="Scroll board left"
                disabled={!board}
                className="workspace-scroll-button size-9 rounded-xl shadow-none"
                onClick={() => scrollBoard("left")}
              >
                <ArrowLeft
                  className="size-4"
                  aria-hidden="true"
                />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Scroll board right"
                title="Scroll board right"
                disabled={!board}
                className="workspace-scroll-button size-9 rounded-xl shadow-none"
                onClick={() => scrollBoard("right")}
              >
                <ArrowRight
                  className="size-4"
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>

          <div
            ref={boardSurface}
            className="board-surface min-w-0 rounded-3xl border p-3 sm:p-5"
          >
            {board ? (
              <Board boardId={board._id} />
            ) : (
              <div
                role="status"
                className="flex min-h-80 items-center justify-center"
              >
                <div className="space-y-2 text-center">
                  <p className="text-sm font-medium">
                    Getting your space ready
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Your board will appear here shortly.
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="mt-3 px-1 text-xs text-muted-foreground">
            Small steps count. Move things along at your own pace.
          </p>
        </section>
      </main>
    </div>
  )
}