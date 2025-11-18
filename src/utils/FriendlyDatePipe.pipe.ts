import { Pipe, PipeTransform } from "@angular/core";
import { DatePipe } from "@angular/common";

@Pipe({
  name: "friendlyDate",
  standalone: true,
  pure: true, // Pipes puros são ótimos para performance
})
export class FriendlyDatePipe implements PipeTransform {
  private today: Date;
  private yesterday: Date;

  constructor(private datePipe: DatePipe) {
    // Definir datas de referência uma vez
    this.today = new Date();
    this.yesterday = new Date();
    this.yesterday.setDate(this.today.getDate() - 1);
  }

  transform(value: string | Date): string {
    if (!value) return "";

    const date = new Date(value);

    // Normalizar datas para ignorar a hora
    const inputDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const todayDate = new Date(
      this.today.getFullYear(),
      this.today.getMonth(),
      this.today.getDate()
    );
    const yesterdayDate = new Date(
      this.yesterday.getFullYear(),
      this.yesterday.getMonth(),
      this.yesterday.getDate()
    );

    if (inputDate.getTime() === todayDate.getTime()) {
      return "Hoje";
    }
    if (inputDate.getTime() === yesterdayDate.getTime()) {
      return "Ontem";
    }

    // Fallback para o formato padrão
    // Ex: 'Segunda-feira, 10/11'
    return this.datePipe.transform(date, "EEEE, dd/MM") ?? "";
  }
}
