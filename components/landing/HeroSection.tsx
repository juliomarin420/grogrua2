import { ArrowRight, MapPin, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import HeroMap from "@/components/maps/HeroMap";

const HeroSection = () => {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center bg-gradient-hero pt-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              Servicio 24/7 en Santiago
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              <span className="text-primary">GoGrúa:</span> Tu Uber para{" "}
              <span className="text-gradient-primary">Grúas</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
              Pon tu negocio sobre ruedas con una app de Uber para grúas que te respalda 
              con la mejor asistencia técnica, ofreciendo productividad y comodidad en el 
              manejo del negocio.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/solicitar">
                  Solicitar Grúa Ahora
                  <ArrowRight size={20} />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/registro">
                  Ser Proveedor
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Grúas Activas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">15min</div>
                <div className="text-sm text-muted-foreground">Tiempo Promedio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">50K+</div>
                <div className="text-sm text-muted-foreground">Servicios</div>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative hidden lg:block animate-slide-in-right">
            <div className="relative bg-card rounded-3xl shadow-xl p-6 border border-border">
              {/* Real Google Maps */}
              <div className="aspect-[4/5] rounded-2xl overflow-hidden relative">
                <HeroMap className="w-full h-full" />
                
                {/* Location card overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
                    <span className="text-sm font-medium">8 grúas disponibles cerca</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="bg-muted rounded-lg p-2">
                      <Clock size={16} className="mx-auto text-primary mb-1" />
                      <span className="text-xs">12 min</span>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <MapPin size={16} className="mx-auto text-primary mb-1" />
                      <span className="text-xs">5.2 km</span>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <Shield size={16} className="mx-auto text-primary mb-1" />
                      <span className="text-xs">Seguro</span>
                    </div>
                  </div>
                  <Button variant="accent" className="w-full" asChild>
                    <Link to="/solicitar">
                      Solicitar Grúa - $45.000 CLP
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-6 -right-6 bg-accent text-accent-foreground px-4 py-2 rounded-xl shadow-lg animate-float">
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span className="font-semibold">ETA: 8 min</span>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-card text-foreground px-4 py-3 rounded-xl shadow-lg border border-border animate-float" style={{ animationDelay: "1s" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="text-primary" size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Juan P.</div>
                  <div className="text-xs text-muted-foreground">★★★★★ 4.9</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
