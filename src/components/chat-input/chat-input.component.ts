import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-chat-input",
  imports: [CommonModule, FormsModule],
  standalone: true,
  template: ` <form
    (submit)="sendMessage.emit()"
    class="flex items-end space-x-3"
  >
    <textarea
      rows="1"
      [(ngModel)]="userInput"
      name="userInput"
      placeholder="Digite seu treino..."
      (keydown)="onKeydown($event)"
      (input)="autoResize($event.target)"
      class="flex-1 w-full bg-[#2a394275] backdrop-blur-sm rounded-md py-2 px-4 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none max-h-32"
      [disabled]="isLoading()"
      autocomplete="off"
    ></textarea>
    <button
      type="submit"
      [disabled]="!userInput() || isLoading()"
      class="bg-emerald-600/50 backdrop-blur-sm rounded-full w-11 h-11 flex items-center justify-center shrink-0 disabled:bg-slate-600 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors"
    >
      <span class="text-xl -mr-1">➤</span>
    </button>
  </form>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatInput {
  sendMessage = output<void>();
  isLoading = input<boolean>(false);
  userInput = model<string>("");

  autoResize(target: EventTarget | null): void {
    if (target) {
      const element = target as HTMLTextAreaElement;
      element.style.height = "auto"; // Reset height to recalculate
      element.style.height = `${element.scrollHeight}px`;
    }
  }
  onKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && event.shiftKey) {
      // Let the default behavior (new line) happen
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent new line on Enter
      this.sendMessage.emit();
    }
  }
}

