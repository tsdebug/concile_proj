import { Button } from "@/components/ui/button"
import { useAuth } from "@/auth/AuthProvider"
import { toast } from "sonner"

export function App() {
  const { session, signOut } = useAuth()
  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Concile Board</span>
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
      <main className="text-muted-foreground p-6">Your board is coming next.</main>
    </div>
  )
}