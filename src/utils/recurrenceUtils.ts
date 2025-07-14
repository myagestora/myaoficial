import { addDays, addWeeks, addMonths, addYears, isAfter, parseISO } from 'date-fns';

export interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'biweekly' | 'semiannual' | 'custom';
  interval: number;
  startDate: string;
  count: number;
  customDays?: number;
}

export const generateRecurrenceDates = (config: RecurrenceConfig): string[] => {
  const { frequency, interval, startDate, count, customDays } = config;
  const dates: string[] = [];
  const start = parseISO(startDate);
  
  let currentDate = start;
  const maxOccurrences = Math.min(count, 365); // Limite de segurança
  let generatedCount = 0;

  while (generatedCount < maxOccurrences) {
    // Adicionar a data atual
    dates.push(currentDate.toISOString().split('T')[0]);
    generatedCount++;

    // Se chegou ao limite, parar
    if (generatedCount >= maxOccurrences) {
      break;
    }

    // Calcular próxima data baseada na frequência
    switch (frequency) {
      case 'daily':
        currentDate = addDays(currentDate, interval);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, interval);
        break;
      case 'biweekly':
        currentDate = addWeeks(currentDate, 2 * interval);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, interval);
        break;
      case 'quarterly':
        currentDate = addMonths(currentDate, interval * 3);
        break;
      case 'semiannual':
        currentDate = addMonths(currentDate, interval * 6);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, interval);
        break;
      case 'custom':
        if (customDays) {
          currentDate = addDays(currentDate, customDays);
        } else {
          currentDate = addDays(currentDate, interval);
        }
        break;
    }
  }

  return dates;
};

export const formatRecurrenceInfo = (frequency: string, interval: number, customDays?: number): string => {
  const frequencyMap = {
    daily: 'Diário',
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    yearly: 'Anual',
    custom: 'Personalizado'
  };

  const freq = frequencyMap[frequency as keyof typeof frequencyMap] || frequency;
  
  if (frequency === 'custom' && customDays) {
    return `A cada ${customDays} dias`;
  }
  
  if (interval === 1 && frequency !== 'custom') {
    return freq;
  }
  
  if (frequency === 'biweekly') {
    return interval === 1 ? 'Quinzenal' : `A cada ${interval} quinzenas`;
  }
  
  if (frequency === 'semiannual') {
    return interval === 1 ? 'Semestral' : `A cada ${interval} semestres`;
  }
  
  return `A cada ${interval} ${freq.toLowerCase()}`;
};

export const calculateTotalDuration = (frequency: string, interval: number, count: number, customDays?: number): string => {
  let totalDays = 0;
  
  switch (frequency) {
    case 'daily':
      totalDays = count * interval;
      break;
    case 'weekly':
      totalDays = count * interval * 7;
      break;
    case 'biweekly':
      totalDays = count * interval * 14;
      break;
    case 'monthly':
      totalDays = count * interval * 30;
      break;
    case 'quarterly':
      totalDays = count * interval * 90;
      break;
    case 'semiannual':
      totalDays = count * interval * 180;
      break;
    case 'yearly':
      totalDays = count * interval * 365;
      break;
    case 'custom':
      totalDays = count * (customDays || interval);
      break;
  }
  
  if (totalDays < 30) {
    return `${totalDays} dias`;
  } else if (totalDays < 365) {
    const months = Math.round(totalDays / 30);
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  } else {
    const years = Math.round(totalDays / 365);
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }
};