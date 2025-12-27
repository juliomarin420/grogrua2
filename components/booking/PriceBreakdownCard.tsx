import { useMemo, useState } from "react";
import { Clock, MapPin, Truck, AlertTriangle, CreditCard, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export type PaymentMethod = "TRANSFER" | "CARD";

interface PriceBreakdown {
  // UI breakdown
  basePrice: number;
  distancePrice: number;
  distanceKm: number;
  addonsTotal: number;
  addonsBreakdown: { name: string; price: number }[];
  subtotal: number;

  // Payment totals
  servicePrice: number;
  cardSurcharge: number;
  totalTransfer: number;
  totalCard: number;

  // Meta
  estimatedDurationMinutes: number;
  surge: boolean;
  surgeMultiplier: number;
  timeMultiplier: number;
}

interface PriceBreakdownCardProps {
  breakdown: PriceBreakdown | null;
  loading?: boolean;
  showDetails?: boolean;
  paymentMethod?: PaymentMethod;
  onPaymentMethodChange?: (method: PaymentMethod) => void;
}

export default function PriceBreakdownCard({
  breakdown,
  loading = false,
  showDetails = true,
  paymentMethod,
  onPaymentMethodChange,
}: PriceBreakdownCardProps) {
  const [localMethod, setLocalMethod] = useState<PaymentMethod>("TRANSFER");
  const selectedMethod = paymentMethod ?? localMethod;

  const setMethod = (m: PaymentMethod) => {
    setLocalMethod(m);
    onPaymentMethodChange?.(m);
  };

  const formatPrice = (price: number) => `$${Math.round(price).toLocaleString("es-CL")}`;

  const totalToPay = useMemo(() => {
    if (!breakdown) return 0;
    return selectedMethod === "CARD" ? breakdown.totalCard : breakdown.totalTransfer;
  }, [breakdown, selectedMethod]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Calculando precio...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!breakdown) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Precio estimado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Selecciona origen y destino para calcular el precio
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {breakdown.surge && (
        <div className="bg-destructive/10 px-4 py-2 flex items-center gap-2 text-destructive">
          <AlertTriangle size={16} />
          <span className="text-sm font-medium">
            Alta demanda: x{breakdown.surgeMultiplier.toFixed(1)}
          </span>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Desglose del precio</CardTitle>
          {breakdown.timeMultiplier > 1 && (
            <Badge variant="secondary" className="text-xs">
              <Clock size={12} className="mr-1" />
              Horario especial
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showDetails && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Truck size={14} />
                  Tarifa base
                </span>
                <span>{formatPrice(breakdown.basePrice)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={14} />
                  Distancia ({breakdown.distanceKm} km)
                </span>
                <span>{formatPrice(breakdown.distancePrice)}</span>
              </div>

              {breakdown.addonsBreakdown.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Servicios Premium
                    </p>
                    {breakdown.addonsBreakdown.map((addon, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{addon.name}</span>
                        <span className="text-primary">+{formatPrice(addon.price)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal servicio</span>
                <span>{formatPrice(breakdown.servicePrice)}</span>
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="text-sm font-medium">Medio de pago</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={selectedMethod === "TRANSFER" ? "accent" : "outline"}
              className="justify-start"
              onClick={() => setMethod("TRANSFER")}
            >
              <Landmark size={16} className="mr-2" />
              Transferencia
            </Button>
            <Button
              type="button"
              variant={selectedMethod === "CARD" ? "accent" : "outline"}
              className="justify-start"
              onClick={() => setMethod("CARD")}
            >
              <CreditCard size={16} className="mr-2" />
              Tarjeta
            </Button>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Costo medio de pago</span>
            <span>
              {selectedMethod === "CARD" ? `+${formatPrice(breakdown.cardSurcharge)}` : formatPrice(0)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            El costo del medio de pago corresponde a la comisión cobrada por el proveedor financiero.
          </p>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="font-medium">Total a pagar</span>
          <span className="text-2xl font-bold text-accent">{formatPrice(totalToPay)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Clock size={16} />
          <span>
            Tiempo estimado: <strong>{breakdown.estimatedDurationMinutes} min</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
