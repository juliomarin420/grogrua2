import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import truckIconUrl from "@/assets/icons/gogrua-truck1.png";

type LatLng = { lat: number; lng: number };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

interface TrackingMapProps {
  position: LatLng;
  heading?: number | null; // grados
  follow?: boolean;
  onUserInteracted?: () => void;

  // tamaño del ícono en px (si lo quieres controlar desde afuera)
  iconSizePx?: number;
}

export default function TrackingMap({
  position,
  heading = 0,
  follow = true,
  onUserInteracted,
  iconSizePx = 66, // ✅ 1.5x (antes 44)
}: TrackingMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);

  // posición visible (animada)
  const [animatedPos, setAnimatedPos] = useState<LatLng>(position);

  const fromRef = useRef<LatLng>(position);
  const toRef = useRef<LatLng>(position);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const DURATION = 900; // ms

  // animar cada cambio de posición
  useEffect(() => {
    fromRef.current = animatedPos;
    toRef.current = position;
    startRef.current = performance.now();

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / DURATION);
      setAnimatedPos({
        lat: lerp(fromRef.current.lat, toRef.current.lat, t),
        lng: lerp(fromRef.current.lng, toRef.current.lng, t),
      });

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lng]);

  // auto-center
  useEffect(() => {
    if (follow && mapRef.current) {
      mapRef.current.panTo(animatedPos);
    }
  }, [animatedPos, follow]);

  const center = useMemo(() => position, [position.lat, position.lng]);

  const icon = useMemo(() => {
    const rot = Number.isFinite(heading as number) ? (heading as number) : 0;

    return {
      url: truckIconUrl,
      scaledSize: new google.maps.Size(iconSizePx, iconSizePx),
      anchor: new google.maps.Point(iconSizePx / 2, iconSizePx / 2),
      // Nota: si en tu setup no rota el PNG, te paso la versión OverlayView (rota 100%)
      rotation: rot,
    } as unknown as google.maps.Icon;
  }, [heading, iconSizePx]);

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={center}
      zoom={16}
      onLoad={(map) => { mapRef.current = map; }}
      onDragStart={onUserInteracted}
      onZoomChanged={onUserInteracted}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      }}
    >
      <Marker position={animatedPos} icon={icon} />
    </GoogleMap>
  );
}
