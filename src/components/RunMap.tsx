'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type RoutePoint = { lat: number; lng: number; timestamp: number }

interface RunMapProps {
  routePoints: RoutePoint[]
  currentPosition: { lat: number; lng: number }
  height?: string
}

export default function RunMap({ routePoints, currentPosition, height = '100%' }: RunMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const polylineRef = useRef<L.Polyline | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [currentPosition.lat, currentPosition.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

    mapRef.current = map
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Atualiza polyline da rota
    const latlngs = routePoints.map(p => [p.lat, p.lng] as [number, number])
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latlngs)
    } else if (latlngs.length >= 2) {
      polylineRef.current = L.polyline(latlngs, { color: '#16a34a', weight: 4, opacity: 0.8 }).addTo(map)
    }

    // Atualiza marcador de posição atual
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;background:#16a34a;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    if (markerRef.current) {
      markerRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
    } else {
      markerRef.current = L.marker([currentPosition.lat, currentPosition.lng], { icon }).addTo(map)
    }

    map.panTo([currentPosition.lat, currentPosition.lng])
  }, [routePoints, currentPosition])

  return <div ref={containerRef} style={{ height, width: '100%' }} />
}
