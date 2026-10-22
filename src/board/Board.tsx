import { useRef, useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQuery } from "@concile/client/react"
import type { Id } from "../../concile/_generated/dataModel"

import { api } from "@/lib/concile"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ScrollArea,
  ScrollBar,
} from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

type Editor =
  | { kind: "new-column" }
  | {
      kind: "edit-column"
      columnId: Id<"columns">
      originalName: string
    }
  | {
      kind: "new-card"
      columnId: Id<"columns">
      columnName: string
    }
  | {
      kind: "edit-card"
      cardId: Id<"cards">
    }

type DeleteTarget =
  | {
      kind: "column"
      columnId: Id<"columns">
      name: string
      count: number
    }
  | {
      kind: "card"
      cardId: Id<"cards">
      title: string
    }

const accents = [
  {
    header: "bg-orange-100/70 dark:bg-orange-950/30",
    badge:
      "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-100",
  },
  {
    header: "bg-violet-100/70 dark:bg-violet-950/30",
    badge:
      "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-100",
  },
  {
    header: "bg-emerald-100/70 dark:bg-emerald-950/30",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  },
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

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again."
}

export function Board({ boardId }: { boardId: Id<"boards"> }) {
  const columns = useQuery(api.columns.list, { boardId })
  const cards = useQuery(api.cards.list, { boardId })

  const createColumn = useMutation(api.columns.create)
  const renameColumn = useMutation(api.columns.rename)
  const removeColumn = useMutation(api.columns.remove)

  const createCard = useMutation(api.cards.create)
  const updateCard = useMutation(api.cards.update)
  const removeCard = useMutation(api.cards.remove)

  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleteTarget, setDeleteTarget] =
    useState<DeleteTarget | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [busy, setBusy] = useState(false)

  // Prevent duplicate submissions before React updates the disabled state.
  const pending = useRef(false)
  const titleInput = useRef<HTMLInputElement>(null)

  function openEditor(
    next: Editor,
    initialTitle = "",
    initialDescription = "",
  ) {
    if (pending.current) return

    setTitle(initialTitle)
    setDescription(initialDescription)
    setEditor(next)
  }

  function requestDelete(target: DeleteTarget) {
    if (pending.current) return

    // Close the editor before opening the confirmation.
    setEditor(null)
    setDeleteTarget(target)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editor || pending.current) return

    const cleanTitle = title.trim()
    if (!cleanTitle) return

    pending.current = true
    setBusy(true)

    try {
      switch (editor.kind) {
        case "new-column":
          await createColumn({
            boardId,
            name: cleanTitle,
          })
          break

        case "edit-column":
          await renameColumn({
            columnId: editor.columnId,
            name: cleanTitle,
          })
          break

        case "new-card":
          await createCard({
            boardId,
            columnId: editor.columnId,
            title: cleanTitle,
            description: description.trim(),
          })
          break

        case "edit-card":
          await updateCard({
            cardId: editor.cardId,
            title: cleanTitle,
            description: description.trim(),
          })
          break
      }

      setEditor(null)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || pending.current) return

    pending.current = true
    setBusy(true)

    try {
      if (deleteTarget.kind === "column") {
        await removeColumn({
          columnId: deleteTarget.columnId,
        })
      } else {
        await removeCard({
          cardId: deleteTarget.cardId,
        })
      }

      toast.success(
        deleteTarget.kind === "column"
          ? "Column deleted."
          : "Card deleted.",
      )
      setDeleteTarget(null)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

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

  const isCardEditor =
    editor?.kind === "new-card" || editor?.kind === "edit-card"

  const isCreating =
    editor?.kind === "new-card" || editor?.kind === "new-column"

  const editorHeading =
    editor?.kind === "new-column"
      ? "Add a column"
      : editor?.kind === "edit-column"
        ? "Edit column"
        : editor?.kind === "new-card"
          ? "Add a card"
          : "Edit card"

  const editorDescription =
    editor?.kind === "new-column"
      ? "Give your next little workspace a name."
      : editor?.kind === "edit-column"
        ? "Update the name of this column."
        : editor?.kind === "new-card"
          ? `Add something to “${editor.columnName}”.`
          : "Update the title or add a little more detail."

  return (
    <>
      <ScrollArea className="w-full min-w-0">
        <div className="flex items-start gap-5 px-0.5 pb-5 pt-1">
          {columns.map((column, index) => {
            const columnCards = cards
              .filter((card) => card.columnId === column._id)
              .sort((a, b) => a.position - b.position)

            const accent = getAccent(column.name, index)

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
                    "gap-2 space-y-0 border-b-2",
                    "border-zinc-300/70 px-4 py-3",
                    "dark:border-zinc-700",
                    accent.header,
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <CardTitle className="min-w-0 break-words text-sm font-semibold tracking-tight">
                      {column.name}
                    </CardTitle>

                    <Badge
                      variant="outline"
                      aria-label={`${columnCards.length} cards`}
                      className={cn(
                        "h-6 min-w-6 shrink-0 justify-center",
                        "rounded-lg px-1.5 text-xs tabular-nums",
                        accent.badge,
                      )}
                    >
                      {columnCards.length}
                    </Badge>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit column ${column.name}`}
                    className="size-8 shrink-0 rounded-lg hover:bg-background/60"
                    onClick={() =>
                      openEditor(
                        {
                          kind: "edit-column",
                          columnId: column._id,
                          originalName: column.name,
                        },
                        column.name,
                      )
                    }
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      …
                    </span>
                  </Button>
                </CardHeader>

                <CardContent className="flex min-h-80 flex-col gap-3 p-3">
                  <div className="flex-1 space-y-3">
                    {columnCards.length === 0 ? (
                      <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-background/50 p-4 text-center dark:border-zinc-700">
                        <p className="text-sm text-muted-foreground">
                          A little room for your next idea.
                        </p>
                      </div>
                    ) : (
                      columnCards.map((card) => (
                        <button
                          key={card._id}
                          type="button"
                          aria-label={`Edit card: ${card.title}`}
                          className={cn(
                            "block w-full rounded-xl border",
                            "border-zinc-300/90 bg-card p-3.5",
                            "text-left text-card-foreground",
                            "shadow-[0_2px_0_0_rgba(24,24,27,0.04)]",
                            "transition-colors hover:border-zinc-400",
                            "focus-visible:outline-none",
                            "focus-visible:ring-2 focus-visible:ring-ring",
                            "focus-visible:ring-offset-2",
                            "dark:border-zinc-700",
                            "dark:hover:border-zinc-500",
                            "dark:shadow-none",
                          )}
                          onClick={() =>
                            openEditor(
                              {
                                kind: "edit-card",
                                cardId: card._id,
                              },
                              card.title,
                              card.description,
                            )
                          }
                        >
                          <span className="block whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {card.title}
                          </span>

                          {card.description.trim() && (
                            <span className="mt-2 block line-clamp-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
                              {card.description}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:bg-background hover:text-foreground"
                    onClick={() =>
                      openEditor({
                        kind: "new-card",
                        columnId: column._id,
                        columnName: column.name,
                      })
                    }
                  >
                    <span aria-hidden="true">+</span>
                    Add card
                  </Button>
                </CardContent>
              </Card>
            )
          })}

          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-14 w-72 shrink-0 justify-start gap-2",
              "rounded-2xl border-2 border-dashed",
              "border-zinc-300 bg-background/60 px-4",
              "text-muted-foreground shadow-none",
              "hover:border-zinc-400 hover:bg-background",
              "dark:border-zinc-700 sm:w-80",
            )}
            onClick={() => openEditor({ kind: "new-column" })}
          >
            <span aria-hidden="true">+</span>
            {columns.length === 0 ? "Add your first column" : "Add column"}
          </Button>
        </div>

        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open && !pending.current) setEditor(null)
        }}
      >
        <DialogContent
          className="rounded-2xl sm:max-w-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            titleInput.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>{editorHeading}</DialogTitle>
            <DialogDescription>{editorDescription}</DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="board-editor-title">
                {isCardEditor ? "Title" : "Column name"}
              </Label>

              <Input
                ref={titleInput}
                id="board-editor-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  isCardEditor
                    ? "What needs to happen?"
                    : "For example, In review"
                }
                disabled={busy}
                required
                className="rounded-lg"
              />
            </div>

            {isCardEditor && (
              <div className="space-y-2">
                <Label htmlFor="board-editor-description">
                  Description
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Optional
                  </span>
                </Label>

                <Textarea
                  id="board-editor-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Notes, context, or a tiny plan..."
                  disabled={busy}
                  className="min-h-32 resize-y rounded-lg"
                />
              </div>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              <div>
                {editor?.kind === "edit-column" && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      requestDelete({
                        kind: "column",
                        columnId: editor.columnId,
                        name: editor.originalName,
                        count: cards.filter(
                          (card) => card.columnId === editor.columnId,
                        ).length,
                      })
                    }
                  >
                    Delete column
                  </Button>
                )}

                {editor?.kind === "edit-card" && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      requestDelete({
                        kind: "card",
                        cardId: editor.cardId,
                        title:
                          cards.find(
                            (card) => card._id === editor.cardId,
                          )?.title ?? "this card",
                      })
                    }
                  >
                    Delete card
                  </Button>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={busy || !title.trim()}
                >
                  {busy
                    ? "Saving..."
                    : isCreating
                      ? isCardEditor
                        ? "Add card"
                        : "Add column"
                      : "Save changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !pending.current) setDeleteTarget(null)
        }}
      >
        <DialogContent
          className="rounded-2xl sm:max-w-md"
          onOpenAutoFocus={(event) => {
            // The safe choice receives initial focus.
            event.preventDefault()
            document.getElementById("cancel-board-delete")?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {deleteTarget?.kind === "column"
                ? "Delete this column?"
                : "Delete this card?"}
            </DialogTitle>

            <DialogDescription className="break-words">
              {deleteTarget?.kind === "column"
                ? `“${deleteTarget.name}” and every card inside it will be permanently deleted. It currently contains ${deleteTarget.count} ${
                    deleteTarget.count === 1 ? "card" : "cards"
                  }. This cannot be undone.`
                : deleteTarget?.kind === "card"
                  ? `“${deleteTarget.title}” will be permanently deleted. This cannot be undone.`
                  : ""}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              id="cancel-board-delete"
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setDeleteTarget(null)}
            >
              Keep it
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={confirmDelete}
            >
              {busy
                ? "Deleting..."
                : deleteTarget?.kind === "column"
                  ? "Delete column and cards"
                  : "Delete card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}