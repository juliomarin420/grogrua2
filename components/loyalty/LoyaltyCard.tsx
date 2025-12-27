import { Star, Award, Flame, Crown, Shield, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLoyalty } from "@/hooks/useLoyalty";

interface LoyaltyCardProps {
  className?: string;
  compact?: boolean;
}

const tierIcons: Record<string, any> = {
  bronze: Award,
  silver: Star,
  gold: Crown,
  platinum: Flame,
};

const badgeIcons: Record<string, any> = {
  verified: Shield,
  punctual: Clock,
  reliable: CheckCircle,
  top_rated: Star,
  vip: Crown,
};

export default function LoyaltyCard({ className, compact = false }: LoyaltyCardProps) {
  const {
    loyaltyPoints,
    reputationScore,
    subscription,
    loading,
    getTierColor,
    getNextTier,
    getPointsToNextTier,
  } = useLoyalty();

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-6">
          <div className="h-24 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!loyaltyPoints) {
    return null;
  }

  const TierIcon = tierIcons[loyaltyPoints.tier] || Award;
  const nextTier = getNextTier(loyaltyPoints.tier);
  const pointsToNext = getPointsToNextTier(loyaltyPoints.tier, loyaltyPoints.points_balance);
  const progressPercent = nextTier
    ? Math.min(100, (loyaltyPoints.points_balance / (loyaltyPoints.points_balance + pointsToNext)) * 100)
    : 100;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className={cn("p-2 rounded-lg", getTierColor(loyaltyPoints.tier))}>
          <TierIcon size={20} />
        </div>
        <div>
          <p className="text-sm font-medium capitalize">{loyaltyPoints.tier}</p>
          <p className="text-xs text-muted-foreground">
            {loyaltyPoints.points_balance.toLocaleString()} pts
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className={cn("p-4", getTierColor(loyaltyPoints.tier))}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TierIcon size={32} />
            <div>
              <p className="font-bold text-lg capitalize">Nivel {loyaltyPoints.tier}</p>
              <p className="text-sm opacity-90">
                {loyaltyPoints.points_balance.toLocaleString()} puntos
              </p>
            </div>
          </div>
          {subscription && (
            <Badge className="bg-white/20 text-white border-white/30">
              {subscription.plan?.name}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {nextTier && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso a {nextTier}</span>
              <span className="font-medium">{pointsToNext.toLocaleString()} pts restantes</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{loyaltyPoints.total_earned.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Ganados</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{loyaltyPoints.total_redeemed.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Canjeados</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{loyaltyPoints.points_balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </div>
        </div>

        {reputationScore && reputationScore.badges.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Insignias</p>
            <div className="flex flex-wrap gap-2">
              {reputationScore.badges.map((badge, index) => {
                const BadgeIcon = badgeIcons[badge] || Award;
                return (
                  <Badge key={index} variant="outline" className="gap-1">
                    <BadgeIcon size={12} />
                    {badge.replace("_", " ")}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-2">Beneficios de tu nivel</p>
          <ul className="text-sm space-y-1">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-success" />
              Acumulación de puntos por servicio
            </li>
            {loyaltyPoints.tier !== "bronze" && (
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-success" />
                Prioridad en asignación
              </li>
            )}
            {(loyaltyPoints.tier === "gold" || loyaltyPoints.tier === "platinum") && (
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-success" />
                Descuentos exclusivos
              </li>
            )}
            {loyaltyPoints.tier === "platinum" && (
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-success" />
                Servicios premium gratis
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
