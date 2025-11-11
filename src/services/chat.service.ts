import { Injectable, signal } from "@angular/core";
import { ChatMessage } from "../models";

@Injectable({
  providedIn: "root",
})
export class ChatService {
  private readonly CHAT_HISTORY_KEY = "aiWorkoutLoggerChatHistory";
  private readonly API_KEY_STORAGE_KEY = "aiWorkoutLogger_deepseekApiKey";

  messages = signal<ChatMessage[]>(this.loadFromStorage());
  apiKey = signal<string | null>(this.loadApiKey());

  private getDefaultWelcomeMessage(): ChatMessage {
    return {
      id: (Date.now() + Math.random()).toString(),
      role: "model",
      type: "quick_actions",
      text: `Olá! Eu sou o Gymini, seu assistente de treino pessoal. 🏋️‍♂️

Para começar, basta me dizer o que você treinou hoje. Ou, se preferir, use um dos atalhos abaixo.`,
      payload: ["Ver meu histórico", "Mostrar resumo", "Qual o meu perfil?"],
      timestamp: new Date().toISOString(),
    };
  }

  private loadApiKey(): string | null {
    try {
      return localStorage.getItem(this.API_KEY_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to load API key from storage", e);
      return null;
    }
  }

  saveApiKey(key: string): void {
    try {
      this.apiKey.set(key);
      localStorage.setItem(this.API_KEY_STORAGE_KEY, key);
    } catch (e) {
      console.error("Failed to save API key to storage", e);
    }
  }

  private loadFromStorage(): ChatMessage[] {
    try {
      const data = localStorage.getItem(this.CHAT_HISTORY_KEY);
      const messages = data ? JSON.parse(data) : [];
      if (messages.length === 0) {
        return [this.getDefaultWelcomeMessage()];
      }
      return messages;
    } catch (e) {
      console.error("Failed to load chat history from storage", e);
      return [this.getDefaultWelcomeMessage()];
    }
  }

  private saveToStorage(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(this.CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history to storage", e);
    }
  }

  addMessage(message: ChatMessage): void {
    const newMessages = [...this.messages(), message];
    this.messages.set(newMessages);
    this.saveToStorage(newMessages);
  }

  updateLastMessage(updateFn: (lastMessage: ChatMessage) => void): void {
    const currentMessages = this.messages();
    if (currentMessages.length === 0) return;

    // Create a copy to avoid direct mutation of signal's value
    const lastMessage = { ...currentMessages[currentMessages.length - 1] };
    updateFn(lastMessage);

    const newMessages = [...currentMessages.slice(0, -1), lastMessage];
    this.messages.set(newMessages);
    this.saveToStorage(newMessages);
  }

  deleteMessage(id: string): void {
    const newMessages = this.messages().filter((m) => m.id !== id);
    this.messages.set(newMessages);
    this.saveToStorage(newMessages);
  }
}

