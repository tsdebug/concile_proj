import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ConcileProvider } from "@concile/client/react"
import { App } from "./App"
import { AuthGate } from "@/auth/AuthGate"
import { AuthProvider } from "@/auth/AuthProvider"
import { client } from "@/lib/concile"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConcileProvider client={client}>
      <AuthProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </AuthProvider>
    </ConcileProvider>
  </StrictMode>,
)