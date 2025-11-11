import { CommonModule, DatePipe } from "@angular/common";
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  model,
  effect,
} from "@angular/core";

export interface UserProfile {
  physique: string;
  age: number;
  height: number;
  weight: number;
  gender: string;
  bmr: number;
}

@Component({
  selector: "app-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  standalone: true,
  template: `
    <div
      (click)="close()"
      class="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        (click)="$event.stopPropagation()"
        class="bg-slate-800 rounded-2xl p-6 w-full max-w-sm"
      >
        <div class="flex flex-col items-center text-center">
          <div
            class="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center text-5xl mb-4"
          >
            <span>👤</span>
          </div>
          <h2 class="text-2xl font-bold">Perfil do Usuário</h2>
          <p class="">Estes dados são usados para calcular as estimativas.</p>
          <div
            class="text-left space-y-2 mt-6 w-full bg-slate-900/50 p-4 rounded-md"
          >
            <p>
              <strong>Físico:</strong>
              <span class="text-emerald-400 font-medium">{{
                userProfile.physique
              }}</span>
            </p>
            <p>
              <strong>Idade:</strong>
              <span class="text-emerald-400 font-medium"
                >{{ userProfile.age }} anos</span
              >
            </p>
            <p>
              <strong>Altura:</strong>
              <span class="text-emerald-400 font-medium"
                >{{ userProfile.height }} cm</span
              >
            </p>
            <p>
              <strong>Peso:</strong>
              <span class="text-emerald-400 font-medium"
                >{{ userProfile.weight }} kg</span
              >
            </p>
            <p>
              <strong>Sexo:</strong>
              <span class="text-emerald-400 font-medium">{{
                userProfile.gender
              }}</span>
            </p>
            <p class="border-t border-slate-900/50 pt-2 mt-2">
              <strong>TMB (Est.):</strong>
              <span class="text-emerald-400 font-medium"
                >{{ userProfile.bmr | number : "1.0-0" }} cal/dia</span
              >
            </p>
          </div>
          <button
            (click)="close()"
            class="mt-6 bg-emerald-600 font-bold py-2 px-6 rounded-md w-full hover:bg-emerald-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class UserComponent {
  @Input() userProfile: UserProfile = {
    physique: "-",
    age: 0,
    height: 0,
    weight: 0,
    gender: "-",
    bmr: 0,
  };

  showProfile = model<boolean>();

  close(): void {
    this.showProfile.set(false);
  }
}
