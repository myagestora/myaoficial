import { addDays, addWeeks, addMonths, addYears, isAfter, parseISO, getDate, getMonth, getYear, lastDayOfMonth, setDate } from 'date-fns';

export interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'biweekly' | 'semiannual' | 'custom';
  interval: number;
  startDate: string;
  count: number;
  customDays?: number;
}

// Função para ajustar data quando o dia não existe no mês de destino
const getValidDateForMonth = (baseDate: Date, targetYear: number, targetMonth: number): Date => {
  const originalDay = getDate(baseDate);
  const targetDate = new Date(targetYear, targetMonth, 1);
  const lastDay = lastDayOfMonth(targetDate);
  const maxDayInMonth = getDate(lastDay);
  
  // Se o dia original existe no mês de destino, usa ele
  if (originalDay <= maxDayInMonth) {
    return setDate(targetDate, originalDay);
  }
  
  // Se não existe, usa o último dia do mês
  return lastDay;
};

export const generateRecurrenceDates = (config: RecurrenceConfig): string[] => {
  const { frequency, interval, startDate, count, customDays } = config;
  const dates: string[] = [];
  const start = parseISO(startDate);
  
  // Começar da primeira data de recorrência (não incluir a data inicial)
  let currentDate = start;
  const maxOccurrences = Math.min(count, 365); // Limite de segurança
  let generatedCount = 0;

  while (generatedCount < maxOccurrences) {
    // Calcular próxima data baseada na frequência ANTES de adicionar
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
        // Usar lógica inteligente para meses
        const nextMonth = getMonth(currentDate) + interval;
        const nextYear = getYear(currentDate) + Math.floor(nextMonth / 12);
        const adjustedMonth = nextMonth % 12;
        currentDate = getValidDateForMonth(start, nextYear, adjustedMonth);
        break;
      case 'quarterly':
        // Trimestral = 3 meses
        const nextQuarterMonth = getMonth(currentDate) + (interval * 3);
        const nextQuarterYear = getYear(currentDate) + Math.floor(nextQuarterMonth / 12);
        const adjustedQuarterMonth = nextQuarterMonth % 12;
        currentDate = getValidDateForMonth(start, nextQuarterYear, adjustedQuarterMonth);
        break;
      case 'semiannual':
        // Semestral = 6 meses
        const nextSemiMonth = getMonth(currentDate) + (interval * 6);
        const nextSemiYear = getYear(currentDate) + Math.floor(nextSemiMonth / 12);
        const adjustedSemiMonth = nextSemiMonth % 12;
        currentDate = getValidDateForMonth(start, nextSemiYear, adjustedSemiMonth);
        break;
      case 'yearly':
        // Anual mantém o dia original ou usa o último dia do mês
        const nextYearValue = getYear(currentDate) + interval;
        const monthValue = getMonth(currentDate);
        currentDate = getValidDateForMonth(start, nextYearValue, monthValue);
        break;
      case 'custom':
        if (customDays) {
          currentDate = addDays(currentDate, customDays);
        } else {
          currentDate = addDays(currentDate, interval);
        }
        break;
    }

    // Adicionar a data calculada (próxima recorrência)
    dates.push(currentDate.toISOString().split('T')[0]);
    generatedCount++;
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