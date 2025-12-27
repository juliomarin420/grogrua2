/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface PlacesAutocompleteProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onPlaceSelect?: (place: { address: string; lat: number; lng: number }) => void;
  icon?: "origin" | "destination";
  className?: string;
}

declare global {
  interface Window {
    initPlacesAutocomplete?: () => void;
  }
}

const PlacesAutocomplete = ({
  placeholder = "Buscar dirección...",
  value,
  onChange,
  onPlaceSelect,
  icon = "origin",
  className = "",
}: PlacesAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      "AIzaSyCUt3mUeeem8N8aJaREtdEyra6-Pooqg2o";
    
    if (!apiKey || !inputRef.current) return;

    const initAutocomplete = () => {
      if (!inputRef.current || !window.google?.maps?.places) return;

      const autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "cl" },
        fields: ["formatted_address", "geometry"],
      });

      autocompleteInstance.addListener("place_changed", () => {
        const place = autocompleteInstance.getPlace();
        
        if (place.geometry?.location && place.formatted_address) {
          const location = {
            address: place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          
          onChange?.(place.formatted_address);
          onPlaceSelect?.(location);
        }
      });

      autocompleteRef.current = autocompleteInstance;
      setIsLoaded(true);
    };

    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    const checkLoaded = setInterval(() => {
      if (window.google?.maps?.places) {
        clearInterval(checkLoaded);
        initAutocomplete();
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkLoaded);
    }, 10000);

    return () => {
      clearInterval(checkLoaded);
      clearTimeout(timeout);
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <MapPin 
        className={`absolute left-3 top-1/2 -translate-y-1/2 ${
          icon === "origin" ? "text-accent" : "text-primary"
        }`} 
        size={20} 
      />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        defaultValue={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="pl-10"
      />
    </div>
  );
};

export default PlacesAutocomplete;
