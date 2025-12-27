import { HelpCircle } from "lucide-react";

const AboutSection = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <HelpCircle size={16} />
              ¿Qué es GoGrúa?
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              ¿Cómo ofrece asistencia para aumentar las ganancias comerciales?
            </h2>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Una persona que necesita grúas ya se encuentra en una situación en la que 
                cualquier otro problema, como encontrar la grúa y guiarlo a una ubicación 
                exacta, parece demasiado inconveniente. Pero eso no es un problema, ya que 
                estos problemas podrían resolverse usando nuestra plataforma.
              </p>
              
              <p>
                <strong className="text-foreground">GoGrúa</strong> es una plataforma avanzada 
                que permite a los agentes o empresas de grúas ofrecer reservas en línea de 
                los camiones para remolcar. Con unos pocos toques, los clientes pueden 
                obtener los servicios en el tiempo estimado hasta el inicio.
              </p>
              
              <p>
                Ofrecemos módulos intuitivos para brindar el mejor soporte a los clientes 
                y ayudar en sus procesos comerciales. Nuestra aplicación de grúas equipa 
                ámbitos de expansión empresarial, con todas las funcionalidades de apoyo 
                que la nube ayuda a los procesos empresariales.
              </p>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="bg-card rounded-3xl shadow-xl p-8 border border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                  <div className="text-sm text-muted-foreground">Servicio Continuo</div>
                </div>
                <div className="bg-accent/20 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-accent-foreground mb-2">500+</div>
                  <div className="text-sm text-muted-foreground">Grúas Disponibles</div>
                </div>
                <div className="bg-accent/20 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-accent-foreground mb-2">15min</div>
                  <div className="text-sm text-muted-foreground">Llegada Promedio</div>
                </div>
                <div className="bg-primary/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-primary mb-2">4.9★</div>
                  <div className="text-sm text-muted-foreground">Calificación</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                    CL
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Santiago de Chile</div>
                    <div className="text-sm text-muted-foreground">Cobertura completa en la región metropolitana</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -z-10 top-10 -right-10 w-40 h-40 bg-accent/30 rounded-full blur-3xl" />
            <div className="absolute -z-10 -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
