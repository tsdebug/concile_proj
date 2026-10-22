import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@concile/client/react"
import type { Id } from "../concile/_generated/dataModel"
import { api } from "@/lib/concile"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/auth/AuthProvider"
import { toast } from "sonner"

import { Board } from "@/board/Board"

export function App() {
  const { session, signOut } = useAuth()
  const ensureDefault = useMutation(api.boards.ensureDefault)
  const board = useQuery(api.boards.getMine, {})

  // board === null means "loaded, and there is none yet": create it.
  useEffect(() => {
    if (board === null) {
      ensureDefault({}).catch((err) =>
        toast.error(err instanceof Error ? err.message : "Could not create your board."),
      )
    }
  }, [board])

  return (
    <div className="min-h-svh bg-stone-50/70 dark:bg-background">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3 sm:px-6">
        <span className="shrink-0 text-sm font-semibold tracking-tight">
          CONCILE BOARD
        </span>

        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:block">
            {session?.userId}
          </span>

          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg"
            onClick={() =>
              signOut().catch(() => toast.error("Sign out failed."))
            }
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="min-w-0 p-4 sm:p-6">
        {board ? (
          <Board boardId={board._id} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Setting up your board...
          </p>
        )}
      </main>
    </div>
  )
}