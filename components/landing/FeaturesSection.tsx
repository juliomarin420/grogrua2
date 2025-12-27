import { 
  MapPin, 
  Truck, 
  Phone, 
  BarChart3, 
  Globe, 
  Cloud, 
  Palette, 
  Bell,
  Shield,
  Clock,
  CreditCard,
  Users
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Seguimiento en Tiempo Real y GPS",
    description: "Realice un seguimiento de todo el viaje en tiempo real con el GPS integrado para comprobar el estado de cada reserva. Los camioneros también pueden navegar hasta la ubicación de los usuarios con GPS.",
  },
  {
    icon: Truck,
    title: "Administrar Flotas",
    description: "El administrador gestiona la lista de todos los vehículos registrados y puede ver los detalles de cada uno. Pueden definir tipos y tarifas base para diferentes vehículos.",
  },
  {
    icon: Phone,
    title: "Enmascaramiento de Llamadas",
    description: "Funciones seguras de llamadas y conversaciones. Pueden interactuar realizando una llamada y el enmascaramiento no revela sus números de contacto.",
  },
  {
    icon: BarChart3,
    title: "Analizar Ganancias",
    description: "Ver los detalles de las ganancias y exportar datos. Los conductores pueden analizar ganancias en intervalos diarios, semanales y mensuales.",
  },
  {
    icon: Globe,
    title: "Definir Zonas",
    description: "Defina diferentes zonas para habilitar/deshabilitar servicios. Determine diferentes precios y tarifas base para cada zona.",
  },
  {
    icon: Cloud,
    title: "Soporte en la Nube",
    description: "Compatible con varias plataformas para mejor experiencia. Almacenamiento y transferencia de datos entre todos los módulos y dispositivos.",
  },
  {
    icon: Palette,
    title: "Solución de Marca Blanca",
    description: "Personalice el tema, diseño, color, nombre y logotipo. Habilite o deshabilite funciones según las necesidades de su empresa.",
  },
  {
    icon: Bell,
    title: "Seguimiento de Reservas",
    description: "Seguimiento de reservas con actualizaciones de estado en tiempo real. Los usuarios reciben notificaciones en su dispositivo hasta completar el servicio.",
  },
  {
    icon: Shield,
    title: "Pagos Seguros",
    description: "Múltiples opciones de pago: tarjetas de crédito/débito y billetera integrada. Transacciones seguras y protegidas.",
  },
  {
    icon: Clock,
    title: "ETA Inteligente",
    description: "La hora estimada de llegada notifica a los usuarios antes de la llegada del conductor para garantizar una experiencia sin complicaciones.",
  },
  {
    icon: CreditCard,
    title: "Códigos Promocionales",
    description: "Cree códigos de promoción con fechas de vencimiento, condiciones de canje y otros detalles para ofrecer descuentos.",
  },
  {
    icon: Users,
    title: "Multilenguaje",
    description: "Cambie el idioma de la solución según las preferencias del usuario para lograr popularidad internacional.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="caracteristicas" className="py-20 md:py-28 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">Características</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Funciones Superiores de Nuestra Plataforma
          </h2>
          <p className="text-muted-foreground text-lg">
            Nuestra aplicación Uber para asistencia en carretera contiene aspectos que pueden 
            ayudarle a globalizarse y prestar servicios sin complicaciones.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent transition-colors">
                <feature.icon size={24} className="text-accent group-hover:text-accent-foreground transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
