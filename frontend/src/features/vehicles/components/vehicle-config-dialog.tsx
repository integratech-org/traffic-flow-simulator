import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import carIcon from "../assets/car.svg"
import motorcycleIcon from "../assets/motorcycle.svg"
import { useSimStore } from "@/features/simulation/store"

interface VehicleParams {
  maxSpeed: string
  minSpeed: string
  randomSlowdown: string
}

interface VehicleConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VehicleConfigDialog({
  open,
  onOpenChange,
}: VehicleConfigDialogProps) {
  const simConfig = useSimStore((s) => s.config)
  const patchConfig = useSimStore((s) => s.patchConfig)

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

      // Clear errors when dialog opens
      setErrors({})
    }
  }, [open, simConfig.vehicle_params])

  // Get current config based on selected vehicle type
  const currentConfig = vehicleType === "car" ? carConfig : motorcycleConfig
  const setCurrentConfig =
    vehicleType === "car" ? setCarConfig : setMotorcycleConfig

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

  const handleVehicleTypeSelect = (type: "car" | "motorcycle") => {
    setVehicleType(type)
  }

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate both car and motorcycle configs
    const configs = [
      { type: "car", config: carConfig },
      { type: "motorcycle", config: motorcycleConfig },
    ]

    configs.forEach(({ type, config }) => {
      const maxSpeed = Number(config.maxSpeed)
      const minSpeed = Number(config.minSpeed)
      const randomSlowdown = Number(config.randomSlowdown)

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
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  if (!open) return null

  return (
    <Card className="absolute top-20 right-4 z-[1000] w-[340px] shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardTitle className="text-base">Cars Configuration</CardTitle>
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
              onChange={(e) => handleChange("randomSlowdown", e.target.value)}
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

        {/* Vehicle Options */}
        <div className="space-y-3 pt-2">
          <h3 className="text-center text-sm font-semibold">Vehicle Options</h3>

          {/* Car Option */}
          <button
            onClick={() => handleVehicleTypeSelect("car")}
            className={`flex w-full items-center gap-3 rounded-full px-5 py-3 transition-colors ${
              vehicleType === "car"
                ? "bg-[#0D1628] text-white"
                : "border border-gray-300 bg-white text-foreground hover:bg-gray-50"
            }`}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-white">
              <img src={carIcon} alt="Car" className="size-6" />
            </div>
            <div className="text-left">
              <p className="text-xs opacity-80">Four wheeled vehicle</p>
              <p className="font-semibold">Car</p>
            </div>
          </button>

          {/* Motorcycle Option */}
          <button
            onClick={() => handleVehicleTypeSelect("motorcycle")}
            className={`flex w-full items-center gap-3 rounded-full px-5 py-3 transition-colors ${
              vehicleType === "motorcycle"
                ? "bg-[#0D1628] text-white"
                : "border border-gray-300 bg-white text-foreground hover:bg-gray-50"
            }`}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-white">
              <img src={motorcycleIcon} alt="Motorcycle" className="size-6" />
            </div>
            <div className="text-left">
              <p className="text-xs opacity-80">Two wheeled vehicle</p>
              <p className="font-semibold">Motorcycle</p>
            </div>
          </button>
        </div>

        {/* Save Button */}
        <Button
          onClick={() => {
            if (!validateConfig()) {
              return
            }

            // Save both car and motorcycle configs to store
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
            onOpenChange(false)
          }}
          className="h-11 w-full bg-[#0D1628] hover:bg-[#0D1628]/90"
        >
          Save Vehicle Configuration
        </Button>
      </CardContent>
    </Card>
  )
}
