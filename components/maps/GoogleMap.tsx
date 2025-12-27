/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";

interface GoogleMapProps {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number };
  onOriginSelect?: (location: { lat: number; lng: number; address: string }) => void;
  onDestinationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  className?: string;
  interactive?: boolean;
  showRoute?: boolean;
}

declare global {
  interface Window {
    initGoogleMaps?: () => void;
    google?: typeof google;
  }
}

const GoogleMap = ({
  origin,
  destination,
  driverLocation,
  onOriginSelect,
  onDestinationSelect,
  className = "",
  interactive = true,
  showRoute = false,
}: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [originMarker, setOriginMarker] = useState<google.maps.Marker | null>(null);
  const [destMarker, setDestMarker] = useState<google.maps.Marker | null>(null);
  const [driverMarker, setDriverMarker] = useState<google.maps.Marker | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      "AIzaSyCUt3mUeeem8N8aJaREtdEyra6-Pooqg2o";
    
    if (!apiKey) {
      setError("API Key de Google Maps no configurada");
      return;
    }

    if (window.google?.maps) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    window.initGoogleMaps = () => {
      initMap();
    };

    script.onerror = () => {
      setError("Error al cargar Google Maps");
    };

    document.head.appendChild(script);

    return () => {
      window.initGoogleMaps = undefined;
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    const defaultCenter = { lat: -33.4489, lng: -70.6693 };
    
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: origin || defaultCenter,
      zoom: 13,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    setMap(mapInstance);
    setIsLoaded(true);

    if (interactive && (onOriginSelect || onDestinationSelect)) {
      const geocoder = new window.google.maps.Geocoder();
      
      mapInstance.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        
        const location = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };

        geocoder.geocode({ location: e.latLng }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            const address = results[0].formatted_address;
            
            if (!origin && onOriginSelect) {
              onOriginSelect({ ...location, address });
            } else if (onDestinationSelect) {
              onDestinationSelect({ ...location, address });
            }
          }
        });
      });
    }

    const renderer = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#1F5A8E",
        strokeWeight: 4,
      },
    });
    renderer.setMap(mapInstance);
    setDirectionsRenderer(renderer);
  };

  useEffect(() => {
    if (!map || !origin || !window.google) return;

    if (originMarker) {
      originMarker.setPosition(origin);
    } else {
      const marker = new window.google.maps.Marker({
        position: origin,
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#F2B600",
          fillOpacity: 1,
          strokeColor: "#1F5A8E",
          strokeWeight: 3,
        },
        title: "Origen",
      });
      setOriginMarker(marker);
    }
  }, [map, origin]);

  useEffect(() => {
    if (!map || !destination || !window.google) return;

    if (destMarker) {
      destMarker.setPosition(destination);
    } else {
      const marker = new window.google.maps.Marker({
        position: destination,
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#1F5A8E",
          fillOpacity: 1,
          strokeColor: "#F2B600",
          strokeWeight: 3,
        },
        title: "Destino",
      });
      setDestMarker(marker);
    }
  }, [map, destination]);

  useEffect(() => {
    if (!map || !driverLocation || !window.google) return;

    if (driverMarker) {
      driverMarker.setPosition(driverLocation);
    } else {
      const marker = new window.google.maps.Marker({
        position: driverLocation,
        map,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#1F5A8E">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20),
        },
        title: "Grúa",
      });
      setDriverMarker(marker);
    }
  }, [map, driverLocation]);

  useEffect(() => {
    if (!map || !directionsRenderer || !origin || !destination || !showRoute || !window.google) return;

    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          directionsRenderer.setDirections(result);
        }
      }
    );
  }, [map, directionsRenderer, origin, destination, showRoute]);

  useEffect(() => {
    if (!map || !origin || !destination || !window.google) return;

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    if (driverLocation) bounds.extend(driverLocation);
    map.fitBounds(bounds, 50);
  }, [map, origin, destination, driverLocation]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-xl ${className}`}>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
