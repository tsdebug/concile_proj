import type { Id } from "../../concile/_generated/dataModel"

import { cn } from "@/lib/utils"
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

type SharedColumn = {
  _id: Id<"columns">
  name: string
  position: number
}

type SharedCard = {
  _id: Id<"cards">
  columnId: Id<"columns">
  title: string
  description: string
  position: number
}

const accents = [
  "bg-orange-100/70 dark:bg-orange-950/30",
  "bg-violet-100/70 dark:bg-violet-950/30",
  "bg-emerald-100/70 dark:bg-emerald-950/30",
]

function getAccent(name: string, index: number) {
  switch (name.trim().toLowerCase()) {
    case "to do":
    case "todo":
      return accents[0]
    case "doing":
    case "in progress":
      return accents[1]
    case "done":
      return accents[2]
    default:
      return accents[index % accents.length]
  }
}

export function SharedBoard({
  columns,
  cards,
}: {
  columns: SharedColumn[]
  cards: SharedCard[]
}) {
  const sortedColumns = [...columns].sort(
    (a, b) => a.position - b.position,
  )

  if (sortedColumns.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        This board doesn’t have any columns yet.
      </div>
    )
  }

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">
        A little look at what’s in progress. This board is view only.
      </p>

      <ScrollArea className="w-full min-w-0">
        <div className="flex items-start gap-5 px-0.5 pb-5 pt-1">
          {sortedColumns.map((column, index) => {
            const columnCards = cards
              .filter((card) => card.columnId === column._id)
              .sort((a, b) => a.position - b.position)

            return (
              <Card
                key={column._id}
                className={cn(
                  "w-72 shrink-0 gap-0 overflow-hidden rounded-2xl",
                  "border-2 border-zinc-300/90 bg-muted/35 py-0",
                  "shadow-[0_3px_0_0_rgba(24,24,27,0.08)]",
                  "dark:border-zinc-700 dark:shadow-none sm:w-80",
                )}
              >
                <CardHeader
                  className={cn(
                    "flex flex-row items-center justify-between",
                    "gap-2 space-y-0 border-b-2",
                    "border-zinc-300/70 px-4 py-4",
                    "dark:border-zinc-700",
                    getAccent(column.name, index),
                  )}
                >
                  <CardTitle className="min-w-0 break-words text-sm font-semibold">
                    {column.name}
                  </CardTitle>

                  <Badge
                    variant="outline"
                    className="shrink-0 rounded-lg bg-background/60 tabular-nums"
                    aria-label={`${columnCards.length} cards`}
                  >
                    {columnCards.length}
                  </Badge>
                </CardHeader>

                <CardContent className="min-h-80 space-y-3 p-3">
                  {columnCards.length === 0 ? (
                    <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-background/50 p-4 dark:border-zinc-700">
                      <p className="text-sm text-muted-foreground">
                        No cards here yet.
                      </p>
                    </div>
                  ) : (
                    columnCards.map((card) => (
                      <article
                        key={card._id}
                        className="rounded-xl border border-zinc-300/90 bg-card p-3.5 text-card-foreground shadow-sm dark:border-zinc-700"
                      >
                        <h2 className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed">
                          {card.title}
                        </h2>

                        {card.description.trim() && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                            {card.description}
                          </p>
                        )}
                      </article>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </>
  )
}