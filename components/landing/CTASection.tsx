import { ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const benefits = [
  "Instalación perfecta con 3 meses de soporte gratuito",
  "Control de versiones y actualizaciones automáticas",
  "Soporte multilenguaje para alcance internacional",
  "Escalable desde pequeñas empresas hasta grandes flotas",
];

const CTASection = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-primary relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Comience en el Mercado con la{" "}
            <span className="text-accent">Solución Perfecta</span>
          </h2>
          
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Prometa mejores resultados con nuestra aplicación GoGrúa y gane 
            reputación comercial y ganancias.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 text-primary-foreground/90 text-left">
                <CheckCircle className="text-accent flex-shrink-0" size={20} />
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="accent" size="xl" asChild>
              <Link to="/solicitar">
                Solicitar Servicio
                <ArrowRight size={20} />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="xl" 
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link to="/contacto">
                Contactar Ventas
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
