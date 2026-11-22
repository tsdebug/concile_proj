import { useEffect } from "react"
import { useMutation, useQuery } from "@concile/client/react"
import type { Id } from "../../concile/_generated/dataModel"

import { api } from "@/lib/concile"
import { presenceColor } from "@/lib/avatar"

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase() ?? "")
    .join("")
}

export function BoardPresence({
  boardId,
  shareToken,
}: {
  boardId: Id<"boards">
  shareToken?: string
}) {
  const args = shareToken ? { boardId, shareToken } : { boardId }
  const join = useMutation(api.presence.join)
  const heartbeat = useMutation(api.presence.heartbeat)
  const leave = useMutation(api.presence.leave)
  const presence = useQuery(api.presence.list, args)

  useEffect(() => {
    void join(args)
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void heartbeat(args)
      }
    }, 20_000)

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void join(args)
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
      void leave({ boardId })
    }
  }, [boardId, shareToken, join, heartbeat, leave])

  if (!presence || presence.length === 0) return null

  return (
    <div className="flex min-h-9 items-center justify-end gap-2" aria-label="People currently active on this board">
      <span className="text-xs text-muted-foreground">
        {presence.length} active
      </span>
      <div className="flex -space-x-2">
        {presence.slice(0, 5).map((person) => (
          <div
            key={person.userId}
            title={`${person.displayName} · ${person.role}`}
            aria-label={`${person.displayName}, ${person.role}`}
            className={`flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold transition-transform hover:-translate-y-0.5 ${presenceColor(person.userId)}`}
          >
            {initials(person.displayName)}
          </div>
        ))}
      </div>
    </div>
  )
}
