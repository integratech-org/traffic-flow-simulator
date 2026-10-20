import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { X, Sparkles } from "lucide-react"
import { useSimStore } from "@/features/simulation/store"
import { OptimizationDialog } from "./optimization-dialog"

interface TrafficLightTiming {
  green: string
  yellow: string
  red: string
}

interface TrafficLightConfig {
  north: TrafficLightTiming
  south: TrafficLightTiming
  west: TrafficLightTiming
  east: TrafficLightTiming
}

interface TrafficLightDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeDirection?: keyof TrafficLightConfig
  onDirectionChange: (direction: keyof TrafficLightConfig) => void
}

export function TrafficLightDialog({
  open,
  onOpenChange,
  activeDirection = "north",
  onDirectionChange,
}: TrafficLightDialogProps) {
  const simConfig = useSimStore((s) => s.config)
  const patchConfig = useSimStore((s) => s.patchConfig)

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Optimization dialog state
  const [isOptimizationOpen, setIsOptimizationOpen] = useState(false)

  // Initialize from store config
  const [config, setConfig] = useState<TrafficLightConfig>(() => {
    const signalTimers = simConfig.signal_plan.signal_timers
    return {
      north: {
        green: String(signalTimers[0]?.green ?? 30),
        yellow: String(signalTimers[0]?.yellow ?? 5),
        red: String(signalTimers[0]?.red ?? 30),
      },
      south: {
        green: String(signalTimers[1]?.green ?? 30),
        yellow: String(signalTimers[1]?.yellow ?? 5),
        red: String(signalTimers[1]?.red ?? 30),
      },
      east: {
        green: String(signalTimers[2]?.green ?? 30),
        yellow: String(signalTimers[2]?.yellow ?? 5),
        red: String(signalTimers[2]?.red ?? 30),
      },
      west: {
        green: String(signalTimers[3]?.green ?? 30),
        yellow: String(signalTimers[3]?.yellow ?? 5),
        red: String(signalTimers[3]?.red ?? 30),
      },
    }
  })

  // Sync with store when dialog opens
  useEffect(() => {
    if (open) {
      const signalTimers = simConfig.signal_plan.signal_timers
      setConfig({
        north: {
          green: String(signalTimers[0]?.green ?? 30),
          yellow: String(signalTimers[0]?.yellow ?? 5),
          red: String(signalTimers[0]?.red ?? 30),
        },
        south: {
          green: String(signalTimers[1]?.green ?? 30),
          yellow: String(signalTimers[1]?.yellow ?? 5),
          red: String(signalTimers[1]?.red ?? 30),
        },
        east: {
          green: String(signalTimers[2]?.green ?? 30),
          yellow: String(signalTimers[2]?.yellow ?? 5),
          red: String(signalTimers[2]?.red ?? 30),
        },
        west: {
          green: String(signalTimers[3]?.green ?? 30),
          yellow: String(signalTimers[3]?.yellow ?? 5),
          red: String(signalTimers[3]?.red ?? 30),
        },
      })
      // Clear errors when dialog opens
      setErrors({})
    }
  }, [open, simConfig.signal_plan.signal_timers])

  const handleTimingChange = (
    direction: keyof TrafficLightConfig,
    phase: keyof TrafficLightTiming,
    value: string
  ) => {
    setConfig((prev) => ({
      ...prev,
      [direction]: {
        ...prev[direction],
        [phase]: value,
      },
    }))

    // Clear error for this field when user types
    const errorKey = `${direction}.${phase}`
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  const handleDirectionChange = (value: string) => {
    const direction = value as keyof TrafficLightConfig
    onDirectionChange(direction)
  }

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {}
    const directions: Array<keyof TrafficLightConfig> = [
      "north",
      "south",
      "east",
      "west",
    ]

    directions.forEach((direction) => {
      const timing = config[direction]

      // Validate green
      const green = Number(timing.green)
      if (isNaN(green) || green <= 0) {
        newErrors[`${direction}.green`] = "Must be a positive number"
      } else if (green < 5) {
        newErrors[`${direction}.green`] = "Must be at least 5 seconds"
      } else if (green > 300) {
        newErrors[`${direction}.green`] = "Cannot exceed 300 seconds"
      }

      // Validate yellow
      const yellow = Number(timing.yellow)
      if (isNaN(yellow) || yellow <= 0) {
        newErrors[`${direction}.yellow`] = "Must be a positive number"
      } else if (yellow < 2) {
        newErrors[`${direction}.yellow`] = "Must be at least 2 seconds"
      } else if (yellow > 10) {
        newErrors[`${direction}.yellow`] = "Cannot exceed 10 seconds"
      }

      // Validate red
      const red = Number(timing.red)
      if (isNaN(red) || red <= 0) {
        newErrors[`${direction}.red`] = "Must be a positive number"
      } else if (red < 5) {
        newErrors[`${direction}.red`] = "Must be at least 5 seconds"
      } else if (red > 300) {
        newErrors[`${direction}.red`] = "Cannot exceed 300 seconds"
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateConfig()) {
      return
    }

    // Map directions to signal IDs: S1=North, S2=South, S3=East, S4=West
    patchConfig({
      signal_plan: {
        signal_timers: [
          {
            signal_id: "S1",
            green: Number(config.north.green),
            yellow: Number(config.north.yellow),
            red: Number(config.north.red),
          },
          {
            signal_id: "S2",
            green: Number(config.south.green),
            yellow: Number(config.south.yellow),
            red: Number(config.south.red),
          },
          {
            signal_id: "S3",
            green: Number(config.east.green),
            yellow: Number(config.east.yellow),
            red: Number(config.east.red),
          },
          {
            signal_id: "S4",
            green: Number(config.west.green),
            yellow: Number(config.west.yellow),
            red: Number(config.west.red),
          },
        ],
      },
    })
    onOpenChange(false)
  }

  const currentTiming = config[activeDirection]

  if (!open) return null

  return (
    <Card className="absolute top-20 right-4 z-[1000] w-[340px] shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between px-5 pt-2">
        <CardTitle className="text-base">Traffic Light Configuration</CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6 rounded-md hover:bg-muted"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-4">
        <Tabs value={activeDirection} onValueChange={handleDirectionChange}>
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger
              value="north"
              className="transition-none data-active:bg-[#0D1628] data-active:text-white hover:data-active:text-white"
            >
              North
            </TabsTrigger>
            <TabsTrigger
              value="south"
              className="transition-none data-active:bg-[#0D1628] data-active:text-white hover:data-active:text-white"
            >
              South
            </TabsTrigger>
            <TabsTrigger
              value="west"
              className="transition-none data-active:bg-[#0D1628] data-active:text-white hover:data-active:text-white"
            >
              West
            </TabsTrigger>
            <TabsTrigger
              value="east"
              className="transition-none data-active:bg-[#0D1628] data-active:text-white hover:data-active:text-white"
            >
              East
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeDirection} className="mt-4 space-y-4">
            {/* Green Light Timing */}
            <div className="space-y-2">
              <Label
                htmlFor="green"
                className={`text-sm ${errors[`${activeDirection}.green`] ? "text-red-500" : ""}`}
              >
                Green
              </Label>
              <div className="relative">
                <Input
                  id="green"
                  type="number"
                  step="0.01"
                  value={currentTiming.green}
                  onChange={(e) =>
                    handleTimingChange(activeDirection, "green", e.target.value)
                  }
                  className={`pr-20 ${errors[`${activeDirection}.green`] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  seconds
                </span>
              </div>
              {errors[`${activeDirection}.green`] && (
                <p className="text-sm text-red-500">
                  {errors[`${activeDirection}.green`]}
                </p>
              )}
            </div>

            {/* Yellow Light Timing */}
            <div className="space-y-2">
              <Label
                htmlFor="yellow"
                className={`text-sm ${errors[`${activeDirection}.yellow`] ? "text-red-500" : ""}`}
              >
                Yellow
              </Label>
              <div className="relative">
                <Input
                  id="yellow"
                  type="number"
                  step="0.01"
                  value={currentTiming.yellow}
                  onChange={(e) =>
                    handleTimingChange(
                      activeDirection,
                      "yellow",
                      e.target.value
                    )
                  }
                  className={`pr-20 ${errors[`${activeDirection}.yellow`] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  seconds
                </span>
              </div>
              {errors[`${activeDirection}.yellow`] && (
                <p className="text-sm text-red-500">
                  {errors[`${activeDirection}.yellow`]}
                </p>
              )}
            </div>

            {/* Red Light Timing */}
            <div className="space-y-2">
              <Label
                htmlFor="red"
                className={`text-sm ${errors[`${activeDirection}.red`] ? "text-red-500" : ""}`}
              >
                Red
              </Label>
              <div className="relative">
                <Input
                  id="red"
                  type="number"
                  step="0.01"
                  value={currentTiming.red}
                  onChange={(e) =>
                    handleTimingChange(activeDirection, "red", e.target.value)
                  }
                  className={`pr-20 ${errors[`${activeDirection}.red`] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  seconds
                </span>
              </div>
              {errors[`${activeDirection}.red`] && (
                <p className="text-sm text-red-500">
                  {errors[`${activeDirection}.red`]}
                </p>
              )}
            </div>

            {/* Auto Optimize Button */}
            <Button
              onClick={() => setIsOptimizationOpen(true)}
              variant="outline"
              className="h-11 w-full border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              <Sparkles className="mr-2 size-4" />
              Auto-Optimize All Signals
            </Button>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className="h-11 w-full bg-[#0D1628] hover:bg-[#0D1628]/90"
            >
              Save Traffic Light Configuration
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Optimization Dialog */}
      {isOptimizationOpen && (
        <OptimizationDialog
          open={isOptimizationOpen}
          onOpenChange={setIsOptimizationOpen}
          onOptimizationComplete={() => {
            // Sync the local config with the updated store config
            const signalTimers =
              useSimStore.getState().config.signal_plan.signal_timers
            setConfig({
              north: {
                green: String(signalTimers[0]?.green ?? 30),
                yellow: String(signalTimers[0]?.yellow ?? 5),
                red: String(signalTimers[0]?.red ?? 30),
              },
              south: {
                green: String(signalTimers[1]?.green ?? 30),
                yellow: String(signalTimers[1]?.yellow ?? 5),
                red: String(signalTimers[1]?.red ?? 30),
              },
              east: {
                green: String(signalTimers[2]?.green ?? 30),
                yellow: String(signalTimers[2]?.yellow ?? 5),
                red: String(signalTimers[2]?.red ?? 30),
              },
              west: {
                green: String(signalTimers[3]?.green ?? 30),
                yellow: String(signalTimers[3]?.yellow ?? 5),
                red: String(signalTimers[3]?.red ?? 30),
              },
            })
          }}
        />
      )}
    </Card>
  )
}
