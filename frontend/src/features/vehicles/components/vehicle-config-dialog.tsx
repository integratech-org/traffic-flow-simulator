import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { X } from "lucide-react"
import { useSimStore } from "@/features/simulation/store"
import carIcon from "../assets/car.svg"
import motorcycleIcon from "../assets/motorcycle.svg"

interface VehicleParams {
  maxSpeed: string
  minSpeed: string
  randomSlowdown: string
}

interface VehicleDisplay {
  color: string
  size: string
}

interface VehicleConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const VEHICLE_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "White", value: "#ffffff" },
]

export function VehicleConfigDialog({
  open,
  onOpenChange,
}: VehicleConfigDialogProps) {
  const simConfig = useSimStore((s) => s.config)
  const patchConfig = useSimStore((s) => s.patchConfig)
  const vehicleDisplay = useSimStore((s) => s.vehicleDisplay)
  const setVehicleDisplay = useSimStore((s) => s.setVehicleDisplay)

  const [vehicleType, setVehicleType] = useState<"car" | "motorcycle">("car")

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Separate state for each vehicle type to preserve changes when switching
  const [carConfig, setCarConfig] = useState<VehicleParams>(() => {
    const carParams = simConfig.vehicle_params.car
    return {
      maxSpeed: String(carParams.v_max),
      minSpeed: String(carParams.v_min),
      randomSlowdown: String(carParams.p_slow),
    }
  })

  const [motorcycleConfig, setMotorcycleConfig] = useState<VehicleParams>(
    () => {
      const motoParams = simConfig.vehicle_params.motorcycle
      return {
        maxSpeed: String(motoParams.v_max),
        minSpeed: String(motoParams.v_min),
        randomSlowdown: String(motoParams.p_slow),
      }
    }
  )

  // Display config (color and size)
  const [carDisplay, setCarDisplay] = useState<VehicleDisplay>(() => ({
    color: vehicleDisplay.car.color,
    size: String(vehicleDisplay.car.size),
  }))

  const [motorcycleDisplay, setMotorcycleDisplay] = useState<VehicleDisplay>(
    () => ({
      color: vehicleDisplay.motorcycle.color,
      size: String(vehicleDisplay.motorcycle.size),
    })
  )

  // Reset to store values when dialog opens
  useEffect(() => {
    if (open) {
      const carParams = simConfig.vehicle_params.car
      const motoParams = simConfig.vehicle_params.motorcycle

      setCarConfig({
        maxSpeed: String(carParams.v_max),
        minSpeed: String(carParams.v_min),
        randomSlowdown: String(carParams.p_slow),
      })

      setMotorcycleConfig({
        maxSpeed: String(motoParams.v_max),
        minSpeed: String(motoParams.v_min),
        randomSlowdown: String(motoParams.p_slow),
      })

      setCarDisplay({
        color: vehicleDisplay.car.color,
        size: String(vehicleDisplay.car.size),
      })

      setMotorcycleDisplay({
        color: vehicleDisplay.motorcycle.color,
        size: String(vehicleDisplay.motorcycle.size),
      })

      // Clear errors when dialog opens
      setErrors({})
    }
  }, [open, simConfig.vehicle_params, vehicleDisplay])

  // Get current config based on selected vehicle type
  const currentConfig = vehicleType === "car" ? carConfig : motorcycleConfig
  const setCurrentConfig =
    vehicleType === "car" ? setCarConfig : setMotorcycleConfig

  const currentDisplay = vehicleType === "car" ? carDisplay : motorcycleDisplay
  const setCurrentDisplay =
    vehicleType === "car" ? setCarDisplay : setMotorcycleDisplay

  const handleChange = (field: keyof VehicleParams, value: string) => {
    setCurrentConfig((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear error for this field when user types
    const errorKey = `${vehicleType}.${field}`
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  const handleDisplayChange = (field: keyof VehicleDisplay, value: string) => {
    setCurrentDisplay((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear error for this field
    const errorKey = `${vehicleType}.${field}`
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  const handleVehicleTypeChange = (value: string) => {
    setVehicleType(value as "car" | "motorcycle")
  }

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate both car and motorcycle configs
    const configs = [
      { type: "car", config: carConfig, display: carDisplay },
      {
        type: "motorcycle",
        config: motorcycleConfig,
        display: motorcycleDisplay,
      },
    ]

    configs.forEach(({ type, config, display }) => {
      const maxSpeed = Number(config.maxSpeed)
      const minSpeed = Number(config.minSpeed)
      const randomSlowdown = Number(config.randomSlowdown)
      const size = Number(display.size)

      // Validate max speed
      if (isNaN(maxSpeed) || maxSpeed <= 0) {
        newErrors[`${type}.maxSpeed`] = "Must be a positive number"
      } else if (maxSpeed < 1) {
        newErrors[`${type}.maxSpeed`] = "Must be at least 1 cell/s"
      } else if (maxSpeed > 20) {
        newErrors[`${type}.maxSpeed`] = "Cannot exceed 20 cells/s"
      }

      // Validate min speed
      if (isNaN(minSpeed) || minSpeed < 0) {
        newErrors[`${type}.minSpeed`] = "Must be 0 or greater"
      } else if (minSpeed > maxSpeed) {
        newErrors[`${type}.minSpeed`] = "Cannot exceed maximum speed"
      }

      // Validate random slowdown probability
      if (isNaN(randomSlowdown) || randomSlowdown < 0 || randomSlowdown > 1) {
        newErrors[`${type}.randomSlowdown`] = "Must be between 0 and 1"
      }

      // Validate size
      if (isNaN(size) || size < 1) {
        newErrors[`${type}.size`] = "Must be at least 1px"
      } else if (size > 10) {
        newErrors[`${type}.size`] = "Cannot exceed 10px"
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  if (!open) return null

  return (
    <Card className="absolute top-20 right-4 z-[1000] w-[340px] shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between px-5 pt-2">
        <CardTitle className="text-base">Vehicle Configuration</CardTitle>
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
        <Tabs value={vehicleType} onValueChange={handleVehicleTypeChange}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger
              value="car"
              className="transition-none data-active:bg-[#0D1628] data-active:text-white hover:data-active:text-white"
            >
              Car
            </TabsTrigger>
            <TabsTrigger
              value="motorcycle"
              className="transition-none data-active:bg-[#0D1628] data-active:text-white hover:data-active:text-white"
            >
              Motorcycle
            </TabsTrigger>
          </TabsList>

          <TabsContent value={vehicleType} className="mt-4 space-y-4">
            {/* Vehicle Type Label with Image */}
            <div className="flex flex-col items-center space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <Label className="text-sm font-semibold">Vehicle Type</Label>
              <p className="text-sm text-muted-foreground">
                {vehicleType === "car"
                  ? "Four wheeled vehicle"
                  : "Two wheeled vehicle"}
              </p>
              <img
                src={vehicleType === "car" ? carIcon : motorcycleIcon}
                alt={vehicleType === "car" ? "Car" : "Motorcycle"}
                className="h-16 w-16"
              />
            </div>

            {/* Vehicle Color */}
            <div className="space-y-2">
              <Label htmlFor="color" className="text-sm font-normal">
                Vehicle Color
              </Label>
              <Select
                value={currentDisplay.color}
                onValueChange={(value) =>
                  value && handleDisplayChange("color", value)
                }
              >
                <SelectTrigger className="h-11 w-full">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-4 rounded border"
                      style={{ backgroundColor: currentDisplay.color }}
                    />
                    {VEHICLE_COLORS.find(
                      (c) => c.value === currentDisplay.color
                    )?.name || currentDisplay.color}
                  </div>
                </SelectTrigger>
                <SelectContent
                  side="bottom"
                  align="start"
                  alignItemWithTrigger={false}
                >
                  {VEHICLE_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-4 rounded border"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle Size */}
            <div className="space-y-2">
              <Label
                htmlFor="size"
                className={`text-sm font-normal ${errors[`${vehicleType}.size`] ? "text-red-500" : ""}`}
              >
                Vehicle Size
              </Label>
              <div className="relative">
                <Input
                  id="size"
                  type="number"
                  step="1"
                  min="1"
                  max="10"
                  value={currentDisplay.size}
                  onChange={(e) => handleDisplayChange("size", e.target.value)}
                  className={`pr-16 ${errors[`${vehicleType}.size`] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  px
                </span>
              </div>
              {errors[`${vehicleType}.size`] && (
                <p className="text-sm text-red-500">
                  {errors[`${vehicleType}.size`]}
                </p>
              )}
            </div>

            {/* Maximum Speed */}
            <div className="space-y-2">
              <Label
                htmlFor="maxSpeed"
                className={`text-sm font-normal ${errors[`${vehicleType}.maxSpeed`] ? "text-red-500" : ""}`}
              >
                Maximum Speed
              </Label>
              <div className="relative">
                <Input
                  id="maxSpeed"
                  type="number"
                  step="0.01"
                  value={currentConfig.maxSpeed}
                  onChange={(e) => handleChange("maxSpeed", e.target.value)}
                  className={`pr-20 ${errors[`${vehicleType}.maxSpeed`] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  cells/s
                </span>
              </div>
              {errors[`${vehicleType}.maxSpeed`] && (
                <p className="text-sm text-red-500">
                  {errors[`${vehicleType}.maxSpeed`]}
                </p>
              )}
            </div>

            {/* Minimum Speed */}
            <div className="space-y-2">
              <Label
                htmlFor="minSpeed"
                className={`text-sm font-normal ${errors[`${vehicleType}.minSpeed`] ? "text-red-500" : ""}`}
              >
                Minimum Speed
              </Label>
              <div className="relative">
                <Input
                  id="minSpeed"
                  type="number"
                  step="0.01"
                  value={currentConfig.minSpeed}
                  onChange={(e) => handleChange("minSpeed", e.target.value)}
                  className={`pr-20 ${errors[`${vehicleType}.minSpeed`] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  cells/s
                </span>
              </div>
              {errors[`${vehicleType}.minSpeed`] && (
                <p className="text-sm text-red-500">
                  {errors[`${vehicleType}.minSpeed`]}
                </p>
              )}
            </div>

            {/* Random Slowdown */}
            <div className="space-y-2">
              <Label
                htmlFor="randomSlowdown"
                className={`text-sm font-normal ${errors[`${vehicleType}.randomSlowdown`] ? "text-red-500" : ""}`}
              >
                Random Slowdown
              </Label>
              <div className="relative">
                <Input
                  id="randomSlowdown"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={currentConfig.randomSlowdown}
                  onChange={(e) =>
                    handleChange("randomSlowdown", e.target.value)
                  }
                  className={`pr-20 ${errors[`${vehicleType}.randomSlowdown`] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  probability
                </span>
              </div>
              {errors[`${vehicleType}.randomSlowdown`] && (
                <p className="text-sm text-red-500">
                  {errors[`${vehicleType}.randomSlowdown`]}
                </p>
              )}
            </div>

            {/* Save Button */}
            <Button
              onClick={() => {
                if (!validateConfig()) {
                  return
                }

                // Save vehicle params to store
                patchConfig({
                  vehicle_params: {
                    car: {
                      v_max: Number(carConfig.maxSpeed),
                      v_min: Number(carConfig.minSpeed),
                      p_slow: Number(carConfig.randomSlowdown),
                    },
                    motorcycle: {
                      v_max: Number(motorcycleConfig.maxSpeed),
                      v_min: Number(motorcycleConfig.minSpeed),
                      p_slow: Number(motorcycleConfig.randomSlowdown),
                    },
                  },
                })

                // Save vehicle display settings
                setVehicleDisplay("car", {
                  color: carDisplay.color,
                  size: Number(carDisplay.size),
                })
                setVehicleDisplay("motorcycle", {
                  color: motorcycleDisplay.color,
                  size: Number(motorcycleDisplay.size),
                })

                onOpenChange(false)
              }}
              className="h-11 w-full bg-[#0D1628] hover:bg-[#0D1628]/90"
            >
              Save Vehicle Configuration
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
