import {
  Component,
  Output,
  EventEmitter,
  Signal,
  input, // <-- MUDANÇA
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule, DatePipe, DecimalPipe } from "@angular/common";

// Pipes
import { FriendlyDatePipe } from "../../utils/FriendlyDatePipe.pipe"; // <-- MUDANÇA

// Componentes
import { WorkoutCardComponent } from "../workout-card/workout-card.component";
import { StatsSummaryCardComponent } from "../summary-card/summary-card.component";
import { Workout } from "@/src/models";
// Definições de tipo básicas (ajuste conforme seu modelo de dados)

interface Message {
  id: string;
  role: "user" | "model";
  type: string;
  text?: string;
  payload?: any;
  timestamp: Date;
}

interface WeekGroup {
  weekIdentifier: string;
  weekLabel: string;
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
  dayGroups: DayGroup[];
}

interface DayGroup {
  date: string;
  totalCalories: number;
  workouts: Workout[];
}

@Component({
  selector: "app-message-item",
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    WorkoutCardComponent,
    StatsSummaryCardComponent,
    FriendlyDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex animate-fade-in"
      [class.justify-end]="message()?.role === 'user'"
    >
      <div
        class="md:w-3/4 rounded-md p-2 relative backdrop-blur-sm"
        [class.chat-bubble-user]="message()?.role === 'user'"
        [class.chat-bubble-model]="message()?.role === 'model'"
      >
        @switch (message()?.type) { @case ('loading') { } @case ('error') {
        <p class="whitespace-pre-wrap text-red-400">{{ message().text }}</p>
        } @case ('text') {
        <p class="whitespace-pre-wrap">{{ message().text }}</p>
        } @case ('quick_actions') {
        <p class="whitespace-pre-wrap">{{ message().text }}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          @for (action of message().payload; track action) {
          <button
            (click)="quickAction.emit(action)"
            class="bg-emerald-600/70 text-emerald-300 text-sm font-semibold py-1.5 px-3 rounded-full hover:bg-emerald-600/70 transition-colors"
          >
            {{ action }}
          </button>
          }
        </div>
        } @case ('workout_log') {
        <div>
          <p class="text-sm font-semibold mb-2">{{ message().text }}</p>
          <app-workout-card
            [workout]="message().payload"
            (deleteRequest)="onDeleteWorkoutLog($event)"
          ></app-workout-card>
        </div>
        } @case ('stats_summary') {
        <app-stats-summary-card
          [title]="message().text!"
          [stats]="message().payload"
        >
        </app-stats-summary-card>
        } @case ('history_summary') {
        <div>
          <p class="text-sm font-semibold mb-2">{{ message().text }}</p>

          @if (groupedWorkoutsByWeek() && groupedWorkoutsByWeek().length > 0) {
          <div
            class="space-y-2 mt-2 max-h-[400px] overflow-y-auto pr-2 chat-container"
          >
            @for (weekGroup of groupedWorkoutsByWeek(); track
            weekGroup.weekIdentifier) {
            <div class="bg-slate-900/40 rounded-lg overflow-hidden">
              <button
                (click)="toggleWeek.emit(weekGroup.weekIdentifier)"
                class="w-full p-3 text-left bg-slate-800/50 hover:bg-slate-800/80 transition-colors focus:outline-none flex justify-between items-center"
              >
                <div>
                  <h4 class="font-bold text-white">
                    {{ weekGroup.weekLabel }}
                  </h4>
                  <p class="text-xs text-slate-400">
                    {{ weekGroup.totalWorkouts }} treinos •
                    {{ weekGroup.totalDuration }} min • ~{{
                      weekGroup.totalCalories | number : "1.0-0"
                    }}
                    cals
                  </p>
                </div>
                <span
                  class="text-xl transition-transform duration-200"
                  [class.rotate-180]="
                    !openWeeks().has(weekGroup.weekIdentifier)
                  "
                  >▼</span
                >
              </button>

              @if (openWeeks().has(weekGroup.weekIdentifier)) {
              <div class="p-3 space-y-4 animate-fade-in">
                @for (dayGroup of weekGroup.dayGroups; track dayGroup.date) {
                <div>
                  <div
                    class="mb-2 flex justify-between items-center sticky py-1 px-2 rounded-md top-0 backdrop-blur-sm z-10 bg-emerald-800/60"
                  >
                    <h5 class="font-bold text-md text-emerald-200">
                      {{ dayGroup.date | friendlyDate }}
                    </h5>
                    @if (dayGroup.totalCalories > 0) {
                    <span class="text-xs font-bold text-emerald-300"
                      >~{{ dayGroup.totalCalories | number : "1.0-0" }} cals
                      🔥</span
                    >
                    }
                  </div>
                  <div class="flex flex-col gap-2">
                    @for (workout of dayGroup.workouts; track workout.id) {
                    <app-workout-card
                      [workout]="workout"
                      (deleteRequest)="onDeleteWorkoutLog($event)"
                    >
                    </app-workout-card>
                    }
                  </div>
                </div>
                }
              </div>
              }
            </div>
            }
          </div>
          } @else {
          <p class="text-sm italic mt-2">Nenhum treino no histórico.</p>
          }
        </div>
        } @case ('user_profile') {
        <div>
          <p class="text-sm font-semibold mb-2">{{ message().text }}</p>
          <div class="p-1 space-y-1 text-sm">
            <p><strong>Físico:</strong> {{ message().payload.physique }}</p>
            <p><strong>Idade:</strong> {{ message().payload.age }} anos</p>
            <p><strong>Altura:</strong> {{ message().payload.height }} cm</p>
            <p><strong>Peso:</strong> {{ message().payload.weight }} kg</p>
            <p>
              <strong>TMB (Est.):</strong>
              {{ message().payload.bmr | number : "1.0-0" }} cal/dia
            </p>
          </div>
        </div>
        } }
        <div
          [class.hora-container-model]="message()?.role === 'model'"
          class="text-xs text-right mt-1"
        >
          {{ message()?.timestamp | date : "HH:mm" }}
        </div>
      </div>
    </div>
  `,
})
export class MessageItemComponent {
  message = input.required<Message>();
  groupedWorkoutsByWeek = input<WeekGroup[]>([]);
  openWeeks = input<Set<string>>(new Set());

  @Output() quickAction = new EventEmitter<string>();
  @Output() deleteWorkout = new EventEmitter<{
    workoutId: string;
    messageId: string;
  }>();
  @Output() toggleWeek = new EventEmitter<string>();

  onDeleteWorkoutLog(workoutId: string) {
    this.deleteWorkout.emit({
      workoutId: workoutId,
      messageId: this.message()?.id,
    });
  }
}
