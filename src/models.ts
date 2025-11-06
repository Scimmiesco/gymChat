export interface WorkoutSet {
  reps?: number;
  weight?: number;
  duration_sec?: number;
}

export interface Workout {
  id: number;
  name: string;
  type: 'musculacao' | 'cardio' | 'isometrico';
  date: string;
  duration?: number; // in minutes
  distance?: number; // in km
  calories?: number;
  sets?: WorkoutSet[];
  notes?: string;
}

export type MessageType = 'text' | 'workout_log' | 'history_summary' | 'stats_summary' | 'user_profile' | 'loading' | 'error' | 'quick_actions';

export interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  type: MessageType;
  text?: string;
  payload?: any;
  timestamp: string;
}

// Katch-McArdle BMR Calculation
const weightKg = 86;
const bodyFatPercentage = 15; // Assumption for "Atlético/Muscular"
const leanBodyMass = weightKg * (1 - (bodyFatPercentage / 100));
const bmr = Math.round(370 + (21.6 * leanBodyMass));

export const USER_PROFILE = {
  gender: "Masculino",
  height: 179,
  weight: 86,
  age: 24,
  physique: "Atlético/Muscular",
  bmr: bmr
};