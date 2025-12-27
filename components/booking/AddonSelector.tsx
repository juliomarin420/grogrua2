import { Shield, Zap, Award, Moon, Camera, ShieldCheck, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Addon {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_price: number;
  price_type: string;
  icon: string | null;
}

interface AddonSelectorProps {
  addons: Addon[];
  selectedAddons: string[];
  onToggle: (addonId: string) => void;
  basePrice?: number;
}

const iconMap: Record<string, any> = {
  shield: Shield,
  zap: Zap,
  award: Award,
  moon: Moon,
  camera: Camera,
  "shield-check": ShieldCheck,
};

const categoryLabels: Record<string, string> = {
  insurance: "Seguros",
  priority: "Prioridad",
  operator: "Operador",
  assistance: "Asistencia",
  documentation: "Documentación",
};

export default function AddonSelector({
  addons,
  selectedAddons,
  onToggle,
  basePrice = 0,
}: AddonSelectorProps) {
  const groupedAddons = addons.reduce((acc, addon) => {
    if (!acc[addon.category]) {
      acc[addon.category] = [];
    }
    acc[addon.category].push(addon);
    return acc;
  }, {} as Record<string, Addon[]>);

  const formatPrice = (addon: Addon) => {
    if (addon.price_type === "percentage") {
      return `${addon.base_price}% del total`;
    }
    return `$${addon.base_price.toLocaleString("es-CL")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Servicios Premium</h3>
        {selectedAddons.length > 0 && (
          <Badge variant="secondary">
            {selectedAddons.length} seleccionado{selectedAddons.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {Object.entries(groupedAddons).map(([category, categoryAddons]) => (
        <div key={category} className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {categoryLabels[category] || category}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {categoryAddons.map((addon) => {
              const Icon = iconMap[addon.icon || "shield"] || Shield;
              const isSelected = selectedAddons.includes(addon.id);

              return (
                <Card
                  key={addon.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => onToggle(addon.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{addon.name}</p>
                          {isSelected && (
                            <Check size={16} className="text-primary flex-shrink-0" />
                          )}
                        </div>
                        {addon.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {addon.description}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-accent mt-2">
                          +{formatPrice(addon)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {addons.length === 0 && (
        <p className="text-center text-muted-foreground py-4">
          No hay servicios premium disponibles
        </p>
      )}
    </div>
  );
}
