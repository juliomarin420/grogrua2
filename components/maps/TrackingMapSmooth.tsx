import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, OverlayView } from "@react-google-maps/api";
import craneIcon from "@/assets/icons/gogrua-truck1.png";

type LatLng = { lat: number; lng: number };

type Props = {
  targetPosition: LatLng | null;
  initialCenter: LatLng;
  iconSizePx?: number;
  headingOffsetDeg?: number;
  smoothingSeconds?: number;
  minMoveMetersForHeading?: number;
  zoom?: number;
  followMarker?: boolean;
  mapContainerStyle?: React.CSSProperties;
};

/* ------------------ helpers ------------------ */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function bearingDegrees(from: LatLng, to: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/* ------------------ component ------------------ */

export default function TrackingMapSmooth({
  targetPosition,
  initialCenter,
  iconSizePx = 46,
  headingOffsetDeg = 0,
  smoothingSeconds = 1.2,
  minMoveMetersForHeading = 1,
  zoom = 16,
  followMarker = false,
  mapContainerStyle,
}: Props) {
  const [map, setMap] = useState<any>(null);
  const [smoothPos, setSmoothPos] = useState<LatLng | null>(null);

  // 🔑 refs (NO causan re-render)
  const smoothRef = useRef<LatLng | null>(null);
  const targetRef = useRef<LatLng | null>(null);
  const headingRef = useRef(0);
  const lastHeadingFromRef = useRef<LatLng | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // mantener target en ref
  useEffect(() => {
    targetRef.current = targetPosition;
  }, [targetPosition]);

  // inicializar
  useEffect(() => {
    if (!smoothRef.current && targetPosition) {
      smoothRef.current = targetPosition;
      setSmoothPos(targetPosition);
      lastHeadingFromRef.current = targetPosition;
    }
  }, [targetPosition]);

  // 🚀 LOOP ÚNICO (ESTO ES LA CLAVE)
  useEffect(() => {
    let raf: number;

    const loop = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const cur = smoothRef.current;
      const tgt = targetRef.current;

      if (cur && tgt) {
        const t = 1 - Math.exp(-dt / Math.max(0.001, smoothingSeconds));

        const next = {
          lat: lerp(cur.lat, tgt.lat, t),
          lng: lerp(cur.lng, tgt.lng, t),
        };

        const moved = distanceMeters(lastHeadingFromRef.current ?? cur, tgt);

        if (moved >= minMoveMetersForHeading) {
          headingRef.current = bearingDegrees(cur, tgt);
          lastHeadingFromRef.current = tgt;
        }

        smoothRef.current = next;
        setSmoothPos(next);

        if (followMarker && map) {
          map.panTo(next);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [map, followMarker, smoothingSeconds, minMoveMetersForHeading]);

  const rotation = (headingRef.current + headingOffsetDeg) % 360;

  return (
    <GoogleMap
      onLoad={setMap}
      center={initialCenter} // 🔒 mapa fijo
      zoom={zoom}
      mapContainerStyle={{
        width: "100%",
        height: "520px",
        borderRadius: 16,
        ...mapContainerStyle,
      }}
      options={{ disableDefaultUI: true }}
    >
      {smoothPos && (
        <OverlayView position={smoothPos} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div
            style={{
              position: "absolute",
              width: iconSizePx,
              height: iconSizePx,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              pointerEvents: "none",
            }}
          >
            <img src={craneIcon} style={{ width: "100%", height: "100%" }} />
          </div>
        </OverlayView>
      )}
    </GoogleMap>
  );
}
