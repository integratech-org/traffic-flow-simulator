import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import carIcon from "../assets/car.svg"
import motorcycleIcon from "../assets/motorcycle.svg"

interface VehicleConfig {
  maxSpeed: string
  minSpeed: string
  randomSlowdown: string
  vehicleType: "car" | "motorcycle"
}

interface VehicleConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const initialConfig: VehicleConfig = {
  maxSpeed: "8.00",
  minSpeed: "8.00",
  randomSlowdown: "8.00",
  vehicleType: "car",
}

export function VehicleConfigDialog({
  open,
  onOpenChange,
}: VehicleConfigDialogProps) {
  const [config, setConfig] = useState<VehicleConfig>(initialConfig)

  const handleChange = (field: keyof VehicleConfig, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleVehicleTypeSelect = (type: "car" | "motorcycle") => {
    setConfig((prev) => ({
      ...prev,
      vehicleType: type,
    }))
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
          <Label htmlFor="maxSpeed" className="text-sm font-normal">
            Maximum Speed
          </Label>
          <div className="relative">
            <Input
              id="maxSpeed"
              type="number"
              step="0.01"
              value={config.maxSpeed}
              onChange={(e) => handleChange("maxSpeed", e.target.value)}
              className="pr-20"
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              seconds
            </span>
          </div>
        </div>

        {/* Minimum Speed */}
        <div className="space-y-2">
          <Label htmlFor="minSpeed" className="text-sm font-normal">
            Minimum Speed
          </Label>
          <div className="relative">
            <Input
              id="minSpeed"
              type="number"
              step="0.01"
              value={config.minSpeed}
              onChange={(e) => handleChange("minSpeed", e.target.value)}
              className="pr-20"
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              seconds
            </span>
          </div>
        </div>

        {/* Random Slowdown */}
        <div className="space-y-2">
          <Label htmlFor="randomSlowdown" className="text-sm font-normal">
            Random Slowdown
          </Label>
          <div className="relative">
            <Input
              id="randomSlowdown"
              type="number"
              step="0.01"
              value={config.randomSlowdown}
              onChange={(e) => handleChange("randomSlowdown", e.target.value)}
              className="pr-20"
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              seconds
            </span>
          </div>
        </div>

        {/* Vehicle Options */}
        <div className="space-y-3 pt-2">
          <h3 className="text-center text-sm font-semibold">Vehicle Options</h3>

          {/* Car Option */}
          <button
            onClick={() => handleVehicleTypeSelect("car")}
            className={`flex w-full items-center gap-3 rounded-full px-5 py-3 transition-colors ${
              config.vehicleType === "car"
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
              config.vehicleType === "motorcycle"
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
            console.log("Saving vehicle configuration:", config)
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
