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
import { AiService } from "../../services/gemini.service";
import { WorkoutService } from "../../services/workout.service";
import { ChatService } from "../../services/chat.service";
import { ChatMessage, Workout, USER_PROFILE, WorkoutSet } from "../../models"; // Importar WorkoutSet
import { WorkoutCardComponent } from "../workout-card/workout-card.component";
import { UserComponent } from "../user/user.component";
import { SettingsComponent } from "../settings/settings.component";
// Importar as novas interfaces do summary-card
import {
  StatsSummaryCardComponent,
  StatsSummary,
  WeekStats,
} from "./../summary-card/summary-card.component";

// Interfaces for history view
interface DayGroup {
  date: string;
  workouts: Workout[];
  totalCalories: number;
}

interface WeekGroup {
  weekIdentifier: string;
  weekLabel: string;
  dayGroups: DayGroup[];
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
}

@Component({
  selector: "app-chat",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    UserComponent,
    WorkoutCardComponent,
    StatsSummaryCardComponent,
    SettingsComponent,
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

  openWeekIdentifiers = signal<Set<string>>(new Set());

  groupedWorkoutsByWeek = computed((): WeekGroup[] => {
    const workoutsByWeek = new Map<string, Workout[]>();

    // 1. Group all workouts by their week identifier
    for (const workout of this.workouts()) {
      const workoutDate = new Date(workout.date + "T12:00:00Z");
      const weekId = this.getWeekIdentifier(workoutDate);
      if (!workoutsByWeek.has(weekId)) {
        workoutsByWeek.set(weekId, []);
      }
      workoutsByWeek.get(weekId)!.push(workout);
    }

    const weekGroups: WeekGroup[] = [];

    // 2. Process each week's workouts
    for (const [weekIdentifier, weeklyWorkouts] of workoutsByWeek.entries()) {
      const startOfWeek = new Date(weekIdentifier + "T12:00:00Z");
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      // Format the week label for display
      const weekLabel = `Semana de ${this.datePipe.transform(
        startOfWeek,
        "d MMM"
      )} à ${this.datePipe.transform(endOfWeek, "d MMM, y")}`;

      // Group workouts within the week by day
      const dayGroupsMap = new Map<string, Workout[]>();
      for (const workout of weeklyWorkouts) {
        if (!dayGroupsMap.has(workout.date)) {
          dayGroupsMap.set(workout.date, []);
        }
        dayGroupsMap.get(workout.date)!.push(workout);
      }

      const dayGroups: DayGroup[] = Array.from(dayGroupsMap.entries()).map(
        ([date, workouts]) => ({
          date,
          workouts,
          totalCalories: workouts.reduce(
            (sum, w) => sum + (w.calories || 0),
            0
          ),
        })
      );

      // Sort days within the week (most recent first)
      dayGroups.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Calculate week-level statistics
      const totalDuration = weeklyWorkouts.reduce(
        (sum, w) => sum + (w.duration || 0),
        0
      );
      const totalCalories = weeklyWorkouts.reduce(
        (sum, w) => sum + (w.calories || 0),
        0
      );

      weekGroups.push({
        weekIdentifier,
        weekLabel,
        dayGroups,
        totalWorkouts: weeklyWorkouts.length,
        totalDuration,
        totalCalories,
      });
    }

    // 3. Sort weeks from most recent to oldest
    weekGroups.sort(
      (a, b) =>
        new Date(b.weekIdentifier).getTime() -
        new Date(a.weekIdentifier).getTime()
    );

    return weekGroups;
  });

  constructor() {
    effect(() => {
      if (this.chatContainer()) {
        this.scrollToBottom();
      }
    });

    // Effect to auto-open the first week if no weeks are currently open
    effect(
      () => {
        const groups = this.groupedWorkoutsByWeek();
        if (groups.length > 0 && this.openWeekIdentifiers().size === 0) {
          this.openWeekIdentifiers.set(new Set([groups[0].weekIdentifier]));
        }
      },
      { allowSignalWrites: true }
    );
  }

  isWeekOpen(weekIdentifier: string): boolean {
    return this.openWeekIdentifiers().has(weekIdentifier);
  }

  toggleWeek(weekIdentifier: string): void {
    this.openWeekIdentifiers.update((currentSet) => {
      const newSet = new Set(currentSet);
      if (newSet.has(weekIdentifier)) {
        newSet.delete(weekIdentifier);
      } else {
        newSet.add(weekIdentifier);
      }
      return newSet;
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
    debugger;
    const userMessageText = this.userInput().trim();
    if (!userMessageText || this.isLoading()) return;

    if (!this.chatService.apiKey()) {
      this.addMessage(
        "model",
        "error",
        "Por favor, configure sua chave de API do DeepSeek nas configurações. ⚙️"
      );
      this.showSettings.set(true);
      return;
    }

    this.isLoading.set(true);

    const userMessage: ChatMessage = {
      id: this.obterIdAleatorio(),
      role: "user",
      type: "text",
      text: userMessageText,
      timestamp: new Date().toISOString(),
    };
    
    this.chatService.addMessage(userMessage);
    this.userInput.set("");

    this.chatService.addMessage({
      id: this.obterIdAleatorio(),
      role: "model",
      type: "loading",
      timestamp: new Date().toISOString(),
    });
    this.scrollToBottom();

    try {
      const stream = this.aiService.sendMessageStream(userMessageText);
      let fullResponse = "";

      // Convert the 'loading' bubble to a 'text' bubble to show the streaming response
      this.chatService.updateLastMessage((lastMessage) => {
        lastMessage.type = "text";
        lastMessage.text = "";
      });

      for await (const chunk of stream) {
        const content = chunk || ""; // Chunk from AiService is a string delta
        if (content) {
          fullResponse += content;
          // Update the UI in real-time as chunks arrive
          this.chatService.updateLastMessage((lastMessage) => {
            lastMessage.text = fullResponse;
          });
        }
      }

      const parsedAction = this.parseJsonFromText(fullResponse);

      // Final update to the message with the parsed text, and then handle the action
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
            "A chave de API do DeepSeek parece ser inválida. Verifique-a nas configurações. 🔑";
        } else if (error.message.includes("DeepSeek API key not set")) {
          errorMessage =
            "Por favor, configure sua chave de API do DeepSeek nas configurações. ⚙️";
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

  private obterIdAleatorio(): string {
    return (
      Date.now().toFixed(0).toString() + Math.floor(Math.random()).toString()
    );
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

  // --- NOVAS FUNÇÕES DE CÁLCULO DE ESTATÍSTICAS ---

  private getStartOfWeek(date: Date, startDay: number = 0): Date {
    // 0 = Domingo, 1 = Segunda
    const d = new Date(date);
    const day = d.getDay();
    const diff =
      d.getDate() -
      day +
      (day === startDay ? 0 : day < startDay ? -7 + startDay : startDay);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getWeekIdentifier(date: Date): string {
    // Use Sunday (0) as the start of the week to align with getStartOfWeek
    const startOfWeek = this.getStartOfWeek(date, 0);
    return startOfWeek.toISOString().split("T")[0];
  }

  private calculateVolume(sets: WorkoutSet[] | undefined): number {
    if (!Array.isArray(sets)) {
      return 0;
    }
    return sets.reduce(
      (sum, set) => sum + (set.reps || 0) * (set.weight || 0),
      0
    );
  }

  private getStatsForPeriod(
    workouts: Workout[],
    startDate: Date,
    endDate: Date
  ): WeekStats {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const filteredWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.date + "T12:00:00Z").getTime();
      return workoutDate >= startTimestamp && workoutDate <= endTimestamp;
    });

    return filteredWorkouts.reduce(
      (acc, w) => {
        acc.totalWorkouts += 1;
        acc.totalCalories += w.calories || 0;
        acc.totalDuration += w.duration || 0;
        acc.totalDistance += w.distance || 0;
        acc.totalVolume +=
          w.type === "musculacao" ? this.calculateVolume(w.sets) : 0;
        return acc;
      },
      {
        totalWorkouts: 0,
        totalCalories: 0,
        totalDuration: 0,
        totalVolume: 0,
        totalDistance: 0,
      }
    );
  }

  private getConsistencyStats(
    workouts: Workout[],
    days: number
  ): { daysInLast7: number } {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const pastDate = new Date();
    pastDate.setDate(today.getDate() - (days - 1));
    pastDate.setHours(0, 0, 0, 0);

    const startTimestamp = pastDate.getTime();
    const endTimestamp = today.getTime();

    const trainedDays = new Set<string>();

    workouts.forEach((w) => {
      const workoutDate = new Date(w.date + "T12:00:00Z").getTime();
      if (workoutDate >= startTimestamp && workoutDate <= endTimestamp) {
        trainedDays.add(w.date);
      }
    });

    return { daysInLast7: trainedDays.size };
  }

  // --- FIM DAS NOVAS FUNÇÕES ---

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

        // --- LÓGICA ATUALIZADA PARA 'show_summary' ---
        case "show_summary":
          const allWorkouts = this.workouts();

          // Definir datas
          const today = new Date();
          // Assumindo que a semana começa no Domingo (0)
          const startOfThisWeek = this.getStartOfWeek(today, 0);
          const endOfThisWeek = new Date(startOfThisWeek);
          endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
          endOfThisWeek.setHours(23, 59, 59, 999);

          const startOfLastWeek = new Date(startOfThisWeek);
          startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
          const endOfLastWeek = new Date(startOfThisWeek);
          endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);
          endOfLastWeek.setHours(23, 59, 59, 999);

          // Calcular estatísticas
          const overallStats = this.getStatsForPeriod(
            allWorkouts,
            new Date(0),
            today
          );
          const thisWeekStats = this.getStatsForPeriod(
            allWorkouts,
            startOfThisWeek,
            endOfThisWeek
          );
          const lastWeekStats = this.getStatsForPeriod(
            allWorkouts,
            startOfLastWeek,
            endOfLastWeek
          );
          const consistencyStats = this.getConsistencyStats(allWorkouts, 7);

          const typeDistribution = allWorkouts.reduce((acc, w) => {
            acc[w.type] = (acc[w.type] || 0) + 1;
            return acc;
          }, {} as { [key in "musculacao" | "cardio" | "isometrico"]?: number });

          // Montar o payload
          const summaryPayload: StatsSummary = {
            overall: overallStats,
            thisWeek: thisWeekStats,
            lastWeek: lastWeekStats,
            consistency: consistencyStats,
            typeDistribution: typeDistribution,
          };

          lastMessage.type = "stats_summary";
          lastMessage.payload = summaryPayload;
          break;

        // --- FIM DA LÓGICA ATUALIZADA ---
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

  deleteWorkout(workoutId: number, messageId?: string) {
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
      id: this.obterIdAleatorio(), // Add random to avoid ID collision in fast multi-add
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

