import { Injectable, signal, computed } from '@angular/core';
import { Workout, USER_PROFILE } from '../models';

@Injectable({
  providedIn: 'root',
})
export class WorkoutService {
  private readonly STORAGE_KEY = 'aiWorkoutLoggerData';
  
  workouts = signal<Workout[]>(this.loadFromStorage());

  totalWorkouts = computed(() => this.workouts().length);
  totalCalories = computed(() => this.workouts().reduce((sum, w) => sum + (w.calories || 0), 0));

  constructor() {
    // Effect to auto-save to localStorage whenever workouts change
    // effect(() => this.saveToStorage(this.workouts())); // effect() is not available in zoneless yet, we will save manually
  }

  addWorkout(workoutData: Partial<Workout>): Workout {
    const newWorkout: Workout = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      type: 'musculacao',
      name: 'Novo Treino',
      ...workoutData
    };

    if (!newWorkout.calories) {
        newWorkout.calories = this.calculateCalories(newWorkout);
    }

    this.workouts.update(workouts => [newWorkout, ...workouts]);
    this.saveToStorage(this.workouts());
    return newWorkout;
  }

  deleteWorkout(id: number): void {
    this.workouts.update(workouts => workouts.filter(w => w.id !== id));
    this.saveToStorage(this.workouts());
  }
  
  calculateCalories(workout: Partial<Workout>): number {
    if (!workout.duration) return 0;

    const MET_VALUES = {
        musculacao: 5.0,
        corrida: 8.0,
        caminhada: 3.8,
        ciclismo: 7.5,
        cardio: 7.0,
        isometrico: 2.5
    };

    let met = MET_VALUES.musculacao;
    if (workout.type === 'cardio' && workout.name) {
        const name = workout.name.toLowerCase();
        if (name.includes('corrida')) met = MET_VALUES.corrida;
        else if (name.includes('caminhada')) met = MET_VALUES.caminhada;
        else if (name.includes('ciclismo') || name.includes('bicicleta')) met = MET_VALUES.ciclismo;
        else met = MET_VALUES.cardio;
    } else if (workout.type) {
        met = MET_VALUES[workout.type] || MET_VALUES.musculacao;
    }
    
    // (MET * peso em kg * 1.1 (fator atlético)) * (duração em horas)
    const calories = (met * USER_PROFILE.weight * 1.1) * (workout.duration / 60);
    return Math.round(calories);
  }

  private loadFromStorage(): Workout[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load workouts from storage', e);
      return [];
    }
  }

  private saveToStorage(workouts: Workout[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workouts));
    } catch (e) {
      console.error('Failed to save workouts to storage', e);
    }
  }

  exportWorkouts(): void {
    const data = JSON.stringify(this.workouts(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workout_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importWorkouts(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (Array.isArray(data)) { // Basic validation
            this.workouts.set(data);
            this.saveToStorage(data);
            resolve();
          } else {
            reject(new Error('Invalid JSON format.'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }
}