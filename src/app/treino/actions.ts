'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type WorkoutData = {
  muscleGroups: string[];
  durationSeconds: number;
  notes: string;
  exercises: {
    name: string;
    sets: { reps: number; weight: number }[];
  }[];
};

export async function saveWorkout(data: WorkoutData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Usuário não autenticado')

  // 1. Cria o treino pai
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      type: 'gym',
      date: new Date().toISOString().split('T')[0],
      duration_seconds: data.durationSeconds,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (workoutError) throw new Error('Erro ao salvar treino: ' + workoutError.message)

  // 2. Cria a sessão de academia
  const { error: gymError } = await supabase
    .from('gym_sessions')
    .insert({
      workout_id: workout.id,
      muscle_groups: data.muscleGroups,
    })

  if (gymError) throw new Error('Erro ao salvar sessão: ' + gymError.message)

  // 3. Cria exercícios e séries
  for (let i = 0; i < data.exercises.length; i++) {
    const ex = data.exercises[i]

    const { data: exercise, error: exError } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: workout.id,
        name: ex.name,
        sort_order: i,
      })
      .select()
      .single()

    if (exError) throw new Error('Erro ao salvar exercício: ' + exError.message)

    if (ex.sets.length > 0) {
      const { error: setsError } = await supabase
        .from('sets')
        .insert(
          ex.sets.map((set, idx) => ({
            workout_exercise_id: exercise.id,
            set_number: idx + 1,
            reps: Number(set.reps),
            weight_kg: Number(set.weight),
          }))
        )

      if (setsError) throw new Error('Erro ao salvar séries: ' + setsError.message)
    }
  }

  redirect('/?message=Treino de academia salvo com sucesso! 💪')
}
