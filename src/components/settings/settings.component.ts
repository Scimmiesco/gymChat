import {
  Component,
  inject,
  Input,
  model,
  output,
  signal,
  WritableSignal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChatService } from "@/src/services/chat.service";

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      (click)="showSettings?.set(false)"
      class="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        (click)="$event.stopPropagation()"
        class="bg-slate-800 rounded-2xl p-6 w-full max-w-sm"
      >
        <h2 class="text-2xl font-bold text-center">Configurações</h2>
        <p class="text-center mt-1 mb-6">Gerencie suas chaves de API.</p>

        <div class="space-y-2">
          <label for="apiKey" class="text-sm font-medium text-slate-300"
            >Chave de API DeepSeek</label
          >
          <input
            id="apiKey"
            type="password"
            [ngModel]="apiKeyInput()"
            (ngModelChange)="apiKeyInput.set($event)"
            name="apiKeyInput"
            placeholder="Insira sua chave de API aqui"
            class="w-full bg-[#2a3942] rounded-md py-2 px-4 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p class="text-xs">
            Sua chave é salva localmente e nunca sai do seu navegador.
          </p>
        </div>

        <div class="flex items-center gap-4 mt-6">
          <button
            (click)="showSettings?.set(false)"
            class="bg-slate-600 font-bold py-2 px-6 rounded-md w-full hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            (click)="saveSettings()"
            [disabled]="!apiKeyInput()"
            class="bg-emerald-600 font-bold py-2 px-6 rounded-md w-full hover:bg-emerald-600 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  salvoComSucesso = output<string>();
  chatService = inject(ChatService);
  showSettings = model<boolean>(false);

  apiKeyInput = signal(this.chatService.apiKey() ?? "");

  private readonly storageKey = "deepseek_api_key";

  saveSettings() {
    this.chatService.saveApiKey(this.apiKeyInput().trim());
    this.showSettings.set(false);
    this.salvoComSucesso.emit("✅ Chave de API salva com sucesso!");
  }
}
