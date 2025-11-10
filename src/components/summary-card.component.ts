import { Component, ChangeDetectionStrategy, input } from "@angular/core";
import { CommonModule } from "@angular/common";

export interface StatsSummary {
  totalWorkouts: number;
  totalCalories: number;
  totalDuration: number;
  totalVolume: number;
  totalDistance: number;
  typeDistribution: {
    [key in "musculacao" | "cardio" | "isometrico"]?: number;
  };
}

@Component({
  selector: "app-stats-summary-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-2">
      <p class="tracking-wide">{{ title() }}</p>

      <!-- Main Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div
          class="bg-slate-900/50 backdrop-blur-sm p-2  rounded-md flex flex-col items-center justify-center"
        >
          <div class="text-3xl mb-1">🏋️‍♂️</div>
          <h4
            class="text-xs text-slate-400 font-bold uppercase tracking-wider text-center"
          >
            Treinos
          </h4>
          <p class="text-xl font-bold">{{ stats().totalWorkouts }}</p>
        </div>
        <div
          class="bg-slate-900/50 backdrop-blur-sm p-2  rounded-md flex flex-col items-center justify-center"
        >
          <div class="text-3xl mb-1">🔥</div>
          <h4
            class="text-xs text-slate-400 font-bold uppercase tracking-wider text-center"
          >
            Calorias
          </h4>
          <p class="text-xl font-bold text-emerald-400">
            ~{{ stats().totalCalories | number : "1.0-0" }}
          </p>
        </div>
        <div
          class="bg-slate-900/50 backdrop-blur-sm p-2  rounded-md flex flex-col items-center justify-center"
        >
          <div class="text-3xl mb-1">⏱️</div>
          <h4
            class="text-xs text-slate-400 font-bold uppercase tracking-wider text-center"
          >
            Tempo
          </h4>
          <p class="text-xl font-bold">
            {{ stats().totalDuration }}
            <span class="text-base font-normal">min</span>
          </p>
        </div>
        @if (stats().totalVolume > 0) {
        <div
          class="bg-slate-900/50 backdrop-blur-sm p-2  rounded-md flex flex-col items-center justify-center"
        >
          <div class="text-3xl mb-1">💪</div>
          <h4
            class="text-xs text-slate-400 font-bold uppercase tracking-wider text-center"
          >
            Volume
          </h4>
          <p class="text-xl font-bold">
            {{ stats().totalVolume | number : "1.0-0" }}
            <span class="text-base font-normal">kg</span>
          </p>
        </div>
        } @if (stats().totalDistance > 0) {
        <div
          class="bg-slate-900/50 backdrop-blur-sm p-2  rounded-md flex flex-col items-center justify-center"
        >
          <div class="text-3xl mb-1">🏃‍♂️</div>
          <h4
            class="text-xs text-slate-400 font-bold uppercase tracking-wider text-center"
          >
            Distância
          </h4>
          <p class="text-xl font-bold">
            {{ stats().totalDistance | number : "1.1-1" }}
            <span class="text-base font-normal">km</span>
          </p>
        </div>
        }
      </div>

      <!-- Distribution Section -->
      @if (stats().totalWorkouts > 0 && stats().typeDistribution) {
      <div class="border-t-2 border-slate-900/50 p-2">
        @let dist = stats().typeDistribution; @let total =
        stats().totalWorkouts;
        <div class="space-y-3 text-sm">
          @if(dist.musculacao) {
          <div>
            <div class="flex justify-between mb-1.5 font-bold">
              <span>Musculação</span>
              <span class="font-mono">{{ dist.musculacao }}</span>
            </div>
            <div class="w-full bg-slate-900  h-4 p-0.5 rounded-sm">
              <div
                class="bg-emerald-600 h-full rounded-sm"
                [style.width]="(dist.musculacao / total) * 100 + '%'"
              ></div>
            </div>
          </div>
          } @if(dist.cardio) {
          <div>
            <div class="flex justify-between mb-1.5 font-bold">
              <span>Cardio</span>
              <span class="font-mono">{{ dist.cardio }}</span>
            </div>
            <div class="w-full bg-slate-900  h-4 p-0.5 rounded-sm">
              <div
                class="bg-sky-500 h-full rounded-sm"
                [style.width]="(dist.cardio / total) * 100 + '%'"
              ></div>
            </div>
          </div>
          } @if(dist.isometrico) {
          <div>
            <div class="flex justify-between mb-1.5 font-bold">
              <span>Isométrico</span>
              <span class="font-mono">{{ dist.isometrico }}</span>
            </div>
            <div class="w-full bg-slate-900  h-4 p-0.5">
              <div
                class="bg-amber-500 h-full"
                [style.width]="(dist.isometrico / total) * 100 + '%'"
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
  stats = input.required<StatsSummary>();
  title = input.required<string>();
}
