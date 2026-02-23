/**
 * Utilitários para conversão de timezone
 * O sistema usa UTC internamente, mas a interface é em horário de Brasília (UTC-3)
 */

/**
 * Converte uma string de datetime-local (YYYY-MM-DDTHH:MM) para Date em UTC
 * considerando que o input está em horário de Brasília
 *
 * @param dateTimeLocal - String no formato "YYYY-MM-DDTHH:MM" em horário de Brasília
 * @returns Date em UTC
 */
export function parseDateTimeLocalToBrazil(dateTimeLocal: string): Date {
  if (!dateTimeLocal) {
    throw new Error('Data inválida');
  }

  // Input: "2024-01-15T09:00" (horário de Brasília)
  // O usuário digitou 9h de Brasília, que é 12h UTC
  // Precisamos adicionar 3 horas para converter para UTC

  const [datePart, timePart] = dateTimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  // Cria a data em UTC adicionando 3 horas (offset de Brasília)
  return new Date(Date.UTC(year, month - 1, day, hours + 3, minutes, 0, 0));
}

/**
 * Converte uma Date UTC para string datetime-local em horário de Brasília
 * para preencher inputs do tipo datetime-local
 *
 * @param date - Date em UTC
 * @returns String no formato "YYYY-MM-DDTHH:MM" em horário de Brasília
 */
export function formatDateToLocalInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Converte para string no timezone de Brasília
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  const parts = new Intl.DateTimeFormat('pt-BR', options).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Formata uma data para exibição em pt-BR com timezone de Brasília
 *
 * @param date - Date ou string ISO
 * @returns String formatada (ex: "15/01/2024 09:00")
 */
export function formatDateTimeBrazil(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formata apenas a data para exibição em pt-BR com timezone de Brasília
 *
 * @param date - Date ou string ISO
 * @returns String formatada (ex: "15/01/2024")
 */
export function formatDateBrazil(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Converte uma string de date (YYYY-MM-DD) para Date em UTC
 * considerando que o input está em horário de Brasília (início do dia)
 *
 * @param dateStr - String no formato "YYYY-MM-DD" em horário de Brasília
 * @returns Date em UTC (meia-noite de Brasília = 03:00 UTC)
 */
export function parseDateToBrazil(dateStr: string): Date {
  if (!dateStr) {
    throw new Error('Data inválida');
  }

  const [year, month, day] = dateStr.split('-').map(Number);

  // Cria a data em UTC adicionando 3 horas (meia-noite em Brasília = 03:00 UTC)
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
}
