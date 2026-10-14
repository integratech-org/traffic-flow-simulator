import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, MapPin, Trash2 } from "lucide-react"
import { useSimStore, type Accident } from "@/features/simulation/store"
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  Marker,
  Circle,
  Polyline,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { addAccident, deleteAccident } from "@/api/simulation"
import { useNetwork } from "@/features/map/hooks/use-network"

// Fix default marker icon issue in Leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"

// @ts-expect-error leaflet types
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface AccidentPlacementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TempAccident {
  lat: number
  lon: number
}

// Lane colors matching main map
const LANE_COLOR = { inbound: "#3388ff", outbound: "#888" } as const

// network.json is [lng, lat]; Leaflet wants [lat, lng]
const toLatLng = ([lng, lat]: [number, number]): [number, number] => [lat, lng]

// Mindanao Avenue intersection coordinates - tighter bounds
const INTERSECTION_CENTER: [number, number] = [14.721306, 121.052105]
const MAP_BOUNDS: [[number, number], [number, number]] = [
  [14.7198, 121.0508], // Southwest corner
  [14.7228, 121.0535], // Northeast corner
]

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lon: number) => void
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function AccidentPlacementDialog({
  open,
  onOpenChange,
}: AccidentPlacementDialogProps) {
  const addAccidentToStore = useSimStore((s) => s.addAccident)
  const removeAccidentFromStore = useSimStore((s) => s.removeAccident)
  const accidents = useSimStore((s) => s.accidents)
  const runId = useSimStore((s) => s.runId)
  const tick = useSimStore((s) => s.tick)
  const status = useSimStore((s) => s.status)
  const { laneById } = useNetwork()

  const [duration, setDuration] = useState<string>("180")
  const [tempAccidents, setTempAccidents] = useState<TempAccident[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDuration("180")
      setTempAccidents([])
      setErrors({})
    }
  }, [open])

  const handleMapClick = (lat: number, lon: number) => {
    // ACCIDENT_FIX: Leaflet returns coordinates in correct geographic order (lat, lon)
    // Store as-is for sending to backend
    setTempAccidents((prev) => [...prev, { lat, lon }])
    setErrors({}) // Clear errors when placing accident
  }

  const handleClearTempAccidents = () => {
    setTempAccidents([])
  }

  const handleRemoveExistingAccident = async (accidentId: string) => {
    // Remove from store
    removeAccidentFromStore(accidentId)

    // Remove from backend
    if (runId) {
      try {
        await deleteAccident(runId, accidentId)
      } catch (error) {
        console.error("Failed to remove accident from backend:", error)
      }
    }
  }

  const handlePlaceAccidents = async () => {
    // Validation
    const newErrors: Record<string, string> = {}

    if (tempAccidents.length === 0) {
      newErrors.map = "Click on the map to place at least one accident"
    }

    const durationNum = Number(duration)
    if (isNaN(durationNum) || durationNum <= 0) {
      newErrors.duration = "Duration must be a positive number"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (!runId || !tick) {
      newErrors.general =
        "No active simulation run. Please start a simulation first."
      setErrors(newErrors)
      return
    }

    if (status !== "running") {
      newErrors.general =
        "Simulation must be running to place accidents. Please click Run."
      setErrors(newErrors)
      return
    }

    // Duration is already in seconds
    const durationSeconds = durationNum

    // Create accidents for all temporary placements (fixed severity: severe, fixed radius: 8m)
    // ACCIDENT_FIX: Accident coordinates stored in standard geographic order (lat, lon)
    // This matches the Accident schema and is correct for distance calculations
    const newAccidents: Accident[] = tempAccidents.map((temp, idx) => ({
      id: `accident-${Date.now()}-${idx}`,
      lat: temp.lat, // Geographic latitude
      lon: temp.lon, // Geographic longitude
      severity: "severe", // Always use severe for strong slowdown effect
      duration_seconds: durationSeconds,
      created_at_tick: tick.tick,
    }))

    // Add to store
    for (const accident of newAccidents) {
      addAccidentToStore(accident)
    }

    // Send to backend
    try {
      for (const accident of newAccidents) {
        await addAccident(runId, accident)
      }
    } catch (error) {
      console.error("Failed to add accidents to backend:", error)
      // Still keep them in frontend store for visualization
    }

    // Clear temporary placements but keep modal open
    setTempAccidents([])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <Card className="flex max-h-[90vh] w-full max-w-3xl flex-col bg-white shadow-2xl">
        {/* Header - Match other dialogs */}
        <CardHeader className="flex flex-row items-center justify-between px-5 pb-3">
          <CardTitle className="text-base">Place Accident on Map</CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6 rounded-md hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </CardHeader>

        {/* Content - White Background with Scrollable Area */}
        <CardContent
          className="flex-1 space-y-6 overflow-y-auto p-6 px-5 pb-4"
          style={{ scrollbarWidth: "thin" }}
        >
          {/* Duration (Seconds Only) */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm font-normal">
              Duration (seconds)
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={`h-11 ${errors.duration ? "border-red-500" : ""}`}
            />
            {errors.duration && (
              <p className="text-sm text-red-500">{errors.duration}</p>
            )}
          </div>

          {/* Map Preview - Dark theme, focused on intersection roads */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">
                Click on the map to place accidents
              </Label>
              {tempAccidents.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearTempAccidents}
                  className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Clear All ({tempAccidents.length})
                </Button>
              )}
            </div>
            <div
              className={`h-[400px] overflow-hidden rounded-md border-2 ${
                errors.map ? "border-red-500" : "border-gray-300"
              }`}
            >
              <MapContainer
                center={INTERSECTION_CENTER}
                zoom={18}
                maxZoom={19}
                minZoom={17}
                maxBounds={MAP_BOUNDS}
                maxBoundsViscosity={1.0}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://stadiamaps.com/attribution/" target="_blank">Stadia Maps</a>'
                  url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                />
                <MapClickHandler onMapClick={handleMapClick} />

                {/* Lane overlays - same colors as main map */}
                {laneById &&
                  Object.entries(laneById).map(([laneId, lane]) => (
                    <Polyline
                      key={laneId}
                      positions={lane.cellCoords.map(toLatLng)}
                      pathOptions={{
                        color:
                          LANE_COLOR[
                            lane.direction as "inbound" | "outbound"
                          ] ?? "#888",
                        weight: 4,
                      }}
                    />
                  ))}

                {/* Temporary accident markers */}
                {tempAccidents.map((acc, idx) => (
                  <div key={`temp-${idx}`}>
                    <Marker position={[acc.lat, acc.lon]} />
                    <Circle
                      center={[acc.lat, acc.lon]}
                      radius={8}
                      pathOptions={{
                        color: "#ef4444",
                        fillColor: "#ef4444",
                        fillOpacity: 0.2,
                      }}
                    />
                  </div>
                ))}

                {/* Existing accidents from store */}
                {accidents.map((acc) => (
                  <div key={acc.id}>
                    <Marker position={[acc.lat, acc.lon]} />
                    <Circle
                      center={[acc.lat, acc.lon]}
                      radius={8}
                      pathOptions={{
                        color: "#ef4444",
                        fillColor: "#ef4444",
                        fillOpacity: 0.2,
                      }}
                    />
                  </div>
                ))}
              </MapContainer>
            </div>
            {errors.map && <p className="text-sm text-red-500">{errors.map}</p>}
          </div>

          {/* Existing Accidents List */}
          {accidents.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-normal">
                Active Accidents ({accidents.length})
              </Label>
              <div
                className="max-h-32 divide-y overflow-y-auto rounded-md border"
                style={{ scrollbarWidth: "thin" }}
              >
                {accidents.map((accident) => (
                  <div
                    key={accident.id}
                    className="flex items-center justify-between p-2 text-sm hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: "#ef4444" }}
                      />
                      <span className="truncate text-xs text-muted-foreground">
                        {accident.lat.toFixed(5)}, {accident.lon.toFixed(5)}
                      </span>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        {accident.duration_seconds}s
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveExistingAccident(accident.id)}
                      className="h-7 w-7 flex-shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info text */}
          <div className="space-y-1 rounded-md bg-muted p-4 text-sm text-muted-foreground">
            {!runId || status !== "running" ? (
              <p className="font-medium text-amber-600 dark:text-amber-500">
                ⚠️ Please start a simulation before placing accidents
              </p>
            ) : (
              <>
                <p>
                  • Accidents will automatically expire after {duration} seconds
                </p>
                <p>
                  • Vehicles in the affected area (8m radius) will slow down
                  dramatically (80% braking)
                </p>
                <p>
                  • You can place multiple accidents before closing this dialog
                </p>
              </>
            )}
          </div>

          {errors.general && (
            <p className="rounded-md bg-red-50 p-3 text-center text-sm text-red-500 dark:bg-red-950/20">
              {errors.general}
            </p>
          )}

          {/* Footer - Buttons */}
          <div className="mt-6 flex justify-end gap-3 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11"
            >
              Close
            </Button>
            <Button
              onClick={handlePlaceAccidents}
              disabled={
                tempAccidents.length === 0 || !runId || status !== "running"
              }
              className="h-11 bg-[#0D1628] hover:bg-[#0D1628]/90 disabled:opacity-50"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Place Accident{tempAccidents.length > 1 ? "s" : ""} (
              {tempAccidents.length})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
