import { Injectable, inject } from '@angular/core';
import OpenAI from 'openai';
import { Stream } from 'openai/streaming';

import { USER_PROFILE } from '../models';
import { ChatService } from './chat.service';
import { WorkoutService } from './workout.service';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private chatService = inject(ChatService);
  private workoutService = inject(WorkoutService);
  private openai?: OpenAI;

  private initializeAi() {
    const apiKey = this.chatService.apiKey();
    if (apiKey && (!this.openai || this.openai.apiKey !== apiKey)) {
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.deepseek.com/v1',
        dangerouslyAllowBrowser: true,
      });
    } else if (!apiKey) {
      this.openai = undefined;
    }
  }

  private getSystemPrompt(workoutHistoryContext: string): string {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
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
  
  async sendMessageStream(message: string): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    this.initializeAi();
    if (!this.openai) {
      throw new Error("DeepSeek API key not set.");
    }
    
    const lastWorkouts = this.workoutService.workouts().slice(0, 6);
    const workoutHistoryForPrompt = lastWorkouts.length > 0
      ? `Estes são os últimos 6 treinos registrados pelo usuário (do mais recente para o mais antigo):\n${JSON.stringify(lastWorkouts, null, 2)}`
      : "O usuário ainda não registrou nenhum treino.";
      
    try {
      return await this.openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: this.getSystemPrompt(workoutHistoryForPrompt) },
          // O histórico de chat foi removido conforme solicitado para priorizar o histórico de treinos.
          { role: 'user', content: message }
        ],
        stream: true,
        response_format: { type: 'json_object' }
      });
    } catch (error) {
      console.error('DeepSeek API call failed:', error);
      throw error;
    }
  }
}