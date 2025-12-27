import { 
  User, 
  Settings, 
  Headphones, 
  Truck,
  MapPin,
  Eye,
  Calculator,
  Wallet,
  ClipboardList,
  UserCheck,
  Tag,
  DollarSign,
  Phone,
  Route,
  History,
  CreditCard,
  Heart,
  AlertTriangle,
  Gift,
  Sliders
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const panels = {
  usuario: {
    title: "Aplicación de Usuario",
    description: "Todo lo que necesitan tus clientes para solicitar servicios de grúa.",
    features: [
      { icon: MapPin, title: "Elija ubicación en el mapa", description: "Marque su ubicación actual en el mapa integrado o simplemente escríbala." },
      { icon: Eye, title: "Ver detalles del vehículo", description: "Vea los detalles completos del vehículo, matrícula, cargos y contacto del proveedor." },
      { icon: Calculator, title: "Estimación de tarifas", description: "Según la tarifa base, se calcula y muestra la tarifa estimada para los servicios." },
      { icon: Wallet, title: "Pagar con tarjeta/billetera", description: "Pague con tarjeta de crédito/débito o use la billetera integrada." },
      { icon: Heart, title: "Conductor favorito", description: "Marque conductores favoritos y elíjalos según sus preferencias." },
      { icon: AlertTriangle, title: "Contactos de emergencia", description: "Agregue múltiples contactos de emergencia con botón de pánico SOS." },
      { icon: Gift, title: "Propinas para conductores", description: "Envíe propinas a los conductores según su experiencia." },
      { icon: Sliders, title: "Seleccionar preferencias", description: "Seleccione preferencias específicas como niños, mascotas y equipaje." },
    ],
  },
  admin: {
    title: "Panel de Administración",
    description: "Control total sobre tu negocio de grúas.",
    features: [
      { icon: ClipboardList, title: "Ver Reservas", description: "Vea todos los detalles de reserva incluyendo asistencia, cargos, impuestos y método de pago." },
      { icon: UserCheck, title: "Aprobar proveedores", description: "Verifique documentos y apruebe proveedores de servicios de camiones." },
      { icon: Tag, title: "Configuración de códigos promo", description: "Cree códigos de promoción con fechas de vencimiento y condiciones de canje." },
      { icon: DollarSign, title: "Precios fijos por zonas", description: "Establezca precios fijos para zonas específicas independiente de distancia o tiempo." },
    ],
  },
  despachador: {
    title: "Consola de Despachador",
    description: "Gestione operaciones en tiempo real.",
    features: [
      { icon: User, title: "Reservar para usuarios", description: "Solicite servicio de grúa para usuarios registrados o no registrados." },
      { icon: MapPin, title: "Seguir proveedores", description: "Rastree proveedores en tiempo real en el mapa mientras están de viaje." },
      { icon: CreditCard, title: "Guardar información bancaria", description: "Guarde información de cuenta bancaria para pagos rápidos y seguros." },
      { icon: ClipboardList, title: "Detalles de reserva", description: "Vea todos los detalles de reservas: canceladas, completadas, rechazadas o en proceso." },
    ],
  },
  proveedor: {
    title: "Aplicación de Proveedor",
    description: "Para empresas de servicios de grúa.",
    features: [
      { icon: UserCheck, title: "Aprobar/Rechazar solicitudes", description: "Apruebe o rechace las solicitudes de remolque recibidas." },
      { icon: Route, title: "Optimización de ruta", description: "Vea rutas optimizadas al lugar de recogida para llegar rápidamente." },
      { icon: History, title: "Ver historial de servicio", description: "Analice viajes con estados como aceptado, rechazado o cancelado." },
      { icon: CreditCard, title: "Agregar información de pago", description: "Agregue datos bancarios para recibir pagos directamente." },
    ],
  },
  conductor: {
    title: "Panel del Conductor",
    description: "Herramientas para los conductores de grúa.",
    features: [
      { icon: Wallet, title: "Pagar con billetera electrónica", description: "Agregue datos bancarios vinculados a la billetera integrada." },
      { icon: Settings, title: "Actualización de contraseña", description: "Actualice la contraseña agregando contraseñas nuevas y antiguas." },
      { icon: User, title: "Detalles del perfil", description: "Realice cambios en nombre, correo, datos de contacto y foto de perfil." },
      { icon: History, title: "Historial de viaje", description: "Todos los viajes realizados se guardan como historial consultable." },
    ],
  },
};

const PanelsSection = () => {
  return (
    <section id="como-funciona" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">Paneles y Módulos</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Solución Completa para Cada Rol
          </h2>
          <p className="text-muted-foreground text-lg">
            Comience en el mercado con la solución perfecta: aplicaciones y paneles 
            para usuarios, proveedores, conductores, despachadores y administradores.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="usuario" className="w-full">
          <TabsList className="w-full flex flex-wrap justify-center gap-2 bg-transparent h-auto mb-12">
            {Object.entries(panels).map(([key, panel]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-3 rounded-lg transition-all"
              >
                {key === "usuario" && <User className="mr-2" size={18} />}
                {key === "admin" && <Settings className="mr-2" size={18} />}
                {key === "despachador" && <Headphones className="mr-2" size={18} />}
                {key === "proveedor" && <Truck className="mr-2" size={18} />}
                {key === "conductor" && <Truck className="mr-2" size={18} />}
                {panel.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(panels).map(([key, panel]) => (
            <TabsContent key={key} value={key} className="animate-fade-in">
              <div className="text-center mb-10">
                <h3 className="text-2xl font-bold text-foreground mb-2">{panel.title}</h3>
                <p className="text-muted-foreground">{panel.description}</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {panel.features.map((feature, index) => (
                  <div
                    key={feature.title}
                    className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon size={24} className="text-primary" />
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default PanelsSection;
