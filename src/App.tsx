import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@concile/client/react"
import type { Id } from "../concile/_generated/dataModel"
import { api } from "@/lib/concile"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/auth/AuthProvider"
import { toast } from "sonner"

function BoardDebug({ boardId }: { boardId: Id<"boards"> }) {
  const columns = useQuery(api.columns.list, { boardId })
  const cards = useQuery(api.cards.list, { boardId })
  const createCard = useMutation(api.cards.create)

  return (
    <div className="space-y-3">
      <Button
        size="sm"
        onClick={() => {
          const first = columns?.[0]
          if (first) {
            void createCard({
              boardId,
              columnId: first._id,
              title: `Test card ${new Date().toLocaleTimeString()}`,
            })
          }
        }}
      >
        Add test card to first column
      </Button>
      <p className="text-muted-foreground text-xs">My board id: {boardId}</p>
      <pre className="bg-muted overflow-auto rounded-md p-3 text-xs">
        {JSON.stringify({ columns, cards }, null, 2)}
      </pre>
    </div>
  )
}

// OPTIONAL security check: paste a board id that belongs to ANOTHER account.
function ForeignResult({ id }: { id: Id<"boards"> }) {
  const columns = useQuery(api.columns.list, { boardId: id })
  return (
    <p className="text-xs">
      You can see: {JSON.stringify(columns)} (should be [] for a board that is not yours)
    </p>
  )
}

function ForeignCheck() {
  const [text, setText] = useState("")
  return (
    <div className="space-y-2">
      <input
        className="w-full rounded-md border px-2 py-1 text-xs"
        placeholder="Paste another account's board id here"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text.trim() && <ForeignResult id={text.trim() as Id<"boards">} />}
    </div>
  )
}

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
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Concile Board (backend test)</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">{session?.userId}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut().catch(() => toast.error("Sign out failed."))}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="space-y-6 p-6">
        {board ? <BoardDebug boardId={board._id} /> : <p>Setting up your board...</p>}
        <ForeignCheck />
      </main>
    </div>
  )
}