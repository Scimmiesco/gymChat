import { Component, model, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule],
  template: `
    <header
      class="flex items-center justify-between p-3 bg-slate-900/75 backdrop-blur-sm shrink-0"
    >
      <div
        (click)="showProfile.set(true)"
        class="flex items-center cursor-pointer"
      >
        <div
          class="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-xl mr-4"
        >
          <span>👤</span>
        </div>
        <div>
          <h3 class="font-semibold">Gymini</h3>
        </div>
      </div>

      <div class="flex items-center space-x-1 sm:space-x-2">
        <button
          (click)="sendQuickAction('Ver meu histórico')"
          class="text-2xl transition-colors p-2 rounded-full"
          title="Ver Histórico"
        >
          <span>📜</span>
        </button>
        <button
          (click)="sendQuickAction('Mostrar resumo')"
          class="text-2xl transition-colors p-2 rounded-full"
          title="Mostrar Resumo"
        >
          <span>📊</span>
        </button>
        <button
          (click)="showSettings.set(true)"
          class="text-2xl transition-colors p-2 rounded-full"
          title="Configurações"
        >
          <span>⚙️</span>
        </button>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  showProfile = model<boolean>();
  showSettings = model<boolean>();
  quickAction = output<string>();

  sendQuickAction(action: string) {
    this.quickAction.emit(action);
  }
}
