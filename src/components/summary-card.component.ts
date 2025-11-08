import { Component, ChangeDetectionStrategy, input } from "@angular/core";
import { CommonModule } from "@angular/common"; // Necessário para @if, @let, | number, [style.width]

/**
 * Define a estrutura esperada para o payload de estatísticas.
 * Você pode mover isso para seu arquivo 'models.ts' se preferir.
 */
export interface StatsPayload {
  totalWorkouts: number;
  totalCalories: number;
  totalDuration: number;
  totalVolume?: number;
  totalDistance?: number;
  typeDistribution?: {
    musculacao?: number;
    cardio?: number;
    isometrico?: number;
  };
}

@Component({
  selector: "app-stats-summary-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-2">
      <p class="text-base font-bold">{{ title() }}</p>

      <div class="grid grid-cols-2 gap-2">
        <div
          class="bg-emerald-900/50 p-3 rounded-lg text-center flex flex-col items-center justify-center"
        >
          <div class="text-3xl mb-1">🏋️‍♂️</div>
          <h4 class="text-xs text-gray-400">Total de Treinos</h4>
          <p class="text-xl font-bold">
            {{ stats().totalWorkouts }}
          </p>
        </div>

        <div
          class="bg-emerald-900/50 p-3 rounded-lg text-center flex flex-col items-center justify-center"
        >
          <div class="text-3xl mb-1">🔥</div>
          <h4 class="text-xs text-gray-400">Calorias (Est.)</h4>
          <p class="text-xl font-bold">
            {{ stats().totalCalories | number : "1.0-0" }}
          </p>
        </div>

        <div
          class="bg-emerald-900/50 p-3 rounded-lg text-center flex flex-col items-center justify-center"
        >
          <div class="text-3xl mb-1">⏱️</div>
          <h4 class="text-xs text-gray-400">Tempo Total</h4>
          <p class="text-xl font-bold">{{ stats().totalDuration }} min</p>
        </div>

        @if (stats().totalVolume && stats().totalVolume! > 0) {
        <div
          class="bg-emerald-900/50 p-3 rounded-lg text-center flex flex-col items-center justify-center"
        >
          <div class="text-3xl mb-1">💪</div>
          <h4 class="text-xs text-gray-400">Volume Total</h4>
          <p class="text-xl font-bold">
            {{ stats().totalVolume | number : "1.0-0" }} kg
          </p>
        </div>
        } @if (stats().totalDistance && stats().totalDistance! > 0) {
        <div
          class="bg-emerald-900/50 p-3 rounded-lg text-center flex flex-col items-center justify-center"
        >
          <div class="text-3xl mb-1">🏃‍♂️</div>
          <h4 class="text-xs text-gray-400">Distância Total</h4>
          <p class="text-xl font-bold">
            {{ stats().totalDistance | number : "1.1-1" }} km
          </p>
        </div>
        }
      </div>

      @if (stats().totalWorkouts > 0 && stats().typeDistribution) {
      <div class="mt-4">
        <h4 class="text-sm font-semibold text-gray-300">
          Distribuição de Treinos
        </h4>
        @let dist = stats().typeDistribution; @let total =
        stats().totalWorkouts;
        <div class="space-y-2 text-sm">
          @if(dist?.musculacao) {
          <div>
            <div class="flex justify-between mb-1">
              <span>Musculação</span>
              <span class="font-semibold">{{ dist.musculacao }}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2.5">
              <div
                class="bg-emerald-500 h-2.5 rounded-full"
                [style.width]="(dist.musculacao! / total) * 100 + '%'"
              ></div>
            </div>
          </div>
          } @if(dist?.cardio) {
          <div>
            <div class="flex justify-between mb-1">
              <span>Cardio</span>
              <span class="font-semibold">{{ dist.cardio }}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2.5">
              <div
                class="bg-sky-500 h-2.5 rounded-full"
                [style.width]="(dist.cardio! / total) * 100 + '%'"
              ></div>
            </div>
          </div>
          } @if(dist?.isometrico) {
          <div>
            <div class="flex justify-between mb-1">
              <span>Isométrico</span>
              <span class="font-semibold">{{ dist.isometrico }}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2.5">
              <div
                class="bg-amber-500 h-2.5 rounded-full"
                [style.width]="(dist.isometrico! / total) * 100 + '%'"
              ></div>
            </div>
          </div>
          }
        </div>
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsSummaryCardComponent {
  title = input.required<string>();
  stats = input.required<StatsPayload>();
}
