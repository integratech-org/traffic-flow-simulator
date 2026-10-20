import { fetchJson } from "@/api/client"

export const WS_URL = (import.meta.env.VITE_API_URL as string).replace(
  /^http/,
  "ws"
)

export type VehicleType = "car" | "motorcycle"
export type RunState = "created" | "running" | "paused"
export type CongestionLevel = "light" | "moderate" | "heavy"
export type Phase = "green" | "yellow" | "red"
export type AccidentSeverity = "light" | "moderate" | "severe"

export interface VehicleParams {
  v_max: number // m/s, int 1..20
  // FIX_TASK1: Removed v_min - standard NaSch allows speed=0 naturally
  p_slow: number // 0..1
}

export interface SignalTimer {
  signal_id: string // "S1".."S4"
  green: number // seconds, int >= 1
  yellow: number
  red: number
}

export interface SignalPlan {
  signal_timers: SignalTimer[]
}

export interface CreateRunRequest {
  day_of_week:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday"
  time: string // "HH:MM" 24h
  weather_condition: "clear" | "cloudy" | "rainy"
  density_scenario: CongestionLevel
  vehicle_mix: { two_wheeler_pct: number; four_wheeler_pct: number }
  vehicle_params: Record<VehicleType, VehicleParams>
  signal_plan: SignalPlan
  seed?: number | null
}

export interface RunStateResponse {
  run_id: string
  state: RunState
  tick: number
  created_at: string
  config: CreateRunRequest
}

export interface VehicleState {
  id: number
  type: VehicleType
  lane_id: string
  cell: number // index into lanes[lane_id].cellCoords
  speed: number // cells per tick
}

export interface LaneCongestion {
  lane_id: string
  level: CongestionLevel
  density: number
  volume: number
}

export interface LaneSegment {
  // TASK_SEGMENTED_CONGESTION: Individual segment of a lane with localized congestion
  lane_id: string
  start_cell: number
  end_cell: number
  level: CongestionLevel
  density: number
  vehicle_count: number
}

export interface SignalStatus {
  signal_id: string
  leg_id: string
  phase: Phase
  seconds_remaining: number
}

export interface Metrics {
  throughput: number
  avg_wait: number
  max_queue: number
  two_wheeler_pct: number
  four_wheeler_pct: number
}

export interface Accident {
  id: string
  lat: number
  lon: number
  severity: AccidentSeverity
  duration_seconds: number
  created_at_tick: number
}

export interface TickMessage {
  run_id: string
  state: RunState
  tick: number
  vehicles: VehicleState[]
  congestion: LaneCongestion[]
  segments: LaneSegment[] // TASK_SEGMENTED_CONGESTION: Segment-level congestion
  signals: SignalStatus[]
  metrics: Metrics | null
  accidents: Accident[]
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body ? { "Content-Type": "application/json" } : undefined,
  body: body ? JSON.stringify(body) : undefined,
})

export const createRun = (config: CreateRunRequest) =>
  fetchJson<RunStateResponse>("/simulation/runs", send("POST", config))

export const startRun = (id: string) =>
  fetchJson<RunStateResponse>(`/simulation/runs/${id}/start`, send("POST"))

export const pauseRun = (id: string) =>
  fetchJson<RunStateResponse>(`/simulation/runs/${id}/pause`, send("POST"))

export const deleteRun = (id: string) =>
  fetchJson<void>(`/simulation/runs/${id}`, send("DELETE"))

export const updateSignalPlan = (id: string, plan: SignalPlan) =>
  fetchJson<RunStateResponse>(
    `/simulation/runs/${id}/signal-plan`,
    send("PUT", plan)
  )

export const optimizeRealtime = (id: string, request: OptimizationRequest) =>
  fetchJson<OptimizationResult>(
    `/optimization/optimize-realtime/${id}`,
    send("POST", request)
  )

export const addAccident = (runId: string, accident: Accident) =>
  fetchJson<Accident>(
    `/simulation/runs/${runId}/accidents`,
    send("POST", accident)
  )

export const getAccidents = (runId: string) =>
  fetchJson<Accident[]>(`/simulation/runs/${runId}/accidents`, send("GET"))

export const deleteAccident = (runId: string, accidentId: string) =>
  fetchJson<void>(
    `/simulation/runs/${runId}/accidents/${accidentId}`,
    send("DELETE")
  )

// Optimization API
export interface OptimizationRequest {
  base_config: CreateRunRequest
  population_size?: number
  generations?: number
  ticks_per_eval?: number
  w_throughput?: number
  w_wait?: number
  w_queue?: number
  seed?: number | null
}

export interface CandidateMetrics {
  throughput: number
  avg_wait: number
  max_queue: number
  fitness: number
}

export interface OptimizationResult {
  best_signal_plan: SignalPlan
  best_metrics: CandidateMetrics
  elapsed_seconds: number
  total_evaluations: number
}

export const optimizeSignalPlan = (req: OptimizationRequest) =>
  fetchJson<OptimizationResult>("/optimization/optimize", send("POST", req))
