/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";

interface TowTruckMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  rating: number;
  available: boolean;
}

// Simulated tow trucks in Santiago
const SAMPLE_TOW_TRUCKS: TowTruckMarker[] = [
  { id: "1", lat: -33.4372, lng: -70.6506, name: "Carlos M.", rating: 4.9, available: true },
  { id: "2", lat: -33.4589, lng: -70.6893, name: "Juan P.", rating: 4.8, available: true },
  { id: "3", lat: -33.4256, lng: -70.6141, name: "Roberto S.", rating: 4.7, available: true },
  { id: "4", lat: -33.4698, lng: -70.6423, name: "Miguel A.", rating: 4.9, available: true },
  { id: "5", lat: -33.4412, lng: -70.6789, name: "Pedro L.", rating: 4.6, available: true },
  { id: "6", lat: -33.4534, lng: -70.6234, name: "Luis R.", rating: 4.8, available: true },
  { id: "7", lat: -33.4321, lng: -70.6567, name: "Diego F.", rating: 4.7, available: true },
  { id: "8", lat: -33.4623, lng: -70.6712, name: "Andrés C.", rating: 4.9, available: true },
];

interface HeroMapProps {
  className?: string;
}

declare global {
  interface Window {
    initHeroMap?: () => void;
    google?: typeof google;
  }
}

const HeroMap = ({ className = "" }: HeroMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      "AIzaSyCUt3mUeeem8N8aJaREtdEyra6-Pooqg2o";

    if (!apiKey) {
      setError("Cargando mapa...");
      return;
    }

    if (window.google?.maps) {
      initMap();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      const checkGoogle = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkGoogle);
          initMap();
        }
      }, 100);
      return () => clearInterval(checkGoogle);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      initMap();
    };

    script.onerror = () => {
      setError("Error al cargar el mapa");
    };

    document.head.appendChild(script);
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    const santiagoCenter = { lat: -33.4489, lng: -70.6593 };

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: santiagoCenter,
      zoom: 13,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d1d9" }] },
        { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e0e0e0" }] },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      gestureHandling: "none",
      disableDefaultUI: true,
    });

    // Add tow truck markers
    SAMPLE_TOW_TRUCKS.forEach((truck, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: truck.lat, lng: truck.lng },
        map: mapInstance,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" fill="#1F5A8E" stroke="#F2B600" stroke-width="2"/>
              <path d="M16.92 8.01C16.72 7.42 16.16 7 15.5 7h-7c-.66 0-1.21.42-1.42 1.01L5.5 12.5v5c0 .28.22.5.5.5h.5c.28 0 .5-.22.5-.5V17h10v.5c0 .28.22.5.5.5h.5c.28 0 .5-.22.5-.5v-5l-1.58-4.49zM8 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM7 12l1-3h8l1 3H7z" fill="#F2B600"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(36, 36),
          anchor: new window.google.maps.Point(18, 18),
        },
        title: truck.name,
        animation: window.google.maps.Animation.DROP,
      });

      // Delay animation for staggered effect
      setTimeout(() => {
        marker.setAnimation(null);
      }, 500 + index * 100);

      // Info window on hover
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: system-ui, sans-serif;">
            <div style="font-weight: 600; color: #1F5A8E;">${truck.name}</div>
            <div style="font-size: 12px; color: #666;">⭐ ${truck.rating} • Disponible</div>
          </div>
        `,
      });

      marker.addListener("mouseover", () => {
        infoWindow.open(mapInstance, marker);
      });

      marker.addListener("mouseout", () => {
        infoWindow.close();
      });

      markersRef.current.push(marker);
    });

    setIsLoaded(true);
  };

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gogrua-blue/10 to-gogrua-yellow/10 ${className}`}>
        <div className="text-center">
          <div className="animate-pulse text-primary text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={mapRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gogrua-blue/10 to-gogrua-yellow/10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      {/* Overlay gradient for visual integration */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-card/20 to-transparent" />
    </div>
  );
};

export default HeroMap;
