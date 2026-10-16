import { create } from "zustand"
import type {
  CreateRunRequest,
  RunState,
  TickMessage,
  Accident,
  AccidentSeverity,
} from "@/api/simulation"

export type { AccidentSeverity, Accident }

export const DEFAULT_CONFIG: CreateRunRequest = {
  day_of_week: "monday",
  time: "08:00",
  weather_condition: "clear",
  density_scenario: "light",
  vehicle_mix: { two_wheeler_pct: 40, four_wheeler_pct: 60 },
  vehicle_params: {
    car: { v_max: 15, p_slow: 0.2 },
    motorcycle: { v_max: 20, p_slow: 0.1 },
  },
  signal_plan: {
    signal_timers: [1, 2, 3, 4].map((i) => ({
      signal_id: `S${i}`,
      green: 30,
      yellow: 5,
      red: 30,
    })),
  },
  seed: null,
}

// Vehicle display configuration (frontend-only, not sent to backend)
export interface VehicleDisplay {
  color: string
  size: number // radius in pixels
}

export const DEFAULT_VEHICLE_DISPLAY: Record<
  "car" | "motorcycle",
  VehicleDisplay
> = {
  car: { color: "#3b82f6", size: 4 }, // Blue
  motorcycle: { color: "#ec4899", size: 3 }, // Pink
}

export interface QueuePoint {
  t: number // simulated seconds
  queue: number // vehicles currently stopped
}

interface SimStore {
  // what the dialogs edit; sent as the body of POST /simulation/runs
  config: CreateRunRequest
  patchConfig: (patch: Partial<CreateRunRequest>) => void

  // vehicle display config (frontend-only)
  vehicleDisplay: Record<"car" | "motorcycle", VehicleDisplay>
  setVehicleDisplay: (
    vehicleType: "car" | "motorcycle",
    display: VehicleDisplay
  ) => void

  // accidents
  accidents: Accident[]
  addAccident: (accident: Accident) => void
  removeAccident: (id: string) => void
  clearAccidents: () => void

  // live run state
  runId: string | null
  status: "idle" | RunState
  tick: TickMessage | null
  queueHistory: QueuePoint[]

  setRun: (runId: string) => void
  setStatus: (status: "idle" | RunState) => void
  pushTick: (tick: TickMessage) => void
  clearRun: () => void
}

export const useSimStore = create<SimStore>((set) => ({
  config: DEFAULT_CONFIG,
  patchConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  vehicleDisplay: DEFAULT_VEHICLE_DISPLAY,
  setVehicleDisplay: (vehicleType, display) =>
    set((s) => ({
      vehicleDisplay: { ...s.vehicleDisplay, [vehicleType]: display },
    })),

  accidents: [],
  addAccident: (accident) =>
    set((s) => ({ accidents: [...s.accidents, accident] })),
  removeAccident: (id) =>
    set((s) => ({ accidents: s.accidents.filter((a) => a.id !== id) })),
  clearAccidents: () => set({ accidents: [] }),

  runId: null,
  status: "idle",
  tick: null,
  queueHistory: [],

  setRun: (runId) =>
    set({ runId, status: "created", tick: null, queueHistory: [] }),
  setStatus: (status) => set({ status }),
  pushTick: (tick) =>
    set((s) => {
      const last = s.queueHistory.at(-1)
      const sample = tick.tick % 5 === 0 && last?.t !== tick.tick
      return {
        tick,
        status: tick.state,
        accidents: tick.accidents, // Sync accidents from backend
        queueHistory: sample
          ? [
              ...s.queueHistory,
              {
                t: tick.tick,
                queue: tick.vehicles.filter((v) => v.speed === 0).length,
              },
            ].slice(-120)
          : s.queueHistory,
      }
    }),
  clearRun: () =>
    set({
      runId: null,
      status: "idle",
      tick: null,
      queueHistory: [],
      accidents: [],
    }),
}))
