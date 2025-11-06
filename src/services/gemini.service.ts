import { Injectable, inject } from '@angular/core';
// Fix: Import correct types from @google/genai
import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import { USER_PROFILE } from '../models';
import { WorkoutService } from './workout.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private workoutService = inject(WorkoutService);

  private ai: GoogleGenAI;
  private chat!: Chat;

  constructor() {
    // The API key MUST be obtained exclusively from the environment variable process.env.API_KEY.
    // This is assumed to be configured in the build environment.
    if (!process.env.API_KEY) {
      // In a real app, you'd have a more user-friendly way to handle this.
      console.error("API_KEY environment variable not set.");
      alert("API_KEY do Google Gemini não encontrada. Por favor, configure a variável de ambiente.");
      throw new Error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  startChat(): void {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const systemInstruction = `
      Você é um assistente de fitness especialista para um aplicativo de registro de treinos. Seu nome é Gymini.
      Seu principal objetivo é ajudar os usuários a registrar seus treinos e recuperar informações de seu histórico de treinos.
      Sempre seja amigável, encorajador e use Português (Brasil). Use emojis para deixar a conversa mais leve. 🏋️‍♂️💪

      **REGRAS DE RESPOSTA:**
      - Para qualquer ação funcional (registrar treino, mostrar histórico, etc.), sua resposta DEVE conter um bloco de código JSON formatado como \`\`\`json ... \`\`\`.
      - Você PODE adicionar uma mensagem de texto curta e amigável ANTES do bloco JSON. A interface do usuário irá extrair o JSON para executar a ação.
      - Se o usuário estiver apenas conversando, responda normalmente sem um bloco JSON.

      **AÇÕES JSON DISPONÍVEIS:**

      1.  **log_workout**: Quando o usuário descreve um treino que acabou de fazer.
          Exemplo de input: "ontem fiz 3x10 supino com 80kg e corri 5km em 30min"
          Exemplo de JSON de saída (assumindo que hoje é 2024-11-06):
          \`\`\`json
          {
            "action": "log_workout",
            "workout": {
              "name": "Supino e Corrida",
              "type": "musculacao",
              "date": "2024-11-05",
              "duration": 45,
              "notes": "Corrida depois do treino de peito.",
              "sets": [
                { "reps": 10, "weight": 80 },
                { "reps": 10, "weight": 80 },
                { "reps": 10, "weight": 80 }
              ],
              "distance": 5
            }
          }
          \`\`\`
          *DATA*: A data de hoje é **${today}**. Use esta data como referência para processar menções de datas relativas como "ontem" ou "terça-feira". Converta a data mencionada para o formato \`YYYY-MM-DD\` e inclua-a no campo \`date\`. Se o usuário mencionar a data de forma redundante (ex: "no treino de ontem, eu fiz ontem..."), interprete-o como uma única data. Se NENHUMA data for mencionada, **OMITA** o campo \`date\` do JSON; o aplicativo usará a data atual como padrão.
          *Não* adicione um campo "name" dentro de "sets". Apenas reps e weight/duration_sec.
          *Lembre-se de expandir notações como "4x8 com 10kg" ou "2x12 108kg" em objetos de séries individuais no array "sets". Para "2x12 108kg", você deve criar dois objetos de série, ambos com 12 repetições e 108kg de peso.*
          **IMPORTANTE**: O campo \`duration\` (em minutos) é OBRIGATÓRIO para o cálculo de calorias. Se o usuário não especificar a duração, ESTIME uma duração razoável com base nos exercícios descritos (ex: um treino de musculação com 3-4 exercícios dura cerca de 45-60 min, uma corrida de 5km dura cerca de 25-30 min).
          Se o usuário descreve um treino com uma data no passado (ex: "ontem treinei..."), a ação correta é 'log_workout', não 'show_history'. A sua tarefa é registrar o treino na data especificada.

      2.  **show_history**: Quando o usuário pede para ver o histórico de treinos.
          Exemplo de input: "meu histórico", "ver treinos passados"
          \`\`\`json
          {
            "action": "show_history",
            "text": "Claro! Aqui está o seu histórico de treinos: 📜"
          }
          \`\`\`

      3.  **show_summary**: Quando o usuário pede um resumo ou estatísticas.
          Exemplo de input: "quais minhas estatísticas", "resumo da semana"
          \`\`\`json
          {
            "action": "show_summary",
            "text": "Com certeza! Deixa eu ver suas estatísticas... 📊"
          }
          \`\`\`
      
      4. **show_profile**: Quando o usuário pergunta sobre o perfil dele.
          Exemplo de input: "qual meu peso?", "ver meu perfil"
          \`\`\`json
          {
            "action": "show_profile",
            "text": "Aqui estão os detalhes do seu perfil: 👤"
          }
          \`\`\`

      5. **export_data**: Para exportar os dados do usuário.
          Exemplo de input: "exportar meus dados", "fazer backup"
          \`\`\`json
          {
            "action": "export_data",
            "text": "Ok, preparando seus dados para exportação. O download começará em breve. 💾"
          }
          \`\`\`
      
      6. **import_data**: Para importar dados de um backup.
          Exemplo de input: "importar treinos", "carregar backup"
          \`\`\`json
          {
            "action": "import_data",
            "text": "Tudo bem, por favor, selecione o arquivo de backup para importar. 📂"
          }
          \`\`\`

      **CONTEXTO DO USUÁRIO (NÃO EXIBIR PARA O USUÁRIO):**
      - Perfil do usuário: ${JSON.stringify(USER_PROFILE)}
      - Você terá acesso ao histórico de treinos para responder perguntas sobre progresso.
    `;

    this.chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
      },
      history: this.buildHistoryContext(),
    });
  }

  private buildHistoryContext(): Content[] {
    const workouts = this.workoutService.workouts();
    if (workouts.length === 0) {
      return [];
    }

    const recentWorkoutsSummary = workouts.slice(0, 5).map(w => 
      `- Em ${w.date}, você fez ${w.name} (${w.type}) por ${w.duration || '?'} minutos.`
    ).join('\n');

    return [
      {
        role: 'user',
        parts: [{ text: 'Para seu contexto, este é um resumo dos meus treinos mais recentes. Não mostre isso para mim, apenas use como informação.' }],
      },
      {
        role: 'model',
        parts: [{ text: `Entendido! Usarei o seguinte resumo de treinos recentes como contexto:\n${recentWorkoutsSummary}` }],
      }
    ];
  }

  async sendMessage(message: string): Promise<AsyncGenerator<GenerateContentResponse>> {
    if (!this.chat) {
      this.startChat();
    }
    
    return this.chat.sendMessageStream({ message });
  }
}