import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Fuso horário do Brasil (UTC-3)
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Obtém a data atual no fuso horário brasileiro
 */
export const getBrazilianDate = (): Date => {
  const now = new Date();
  // Converte para UTC-3 (Brasília)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilTime = new Date(utc + (-3 * 3600000));
  return brazilTime;
};

/**
 * Formata uma data para string no formato yyyy-MM-dd considerando UTC-3
 */
export const formatDateForBrazil = (date?: Date): string => {
  const targetDate = date || getBrazilianDate();
  return formatInTimeZone(targetDate, BRAZIL_TIMEZONE, 'yyyy-MM-dd');
};

/**
 * Formata uma data para exibição no padrão brasileiro (dd/MM/yyyy)
 */
export const formatDateBrazilian = (date: string | Date, pattern: string = 'dd/MM/yyyy'): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(targetDate, BRAZIL_TIMEZONE, pattern, { locale: ptBR });
};

/**
 * Converte uma data string para o fuso horário brasileiro
 */
export const parseToBrazil = (dateString: string): Date => {
  const date = new Date(dateString);
  return new Date(date.toLocaleString("en-US", { timeZone: BRAZIL_TIMEZONE }));
};

/**
 * Obtém o timestamp atual em UTC-3
 */
export const getBrazilianTimestamp = (): string => {
  return formatInTimeZone(new Date(), BRAZIL_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
};

/**
 * Verifica se uma data é hoje no fuso horário brasileiro
 */
export const isTodayInBrazil = (date: string | Date): boolean => {
  const today = formatDateForBrazil();
  const targetDate = typeof date === 'string' ? date : formatDateForBrazil(date);
  return today === targetDate.split('T')[0];
};

/**
 * Obtém a data e hora atual formatada para input datetime-local
 */
export const getCurrentDateTimeForInput = (): string => {
  return formatInTimeZone(new Date(), BRAZIL_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
};

/**
 * Obtém apenas a data atual formatada para input date
 */
export const getCurrentDateForInput = (): string => {
  return formatDateForBrazil();
};