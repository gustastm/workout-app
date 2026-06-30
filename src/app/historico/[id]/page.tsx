import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ArrowLeft, Dumbbell, Footprints, Timer, Calendar, MapPin, Heart, Activity } from 'lucide-react'
import dynamic from 'next/dynamic'

// Carrega o mapa dinamicamente apenas no cliente para corridas
const RunMap = dynamic(() => import('@/components/RunMap'), { ssr: false })

export default async function DetalhesTreinoPage({
  params
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. Busca o treino principal
  const { data: workout, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id) // Segurança: garante que é do usuário
    .single()

  if (error || !workout) return notFound()

  // 2. Busca os dados específicos dependendo do tipo
  let gymData = null
  let runData = null
  let exercises = []

  if (workout.type === 'gym') {
    const { data: gs } = await supabase
      .from('gym_sessions')
      .select('*')
      .eq('workout_id', workout.id)
      .single()
    gymData = gs

    // Busca exercícios com suas séries
    const { data: ex } = await supabase
      .from('workout_exercises')
      .select('*, sets(*)')
      .eq('workout_id', workout.id)
      .order('sort_order')

    // Ordena as séries dentro de cada exercício
    exercises = (ex || []).map(exercise => ({
      ...exercise,
      sets: exercise.sets.sort((a: any, b: any) => a.set_number - b.set_number)
    }))

  } else if (workout.type === 'run') {
    const { data: rs } = await supabase
      .from('run_sessions')
      .select('*')
      .eq('workout_id', workout.id)
      .single()
    runData = rs
  }

  // Helpers de formatação
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4 shadow-sm flex items-center gap-3">
        <Link href="/historico" className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">Detalhes do Treino</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6 mt-2">
        {/* Card Principal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4 mb-6">
            <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${
              workout.type === 'gym' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            }`}>
              {workout.type === 'gym' ? <Dumbbell className="h-7 w-7" /> : <Footprints className="h-7 w-7" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 capitalize">
                {workout.type === 'gym' ? 'Treino de Academia' : 'Corrida'}
              </h2>
              <div className="text-sm text-gray-500 capitalize">{formatDate(workout.date)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <Timer className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Duração</div>
                <div className="font-medium text-gray-900">{formatDuration(workout.duration_seconds)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Data</div>
                <div className="font-medium text-gray-900">{new Date(workout.date).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ESPECÍFICO DE ACADEMIA --- */}
        {workout.type === 'gym' && gymData && (
          <>
            {/* Grupos Musculares */}
            {gymData.muscle_groups && gymData.muscle_groups.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Foco do Treino</h3>
                <div className="flex flex-wrap gap-2">
                  {gymData.muscle_groups.map((mg: string) => (
                    <span key={mg} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                      {mg}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Exercícios e Séries */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider ml-1">Exercícios Realizados</h3>
              {exercises.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nenhum exercício registrado.</p>
              ) : (
                exercises.map((ex: any, idx: number) => (
                  <div key={ex.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <h4 className="font-bold text-gray-800">{ex.name}</h4>
                    </div>
                    {ex.sets && ex.sets.length > 0 && (
                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-2 mb-2 text-xs font-semibold text-gray-400 text-center">
                          <div>SÉRIE</div><div>PESO (KG)</div><div>REPS</div>
                        </div>
                        <div className="space-y-2">
                          {ex.sets.map((set: any) => (
                            <div key={set.id} className="grid grid-cols-3 gap-2 text-center text-sm items-center py-1 border-b border-gray-50 last:border-0">
                              <div className="font-medium text-gray-500">{set.set_number}</div>
                              <div className="font-semibold text-gray-900">{set.weight_kg > 0 ? set.weight_kg : '-'}</div>
                              <div className="font-semibold text-gray-900">{set.reps > 0 ? set.reps : '-'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* --- ESPECÍFICO DE CORRIDA --- */}
        {workout.type === 'run' && runData && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-sm text-gray-500 uppercase font-semibold mb-1">Distância</div>
                <div className="text-3xl font-bold text-gray-900 font-mono">
                  {Number(runData.distance_km).toFixed(2)}
                  <span className="text-base text-gray-500 ml-1">km</span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-sm text-gray-500 uppercase font-semibold mb-1">Pace Médio</div>
                <div className="text-3xl font-bold text-gray-900 font-mono">
                  {runData.avg_pace}
                  <span className="text-base text-gray-500 ml-1">/km</span>
                </div>
              </div>
            </div>

            {(runData.avg_hr || runData.max_hr) && (
              <div className="grid grid-cols-2 gap-4">
                {runData.avg_hr && (
                  <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Heart className="h-5 w-5 text-red-400" />
                      <span className="text-sm font-semibold uppercase">FC Média</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{runData.avg_hr} <span className="text-xs text-gray-500">bpm</span></div>
                  </div>
                )}
                {runData.max_hr && (
                  <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Activity className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-semibold uppercase">FC Máx</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{runData.max_hr} <span className="text-xs text-gray-500">bpm</span></div>
                  </div>
                )}
              </div>
            )}

            {/* Mapa da Rota */}
            {runData.route_points && runData.route_points.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-64">
                <RunMap 
                  routePoints={runData.route_points} 
                  currentPosition={{ lat: runData.route_points[runData.route_points.length - 1].lat, lng: runData.route_points[runData.route_points.length - 1].lng }} 
                />
              </div>
            )}
          </>
        )}

        {/* Notas (Comum para ambos) */}
        {workout.notes && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Observações</h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{workout.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
