import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "leaflet/dist/leaflet.css"
import "mapbox-gl/dist/mapbox-gl.css"
import { MapContainer } from "./features/map/components"
import { Toaster } from "sonner"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="h-dvh overflow-hidden">
      <MapContainer />
      <Toaster position="top-right" richColors />
    </div>
  </StrictMode>
)
