import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "leaflet/dist/leaflet.css"
import Map from "./components/map"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="h-dvh overflow-hidden">
      <Map />
    </div>
  </StrictMode>
)
