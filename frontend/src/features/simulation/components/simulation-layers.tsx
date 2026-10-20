import { memo, useMemo } from "react"
import { CircleMarker, Polyline, Marker, Circle } from "react-leaflet"
import L from "leaflet" // TASK9: For DivIcon
import type { CongestionLevel } from "@/api/simulation"
import type { Lane } from "@/features/map/api/get-network"
import { useSimStore } from "../store"
import { TrafficLightMarker } from "./traffic-light-marker"

const LEVEL_COLOR: Record<CongestionLevel, string> = {
  light: "#22c55e",
  moderate: "#f97316",
  heavy: "#ef4444",
}
// REALISTIC_TRAFFIC_LIGHTS: PHASE_COLOR removed - now using TrafficLightMarker component
const ACCIDENT_COLOR = "#ef4444" // Red
const ACCIDENT_RADIUS = 8 // meters
const IDLE_COLOR = { inbound: "#3388ff", outbound: "#888" } as const

// TASK9: Arrow decorations for directional flow
const ARROW_SPACING = 15 // Show arrow every N cells
const ARROW_SIZE = 8 // Size of arrow in pixels
const ARROW_COLOR = "rgba(255, 255, 255, 0.6)" // Semi-transparent white

// VISUAL_SIMPLIFICATION: Single-lane visualization (multi-lane logic still runs in backend)
const LANE_WIDTH = 4 // Single consistent width for Google Maps-style roads

// network.json is [lng, lat]; Leaflet wants [lat, lng]
const toLatLng = ([lng, lat]: [number, number]): [number, number] => [lat, lng]

// VISUAL_SIMPLIFICATION: Removed lane offset functions
// Multi-lane simulation still runs in backend, but visualization shows single lane per road
// This simplifies the visual for demo while keeping full lane-changing logic active

/**
 * TASK9: Calculate bearing (angle) between two coordinates for arrow rotation
 */
function calculateBearing(
  from: [number, number],
  to: [number, number]
): number {
  const [lng1, lat1] = from
  const [lng2, lat2] = to
  const dLng = lng2 - lng1
  const dLat = lat2 - lat1
  // Return angle in degrees (0 = north, 90 = east, 180 = south, 270 = west)
  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI
  return angle
}

/**
 * TASK9: Generate arrow positions along a lane at regular intervals
 */
function generateArrowPositions(
  coords: [number, number][],
  spacing: number
): Array<{ position: [number, number]; rotation: number }> {
  const arrows: Array<{ position: [number, number]; rotation: number }> = []

  // Place arrows at regular intervals
  for (let i = spacing; i < coords.length; i += spacing) {
    const position = coords[i]
    const prevPosition = coords[i - 1] || coords[i]
    const nextPosition = coords[i + 1] || coords[i]

    // Calculate bearing for arrow rotation
    const rotation = calculateBearing(prevPosition, nextPosition)

    arrows.push({ position, rotation })
  }

  return arrows
}

const LanePolyline = memo(function LanePolyline({
  positions,
  color,
  weight,
}: {
  positions: [number, number][]
  color: string
  weight: number
}) {
  return <Polyline positions={positions} pathOptions={{ color, weight }} />
})

const DirectionalArrow = memo(function DirectionalArrow({
  position,
  rotation,
}: {
  position: [number, number]
  rotation: number
}) {
  // Create arrow using DivIcon with CSS rotation
  const icon = L.divIcon({
    html: `
      <div style="
        transform: rotate(${rotation}deg);
        width: ${ARROW_SIZE}px;
        height: ${ARROW_SIZE}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="${ARROW_SIZE}" height="${ARROW_SIZE}" viewBox="0 0 24 24" fill="${ARROW_COLOR}" stroke="${ARROW_COLOR}" stroke-width="2">
          <path d="M12 5 L12 19 M12 5 L7 10 M12 5 L17 10"/>
        </svg>
      </div>
    `,
    className: "directional-arrow",
    iconSize: [ARROW_SIZE, ARROW_SIZE],
    iconAnchor: [ARROW_SIZE / 2, ARROW_SIZE / 2],
  })

  return <Marker position={position} icon={icon} />
})

export function SimulationLayers({
  laneById,
}: {
  laneById: Record<string, Lane>
}) {
  const tick = useSimStore((s) => s.tick)
  const accidents = useSimStore((s) => s.accidents)

  // TASK_SEGMENTED_CONGESTION: Build segment map for rendering
  const segmentsByLane = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        lane_id: string
        start_cell: number
        end_cell: number
        level: string
        density: number
        vehicle_count: number
      }>
    >()

    if (!tick?.segments) return map

    for (const segment of tick.segments) {
      if (!map.has(segment.lane_id)) {
        map.set(segment.lane_id, [])
      }
      map.get(segment.lane_id)!.push(segment)
    }
    return map
  }, [tick?.segments])

  // VISUAL_SIMPLIFICATION: Removed lane count calculation - all roads use single width

  // VISUAL_SIMPLIFICATION: Single-lane visualization with segmented congestion
  // Only render lane 0 (center lane) for each leg+direction to show single road
  // Multi-lane simulation continues in backend, but we merge visual representation
  const laneSegments = useMemo(() => {
    const allSegments: Array<{
      id: string
      positions: [number, number][]
      color: string
      weight: number
    }> = []

    // Group lanes by leg+direction to only render the center lane (laneIndex 0)
    for (const [laneId, lane] of Object.entries(laneById)) {
      if (lane.laneIndex !== 0) continue // Only render center lanes

      const coords = lane.cellCoords // No offset - use original coordinates
      const segments = segmentsByLane.get(laneId) || []

      // If no segment data, render whole lane with idle color
      if (segments.length === 0) {
        allSegments.push({
          id: `${laneId}_full`,
          positions: coords.map(toLatLng),
          color: IDLE_COLOR[lane.direction as "inbound" | "outbound"] ?? "#888",
          weight: LANE_WIDTH,
        })
      } else {
        // Render each segment with its own color
        for (const segment of segments) {
          const segmentCoords = coords.slice(
            segment.start_cell,
            segment.end_cell + 1 // Include next point for continuity
          )

          if (segmentCoords.length < 2) continue // Need at least 2 points for polyline

          allSegments.push({
            id: `${laneId}_${segment.start_cell}_${segment.end_cell}`,
            positions: segmentCoords.map(toLatLng),
            color: LEVEL_COLOR[segment.level as CongestionLevel],
            weight: LANE_WIDTH,
          })
        }
      }
    }

    return allSegments
  }, [laneById, segmentsByLane])

  // TASK9: Generate arrow markers for center lanes only (single-lane visualization)
  const laneArrows = useMemo(() => {
    // Only show arrows on center lanes (laneIndex 0) for cleaner visualization
    const centerLanes = Object.entries(laneById).filter(
      ([, lane]) => lane.laneIndex === 0
    )

    return centerLanes.flatMap(([id, lane]) => {
      const coords = lane.cellCoords // No offset - use original coordinates
      const arrows = generateArrowPositions(coords, ARROW_SPACING)

      return arrows.map((arrow, idx) => ({
        id: `${id}_arrow_${idx}`,
        position: toLatLng(arrow.position),
        rotation: arrow.rotation,
      }))
    })
  }, [laneById])

  // PERFECT_SOLUTION: Map leg IDs to direction positions (using DirectionMarkers offset)
  const directionPositions = useMemo(() => {
    const junctionCenter: [number, number] = [14.721306, 121.052105] // [lat, lng]
    const offset = 0.0008 // Same as DirectionMarkers offset
    const southOffset = 0.0012 // Larger offset for south to move it further down

    // VISUAL CLARITY: Rearrange so leg names match their visual positions for less confusion
    // Instead of matching actual road positions, we match label names to visual positions:
    // - Top = Mindanao NE (NE label makes sense at top-right)
    // - Right = Commonwealth NE (NE label makes sense at right)
    // - Bottom = Mindanao SW (SW label makes sense at bottom-left)
    // - Left = Commonwealth SW (SW label makes sense at left)
    const legToPosition: Record<
      string,
      { position: [number, number]; label: string; color: string }
    > = {
      mindanao_ne: {
        position: [junctionCenter[0] + offset, junctionCenter[1]], // NORTH position (top)
        label: "Mindanao NE",
        color: "#3b82f6", // Blue
      },
      commonwealth_ne: {
        position: [junctionCenter[0], junctionCenter[1] + offset], // EAST position (right)
        label: "Commonwealth NE",
        color: "#f59e0b", // Orange
      },
      mindanao_sw: {
        position: [junctionCenter[0] - southOffset, junctionCenter[1]], // SOUTH position (bottom)
        label: "Mindanao SW",
        color: "#ef4444", // Red
      },
      commonwealth_sw: {
        position: [junctionCenter[0], junctionCenter[1] - offset], // WEST position (left)
        label: "Commonwealth SW",
        color: "#10b981", // Green
      },
    }

    return legToPosition
  }, [])

  // a signal marker sits on the last cell (stop line) of its leg's inbound lane
  const stopLines = useMemo(() => {
    const out = new Map<string, [number, number]>()
    for (const lane of Object.values(laneById)) {
      if (lane.direction === "inbound" && lane.laneIndex === 0) {
        out.set(lane.legId, toLatLng(lane.cellCoords.at(-1)!))
      }
    }
    return out
  }, [laneById])

  return (
    <>
      {/* TASK_SEGMENTED_CONGESTION: Render colored segments instead of full lanes */}
      {laneSegments.map((segment) => (
        <LanePolyline
          key={segment.id}
          positions={segment.positions}
          weight={segment.weight}
          color={segment.color}
        />
      ))}

      {/* TASK9: Directional arrows showing traffic flow */}
      {laneArrows.map((arrow) => (
        <DirectionalArrow
          key={arrow.id}
          position={arrow.position}
          rotation={arrow.rotation}
        />
      ))}

      {/* PERFECT_SOLUTION: Large realistic traffic lights at reassigned positions to match diagonal roads */}
      {tick?.signals.map((sig) => {
        const directionData = directionPositions[sig.leg_id]
        if (!directionData) return null

        return (
          <TrafficLightMarker
            key={`direction-${sig.signal_id}`}
            position={directionData.position}
            phase={sig.phase}
            signalId={sig.signal_id}
            directionLabel={directionData.label}
            directionColor={directionData.color}
          />
        )
      })}

      {/* PERFECT_SOLUTION: Small colored dots at actual stop lines on roads (synced with same signals) */}
      {tick?.signals.map((sig) => {
        const stopLinePos = stopLines.get(sig.leg_id)
        if (!stopLinePos) return null

        // Use same phase colors as big traffic lights for visual consistency
        const phaseColor =
          sig.phase === "green"
            ? "#22c55e"
            : sig.phase === "yellow"
              ? "#eab308"
              : "#ef4444"

        return (
          <CircleMarker
            key={`stopline-${sig.signal_id}`}
            center={stopLinePos}
            radius={6}
            pathOptions={{
              color: phaseColor,
              weight: 0,
              fillColor: phaseColor,
              fillOpacity: 0.7,
            }}
          />
        )
      })}

      {/* TASK_REMOVE_VEHICLES: Vehicle circles removed to declutter map - congestion colors now show traffic */}
      {/* Vehicles are still simulated, just not rendered individually */}

      {/* Accident Markers and Zones */}
      {accidents.map((accident) => {
        // Filter out expired accidents (if tick data is available)
        if (
          tick &&
          tick.tick >= accident.created_at_tick + accident.duration_seconds
        ) {
          return null
        }

        return (
          <div key={accident.id}>
            <Marker position={[accident.lat, accident.lon]} />
            <Circle
              center={[accident.lat, accident.lon]}
              radius={ACCIDENT_RADIUS}
              pathOptions={{
                color: ACCIDENT_COLOR,
                fillColor: ACCIDENT_COLOR,
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          </div>
        )
      })}
    </>
  )
}
