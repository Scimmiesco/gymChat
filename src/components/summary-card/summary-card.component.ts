import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from "@angular/core";
// DecimalPipe é necessário para formatKilo e o pipe 'number'
import { CommonModule, DecimalPipe } from "@angular/common";

// NOVAS INTERFACES (do código objetivo)
export interface WeekStats {
  totalWorkouts: number;
  totalCalories: number;
  totalDuration: number;
  totalVolume: number;
  totalDistance: number;
}

export interface StatsSummary {
  overall: WeekStats; // 'overall' agora agrupa os totais
  thisWeek?: WeekStats; // Novo
  lastWeek?: WeekStats; // Novo
  typeDistribution: {
    [key in "musculacao" | "cardio" | "isometrico"]?: number;
  };
  consistency?: {
    // Novo
    daysInLast7: number;
  };
}

@Component({
  selector: "app-stats-summary-card",
  standalone: true,
  // Adicionado DecimalPipe aos imports
  imports: [CommonModule, DecimalPipe],
  templateUrl: "./summary-card.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsSummaryCardComponent {
  // ATUALIZADO: Input 'stats' usa a nova interface
  stats = input.required<StatsSummary>();
  title = input.required<string>();

  // NOVA LÓGICA (do código objetivo)
  totalDistributionWorkouts = computed(() => {
    if (!this.stats()?.typeDistribution) return 0;
    return Object.values(this.stats().typeDistribution).reduce(
      (sum, count) => sum + (count || 0),
      0
    );
  });

  getDistributionPercentage(
    type: "musculacao" | "cardio" | "isometrico"
  ): number {
    const count = this.stats().typeDistribution[type] || 0;
    const total = this.totalDistributionWorkouts();
    if (total === 0) return 0;
    return (count / total) * 100;
  }

  getPercentageChange(current?: number, previous?: number): number | null {
    if (
      previous === undefined ||
      current === undefined ||
      previous === null ||
      current === null
    )
      return null;
    if (previous === 0) return current > 0 ? Infinity : 0;
    return ((current - previous) / previous) * 100;
  }

  formatKilo(value: number): string {
    if (!value) return "0";
    if (value >= 1000) {
      // Usa 'k' para milhares
      const num = value / 1000;
      // Evita ".0k"
      return num.toFixed(num % 1 === 0 ? 0 : 1) + "k";
    }
    // Usa DecimalPipe para formatação padrão de números menores que 1000
    return new DecimalPipe("en-US").transform(value, "1.0-0") || "0";
  }
}
