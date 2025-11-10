import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { Workout, WorkoutSet } from "../models";

@Component({
  selector: "app-workout-card",
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div
      class="flex flex-col gap-4 justify-around bg-slate-900/30 backdrop-blur-sm rounded-md p-2  transition-all duration-200"
      [class.border-t-4]="true"
      [class.border-t-emerald-900]="workout().type === 'musculacao'"
      [class.border-t-sky-900]="workout().type === 'cardio'"
      [class.border-t-amber-900]="workout().type === 'isometrico'"
    >
      <!-- Header -->
      <div
        class="flex justify-between items-start border-b-2 border-slate-900/50 p-2 flex-1"
      >
        <div class="flex items-center gap-3 ">
          <span class="text-3xl">
            @switch(workout().type) { @case('musculacao') { 💪 } @case('cardio')
            { 🏃‍♂️ } @case('isometrico') { 🧘 } @default { 🏋️‍♂️ } }
          </span>
          <div>
            <h4 class="font-bold text-lg tracking-wide">
              {{ workout().name }}
            </h4>
            <p class="text-xs text-slate-400 font-mono">
              {{ workout().date | date : "dd/MM/yyyy" }}
            </p>
          </div>
        </div>
        <button
          (click)="onDelete()"
          class="text-slate-500 hover:text-red-400 transition-colors text-2xl"
          title="Deletar treino"
        >
          🗑️
        </button>
      </div>

      <!-- Main Stats -->
      <div class="grid grid-cols-2 gap-2 text-center flex-1">
        @if (workout().duration) {
        <div class="backdrop-blur-sm p-2  rounded-md">
          <div class="text-3xl mb-1">⏱️</div>
          <h4
            class="text-xs text-slate-400 font-bold uppercase tracking-wider text-center"
          >
            Tempo
          </h4>
          <p class="text-xl font-bold">
            {{ workout().duration }}
            <span class="text-base font-normal">min</span>
          </p>
        </div>
        } @else {
        <div class="hidden sm:block"></div>
        } @if (workout().calories) {
        <div class="backdrop-blur-sm p-2  rounded-md">
          <div class="text-3xl mb-1">🔥</div>
          <h4
            class="text-xs text-slate-400 font-bold uppercase tracking-wider text-center"
          >
            Calorias
          </h4>
          <p class="text-xl font-bold text-emerald-400">
            ~{{ workout().calories | number : "1.0-0" }}
          </p>
        </div>
        } @else {
        <div class="hidden sm:block"></div>
        } @if (workout().distance) {
        <div class="backdrop-blur-sm p-2  rounded-md">
          <div class="text-3xl mb-1">🏃‍♂️</div>
          <h4
            class="text-xs text-slate-400 font-bold uppercase tracking-wider text-center"
          >
            Distância
          </h4>
          <p class="text-xl font-bold">
            {{ workout().distance | number : "1.1-1" }}
            <span class="text-base font-normal">km</span>
          </p>
        </div>
        } @else {
        <div class="hidden sm:block"></div>
        }
      </div>

      <!-- Collapsible Details Section -->
      @if (hasDetails()) {
      <div class="flex flex-col justify-around gap-2 p-1">
        <button
          (click)="toggleDetails()"
          class="w-full bg-emerald-600/70 backdrop-blur-sm rounded-md font-bold text-sm py-2 px-4  active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150"
        >
          @if (isExpanded()) {
          <span>ESCONDER DETALHES</span>
          } @else {
          <span>VER DETALHES</span>
          }
        </button>

        @if (isExpanded()) {
        <div class="text-sm text-center  animate-fade-in">
          @if (workout().notes) {
          <p class="text-slate-300/75 italic py-2 text-sm">
            "{{ workout().notes }}"
          </p>
          } @if (workout().sets && workout().sets!.length > 0) {
          <div class="space-y-1">
            <div
              class="grid grid-cols-3 font-bold p-1 text-xs uppercase tracking-wider"
            >
              <span>Série</span>
              <span class="text-center">Reps</span>
              <span class="text-right">Carga</span>
            </div>
            @for (set of workout().sets; track $index) {
            <div
              class="grid grid-cols-3 items-center bg-slate-900/50 backdrop-blur-sm p-2  rounded-md text-base"
            >
              <span class="font-mono font-bold">{{ $index + 1 }}</span>
              <span class="font-bold  text-center">
                {{ set.reps || "-" }}
              </span>
              <span class="font-bold  text-right">
                @if (set.weight) { {{ set.weight }} kg } @if (set.duration_sec)
                { {{ set.duration_sec }}s } @if (!set.weight &&
                !set.duration_sec) { '-' }
              </span>
            </div>
            }
          </div>
          }
        </div>
        }
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutCardComponent {
  workout = input.required<Workout>();
  deleteRequest = output<number>();

  isExpanded = signal(false);

  hasDetails = computed(() => {
    const w = this.workout();
    return !!w.notes || this.workoutSets().length > 0;
  });

  toggleDetails(): void {
    this.isExpanded.update((v) => !v);
  }

  workoutSets = computed<WorkoutSet[]>(() => {
    const sets = this.workout().sets;
    return Array.isArray(sets) ? sets : [];
  });
  
  onDelete(): void {
    this.deleteRequest.emit(this.workout().id);
  }
}

