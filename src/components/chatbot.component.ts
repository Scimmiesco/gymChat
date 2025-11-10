import {
  Component,
  ChangeDetectionStrategy,
  signal,
  viewChild,
  ElementRef,
  effect,
  inject,
  computed,
} from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AiService } from "../services/gemini.service";
import { WorkoutService } from "../services/workout.service";
import { ChatService } from "../services/chat.service";
import { ChatMessage, Workout, USER_PROFILE } from "../models";
import { WorkoutCardComponent } from "./workout-card.component";
import { StatsSummaryCardComponent } from "./summary-card.component";

interface WorkoutGroup {
  date: string;
  workouts: Workout[];
  totalCalories: number;
}

@Component({
  selector: "app-chat",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    WorkoutCardComponent,
    StatsSummaryCardComponent,
  ],
  templateUrl: "./chatbot.component.html",
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  aiService = inject(AiService);
  workoutService = inject(WorkoutService);
  chatService = inject(ChatService);
  datePipe = inject(DatePipe);

  messages = this.chatService.messages;
  userInput = signal("");
  isLoading = signal(false);
  showProfile = signal(false);
  showSettings = signal(false);
  showScrollButton = signal(false);
  apiKeyInput = signal(this.chatService.apiKey() ?? "");

  chatContainer = viewChild<ElementRef<HTMLDivElement>>("chatContainer");
  importFileInput = viewChild<ElementRef<HTMLInputElement>>("importFileInput");

  userProfile = USER_PROFILE;
  workouts = this.workoutService.workouts;
  totalWorkouts = this.workoutService.totalWorkouts;
  totalCalories = this.workoutService.totalCalories;

  groupedWorkouts = computed((): WorkoutGroup[] => {
    const groups = new Map<string, Workout[]>();
    for (const workout of this.workouts()) {
      const date = workout.date;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(workout);
    }

    const workoutGroups: WorkoutGroup[] = Array.from(groups.entries()).map(
      ([date, workouts]) => {
        const totalCalories = workouts.reduce(
          (sum, w) => sum + (w.calories || 0),
          0
        );
        return { date, workouts, totalCalories };
      }
    );

    // Sort groups by date, descending
    workoutGroups.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return workoutGroups;
  });

  constructor() {
    effect(() => {
      if (this.chatContainer()) {
        this.scrollToBottom();
      }
    });
  }

  getFriendlyDateHeader(dateString: string): string {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = this.datePipe.transform(today, "yyyy-MM-dd");
    const yesterdayStr = this.datePipe.transform(yesterday, "yyyy-MM-dd");

    if (dateString === todayStr) return "Hoje";
    if (dateString === yesterdayStr) return "Ontem";

    const workoutDate = new Date(dateString + "T12:00:00Z"); // Use noon UTC to avoid timezone issues
    return this.datePipe.transform(workoutDate, "dd/MM/yyyy") || dateString;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && event.shiftKey) {
      // Let the default behavior (new line) happen
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent new line on Enter
      this.sendMessage();
    }
  }

  autoResize(target: EventTarget | null): void {
    if (target) {
      const element = target as HTMLTextAreaElement;
      element.style.height = "auto"; // Reset height to recalculate
      element.style.height = `${element.scrollHeight}px`;
    }
  }

  private parseJsonFromText(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No valid JSON object found in the response.");
    } catch (e) {
      console.error("Failed to parse JSON from AI response:", text, e);
      return {
        action: "text_response",
        text: text || "Não consegui processar a resposta. Tente novamente.",
      };
    }
  }

  async sendMessage(): Promise<void> {
    const userMessageText = this.userInput().trim();
    if (!userMessageText || this.isLoading()) return;

    if (!this.chatService.apiKey()) {
      this.addMessage(
        "model",
        "error",
        "Por favor, configure sua chave de API da DeepSeek nas configurações. ⚙️"
      );
      this.showSettings.set(true);
      return;
    }

    this.isLoading.set(true);
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      type: "text",
      text: userMessageText,
      timestamp: new Date().toISOString(),
    };
    this.chatService.addMessage(userMessage);
    this.userInput.set("");

    this.chatService.addMessage({
      id: Date.now() + 1,
      role: "model",
      type: "loading",
      timestamp: new Date().toISOString(),
    });
    this.scrollToBottom();

    try {
      const stream = await this.aiService.sendMessageStream(userMessageText);
      let fullResponse = "";

      this.chatService.updateLastMessage((lastMessage) => {
        lastMessage.text = ""; // Start with empty text for streaming
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
        }
      }

      const parsedAction = this.parseJsonFromText(fullResponse);

      this.chatService.updateLastMessage((lastMessage) => {
        lastMessage.text =
          parsedAction.text ||
          this.getDefaultTextForAction(parsedAction.action);
      });

      this.handleAction(parsedAction);
    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessage =
        "Desculpe, ocorreu um erro ao comunicar com a IA. Tente novamente. 😥";
      if (error instanceof Error) {
        if (
          error.message.includes("401") ||
          error.message.toLowerCase().includes("incorrect api key")
        ) {
          errorMessage =
            "A chave de API da DeepSeek parece ser inválida. Verifique-a nas configurações. 🔑";
        } else if (error.message.includes("DeepSeek API key not set")) {
          errorMessage =
            "Por favor, configure sua chave de API da DeepSeek nas configurações. ⚙️";
        }
      }
      this.chatService.updateLastMessage((lastMessage) => {
        if (lastMessage.type === "loading" || lastMessage.type === "text") {
          lastMessage.text = errorMessage;
          lastMessage.type = "error";
        }
      });
    } finally {
      this.isLoading.set(false);
      this.scrollToBottom();
    }
  }

  saveSettings() {
    this.chatService.saveApiKey(this.apiKeyInput().trim());
    this.showSettings.set(false);
    this.addMessage("model", "text", "✅ Chave de API salva com sucesso!");
  }

  private getDefaultTextForAction(action: string): string {
    switch (action) {
      case "log_workout":
        return "Treino registrado!";
      case "show_history":
        return "Aqui está seu histórico.";
      case "show_summary":
        return "Aqui está seu resumo.";
      default:
        return "";
    }
  }

  private handleAction(parsed: any) {
    let addFollowUp = false;

    if (
      parsed.action === "clarification_needed" ||
      parsed.action === "text_response"
    ) {
      this.chatService.updateLastMessage((lastMessage) => {
        lastMessage.type = "text";
      });
      return;
    }

    this.chatService.updateLastMessage((lastMessage) => {
      switch (parsed.action) {
        case "log_workout":
          if (
            parsed.workouts &&
            Array.isArray(parsed.workouts) &&
            parsed.workouts.length > 0
          ) {
            lastMessage.type = "text";

            for (const workoutData of parsed.workouts) {
              const newWorkout = this.workoutService.addWorkout(workoutData);
              this.addMessage(
                "model",
                "workout_log",
                `Exercício '${newWorkout.name}' registrado.`,
                newWorkout
              );
            }
          } else {
            lastMessage.type = "error";
            lastMessage.text =
              "A IA tentou registrar um treino, mas não conseguiu extrair os detalhes. Por favor, tente descrever o treino novamente.";
          }
          addFollowUp = true;
          break;
        case "show_history":
          lastMessage.type = "history_summary";
          break;
        case "show_summary":
          const workouts = this.workouts();
          const totalWorkouts = workouts.length;
          const totalCalories = workouts.reduce(
            (sum, w) => sum + (w.calories || 0),
            0
          );
          const totalDuration = workouts.reduce(
            (sum, w) => sum + (w.duration || 0),
            0
          );
          const totalVolume = workouts
            .filter((w) => w.type === "musculacao" && w.sets)
            .reduce((total, w) => {
              const workoutVolume = w.sets!.reduce(
                (sum, set) => sum + (set.reps || 0) * (set.weight || 0),
                0
              );
              return total + workoutVolume;
            }, 0);
          const totalDistance = workouts
            .filter((w) => w.type === "cardio" && w.distance)
            .reduce((sum, w) => sum + w.distance!, 0);

          const typeDistribution = workouts.reduce((acc, w) => {
            acc[w.type] = (acc[w.type] || 0) + 1;
            return acc;
          }, {} as { [key in "musculacao" | "cardio" | "isometrico"]?: number });

          lastMessage.type = "stats_summary";
          lastMessage.payload = {
            totalWorkouts: totalWorkouts,
            totalCalories: totalCalories,
            totalDuration: totalDuration,
            totalVolume: totalVolume,
            totalDistance: totalDistance,
            typeDistribution: typeDistribution,
          };
          break;
        case "show_profile":
          lastMessage.type = "user_profile";
          lastMessage.payload = this.userProfile;
          break;
        case "export_data":
          this.exportData();
          break;
        case "import_data":
          this.triggerImport();
          break;
      }
    });

    if (addFollowUp) {
      setTimeout(() => {
        this.addMessage(
          "model",
          "quick_actions",
          "Ótimo! O que gostaria de fazer agora?",
          ["Ver meu histórico", "Mostrar resumo"]
        );
      }, 500);
    }
  }

  deleteWorkout(workoutId: number, messageId?: number) {
    this.workoutService.deleteWorkout(workoutId);
    if (messageId) {
      this.chatService.deleteMessage(messageId);
    }
  }

  exportData() {
    this.workoutService.exportWorkouts();
  }

  triggerImport() {
    this.importFileInput()?.nativeElement.click();
  }

  async importData(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      try {
        await this.workoutService.importWorkouts(input.files[0]);
        this.addMessage("model", "text", "✅ Dados importados com sucesso!");
      } catch (error) {
        console.error(error);
        this.addMessage(
          "model",
          "error",
          "❌ Falha ao importar dados. Verifique o formato do arquivo."
        );
      }
    }
  }

  sendQuickAction(prompt: string): void {
    if (this.isLoading()) return;

    this.addMessage("user", "text", prompt);

    let actionPayload: { action: string; text: string } | null = null;

    switch (prompt) {
      case "Ver meu histórico":
        actionPayload = {
          action: "show_history",
          text: "Claro! Aqui está o seu histórico de treinos: 📜",
        };
        break;
      case "Mostrar resumo":
        actionPayload = {
          action: "show_summary",
          text: "Com certeza! Deixa eu ver suas estatísticas... 📊",
        };
        break;
      case "Qual o meu perfil?":
        actionPayload = {
          action: "show_profile",
          text: "Aqui estão os detalhes do seu perfil: 👤",
        };
        break;
    }

    if (actionPayload) {
      this.addMessage("model", "text", actionPayload.text);
      this.handleAction(actionPayload);
    } else {
      this.userInput.set(prompt);
      this.sendMessage();
    }
  }

  onChatScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    if (!el) return;

    const threshold = 150; // Pixels from bottom to show button
    const isAtBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    this.showScrollButton.set(!isAtBottom);
  }

  smoothScrollToBottom(): void {
    const el = this.chatContainer()?.nativeElement;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    }
  }

  private addMessage(
    role: "model" | "user",
    type: ChatMessage["type"],
    text?: string,
    payload?: any
  ) {
    const newMessage: ChatMessage = {
      id: Date.now() + Math.random(), // Add random to avoid ID collision in fast multi-add
      role,
      type,
      text,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.chatService.addMessage(newMessage);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.chatContainer()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 0);
  }
}

