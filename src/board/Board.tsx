import { useRef, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { useMutation, useQuery } from "@concile/client/react"
import type { Id } from "../../concile/_generated/dataModel"

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type {
  CollisionDetection,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core"

import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/concile"
import { cn } from "@/lib/utils"

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

type ColumnItem = {
  _id: Id<"columns">
  name: string
  position: number
}

type CardItem = {
  _id: Id<"cards">
  columnId: Id<"columns">
  title: string
  description: string
  position: number
}

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
    }
  | {
      kind: "card"
      cardId: Id<"cards">
      title: string
    }

type DragPreview = {
  kind: "column" | "card"
  title: string
}

const columnDragId = (id: string) => `column:${id}`
const cardDragId = (id: string) => `card:${id}`
const columnDropId = (id: string) => `drop:${id}`

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

function getNewPosition<T extends { _id: string; position: number }>(
  reordered: T[],
  movedId: string,
) {
  const index = reordered.findIndex((item) => item._id === movedId)

  if (index === -1) {
    throw new Error("Moved item not found.")
  }

  const previous = reordered[index - 1]
  const next = reordered[index + 1]

  let position: number

  if (!previous && !next) {
    position = 1024
  } else if (!previous) {
    position = next!.position - 1024
  } else if (!next) {
    position = previous.position + 1024
  } else {
    position =
      previous.position + (next.position - previous.position) / 2

    if (
      position <= previous.position ||
      position >= next.position
    ) {
      throw new Error(
        "These items need their positions rebalanced before inserting here.",
      )
    }
  }

  if (!Number.isFinite(position)) {
    throw new Error("Could not calculate a valid position.")
  }

  return position
}

// Column drags only target columns.
// Card drags target cards or the body of a column.
const boardCollisionDetection: CollisionDetection = (args) => {
  const draggingColumn = String(args.active.id).startsWith("column:")

  const containers = args.droppableContainers.filter((container) => {
    const id = String(container.id)

    return draggingColumn
      ? id.startsWith("column:")
      : id.startsWith("card:") || id.startsWith("drop:")
  })

  const filteredArgs = {
    ...args,
    droppableContainers: containers,
  }

  if (draggingColumn) {
    return closestCenter(filteredArgs)
  }

  if (args.pointerCoordinates) {
    const hits = pointerWithin(filteredArgs)
    const cardHits = hits.filter((hit) =>
      String(hit.id).startsWith("card:"),
    )

    return cardHits.length > 0 ? cardHits : hits
  }

  // Keyboard dragging has no pointer coordinates.
  return closestCenter(filteredArgs)
}

function SortableShell({
  id,
  label,
  disabled,
  className,
  children,
}: {
  id: string
  label: string
  disabled: boolean
  className?: string
  children: (handle: ReactNode) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "inline-flex size-7 shrink-0 touch-none items-center",
        "justify-center rounded-md text-muted-foreground",
        "hover:bg-black/5 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring disabled:opacity-40",
        "dark:hover:bg-white/10",
        isDragging ? "cursor-grabbing" : "cursor-grab",
      )}
    >
      <GripVertical className="size-4" aria-hidden="true" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      className={className}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      {children(handle)}
    </div>
  )
}

function ColumnDropZone({
  columnId,
  disabled,
  children,
}: {
  columnId: Id<"columns">
  disabled: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnDropId(columnId),
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-80 flex-1 flex-col gap-3 rounded-xl",
        "transition-colors",
        isOver && "bg-background/70 ring-2 ring-inset ring-border",
      )}
    >
      {children}
    </div>
  )
}

export function Board({ boardId }: { boardId: Id<"boards"> }) {
  const columns = useQuery(api.columns.list, { boardId })
  const cards = useQuery(api.cards.list, { boardId })

  const moveCard = useMutation(api.cards.move)
  const moveColumn = useMutation(api.columns.move)
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
  const [dragPreview, setDragPreview] =
    useState<DragPreview | null>(null)

  const pending = useRef(false)
  const titleInput = useRef<HTMLInputElement>(null)
  const cancelDeleteButton = useRef<HTMLButtonElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const sortedColumns: ColumnItem[] = [...(columns ?? [])].sort(
    (a, b) => a.position - b.position,
  )

  const boardCards: CardItem[] = cards ?? []

  const interactionLocked =
    busy || dragPreview !== null || editor !== null || deleteTarget !== null

  function openEditor(
    next: Editor,
    initialTitle = "",
    initialDescription = "",
  ) {
    if (pending.current || dragPreview) return

    setTitle(initialTitle)
    setDescription(initialDescription)
    setEditor(next)
  }

  function requestDelete(target: DeleteTarget) {
    if (pending.current) return

    setEditor(null)
    setDeleteTarget(target)
  }

  function handleDragStart({ active }: DragStartEvent) {
    const id = String(active.id)

    const column = sortedColumns.find(
      (item) => columnDragId(item._id) === id,
    )

    if (column) {
      setDragPreview({ kind: "column", title: column.name })
      return
    }

    const card = boardCards.find(
      (item) => cardDragId(item._id) === id,
    )

    if (card) {
      setDragPreview({ kind: "card", title: card.title })
    }
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setDragPreview(null)

    if (
      pending.current ||
      !over ||
      active.id === over.id
    ) {
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)

    pending.current = true
    setBusy(true)

    try {
      if (activeId.startsWith("column:")) {
        const oldIndex = sortedColumns.findIndex(
          (column) => columnDragId(column._id) === activeId,
        )
        const newIndex = sortedColumns.findIndex(
          (column) => columnDragId(column._id) === overId,
        )

        if (oldIndex === -1 || newIndex === -1) return

        const reordered = arrayMove(
          sortedColumns,
          oldIndex,
          newIndex,
        )

        const movedColumn = sortedColumns[oldIndex]!

        await moveColumn({
          columnId: movedColumn._id,
          position: getNewPosition(reordered, movedColumn._id),
        })

        return
      }

      const movedCard = boardCards.find(
        (card) => cardDragId(card._id) === activeId,
      )

      if (!movedCard) return

      const targetCard = boardCards.find(
        (card) => cardDragId(card._id) === overId,
      )

      const targetColumn = sortedColumns.find(
        (column) => columnDropId(column._id) === overId,
      )

      const destinationId =
        targetCard?.columnId ?? targetColumn?._id

      if (!destinationId) return

      const destinationCards = boardCards
        .filter((card) => card.columnId === destinationId)
        .sort((a, b) => a.position - b.position)

      let reorderedCards: CardItem[]

      if (destinationId === movedCard.columnId) {
        const oldIndex = destinationCards.findIndex(
          (card) => card._id === movedCard._id,
        )
        const newIndex = targetCard
          ? destinationCards.findIndex(
              (card) => card._id === targetCard._id,
            )
          : destinationCards.length - 1

        if (
          oldIndex === -1 ||
          newIndex === -1 ||
          oldIndex === newIndex
        ) {
          return
        }

        reorderedCards = arrayMove(
          destinationCards,
          oldIndex,
          newIndex,
        )
      } else {
        reorderedCards = destinationCards.filter(
          (card) => card._id !== movedCard._id,
        )

        let insertionIndex = targetCard
          ? reorderedCards.findIndex(
              (card) => card._id === targetCard._id,
            )
          : reorderedCards.length

        // Dropping on the lower half of a card inserts after it.
        if (targetCard) {
          const draggedRect = active.rect.current.translated

          if (
            draggedRect &&
            draggedRect.top + draggedRect.height / 2 >
              over.rect.top + over.rect.height / 2
          ) {
            insertionIndex += 1
          }
        }

        reorderedCards.splice(insertionIndex, 0, {
          ...movedCard,
          columnId: destinationId,
        })
      }

      // This is where the moveCard call belongs:
      // inside the drag-end handler, after calculating the new order.
      await moveCard({
        cardId: movedCard._id,
        columnId: destinationId,
        position: getNewPosition(
          reorderedCards,
          movedCard._id,
        ),
      })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editor || pending.current || !title.trim()) return

    pending.current = true
    setBusy(true)

    try {
      switch (editor.kind) {
        case "new-column":
          await createColumn({
            boardId,
            name: title.trim(),
          })
          break

        case "edit-column":
          await renameColumn({
            columnId: editor.columnId,
            name: title.trim(),
          })
          break

        case "new-card":
          await createCard({
            boardId,
            columnId: editor.columnId,
            title: title.trim(),
            description: description.trim(),
          })
          break

        case "edit-card":
          await updateCard({
            cardId: editor.cardId,
            title: title.trim(),
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

      setDeleteTarget(null)
      toast.success("Deleted.")
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
          <Skeleton
            key={index}
            className="h-96 w-72 shrink-0 rounded-2xl sm:w-80"
          />
        ))}
      </div>
    )
  }

  const isCardEditor =
    editor?.kind === "new-card" ||
    editor?.kind === "edit-card"

  const isCreating =
    editor?.kind === "new-card" ||
    editor?.kind === "new-column"

  const editorHeading = isCreating
    ? isCardEditor
      ? "Add a card"
      : "Add a column"
    : isCardEditor
      ? "Edit card"
      : "Edit column"

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Use the grip handles to move columns and cards.
        </p>

        <span
          role="status"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          {busy ? "Saving..." : ""}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={boardCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragPreview(null)}
      >
        <ScrollArea className="w-full min-w-0">
          <SortableContext
            items={sortedColumns.map((column) =>
              columnDragId(column._id),
            )}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex items-start gap-5 px-0.5 pb-5 pt-1">
              {sortedColumns.map((column, index) => {
                const columnCards = boardCards
                  .filter(
                    (card) => card.columnId === column._id,
                  )
                  .sort((a, b) => a.position - b.position)

                const accent = getAccent(column.name, index)

                return (
                  <SortableShell
                    key={column._id}
                    id={columnDragId(column._id)}
                    label={`Move column ${column.name}`}
                    disabled={busy || editor !== null || deleteTarget !== null}
                    className="w-72 shrink-0 sm:w-80"
                  >
                    {(columnHandle) => (
                      <Card
                        className={cn(
                          "gap-0 overflow-hidden rounded-2xl",
                          "border-2 border-zinc-300/90",
                          "bg-muted/35 py-0",
                          "shadow-[0_3px_0_0_rgba(24,24,27,0.08)]",
                          "dark:border-zinc-700 dark:shadow-none",
                        )}
                      >
                        <CardHeader
                          className={cn(
                            "flex flex-row items-center",
                            "justify-between gap-2 space-y-0",
                            "border-b-2 border-zinc-300/70",
                            "px-3 py-3 dark:border-zinc-700",
                            accent.header,
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            {columnHandle}

                            <CardTitle className="min-w-0 break-words text-sm font-semibold">
                              {column.name}
                            </CardTitle>

                            <Badge
                              variant="outline"
                              className={cn(
                                "h-6 min-w-6 shrink-0",
                                "justify-center rounded-lg",
                                "px-1.5 text-xs tabular-nums",
                                accent.badge,
                              )}
                              aria-label={`${columnCards.length} cards`}
                            >
                              {columnCards.length}
                            </Badge>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={interactionLocked}
                            aria-label={`Edit column ${column.name}`}
                            className="size-8 shrink-0 rounded-lg"
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
                            <span aria-hidden="true">…</span>
                          </Button>
                        </CardHeader>

                        <CardContent className="p-3">
                          <ColumnDropZone
                            columnId={column._id}
                            disabled={
                              busy ||
                              editor !== null ||
                              deleteTarget !== null
                            }
                          >
                            <SortableContext
                              items={columnCards.map((card) =>
                                cardDragId(card._id),
                              )}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="flex-1 space-y-3">
                                {columnCards.length === 0 && (
                                  <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-background/50 p-4 text-center dark:border-zinc-700">
                                    <p className="text-sm text-muted-foreground">
                                      Drop a card here, or add a new one.
                                    </p>
                                  </div>
                                )}

                                {columnCards.map((card) => (
                                  <SortableShell
                                    key={card._id}
                                    id={cardDragId(card._id)}
                                    label={`Move card ${card.title}`}
                                    disabled={
                                      busy ||
                                      editor !== null ||
                                      deleteTarget !== null
                                    }
                                  >
                                    {(cardHandle) => (
                                      <div className="flex items-start gap-1 rounded-xl border border-zinc-300/90 bg-card p-2 text-card-foreground shadow-sm dark:border-zinc-700">
                                        <div className="pt-0.5">
                                          {cardHandle}
                                        </div>

                                        <button
                                          type="button"
                                          disabled={interactionLocked}
                                          aria-label={`Edit card ${card.title}`}
                                          className="min-w-0 flex-1 rounded-lg p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                      </div>
                                    )}
                                  </SortableShell>
                                ))}
                              </div>
                            </SortableContext>

                            <Button
                              type="button"
                              variant="ghost"
                              disabled={interactionLocked}
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
                          </ColumnDropZone>
                        </CardContent>
                      </Card>
                    )}
                  </SortableShell>
                )
              })}

              <Button
                type="button"
                variant="outline"
                disabled={interactionLocked}
                className={cn(
                  "h-14 w-72 shrink-0 justify-start gap-2",
                  "rounded-2xl border-2 border-dashed",
                  "border-zinc-300 bg-background/60 px-4",
                  "text-muted-foreground shadow-none",
                  "dark:border-zinc-700 sm:w-80",
                )}
                onClick={() =>
                  openEditor({ kind: "new-column" })
                }
              >
                <span aria-hidden="true">+</span>
                {sortedColumns.length === 0
                  ? "Add your first column"
                  : "Add column"}
              </Button>
            </div>
          </SortableContext>

          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay dropAnimation={null}>
          {dragPreview ? (
            <div className="max-w-80 rounded-xl border-2 border-zinc-400 bg-card px-4 py-3 text-sm text-card-foreground shadow-lg dark:border-zinc-600">
              <span className="block truncate">
                {dragPreview.title}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
            <DialogDescription>
              {editor?.kind === "new-card"
                ? `Add something to “${editor.columnName}”.`
                : isCardEditor
                  ? "Give your task a title and any useful details."
                  : "Give this column a short, useful name."}
            </DialogDescription>
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
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder={
                  isCardEditor
                    ? "What needs to happen?"
                    : "For example, In review"
                }
                disabled={busy}
                required
              />
            </div>

            {isCardEditor && (
              <div className="space-y-2">
                <Label htmlFor="board-editor-description">
                  Description · Optional
                </Label>

                <Textarea
                  id="board-editor-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Notes, context, or a tiny plan..."
                  disabled={busy}
                  className="min-h-32 resize-y"
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
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      requestDelete({
                        kind: "column",
                        columnId: editor.columnId,
                        name: editor.originalName,
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
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      requestDelete({
                        kind: "card",
                        cardId: editor.cardId,
                        title:
                          boardCards.find(
                            (card) =>
                              card._id === editor.cardId,
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
          if (!open && !pending.current) {
            setDeleteTarget(null)
          }
        }}
      >
        <DialogContent
          className="rounded-2xl sm:max-w-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            cancelDeleteButton.current?.focus()
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
                ? `“${deleteTarget.name}” and all cards inside it will be permanently deleted, including any cards added before deletion completes. This cannot be undone.`
                : deleteTarget?.kind === "card"
                  ? `“${deleteTarget.title}” will be permanently deleted. This cannot be undone.`
                  : ""}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              ref={cancelDeleteButton}
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