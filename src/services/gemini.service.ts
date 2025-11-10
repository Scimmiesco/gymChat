import { Injectable, inject } from "@angular/core";

import { USER_PROFILE } from "../models";
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
      Seu objetivo é ajudar os usuários a registrar treinos, recuperar informações do histórico e conversar sobre fitness.
      Seja sempre amigável, encorajador e use Português (Brasil). Use emojis para deixar a conversa mais leve. 🏋️‍♂️💪

      **REGRAS DE RESPOSTA:**
      - Sua resposta DEVE SEMPRE ser um único objeto JSON.
      - **NÃO** envolva o JSON em \`\`\`json ... \`\`\`. Retorne apenas o JSON bruto.
      - O JSON deve ter uma propriedade "action" e opcionalmente "workouts" (uma lista) e "text".

      **LÓGICA DE AÇÕES:**
      - "action" pode ser: 'log_workout', 'show_history', 'show_summary', 'show_profile', 'export_data', 'import_data', 'clarification_needed', 'text_response'.

      1.  **'text_response'**: Para conversas gerais. O campo 'text' deve conter sua resposta.

      2.  **'clarification_needed'**: Se o usuário fornecer informações insuficientes para registrar um treino.
          - **NÃO INVENTE DADOS**. Peça os detalhes que faltam.
          - Coloque sua pergunta no campo 'text'.
          - Exemplo Input: "Fiz supino hoje." -> JSON: {"action": "clarification_needed", "text": "Legal! 💪 Quantas séries, repetições e qual o peso você usou no supino?"}

      3.  **'log_workout'**: SOMENTE quando tiver todos os detalhes necessários.
          - 'workouts' deve ser um array de objetos de treino.
          - **DURAÇÃO**: 'duration' (em minutos) é OBRATÓRIO. Se não for fornecido, ESTIME um valor razoável e adicione uma nota em 'notes'.
          - **DATA**: Hoje é ${today}. Se não for mencionado, omita. "Ontem" é ${yesterday}. Use "YYYY-MM-DD".
          - **Séries**: Expanda "4x8 com 10kg" em 4 objetos de série.

      4.  **'show_history', 'show_summary', 'show_profile', 'export_data', 'import_data'**: Quando solicitado. O campo 'text' deve ter uma confirmação.
          - Exemplo Input: "meu histórico" -> JSON: {"action": "show_history", "text": "Claro! Aqui está o seu histórico de treinos: 📜"}

      **CONTEXTO DO USUÁRIO (NÃO EXIBIR):**
      - Perfil: ${JSON.stringify(USER_PROFILE)}
      - Histórico Recente de Treinos: ${workoutHistoryContext}
    `;
  }

  async *sendMessageStream(message: string): AsyncGenerator<any> {
    const apiKey = this.chatService.apiKey();
    if (!apiKey) {
      throw new Error("DeepSeek API key not set.");
    }

    // Get the last 3 relevant messages to provide conversation context
    const allMessages = this.chatService.messages();
    const chatHistoryForPrompt = allMessages
      .slice(0, -2) // Exclude current user prompt and loading bubble
      .slice(-4) // Get the last 3 from the remaining history
      .filter((m) => (m.type === "text" || m.type === "workout_log") && m.text) // Filter for relevance
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
        buffer = lines.pop() || ""; // Keep potential partial line

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6).trim();
            if (data === "[DONE]") {
              return; // Stream finished
            }
            try {
              const jsonChunk = JSON.parse(data);
              yield jsonChunk;
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
