import { Injectable, signal } from '@angular/core';
import { ChatMessage } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly STORAGE_KEY = 'aiWorkoutLoggerChatHistory';
  
  messages = signal<ChatMessage[]>(this.loadFromStorage());

  private getDefaultWelcomeMessage(): ChatMessage {
    return {
      id: Date.now(),
      role: 'model',
      type: 'quick_actions',
      text: `Olá! Eu sou o Gymini, seu assistente de treino pessoal. 🏋️‍♂️

Para começar, basta me dizer o que você treinou hoje. Ou, se preferir, use um dos atalhos abaixo.`,
      payload: [
        'Ver meu histórico',
        'Mostrar resumo',
        'Qual o meu perfil?'
      ],
      timestamp: new Date().toISOString()
    };
  }

  private loadFromStorage(): ChatMessage[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const messages = data ? JSON.parse(data) : [];
      if (messages.length === 0) {
        return [this.getDefaultWelcomeMessage()];
      }
      return messages;
    } catch (e) {
      console.error('Failed to load chat history from storage', e);
      return [this.getDefaultWelcomeMessage()];
    }
  }

  private saveToStorage(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history to storage', e);
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

  deleteMessage(id: number): void {
    const newMessages = this.messages().filter(m => m.id !== id);
    this.messages.set(newMessages);
    this.saveToStorage(newMessages);
  }
}