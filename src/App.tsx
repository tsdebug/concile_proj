import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery } from "@concile/client/react"
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  LayoutDashboard,
  LogOut,
  Share2,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/auth/AuthProvider"
import { Board } from "@/board/Board"
import { ShareDialog } from "@/board/ShareDialog"
import { SharedBoard } from "@/board/SharedBoard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/concile"

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return "?"

  const first = Array.from(parts[0]!)[0] ?? ""

  if (parts.length === 1) {
    return first.toLocaleUpperCase()
  }

  const last = Array.from(parts[parts.length - 1]!)[0] ?? ""

  return `${first}${last}`.toLocaleUpperCase()
}

function useLocationHash() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    function update() {
      setHash(window.location.hash)
    }

    window.addEventListener("hashchange", update)

    return () => {
      window.removeEventListener("hashchange", update)
    }
  }, [])

  return hash
}

function goHome() {
  window.location.hash = ""
}

function WorkspaceLayout({
  title,
  eyebrow,
  description,
  ready,
  actions,
  children,
}: {
  title: string
  eyebrow: string
  description: string
  ready: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  const boardSurface = useRef<HTMLDivElement>(null)

  function scrollBoard(direction: "left" | "right") {
    const viewport =
      boardSurface.current?.querySelector<HTMLElement>(
        "[data-radix-scroll-area-viewport]",
      )

    if (!viewport) return

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    viewport.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: reducedMotion ? "auto" : "smooth",
    })
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
      <section aria-labelledby="workspace-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <p className="break-words text-sm text-muted-foreground">
              {eyebrow}
            </p>

            <h1
              id="workspace-title"
              className="break-words text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {title}
            </h1>

            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {actions}

            <div
              role="group"
              aria-label="Scroll board"
              className="flex items-center gap-2"
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Scroll board left"
                disabled={!ready}
                className="workspace-scroll-button size-9 rounded-xl shadow-none"
                onClick={() => scrollBoard("left")}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Scroll board right"
                disabled={!ready}
                className="workspace-scroll-button size-9 rounded-xl shadow-none"
                onClick={() => scrollBoard("right")}
              >
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        <div
          ref={boardSurface}
          className="board-surface min-w-0 rounded-3xl border p-3 sm:p-5"
        >
          {children}
        </div>

        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Small steps count. Move things along at your own pace.
        </p>
      </section>
    </main>
  )
}

function OwnerWorkspace({ displayName }: { displayName: string }) {
  const ensureDefault = useMutation(api.boards.ensureDefault)
  const board = useQuery(api.boards.getMine, {})

  const [shareOpen, setShareOpen] = useState(false)
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

  return (
    <>
      <WorkspaceLayout
        title={board?.name ?? "My Board"}
        eyebrow={`Hey, ${displayName}`}
        description="Your little space for plans, progress, and things worth finishing."
        ready={Boolean(board)}
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={!board}
            className="workspace-scroll-button gap-2 rounded-xl"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </Button>
        }
      >
        {board ? (
          <Board boardId={board._id} />
        ) : (
          <div
            role="status"
            className="flex min-h-80 items-center justify-center text-sm text-muted-foreground"
          >
            Getting your space ready...
          </div>
        )}
      </WorkspaceLayout>

      {board && shareOpen && (
        <ShareDialog
          boardId={board._id}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  )
}

function SharedWorkspace({ token }: { token: string }) {
  const shared = useQuery(api.sharing.getBoard, { token })

  const unavailable = shared === null

  return (
    <WorkspaceLayout
      title={
        shared === undefined
          ? "Opening shared board..."
          : shared === null
            ? "This board isn’t available"
            : shared.name
      }
      eyebrow={shared ? `${shared.ownerName}’s board` : "Shared workspace"}
      description={
        unavailable
          ? "The link may be invalid, disabled, or replaced."
          : "You’re viewing a shared board. Changes are managed by its owner."
      }
      ready={Boolean(shared)}
      actions={
        <>
          {shared && (
            <Badge
              variant="outline"
              className="h-9 gap-1.5 rounded-xl bg-background/60 px-3"
            >
              <Eye className="size-3.5" aria-hidden="true" />
              View only
            </Badge>
          )}

          <Button
            type="button"
            variant="outline"
            className="workspace-scroll-button rounded-xl"
            onClick={goHome}
          >
            My workspace
          </Button>
        </>
      }
    >
      {shared === undefined ? (
        <div
          role="status"
          className="flex min-h-80 items-center justify-center text-sm text-muted-foreground"
        >
          Loading the shared board...
        </div>
      ) : shared === null ? (
        <div className="flex min-h-80 items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-2">
            <p className="text-sm font-medium">
              Nothing to show here right now
            </p>
            <p className="text-sm text-muted-foreground">
              Ask the owner for a current sharing link.
            </p>
          </div>
        </div>
      ) : (
        <SharedBoard
          columns={shared.columns}
          cards={shared.cards}
        />
      )}
    </WorkspaceLayout>
  )
}

export function App() {
  const { signOut } = useAuth()
  const profile = useQuery(api.profiles.getMine, {})
  const hash = useLocationHash()

  const sharedRoute = hash.startsWith("#/share/")
  const token = sharedRoute ? hash.slice("#/share/".length) : ""

  const displayName = profile?.displayName ?? "you"

  return (
    <div className="workspace-page min-h-svh text-foreground">
      <header className="workspace-header border-b">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <button
            type="button"
            aria-label="Open my workspace"
            onClick={goHome}
            className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="workspace-brand-mark flex size-9 items-center justify-center rounded-xl border">
              <LayoutDashboard
                className="size-4"
                aria-hidden="true"
              />
            </span>

            <span className="text-sm font-semibold tracking-tight">
              Concile
            </span>
          </button>

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
              <LogOut className="size-3.5" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {sharedRoute ? (
        <SharedWorkspace key={token} token={token} />
      ) : (
        <OwnerWorkspace displayName={displayName} />
      )}
    </div>
  )
}