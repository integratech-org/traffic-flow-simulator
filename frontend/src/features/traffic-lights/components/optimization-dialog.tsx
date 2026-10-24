import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react"
import { useSimStore } from "@/features/simulation/store"
import {
  optimizeSignalPlan,
  updateSignalPlan,
  type OptimizationResult,
} from "@/api/simulation"

interface OptimizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOptimizationComplete?: () => void
}

interface ProgressState {
  stage: "initializing" | "evaluating" | "evolving" | "completing"
  generation: number
  totalGenerations: number
  evaluationsComplete: number
  totalEvaluations: number
  elapsedSeconds: number
  estimatedRemaining: number
}

export function OptimizationDialog({
  open,
  onOpenChange,
  onOptimizationComplete,
}: OptimizationDialogProps) {
  const simConfig = useSimStore((s) => s.config)
  const patchConfig = useSimStore((s) => s.patchConfig)
  const runId = useSimStore((s) => s.runId)
  const status = useSimStore((s) => s.status)

  const [isOptimizing, setIsOptimizing] = useState(false)
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState>({
    stage: "initializing",
    generation: 0,
    totalGenerations: 10,
    evaluationsComplete: 0,
    totalEvaluations: 200,
    elapsedSeconds: 0,
    estimatedRemaining: 0,
  })

  // Optimization parameters
  const [populationSize, setPopulationSize] = useState("20")
  const [generations, setGenerations] = useState("10")
  const [ticksPerEval, setTicksPerEval] = useState("600")
  const [wThroughput, setWThroughput] = useState("1.0")
  const [wWait, setWWait] = useState("1.0")
  const [wQueue, setWQueue] = useState("1.0")

  // Scenario configuration (editable)
  const [dayOfWeek, setDayOfWeek] = useState(simConfig.day_of_week)
  const [timeOfDay, setTimeOfDay] = useState(simConfig.time)
  const [weatherCondition, setWeatherCondition] = useState(
    simConfig.weather_condition
  )
  const [densityScenario, setDensityScenario] = useState(
    simConfig.density_scenario
  )

  const startTimeRef = useRef<number>(0)
  const progressIntervalRef = useRef<number | null>(null)

  // Simulate realistic progress based on actual optimization workload
  const startProgressSimulation = (popSize: number, gens: number) => {
    startTimeRef.current = Date.now()
    const totalEvals = popSize * gens
    const avgEvalTimeMs = 150 // ~150ms per evaluation (realistic for 600 ticks)
    const estimatedTotalMs = totalEvals * avgEvalTimeMs

    setProgress({
      stage: "initializing",
      generation: 0,
      totalGenerations: gens,
      evaluationsComplete: 0,
      totalEvaluations: totalEvals,
      elapsedSeconds: 0,
      estimatedRemaining: Math.ceil(estimatedTotalMs / 1000),
    })

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const elapsedSec = Math.floor(elapsed / 1000)

      // Estimate progress based on elapsed time and average evaluation speed
      const estimatedEvalsComplete = Math.min(
        Math.floor(elapsed / avgEvalTimeMs),
        totalEvals - 1
      )
      const currentGen = Math.floor(estimatedEvalsComplete / popSize)

      // Determine stage based on progress
      let stage: ProgressState["stage"] = "evaluating"
      if (elapsed < 1000) {
        stage = "initializing"
      } else if (currentGen < gens) {
        stage = currentGen === 0 ? "evaluating" : "evolving"
      }

      const remaining = Math.max(
        0,
        Math.ceil((estimatedTotalMs - elapsed) / 1000)
      )

      setProgress({
        stage,
        generation: currentGen,
        totalGenerations: gens,
        evaluationsComplete: estimatedEvalsComplete,
        totalEvaluations: totalEvals,
        elapsedSeconds: elapsedSec,
        estimatedRemaining: remaining,
      })
    }, 200)
  }

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  useEffect(() => {
    return () => stopProgressSimulation()
  }, [])

  const handleOptimize = async () => {
    setIsOptimizing(true)
    setError(null)
    setResult(null)

    const popSize = Number(populationSize)
    const gens = Number(generations)

    startProgressSimulation(popSize, gens)

    try {
      const optimizationResult = await optimizeSignalPlan({
        base_config: {
          ...simConfig,
          day_of_week: dayOfWeek,
          time: timeOfDay,
          weather_condition: weatherCondition,
          density_scenario: densityScenario,
        },
        population_size: popSize,
        generations: gens,
        ticks_per_eval: Number(ticksPerEval),
        w_throughput: Number(wThroughput),
        w_wait: Number(wWait),
        w_queue: Number(wQueue),
      })

      stopProgressSimulation()
      setProgress((prev) => ({
        ...prev,
        stage: "completing",
        generation: gens,
        evaluationsComplete: popSize * gens,
      }))

      setResult(optimizationResult)
    } catch (err) {
      stopProgressSimulation()
      setError(err instanceof Error ? err.message : "Optimization failed")
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleApply = async () => {
    if (!result) return

    try {
      // Update the frontend store
      patchConfig({
        signal_plan: result.best_signal_plan,
      })

      // If simulation is running, also update the backend
      if (runId && (status === "running" || status === "paused")) {
        await updateSignalPlan(runId, result.best_signal_plan)
      }

      onOptimizationComplete?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to apply optimized plan:", error)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
  }

  if (!open) return null

  const progressPercent =
    (progress.evaluationsComplete / progress.totalEvaluations) * 100

  const getStageLabel = () => {
    switch (progress.stage) {
      case "initializing":
        return "Initializing optimizer..."
      case "evaluating":
        return "Evaluating initial population"
      case "evolving":
        return "Evolving signal plans"
      case "completing":
        return "Finalizing results"
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1150] bg-black/50"
        onClick={() => !isOptimizing && onOpenChange(false)}
      />

      {/* Dialog */}
      <Card className="fixed top-1/2 left-1/2 z-[1200] max-h-[90vh] w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-amber-500" />
            Auto-Optimize Traffic Lights
          </CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-md hover:bg-muted"
            onClick={() => onOpenChange(false)}
            disabled={isOptimizing}
          >
            <X className="size-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5 p-6">
          {/* Configuration State */}
          {!isOptimizing && !result && !error && (
            <>
              {/* Scenario Configuration - Now Editable */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                <div className="mb-3 flex items-start gap-3">
                  <Clock className="mt-0.5 size-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Optimization Scenario
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Configure the traffic conditions to optimize for
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Day of Week */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="day_of_week"
                      className="text-xs font-medium"
                    >
                      Day of Week
                    </Label>
                    <select
                      id="day_of_week"
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(e.target.value as any)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>

                  {/* Time and Weather Row */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Time of Day */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="time_of_day"
                        className="text-xs font-medium"
                      >
                        Time of Day
                      </Label>
                      <Input
                        id="time_of_day"
                        type="time"
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Weather Condition */}
                    <div className="space-y-1.5">
                      <Label htmlFor="weather" className="text-xs font-medium">
                        Weather
                      </Label>
                      <select
                        id="weather"
                        value={weatherCondition}
                        onChange={(e) =>
                          setWeatherCondition(e.target.value as any)
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <option value="clear">Clear</option>
                        <option value="light_rain">Light Rain</option>
                        <option value="heavy_rain">Heavy Rain</option>
                      </select>
                    </div>
                  </div>

                  {/* Density Scenario */}
                  <div className="space-y-1.5">
                    <Label htmlFor="density" className="text-xs font-medium">
                      Traffic Density
                    </Label>
                    <select
                      id="density"
                      value={densityScenario}
                      onChange={(e) =>
                        setDensityScenario(e.target.value as any)
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <option value="light">Light</option>
                      <option value="moderate">Moderate</option>
                      <option value="heavy">Heavy</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                <div className="flex items-start gap-3">
                  <BarChart3 className="mt-0.5 size-5 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1 space-y-1.5">
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Genetic Algorithm Optimization
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Uses evolutionary algorithms to find optimal signal
                      timings that maximize throughput while minimizing wait
                      times and queue lengths.
                    </p>
                  </div>
                </div>
              </div>

              {/* Optimization Parameters */}
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 text-sm font-semibold">
                    Algorithm Parameters
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="population" className="text-xs">
                        Population Size
                      </Label>
                      <Input
                        id="population"
                        type="number"
                        min="4"
                        max="100"
                        value={populationSize}
                        onChange={(e) => setPopulationSize(e.target.value)}
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">
                        Solutions per generation
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="generations" className="text-xs">
                        Generations
                      </Label>
                      <Input
                        id="generations"
                        type="number"
                        min="1"
                        max="100"
                        value={generations}
                        onChange={(e) => setGenerations(e.target.value)}
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">
                        Evolution iterations
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ticks" className="text-xs">
                    Simulation Duration (ticks)
                  </Label>
                  <Input
                    id="ticks"
                    type="number"
                    min="100"
                    max="3600"
                    value={ticksPerEval}
                    onChange={(e) => setTicksPerEval(e.target.value)}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    600 ticks ≈ 10 minutes simulated time per evaluation
                  </p>
                </div>

                <div>
                  <Label className="mb-2 text-sm font-semibold">
                    Optimization Goals
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="w_throughput" className="text-xs">
                        Throughput
                      </Label>
                      <Input
                        id="w_throughput"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={wThroughput}
                        onChange={(e) => setWThroughput(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="w_wait" className="text-xs">
                        Wait Time
                      </Label>
                      <Input
                        id="w_wait"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={wWait}
                        onChange={(e) => setWWait(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="w_queue" className="text-xs">
                        Queue
                      </Label>
                      <Input
                        id="w_queue"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={wQueue}
                        onChange={(e) => setWQueue(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Higher values = more important to optimize
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Evaluations:</span>
                  <span className="font-mono text-lg">
                    {Number(populationSize) * Number(generations)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Estimated Time:</span>
                  <span className="text-muted-foreground">
                    ~
                    {Math.ceil(
                      (Number(populationSize) * Number(generations) * 150) /
                        1000
                    )}
                    s
                  </span>
                </div>
              </div>

              <Button
                onClick={handleOptimize}
                className="h-12 w-full bg-gradient-to-r from-amber-600 to-orange-600 text-base font-semibold hover:from-amber-700 hover:to-orange-700"
              >
                <Zap className="mr-2 size-5" />
                Start Optimization
              </Button>
            </>
          )}

          {/* Optimizing State with Real Progress */}
          {isOptimizing && (
            <div className="space-y-5">
              {/* Stage Header */}
              <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:border-amber-800 dark:from-amber-950 dark:to-orange-950">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-amber-600 dark:bg-amber-500">
                    <Zap className="size-5 animate-pulse text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      {getStageLabel()}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Generation {progress.generation + 1} of{" "}
                      {progress.totalGenerations}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-muted-foreground tabular-nums">
                    {progress.evaluationsComplete} / {progress.totalEvaluations}{" "}
                    evaluations
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Math.round(progressPercent)}% complete</span>
                  <span>{progress.elapsedSeconds}s elapsed</span>
                </div>
              </div>

              {/* Live Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="size-4" />
                    <span>Current Generation</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {progress.generation + 1}
                    <span className="text-sm text-muted-foreground">
                      /{progress.totalGenerations}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-4" />
                    <span>Est. Remaining</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {progress.estimatedRemaining}
                    <span className="text-sm text-muted-foreground">s</span>
                  </p>
                </div>
              </div>

              {/* Process Description */}
              <div className="rounded-lg border bg-muted/20 p-3.5 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  What's happening right now:
                </p>
                <ul className="mt-2 space-y-1">
                  {progress.stage === "initializing" && (
                    <li>• Setting up genetic algorithm parameters</li>
                  )}
                  {progress.stage === "evaluating" && (
                    <>
                      <li>
                        • Running {Number(populationSize)} simulations in
                        parallel
                      </li>
                      <li>• Each simulation tests different signal timings</li>
                      <li>• Measuring throughput, wait times, and queues</li>
                    </>
                  )}
                  {progress.stage === "evolving" && (
                    <>
                      <li>• Selecting best-performing signal plans</li>
                      <li>• Combining and mutating successful strategies</li>
                      <li>• Evaluating new generation of solutions</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Activity Indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <div className="size-2 animate-pulse rounded-full bg-amber-500" />
                  <div className="size-2 animate-pulse rounded-full bg-amber-500 [animation-delay:0.2s]" />
                  <div className="size-2 animate-pulse rounded-full bg-amber-500 [animation-delay:0.4s]" />
                </div>
                <span>Computing optimal signal plan...</span>
              </div>
            </div>
          )}

          {/* Success Result */}
          {result && !isOptimizing && (
            <div className="space-y-5">
              <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 dark:border-green-800 dark:from-green-950 dark:to-emerald-950">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Optimization Complete!
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Found optimal configuration in{" "}
                      {result.elapsed_seconds.toFixed(1)} seconds
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Performance Metrics</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-cyan-50 p-3 dark:from-blue-950 dark:to-cyan-950">
                    <p className="text-xs text-muted-foreground">Throughput</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {result.best_metrics.throughput.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      vehicles/cycle
                    </p>
                  </div>
                  <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 p-3 dark:from-green-950 dark:to-emerald-950">
                    <p className="text-xs text-muted-foreground">Fitness</p>
                    <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
                      {result.best_metrics.fitness.toFixed(3)}
                    </p>
                    <p className="text-xs text-muted-foreground">score</p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Avg Wait</p>
                    <p className="mt-1 text-xl font-semibold">
                      {result.best_metrics.avg_wait.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">ticks</p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Max Queue</p>
                    <p className="mt-1 text-xl font-semibold">
                      {result.best_metrics.max_queue.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">vehicles</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-sm font-semibold">
                  Optimized Signal Timings
                </p>
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  {result.best_signal_plan.signal_timers.map((timer, idx) => {
                    const labels = [
                      "Mindanao NE (S1)",
                      "Commonwealth SW (S2)",
                      "Mindanao SW (S3)",
                      "Commonwealth NE (S4)",
                    ]
                    return (
                      <div
                        key={timer.signal_id}
                        className="flex items-center justify-between rounded-md bg-background/50 p-2 text-xs"
                      >
                        <span className="font-medium">{labels[idx]}</span>
                        <div className="flex gap-3 font-mono text-muted-foreground">
                          <span className="text-green-600 dark:text-green-400">
                            🟢 {timer.green}s
                          </span>
                          <span className="text-yellow-600 dark:text-yellow-400">
                            🟡 {timer.yellow}s
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 font-semibold hover:from-green-700 hover:to-emerald-700"
                >
                  <CheckCircle2 className="mr-2 size-4" />
                  Apply This Configuration
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="px-6"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <div className="flex items-center gap-3">
                  <AlertCircle className="size-6 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900 dark:text-red-100">
                      Optimization Failed
                    </p>
                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
