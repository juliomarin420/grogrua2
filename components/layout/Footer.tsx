import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import logo from "@/assets/logo-gogrua.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <img src={logo} alt="GoGrúa" className="h-12 w-auto brightness-0 invert" />
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              La plataforma líder en servicios de grúa y asistencia en carretera.
              Conectamos usuarios con proveedores de grúas de manera rápida y eficiente.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-primary-foreground/70 hover:text-accent transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-accent transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-accent transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-accent transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Enlaces Rápidos */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-3">
              <li>
                <a href="#servicios" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                  Servicios
                </a>
              </li>
              <li>
                <a href="#caracteristicas" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                  Características
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                  Cómo Funciona
                </a>
              </li>
              <li>
                <Link to="/registro" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                  Registrarse
                </Link>
              </li>
            </ul>
          </div>

          {/* Para Empresas */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Para Empresas</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/proveedores" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                  Ser Proveedor
                </Link>
              </li>
              <li>
                <Link to="/conductores" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                  Ser Conductor
                </Link>
              </li>
              <li>
                <a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                  API para Empresas
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors text-sm">
                  Solución Marca Blanca
                </a>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-primary-foreground/80">
                <Phone size={16} className="text-accent" />
                <span>+56 2 1234 5678</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-primary-foreground/80">
                <Mail size={16} className="text-accent" />
                <span>contacto@gogrua.cl</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-primary-foreground/80">
                <MapPin size={16} className="text-accent mt-0.5" />
                <span>Santiago de Chile</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/60 text-sm">
            © {currentYear} GoGrúa. Todos los derechos reservados.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
              Términos y Condiciones
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
              Política de Privacidad
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
