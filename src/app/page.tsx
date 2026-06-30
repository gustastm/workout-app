import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { LogOut, Dumbbell, Footprints, History, TrendingUp, Plus } from 'lucide-react'
import { logout } from './actions'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Busca os últimos 5 treinos
  const { data: recentWorkouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Estatísticas básicas
  const { count: totalWorkouts } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: gymCount } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'gym')

  const { count: runCount } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'run')

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}min`
    return `${m}min`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-gray-900 text-lg">Workout Tracker</span>
        </div>
        <form>
          <button
            formAction={logout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">

        {/* Mensagem de sucesso */}
        {searchParams?.message && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center text-sm text-green-700 font-medium">
            {searchParams.message}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-gray-900">{totalWorkouts ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">Total</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-blue-600">{gymCount ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">Academia</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-green-600">{runCount ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">Corridas</div>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/treino"
            className="flex flex-col items-center justify-center gap-3 bg-blue-600 text-white rounded-xl p-6 shadow-sm hover:bg-blue-500 active:scale-[0.98] transition-all"
          >
            <div className="bg-blue-500 rounded-full p-3">
              <Dumbbell className="h-7 w-7" />
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">Academia</div>
              <div className="text-blue-100 text-sm">Novo treino</div>
            </div>
          </Link>
          <Link
            href="/corrida"
            className="flex flex-col items-center justify-center gap-3 bg-green-600 text-white rounded-xl p-6 shadow-sm hover:bg-green-500 active:scale-[0.98] transition-all"
          >
            <div className="bg-green-500 rounded-full p-3">
              <Footprints className="h-7 w-7" />
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">Corrida</div>
              <div className="text-green-100 text-sm">Novo treino</div>
            </div>
          </Link>
        </div>

        {/* Últimos treinos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">Últimos Treinos</h2>
            <Link href="/historico" className="text-sm text-blue-600 flex items-center gap-1 hover:underline">
              <History className="h-4 w-4" />
              Ver todos
            </Link>
          </div>

          {!recentWorkouts || recentWorkouts.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
              <Plus className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum treino ainda</p>
              <p className="text-sm text-gray-400 mt-1">Comece agora escolhendo academia ou corrida acima</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentWorkouts.map((workout) => (
                <Link
                  key={workout.id}
                  href={`/historico/${workout.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-gray-200 transition-all"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    workout.type === 'gym' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {workout.type === 'gym'
                      ? <Dumbbell className="h-5 w-5 text-blue-600" />
                      : <Footprints className="h-5 w-5 text-green-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 capitalize">
                      {workout.type === 'gym' ? 'Academia' : 'Corrida'}
                    </div>
                    {workout.notes && (
                      <div className="text-xs text-gray-500 truncate">{workout.notes}</div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-gray-700">{formatDate(workout.date)}</div>
                    <div className="text-xs text-gray-400">{formatDuration(workout.duration_seconds)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
