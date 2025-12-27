import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Home,
  Truck,
  MapPin,
  History,
  Settings,
  Users,
  Building2,
  Map,
  DollarSign,
  Headphones,
  LogOut,
  ClipboardList,
} from "lucide-react";
import logo from "@/assets/logo-gogrua.png";

interface DashboardLayoutProps {
  children: ReactNode;
}

const userMenuItems = [
  { title: "Inicio", url: "/dashboard", icon: Home },
  { title: "Solicitar Grúa", url: "/solicitar", icon: Truck },
  { title: "Tracking", url: "/dashboard/tracking", icon: MapPin },
  { title: "Historial", url: "/dashboard/historial", icon: History },
  { title: "Configuración", url: "/dashboard/configuracion", icon: Settings },
];

const driverMenuItems = [
  { title: "Inicio", url: "/dashboard", icon: Home },
  { title: "Servicios Asignados", url: "/dashboard/servicios", icon: ClipboardList },
  { title: "Mi Ubicación", url: "/dashboard/ubicacion", icon: MapPin },
  { title: "Historial", url: "/dashboard/historial", icon: History },
  { title: "Configuración", url: "/dashboard/configuracion", icon: Settings },
];

const providerMenuItems = [
  { title: "Inicio", url: "/dashboard", icon: Home },
  { title: "Flota", url: "/dashboard/flota", icon: Truck },
  { title: "Conductores", url: "/dashboard/conductores", icon: Users },
  { title: "Servicios", url: "/dashboard/servicios", icon: ClipboardList },
  { title: "Finanzas", url: "/dashboard/finanzas", icon: DollarSign },
  { title: "Configuración", url: "/dashboard/configuracion", icon: Settings },
];

const dispatcherMenuItems = [
  { title: "Panel Principal", url: "/dashboard", icon: Home },
  { title: "Servicios Activos", url: "/dashboard/servicios", icon: ClipboardList },
  { title: "Mapa en Vivo", url: "/dashboard/mapa", icon: Map },
  { title: "Conductores", url: "/dashboard/conductores", icon: Users },
  { title: "Proveedores", url: "/dashboard/proveedores", icon: Building2 },
];

const adminMenuItems = [
  { title: "Panel Principal", url: "/dashboard", icon: Home },
  { title: "Servicios", url: "/dashboard/servicios", icon: ClipboardList },
  { title: "Usuarios", url: "/dashboard/usuarios", icon: Users },
  { title: "Conductores", url: "/dashboard/conductores", icon: Users },
  { title: "Proveedores", url: "/dashboard/proveedores", icon: Building2 },
  { title: "Flotas", url: "/dashboard/flotas", icon: Truck },
  { title: "Zonas", url: "/dashboard/zonas", icon: Map },
  { title: "Tarifas", url: "/dashboard/tarifas", icon: DollarSign },
  { title: "Configuración", url: "/dashboard/configuracion", icon: Settings },
];

function SidebarNav() {
  const { role, signOut, profile } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const getMenuItems = () => {
    switch (role) {
      case "admin":
        return adminMenuItems;
      case "dispatcher":
        return dispatcherMenuItems;
      case "provider":
        return providerMenuItems;
      case "driver":
        return driverMenuItems;
      default:
        return userMenuItems;
    }
  };

  const menuItems = getMenuItems();
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="GoGrúa" className={`${collapsed ? "h-8" : "h-10"} w-auto transition-all`} />
        </Link>
      </div>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs text-muted-foreground">
            {collapsed ? "" : role === "admin" ? "Administración" : role === "dispatcher" ? "Despacho" : "Menú"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon size={20} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(role === "admin" || role === "dispatcher") && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase text-xs text-muted-foreground">
              {collapsed ? "" : "Soporte"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Atención al Cliente">
                    <Link to="/dashboard/soporte" className="flex items-center gap-3">
                      <Headphones size={20} />
                      <span>Soporte</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-border">
        <div className={`flex items-center gap-3 mb-4 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
            {profile?.first_name?.[0] || profile?.email?.[0] || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.first_name || "Usuario"}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={`${collapsed ? "" : "w-full justify-start"} text-muted-foreground hover:text-destructive`}
          onClick={signOut}
        >
          <LogOut size={18} />
          {!collapsed && <span className="ml-2">Cerrar sesión</span>}
        </Button>
      </div>
    </Sidebar>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <SidebarNav />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 bg-card">
            <SidebarTrigger />
          </header>
          <div className="flex-1 p-6 bg-background overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
