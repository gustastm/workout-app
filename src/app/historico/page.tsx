import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Dumbbell, Footprints, ArrowLeft, ChevronRight } from 'lucide-react'

export default async function HistoricoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}min`
    return `${m}min`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4 shadow-sm flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">Histórico</h1>
        <span className="ml-auto text-sm text-gray-500">{workouts?.length ?? 0} treinos</span>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {!workouts || workouts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Nenhum treino registrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {workouts.map((workout) => (
              <Link
                key={workout.id}
                href={`/historico/${workout.id}`}
                className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-gray-200 transition-all group"
              >
                <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${
                  workout.type === 'gym' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {workout.type === 'gym'
                    ? <Dumbbell className="h-5 w-5 text-blue-600" />
                    : <Footprints className="h-5 w-5 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">
                    {workout.type === 'gym' ? 'Academia' : 'Corrida'}
                  </div>
                  <div className="text-sm text-gray-500">{formatDate(workout.date)}</div>
                  {workout.notes && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">{workout.notes}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <div className="text-sm text-gray-500">{formatDuration(workout.duration_seconds)}</div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
