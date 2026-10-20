import { memo } from "react"
import { Marker } from "react-leaflet"
import L from "leaflet"
import type { Phase } from "@/api/simulation"

interface TrafficLightMarkerProps {
  position: [number, number] // [lat, lng]
  phase: Phase // "red" | "yellow" | "green"
  signalId: string // For React key
  directionLabel?: string // Optional N/S/E/W label
  directionColor?: string // Optional circle color (blue/red/orange/green)
}

/**
 * Realistic traffic light marker component
 * Shows a vertical traffic light with three lights (red, yellow, green)
 * Active light glows, inactive lights are dim
 */
export const TrafficLightMarker = memo(function TrafficLightMarker({
  position,
  phase,
  directionLabel,
  directionColor,
}: TrafficLightMarkerProps) {
  // Determine which light is active
  const isRedActive = phase === "red"
  const isYellowActive = phase === "yellow"
  const isGreenActive = phase === "green"

  // Create realistic traffic light SVG
  const icon = L.divIcon({
    html: `
      <div class="traffic-light-container" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      ">
        ${
          directionColor
            ? `
        <!-- Direction Circle Background -->
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${directionColor};
          opacity: 0.3;
          top: 24px;
          z-index: -1;
          box-shadow: 0 0 12px ${directionColor};
        "></div>
        `
            : ""
        }
        
        <!-- Traffic Light Housing -->
        <div style="
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
          border: 2px solid #404040;
          border-radius: 8px;
          padding: 6px;
          box-shadow: 
            inset 0 1px 2px rgba(255, 255, 255, 0.1),
            0 4px 8px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 32px;
        ">
          <!-- Red Light -->
          <div style="
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${
              isRedActive
                ? "radial-gradient(circle at 30% 30%, #ff4444, #cc0000)"
                : "radial-gradient(circle at 30% 30%, #4a0000, #2a0000)"
            };
            border: 1px solid ${isRedActive ? "#ff6666" : "#3a0000"};
            box-shadow: ${
              isRedActive
                ? "0 0 10px #ff0000, 0 0 20px #ff000080, inset 0 -2px 4px rgba(0,0,0,0.3)"
                : "inset 0 2px 4px rgba(0,0,0,0.5)"
            };
            opacity: ${isRedActive ? "1" : "0.3"};
            transition: all 0.3s ease;
          "></div>
          
          <!-- Yellow Light -->
          <div style="
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${
              isYellowActive
                ? "radial-gradient(circle at 30% 30%, #ffff44, #ffcc00)"
                : "radial-gradient(circle at 30% 30%, #4a4a00, #2a2a00)"
            };
            border: 1px solid ${isYellowActive ? "#ffff66" : "#3a3a00"};
            box-shadow: ${
              isYellowActive
                ? "0 0 10px #ffff00, 0 0 20px #ffff0080, inset 0 -2px 4px rgba(0,0,0,0.3)"
                : "inset 0 2px 4px rgba(0,0,0,0.5)"
            };
            opacity: ${isYellowActive ? "1" : "0.3"};
            transition: all 0.3s ease;
          "></div>
          
          <!-- Green Light -->
          <div style="
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${
              isGreenActive
                ? "radial-gradient(circle at 30% 30%, #44ff44, #00cc00)"
                : "radial-gradient(circle at 30% 30%, #004a00, #002a00)"
            };
            border: 1px solid ${isGreenActive ? "#66ff66" : "#003a00"};
            box-shadow: ${
              isGreenActive
                ? "0 0 10px #00ff00, 0 0 20px #00ff0080, inset 0 -2px 4px rgba(0,0,0,0.3)"
                : "inset 0 2px 4px rgba(0,0,0,0.5)"
            };
            opacity: ${isGreenActive ? "1" : "0.3"};
            transition: all 0.3s ease;
          "></div>
        </div>
        
        <!-- Pole -->
        <div style="
          width: 4px;
          height: 16px;
          background: linear-gradient(90deg, #555 0%, #333 50%, #555 100%);
          border-radius: 2px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        "></div>
        
        <!-- Base -->
        <div style="
          width: 12px;
          height: 4px;
          background: linear-gradient(135deg, #444 0%, #222 100%);
          border-radius: 2px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        "></div>
        
        ${
          directionLabel
            ? `
        <!-- Direction Label -->
        <div style="
          margin-top: 4px;
          background: ${directionColor || "rgba(0, 0, 0, 0.8)"};
          color: white;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: bold;
          font-family: system-ui, -apple-system, sans-serif;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
          letter-spacing: 0.5px;
          text-align: center;
          white-space: nowrap;
        ">${directionLabel}</div>
        `
            : ""
        }
      </div>
    `,
    className: "traffic-light-marker",
    iconSize: [32, directionLabel ? 140 : 100], // Taller if label present
    iconAnchor: [16, directionLabel ? 135 : 95], // Anchor at bottom
  })

  return <Marker position={position} icon={icon} />
})
