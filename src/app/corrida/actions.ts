'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

type RoutePoint = { lat: number; lng: number; timestamp: number }

type RunData = {
  durationSeconds: number
  distanceKm: number
  avgPace: string
  avgHr: number | null
  maxHr: number | null
  notes: string
  routePoints: RoutePoint[]
}

export async function saveRun(data: RunData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Usuário não autenticado')

  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      type: 'run',
      date: new Date().toISOString().split('T')[0],
      duration_seconds: data.durationSeconds,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (workoutError) throw new Error('Erro ao salvar treino: ' + workoutError.message)

  const { error: runError } = await supabase
    .from('run_sessions')
    .insert({
      workout_id: workout.id,
      distance_km: data.distanceKm,
      avg_pace: data.avgPace,
      avg_hr: data.avgHr,
      max_hr: data.maxHr,
      route_points: data.routePoints,
    })

  if (runError) throw new Error('Erro ao salvar sessão de corrida: ' + runError.message)

  redirect('/?message=Corrida salva com sucesso! 🏃')
}
