import { addDays, addWeeks, addMonths, addYears, isAfter, parseISO } from 'date-fns';

export interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number;
  startDate: string;
  endDate?: string;
}

export const generateRecurrenceDates = (config: RecurrenceConfig): string[] => {
  const { frequency, interval, startDate, endDate } = config;
  const dates: string[] = [];
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : null;
  
  let currentDate = start;
  const maxOccurrences = 365; // Limite de segurança
  let count = 0;

  while (count < maxOccurrences) {
    // Se há data final e a data atual é posterior, parar
    if (end && isAfter(currentDate, end)) {
      break;
    }

    // Adicionar a data atual apenas se for >= hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (currentDate >= today) {
      dates.push(currentDate.toISOString().split('T')[0]);
    }

    count++;

    // Calcular próxima data baseada na frequência
    switch (frequency) {
      case 'daily':
        currentDate = addDays(currentDate, interval);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, interval);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, interval);
        break;
      case 'quarterly':
        currentDate = addMonths(currentDate, interval * 3);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, interval);
        break;
    }
  }

  return dates;
};

export const formatRecurrenceInfo = (frequency: string, interval: number): string => {
  const frequencyMap = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    yearly: 'Anual'
  };

  const freq = frequencyMap[frequency as keyof typeof frequencyMap] || frequency;
  
  if (interval === 1) {
    return freq;
  }
  
  return `A cada ${interval} ${freq.toLowerCase()}`;
};