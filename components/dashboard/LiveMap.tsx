import { useEffect, useState } from "react";
import GoogleMap from "@/components/maps/GoogleMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useDrivers } from "@/hooks/useDrivers";
import { useServices } from "@/hooks/useServices";

interface LiveMapProps {
  className?: string;
  onDriverClick?: (driverId: string) => void;
  onServiceClick?: (serviceId: string) => void;
}

export default function LiveMap({ className = "", onDriverClick, onServiceClick }: LiveMapProps) {
  const { availableDrivers, fetchDrivers } = useDrivers();
  const { services } = useServices();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const activeServices = services.filter(
    (s) => !["completed", "cancelled"].includes(s.status)
  );

  const handleRefresh = () => {
    fetchDrivers();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <Badge variant="secondary" className="backdrop-blur-sm bg-card/80">
          {availableDrivers.length} conductores disponibles
        </Badge>
        <Badge variant="secondary" className="backdrop-blur-sm bg-card/80">
          {activeServices.length} servicios activos
        </Badge>
      </div>
      
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-4 right-4 z-10 backdrop-blur-sm bg-card/80"
        onClick={handleRefresh}
      >
        <RefreshCw size={18} />
      </Button>

      <GoogleMap
        className="w-full h-full min-h-[400px] rounded-xl"
        interactive={false}
      />

      {/* Driver markers overlay would go here in a real implementation */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {availableDrivers.slice(0, 5).map((driver) => (
            <button
              key={driver.id}
              onClick={() => {
                setSelectedDriver(driver.id);
                onDriverClick?.(driver.id);
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDriver === driver.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/90 backdrop-blur-sm hover:bg-card"
              }`}
            >
              Conductor #{driver.id.slice(0, 6)}
              {driver.rating && (
                <span className="ml-2 text-accent">★ {driver.rating}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
