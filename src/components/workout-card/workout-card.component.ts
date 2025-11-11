import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { Workout, WorkoutSet } from "../../models";

@Component({
  selector: "app-workout-card",
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: "./workout-card.component.html",
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

