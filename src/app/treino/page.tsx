'use client'

import { useState, useEffect } from 'react'
import { saveWorkout, type WorkoutData } from './actions'
import { Plus, Trash2, Dumbbell, Timer, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const MUSCLE_GROUPS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Core', 'Glúteos']

export default function TreinoPage() {
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [exercises, setExercises] = useState<WorkoutData['exercises']>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const toggleMuscleGroup = (group: string) => {
    setMuscleGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    )
  }

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: [] }])
    if (!isTimerRunning) setIsTimerRunning(true)
  }

  const updateExerciseName = (index: number, name: string) => {
    const updated = [...exercises]
    updated[index].name = name
    setExercises(updated)
  }

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const addSet = (exerciseIndex: number) => {
    const updated = [...exercises]
    updated[exerciseIndex].sets.push({ reps: 0, weight: 0 })
    setExercises(updated)
  }

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => {
    const updated = [...exercises]
    updated[exerciseIndex].sets[setIndex][field] = value
    setExercises(updated)
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises]
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex)
    setExercises(updated)
  }

  const handleFinalizar = async () => {
    if (muscleGroups.length === 0) return alert('Selecione ao menos um grupo muscular')
    if (exercises.length === 0) return alert('Adicione ao menos um exercício')
    const validExercises = exercises.filter(ex => ex.name.trim() !== '')
    if (validExercises.length === 0) return alert('Preencha o nome dos exercícios')

    setIsSubmitting(true)
    setIsTimerRunning(false)

    try {
      await saveWorkout({ muscleGroups, durationSeconds: seconds, notes, exercises: validExercises })
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar treino. Tente novamente.')
      setIsSubmitting(false)
      setIsTimerRunning(true)
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
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <Dumbbell className="h-5 w-5" />
            <span>Academia</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full font-mono font-medium text-gray-700">
          <Timer className="h-4 w-4 text-blue-600" />
          {formatTime(seconds)}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-5 mt-2">
        {/* Grupos Musculares (múltipla seleção) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Grupos Musculares</h2>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map(group => (
              <button
                key={group}
                onClick={() => toggleMuscleGroup(group)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  muscleGroups.includes(group)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        {/* Exercícios */}
        <div className="space-y-4">
          {exercises.map((exercise, exIndex) => (
            <div key={exIndex} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Nome do exercício (ex: Supino Reto)"
                  value={exercise.name}
                  onChange={(e) => updateExerciseName(exIndex, e.target.value)}
                  className="flex-1 font-semibold text-lg border-b border-gray-200 py-1 px-2 focus:outline-none focus:border-blue-600 transition-colors"
                />
                <button onClick={() => removeExercise(exIndex)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {exercise.sets.length > 0 && (
                <div className="mb-3">
                  <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-semibold text-gray-400 text-center px-2">
                    <div>SÉRIE</div><div>KG</div><div>REPS</div><div></div>
                  </div>
                  <div className="space-y-2">
                    {exercise.sets.map((set, setIndex) => (
                      <div key={setIndex} className="grid grid-cols-4 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                        <div className="text-center font-medium text-gray-600 text-sm">{setIndex + 1}</div>
                        <input
                          type="number" inputMode="decimal"
                          value={set.weight || ''}
                          onChange={(e) => updateSet(exIndex, setIndex, 'weight', Number(e.target.value))}
                          placeholder="0"
                          className="w-full text-center py-1.5 rounded border border-gray-200 focus:ring-1 focus:ring-blue-600 outline-none text-sm font-semibold"
                        />
                        <input
                          type="number" inputMode="numeric"
                          value={set.reps || ''}
                          onChange={(e) => updateSet(exIndex, setIndex, 'reps', Number(e.target.value))}
                          placeholder="0"
                          className="w-full text-center py-1.5 rounded border border-gray-200 focus:ring-1 focus:ring-blue-600 outline-none text-sm font-semibold"
                        />
                        <div className="flex justify-center">
                          <button onClick={() => removeSet(exIndex, setIndex)} className="text-gray-300 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => addSet(exIndex)}
                className="w-full py-2.5 rounded-lg border border-dashed border-gray-300 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Adicionar Série
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addExercise}
          className="w-full py-4 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-700 font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" /> Adicionar Exercício
        </button>

        {/* Notas */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Observações</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Como foi o treino? Alguma observação?"
            rows={3}
            className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none resize-none"
          />
        </div>
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleFinalizar}
            disabled={isSubmitting || exercises.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3.5 px-4 rounded-xl font-bold text-lg hover:bg-green-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Salvando...' : <><Save className="h-5 w-5" /> Finalizar Treino</>}
          </button>
        </div>
      </div>
    </div>
  )
}
