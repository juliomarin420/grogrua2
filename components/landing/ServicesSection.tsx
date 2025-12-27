import { Car, Truck, Construction, Cog, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Car,
    title: "Vehículos Livianos",
    description: "Remolque y traslado de autos y camionetas de todo tipo con grúas especializadas.",
    price: "Desde $35.000 CLP",
  },
  {
    icon: Truck,
    title: "Camiones y Vehículos Pesados",
    description: "Traslado de camiones y vehículos de carga con equipos de alta capacidad.",
    price: "Desde $85.000 CLP",
  },
  {
    icon: Construction,
    title: "Maquinaria Ligera",
    description: "Transporte de mini cargadores, bobcats y maquinaria de construcción pequeña.",
    price: "Desde $120.000 CLP",
  },
  {
    icon: Cog,
    title: "Maquinaria Pesada",
    description: "Traslado de retroexcavadoras, excavadoras y maquinaria industrial pesada.",
    price: "Desde $250.000 CLP",
  },
];

const bookingTypes = [
  {
    icon: Clock,
    title: "Servicio Inmediato",
    description: "¿Necesitas una grúa ahora? Solicita servicio urgente y te enviamos la grúa más cercana.",
    cta: "Solicitar Ahora",
  },
  {
    icon: Calendar,
    title: "Reserva Programada",
    description: "Planifica el traslado de tu vehículo o maquinaria para una fecha y hora específica.",
    cta: "Agendar Servicio",
  },
];

const ServicesSection = () => {
  return (
    <section id="servicios" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">Nuestros Servicios</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Soluciones para Cada Tipo de Vehículo
          </h2>
          <p className="text-muted-foreground text-lg">
            Desde autos particulares hasta maquinaria pesada, tenemos la grúa perfecta para tu necesidad.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group bg-card border border-border rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <service.icon size={28} className="text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{service.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{service.description}</p>
              <span className="text-accent font-bold">{service.price}</span>
            </div>
          ))}
        </div>

        {/* Booking Types */}
        <div className="grid md:grid-cols-2 gap-8">
          {bookingTypes.map((type) => (
            <div
              key={type.title}
              className="bg-gradient-primary rounded-2xl p-8 text-primary-foreground relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-primary-foreground/20 rounded-xl flex items-center justify-center mb-6">
                  <type.icon size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-3">{type.title}</h3>
                <p className="text-primary-foreground/80 mb-6">{type.description}</p>
                <Button variant="accent" size="lg">
                  {type.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
