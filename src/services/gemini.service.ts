import { Injectable, inject } from "@angular/core";
import { MessageType, USER_PROFILE } from "../models";
import { ChatService } from "./chat.service";
import { WorkoutService } from "./workout.service";

@Injectable({
  providedIn: "root",
})
export class AiService {
  private chatService = inject(ChatService);
  private workoutService = inject(WorkoutService);

  private getSystemPrompt(workoutHistoryContext: string): string {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    return `
      Você é o Gymini, um assistente de fitness especialista para um aplicativo de registro de treinos.
      Seu objetivo é ajudar os usuários a registrar treinos, recuperar informações do histórico.
      Use Português. Use emojis.

      FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
      Sua resposta DEVE ser um único objeto JSON que corresponda a este esquema:
      {
        "action": "'log_workout' | 'show_history' | 'show_summary' | 'show_profile' | 'export_data' | 'import_data' | 'clarification_needed' | 'text_response'",
        "text": "string (Obrigatório para 'text_response', 'clarification_needed' e confirmações.)",
        "workouts": "Array<Workout> (Opcional. Usado APENAS para 'action': 'log_workout'.)"
      }

      LÓGICA DE ESCOLHA DA AÇÃO:
      1.  'text_response': Para conversas gerais sobre fitness.

      2.  'clarification_needed': QUANDO o usuário quer registrar um treino ('log_workout') mas faltam dados (séries, reps, peso).
          - NÃO INVENTE DADOS. Use 'text' para perguntar o que falta.
          - Exemplo Input: "Fiz supino hoje." -> JSON: {"action": "clarification_needed", "text": "Legal! 💪 Quantas séries, repetições e qual o peso você usou no supino?"}

      3.  'log_workout': SOMENTE quando tiver todos os detalhes necessários.
          - DURAÇÃO: 'duration' (em minutos) é OBRIGATÓRIO. Se não for fornecido, ESTIME um valor razoável e adicione uma nota em 'notes'.
          - DATA: Hoje é ${today}. Se não for mencionado, omita. "Ontem" é ${yesterday}. Use "YYYY-MM-DD".
          - Séries: Expanda "4x8 com 10kg" em 4 objetos de série.

      4.  'show_history', 'show_summary', 'show_profile', 'export_data', 'import_data': Quando solicitado. Use 'text' para uma mensagem de confirmação.
          - Exemplo Input: "meu histórico" -> JSON: {"action": "show_history", "text": "Claro! Aqui está o seu histórico de treinos: 📜"}

      CONTEXTO DO USUÁRIO (NÃO EXIBIR):
      - Perfil: ${JSON.stringify(USER_PROFILE)}
      - Histórico Recente de Treinos: ${workoutHistoryContext}
    `;
  }

  async *sendMessageStream(message: string): AsyncGenerator<string> {
    const apiKey = this.chatService.apiKey();
    if (!apiKey) {
      throw new Error("DeepSeek API key not set.");
    }

    const RELEVANT_MESSAGE_TYPES_FOR_HISTORY = new Set<MessageType>([
      "text",
      "workout_log",
      "history_summary",
      "stats_summary",
      "user_profile",
    ]);

    const allMessages = this.chatService.messages();
    const chatHistoryForPrompt = allMessages
      .slice(0, -2) // Exclude current user message and 'loading'
      .slice(-4)   // Get last 4 relevant messages
      .filter((m) => RELEVANT_MESSAGE_TYPES_FOR_HISTORY.has(m.type) && m.text)
      .map((m) => ({
        role: m.role === "model" ? "assistant" : "user",
        content: m.text!,
      }));

    const lastWorkouts = this.workoutService.workouts().slice(0, 6);
    const workoutHistoryForPrompt =
      lastWorkouts.length > 0
        ? `Estes são os últimos 6 treinos registrados pelo usuário (do mais recente para o mais antigo):\n${JSON.stringify(
            lastWorkouts,
            null,
            2
          )}`
        : "O usuário ainda não registrou nenhum treino.";

    try {
      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content: this.getSystemPrompt(workoutHistoryForPrompt),
              },
              ...chatHistoryForPrompt,
              { role: "user", content: message },
            ],
            stream: true,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        const errorMessage = errorBody?.error?.message || response.statusText;
        throw new Error(`${response.status}: ${errorMessage}`);
      }

      if (!response.body) {
        throw new Error("Response body is empty.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6).trim();
            if (data === "[DONE]") {
              return;
            }
            try {
              const jsonChunk = JSON.parse(data);
              const contentDelta = jsonChunk?.choices?.[0]?.delta?.content;
              if (contentDelta) {
                yield contentDelta;
              }
            } catch (e) {
              console.error("Error parsing stream chunk:", data, e);
            }
          }
        }
      }
    } catch (error) {
      console.error("DeepSeek API call failed:", error);
      throw error;
    }
  }
}
