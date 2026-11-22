import { useQuery } from "@concile/client/react"
import type { Id } from "../../concile/_generated/dataModel"

import { api } from "@/lib/concile"

export function BoardActivity({
  boardId,
}: {
  boardId: Id<"boards">
}) {
  const activity = useQuery(api.activity.list, { boardId })

  if (!activity) return null

  return (
    <details className="mb-4 w-full rounded-2xl border-2 bg-background/70 p-0">
      <summary className="cursor-pointer list-none rounded-2xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="inline-flex items-center justify-between gap-3">
          <span>Change log</span>
          <span className="text-xs font-normal text-muted-foreground">
            {activity.length}
          </span>
        </span>
      </summary>
      <div className="border-t px-4 py-3">
        {activity.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No changes recorded yet.
          </p>
        ) : (
          <ol className="max-h-80 space-y-2 overflow-y-auto">
            {activity.map((item) => {
              const time = new Intl.DateTimeFormat(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(item.createdAt)
              return (
                <li
                  key={item._id}
                  className="rounded-xl border bg-card px-3 py-2 text-xs"
                >
                  <p className="font-medium text-foreground">
                    {item.summary ?? `${item.action} ${item.entityType} “${item.entityName}”`}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {item.displayName} · {time}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </details>
  )
}
