import { Check, X } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  tier: string;
  description: string | null;
  monthly_price: number;
  annual_price: number | null;
  features: string[];
  commission_discount_percent: number;
  priority_support: boolean;
  advanced_analytics: boolean;
}

interface SubscriptionPlansProps {
  plans: Plan[];
  currentPlanId?: string;
  onSelect?: (planId: string) => void;
  loading?: boolean;
}

const tierColors: Record<string, string> = {
  free: "border-border",
  pro: "border-primary bg-primary/5",
  enterprise: "border-accent bg-accent/5",
  constructor: "border-premium bg-premium/5",
};

const tierBadgeColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-primary text-primary-foreground",
  enterprise: "bg-accent text-accent-foreground",
  constructor: "bg-gradient-premium text-white",
};

export default function SubscriptionPlans({
  plans,
  currentPlanId,
  onSelect,
  loading,
}: SubscriptionPlansProps) {
  const formatPrice = (price: number) => {
    if (price === 0) return "Gratis";
    return `$${price.toLocaleString("es-CL")}`;
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const isPopular = plan.tier === "pro";

        return (
          <Card
            key={plan.id}
            className={cn(
              "relative overflow-hidden transition-all hover:shadow-lg",
              tierColors[plan.tier] || "border-border",
              isCurrent && "ring-2 ring-primary"
            )}
          >
            {isPopular && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                Más popular
              </div>
            )}

            <CardHeader className="pb-2">
              <Badge className={cn("w-fit", tierBadgeColors[plan.tier])}>
                {plan.name}
              </Badge>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{formatPrice(plan.monthly_price)}</span>
                  {plan.monthly_price > 0 && (
                    <span className="text-muted-foreground">/mes</span>
                  )}
                </div>
                {plan.annual_price && (
                  <p className="text-sm text-muted-foreground mt-1">
                    o {formatPrice(plan.annual_price)}/año
                    <span className="text-success ml-1">
                      (Ahorra {Math.round((1 - plan.annual_price / (plan.monthly_price * 12)) * 100)}%)
                    </span>
                  </p>
                )}
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-success flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}

                {plan.commission_discount_percent > 0 && (
                  <li className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-success flex-shrink-0 mt-0.5" />
                    <span>{plan.commission_discount_percent}% menos comisión</span>
                  </li>
                )}

                {plan.priority_support && (
                  <li className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-success flex-shrink-0 mt-0.5" />
                    <span>Soporte prioritario</span>
                  </li>
                )}

                {plan.advanced_analytics && (
                  <li className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-success flex-shrink-0 mt-0.5" />
                    <span>Analytics avanzados</span>
                  </li>
                )}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={isCurrent ? "outline" : isPopular ? "default" : "secondary"}
                disabled={isCurrent || loading}
                onClick={() => onSelect?.(plan.id)}
              >
                {isCurrent ? "Plan actual" : plan.monthly_price === 0 ? "Comenzar" : "Suscribirse"}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
