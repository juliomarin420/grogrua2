import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Car, Phone, User } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Service = Database["public"]["Tables"]["services"]["Row"];
type ServiceStatus = Database["public"]["Enums"]["service_status"];

interface ServiceCardProps {
  service: Service;
  showActions?: boolean;
  onStatusChange?: (status: ServiceStatus) => void;
  onViewDetails?: () => void;
  onAssign?: () => void;
}

const statusLabels: Record<ServiceStatus, string> = {
  pending: "Pendiente",
  assigned: "Asignado",
  en_route: "En Camino",
  at_origin: "En Origen",
  loading: "Cargando",
  in_transit: "En Tránsito",
  at_destination: "En Destino",
  completed: "Completado",
  cancelled: "Cancelado",
};

const statusColors: Record<ServiceStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  assigned: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  en_route: "bg-indigo-500/20 text-indigo-700 border-indigo-500/30",
  at_origin: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  loading: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  in_transit: "bg-cyan-500/20 text-cyan-700 border-cyan-500/30",
  at_destination: "bg-teal-500/20 text-teal-700 border-teal-500/30",
  completed: "bg-green-500/20 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-700 border-red-500/30",
};

const vehicleTypeLabels: Record<string, string> = {
  car: "Auto / Sedán",
  pickup: "Camioneta / SUV",
  truck_light: "Camión Liviano",
  truck_heavy: "Camión Pesado",
  machinery_light: "Maquinaria Ligera",
  machinery_heavy: "Maquinaria Pesada",
};

export default function ServiceCard({
  service,
  showActions = false,
  onStatusChange,
  onViewDetails,
  onAssign,
}: ServiceCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">
              Servicio #{service.id.slice(0, 8)}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              <Clock size={14} className="inline mr-1" />
              {formatDate(service.created_at)}
            </p>
          </div>
          <Badge className={statusColors[service.status]}>
            {statusLabels[service.status]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Car size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">
              {vehicleTypeLabels[service.client_vehicle_type] || service.client_vehicle_type}
            </p>
            {service.client_vehicle_brand && (
              <p className="text-xs text-muted-foreground">
                {service.client_vehicle_brand} {service.client_vehicle_model}
                {service.client_vehicle_plate && ` • ${service.client_vehicle_plate}`}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Origen</p>
              <p className="text-sm">{service.origin_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Destino</p>
              <p className="text-sm">{service.destination_address}</p>
            </div>
          </div>
        </div>

        {(service.client_name || service.client_phone) && (
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            {service.client_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User size={14} />
                {service.client_name}
              </div>
            )}
            {service.client_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone size={14} />
                {service.client_phone}
              </div>
            )}
          </div>
        )}

        {service.estimated_price && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Precio estimado</span>
            <span className="font-semibold text-accent">
              ${service.estimated_price.toLocaleString("es-CL")}
            </span>
          </div>
        )}

        {showActions && (
          <div className="flex gap-2 pt-2">
            {onViewDetails && (
              <Button variant="outline" size="sm" onClick={onViewDetails} className="flex-1">
                Ver detalles
              </Button>
            )}
            {onAssign && service.status === "pending" && (
              <Button variant="default" size="sm" onClick={onAssign} className="flex-1">
                Asignar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
