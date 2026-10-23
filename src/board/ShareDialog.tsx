import { useRef, useState } from "react"
import { useMutation, useQuery } from "@concile/client/react"
import type { Id } from "../../concile/_generated/dataModel"
import { Copy, Link2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/concile"
import { Button } from "@/components/ui/button"
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

function generateToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

function makeShareUrl(token: string) {
  const url = new URL(window.location.href)
  url.hash = `/share/${token}`
  return url.toString()
}

export function ShareDialog({
  boardId,
  onClose,
}: {
  boardId: Id<"boards">
  onClose: () => void
}) {
  const share = useQuery(api.sharing.getMine, { boardId })
  const enableSharing = useMutation(api.sharing.enable)
  const disableSharing = useMutation(api.sharing.disable)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pending = useRef(false)
  const linkInput = useRef<HTMLInputElement>(null)

  const shareUrl = share ? makeShareUrl(share.token) : ""

  async function changeSharing(action: "enable" | "replace" | "disable") {
    if (pending.current) return

    pending.current = true
    setBusy(true)
    setError(null)

    try {
      if (action === "disable") {
        await disableSharing({ boardId })
        toast.success("Sharing disabled. The old link no longer works.")
      } else {
        await enableSharing({
          boardId,
          token: generateToken(),
          replace: action === "replace",
        })

        toast.success(
          action === "replace"
            ? "Link replaced. The previous link no longer works."
            : "Sharing enabled.",
        )
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update sharing.",
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied.")
    } catch {
      linkInput.current?.focus()
      linkInput.current?.select()
      toast.info("Select and copy the link manually.")
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending.current) onClose()
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share your board</DialogTitle>
          <DialogDescription>
            Anyone signed in to this app with the link can view
            the board, including card descriptions. They cannot
            edit it.
          </DialogDescription>
        </DialogHeader>

        {share === undefined ? (
          <p role="status" className="py-4 text-sm text-muted-foreground">
            Loading sharing settings...
          </p>
        ) : share === null ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-dashed p-4">
              <p className="text-sm font-medium">
                Your board is private
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enable a view-only link when you’re ready to show
                someone around.
              </p>
            </div>

            <Button
              type="button"
              disabled={busy}
              className="w-full gap-2"
              onClick={() => changeSharing("enable")}
            >
              <Link2 className="size-4" aria-hidden="true" />
              {busy ? "Enabling..." : "Enable sharing"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="board-share-link">View-only link</Label>

              <div className="flex gap-2">
                <Input
                  ref={linkInput}
                  id="board-share-link"
                  value={shareUrl}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy share link"
                  disabled={busy}
                  onClick={copyLink}
                >
                  <Copy className="size-4" aria-hidden="true" />
                </Button>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Recipients can forward this link. Replacing it
                invalidates the previous link.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => changeSharing("replace")}
              >
                Replace link
              </Button>

              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className="text-destructive hover:text-destructive"
                onClick={() => changeSharing("disable")}
              >
                Disable sharing
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}