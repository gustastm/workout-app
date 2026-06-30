'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { saveRun } from './actions'
import { Play, Square, MapPin, Timer, Footprints, Heart, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const RunMap = dynamic(() => import('@/components/RunMap'), { ssr: false })

type RoutePoint = { lat: number; lng: number; timestamp: number }

export default function CorridaPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [distance, setDistance] = useState(0)
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [avgHr, setAvgHr] = useState('')
  const [maxHr, setMaxHr] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [gpsError, setGpsError] = useState('')

  const watchIdRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const lastPointRef = useRef<RoutePoint | null>(null)

  // Calcula distância entre dois pontos (Haversine)
  const haversineDistance = (p1: RoutePoint, p2: RoutePoint) => {
    const R = 6371
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const formatPace = (distKm: number, secs: number) => {
    if (distKm < 0.01) return '--:--'
    const paceSecPerKm = secs / distKm
    const m = Math.floor(paceSecPerKm / 60)
    const s = Math.floor(paceSecPerKm % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && !isPaused) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, isPaused])

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS não suportado neste dispositivo.')
      return
    }
    setGpsError('')
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: RoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        }
        setCurrentPosition({ lat: point.lat, lng: point.lng })

        if (lastPointRef.current) {
          const d = haversineDistance(lastPointRef.current, point)
          if (d > 0.005) { // filtra pontos muito próximos (< 5 metros)
            setDistance(prev => prev + d)
            setRoutePoints(prev => [...prev, point])
            lastPointRef.current = point
          }
        } else {
          setRoutePoints([point])
          lastPointRef.current = point
        }
      },
      (err) => setGpsError('Erro de GPS: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch {}
  }

  const releaseWakeLock = () => {
    wakeLockRef.current?.release()
    wakeLockRef.current = null
  }

  const handleStart = async () => {
    setIsRunning(true)
    setIsPaused(false)
    startGPS()
    await requestWakeLock()
  }

  const handlePause = () => {
    setIsPaused(prev => !prev)
    if (!isPaused) stopGPS()
    else startGPS()
  }

  const handleFinish = () => {
    stopGPS()
    releaseWakeLock()
    setIsRunning(false)
    setIsFinished(true)
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      await saveRun({
        durationSeconds: seconds,
        distanceKm: distance,
        avgPace: formatPace(distance, seconds),
        avgHr: avgHr ? Number(avgHr) : null,
        maxHr: maxHr ? Number(maxHr) : null,
        notes,
        routePoints,
      })
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar. Tente novamente.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2 text-green-600 font-bold">
            <Footprints className="h-5 w-5" />
            <span>Corrida</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full font-mono font-medium text-gray-700">
          <Timer className="h-4 w-4 text-green-600" />
          {formatTime(seconds)}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 mt-2">
        {/* Métricas ao vivo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-bold text-gray-900 font-mono">{distance.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1 font-semibold uppercase tracking-wider">km</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-bold text-gray-900 font-mono">{formatPace(distance, seconds)}</div>
            <div className="text-xs text-gray-500 mt-1 font-semibold uppercase tracking-wider">min/km</div>
          </div>
        </div>

        {/* Erro de GPS */}
        {gpsError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            {gpsError}
          </div>
        )}

        {/* Mapa */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-64">
          {currentPosition ? (
            <RunMap routePoints={routePoints} currentPosition={currentPosition} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <MapPin className="h-8 w-8" />
              <span className="text-sm">Aguardando sinal de GPS...</span>
            </div>
          )}
        </div>

        {/* Formulário pós-corrida */}
        {isFinished && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h2 className="font-bold text-gray-800">Dados finais</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  <Heart className="h-3 w-3 inline mr-1" /> FC Média (bpm)
                </label>
                <input
                  type="number" inputMode="numeric"
                  value={avgHr}
                  onChange={(e) => setAvgHr(e.target.value)}
                  placeholder="ex: 145"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  FC Máxima (bpm)
                </label>
                <input
                  type="number" inputMode="numeric"
                  value={maxHr}
                  onChange={(e) => setMaxHr(e.target.value)}
                  placeholder="ex: 178"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Observações
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Como foi a corrida?"
                rows={3}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-green-500 outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          {!isRunning && !isFinished && (
            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-500 active:scale-[0.98] transition-all"
            >
              <Play className="h-6 w-6" /> Iniciar Corrida
            </button>
          )}
          {isRunning && !isFinished && (
            <div className="flex gap-3">
              <button
                onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-white py-4 rounded-xl font-bold hover:bg-yellow-400 transition-all"
              >
                {isPaused ? <Play className="h-5 w-5" /> : <span className="text-xl font-bold">⏸</span>}
                {isPaused ? 'Continuar' : 'Pausar'}
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-500 transition-all"
              >
                <Square className="h-5 w-5" /> Finalizar
              </button>
            </div>
          )}
          {isFinished && (
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-500 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : <><Save className="h-5 w-5" /> Salvar Corrida</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
