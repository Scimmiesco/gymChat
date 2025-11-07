import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { Workout } from "../models";

@Component({
  selector: "app-workout-card",
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div
      class="flex flex-col space-around bg-slate-900/50 p-3 rounded-md min-h-[200px]"
    >
      <div class="flex-1 flex justify-between items-start">
        <div>
          <h4 class="font-semibold text-emerald-400">{{ workout().name }}</h4>
          <p class="text-xs text-gray-400">
            {{ workout().date | date : "dd/MM/yyyy" }}
          </p>
        </div>
        <button
          (click)="onDelete()"
          class="text-gray-500 hover:text-red-500 transition-colors text-lg shrink-0 -mt-1 ml-2"
        >
          🗑️
        </button>
      </div>

      <div class=" flex-1 flex flex-col space-around mt-2 space-y-1 text-sm">
        @if (workout().duration) {
        <div class="flex justify-between items-center">
          <span class="text-gray-300">⏱️ Duração</span>
          <span class="font-semibold">{{ workout().duration }} min</span>
        </div>
        } @if (workout().distance) {
        <div class="flex justify-between items-center">
          <span class="text-gray-300">📏 Distância</span>
          <span class="font-semibold">{{ workout().distance }} km</span>
        </div>
        } @if (workout().calories) {
        <div class="flex justify-between items-center">
          <span class="text-gray-300">🔥 Calorias Estimadas</span>
          <span class="font-semibold text-emerald-400"
            >~{{ workout().calories | number : "1.0-0" }} kcal</span
          >
        </div>
        }
      </div>

      <button
        (click)="toggleDetails()"
        class="flex-1 p-2 w-full text-center bg-emerald-800/50 hover:bg-emerald-700/50 text-emerald-300 text-xl font-semibold py-1.5 rounded-md transition-colors"
      >
        @if (isExpanded()) {
        <span>Esconder Detalhes 🙈</span>
        } @else {
        <span>Ver Detalhes 👀</span>
        }
      </button>

      @if (isExpanded()) {
      <div class="mt-3 pt-3 border-t border-white/10 text-xs animate-fade-in">
        @if (workout().notes) {
        <p class="text-gray-400 mb-2 italic">"{{ workout().notes }}"</p>
        } @if (workout().sets && workout().sets!.length > 0) {
        <ul class="space-y-1">
          @for (set of workout().sets; track $index) {
          <li
            class="flex justify-between items-center bg-black/20 px-2 py-1 rounded"
          >
            <span class="font-mono text-gray-300">Série {{ $index + 1 }}</span>
            <span class="font-semibold text-white">
              @if (set.reps) { {{ set.reps }} reps } @if (set.reps &&
              set.weight) { <span class="text-gray-500 mx-1">x</span> } @if
              (set.weight) { {{ set.weight }} kg } @if (set.duration_sec) {
              {{ set.duration_sec }} seg }
            </span>
          </li>
          }
        </ul>
        } @else if (!workout().notes) {
        <p class="text-gray-400 italic">Nenhum detalhe de série registrado.</p>
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

  toggleDetails(): void {
    this.isExpanded.update((v) => !v);
  }

  onDelete(): void {
    this.deleteRequest.emit(this.workout().id);
  }
}

