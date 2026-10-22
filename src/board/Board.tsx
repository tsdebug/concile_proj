import { useQuery } from "@concile/client/react"
import type { Id } from "../../concile/_generated/dataModel"
import { api } from "@/lib/concile"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ScrollArea,
  ScrollBar,
} from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const columnAccents = [
  {
    header: "bg-orange-100/70 dark:bg-orange-950/30",
    badge:
      "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-100",
  },
  {
    header: "bg-violet-100/70 dark:bg-violet-950/30",
    badge:
      "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-100",
  },
  {
    header: "bg-emerald-100/70 dark:bg-emerald-950/30",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100",
  },
]

function getColumnAccent(name: string, index: number) {
  const normalized = name.trim().toLowerCase()

  switch (normalized) {
    case "to do":
    case "todo":
      return columnAccents[0]
    case "doing":
    case "in progress":
      return columnAccents[1]
    case "done":
      return columnAccents[2]
    default:
      return columnAccents[index % columnAccents.length]
  }
}

export function Board({ boardId }: { boardId: Id<"boards"> }) {
  const columns = useQuery(api.columns.list, { boardId })
  const cards = useQuery(api.cards.list, { boardId })

  if (columns === undefined || cards === undefined) {
    return (
      <div
        role="status"
        aria-label="Loading board"
        className="flex gap-5 overflow-hidden pb-4"
      >
        <span className="sr-only">Loading your board...</span>

        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="w-72 shrink-0 overflow-hidden rounded-2xl border-2 border-border sm:w-80"
          >
            <Skeleton className="h-16 rounded-none" />

            <div className="min-h-80 space-y-3 bg-muted/30 p-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (columns.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-8 text-center">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">A little room for a plan</h2>
          <p className="text-sm text-muted-foreground">
            No columns on this board yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="w-full min-w-0">
      <div className="flex items-start gap-5 px-0.5 pb-5 pt-1">
        {columns.map((column, index) => {
          const columnCards = cards.filter(
            (card) => card.columnId === column._id,
          )
          const accent = getColumnAccent(column.name, index)

          return (
            <Card
              key={column._id}
              className={cn(
                "w-72 shrink-0 gap-0 overflow-hidden rounded-2xl",
                "border-2 border-zinc-300/90 bg-muted/35 py-0",
                "shadow-[0_3px_0_0_rgba(24,24,27,0.08)]",
                "dark:border-zinc-700 dark:shadow-none",
                "sm:w-80",
              )}
            >
              <CardHeader
                className={cn(
                  "flex flex-row items-center justify-between",
                  "gap-3 space-y-0 border-b-2 border-zinc-300/70",
                  "px-4 py-4 dark:border-zinc-700",
                  accent.header,
                )}
              >
                <CardTitle className="min-w-0 break-words text-sm font-semibold tracking-tight">
                  {column.name}
                </CardTitle>

                <Badge
                  variant="outline"
                  aria-label={`${columnCards.length} cards`}
                  className={cn(
                    "h-6 min-w-6 shrink-0 justify-center",
                    "rounded-lg px-1.5 text-xs font-medium tabular-nums",
                    accent.badge,
                  )}
                >
                  {columnCards.length}
                </Badge>
              </CardHeader>

              <CardContent className="min-h-80 space-y-3 p-3">
                {columnCards.length === 0 ? (
                  <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-background/50 px-4 text-center dark:border-zinc-700">
                    <p className="text-sm text-muted-foreground">
                      No cards yet. Room for something good.
                    </p>
                  </div>
                ) : (
                  columnCards.map((card) => (
                    <div
                      key={card._id}
                      className={cn(
                        "rounded-xl border border-zinc-300/90",
                        "bg-card px-3.5 py-3.5 text-card-foreground",
                        "shadow-[0_2px_0_0_rgba(24,24,27,0.04)]",
                        "dark:border-zinc-700 dark:shadow-none",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {card.title}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}