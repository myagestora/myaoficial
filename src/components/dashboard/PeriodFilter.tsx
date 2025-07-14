import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface PeriodFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export const PeriodFilter = ({ dateRange, onDateRangeChange }: PeriodFilterProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('monthly');
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);

  // Detectar qual período está selecionado baseado no dateRange atual
  React.useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;

    const currentDate = new Date();
    const from = dateRange.from;
    const to = dateRange.to;

    // Verificar se é semana atual
    const weekStart = startOfWeek(currentDate, { locale: ptBR });
    const weekEnd = endOfWeek(currentDate, { locale: ptBR });
    if (from.getTime() === weekStart.getTime() && to.getTime() === weekEnd.getTime()) {
      setSelectedPeriod('weekly');
      return;
    }

    // Verificar se é mês atual
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    if (from.getTime() === monthStart.getTime() && to.getTime() === monthEnd.getTime()) {
      setSelectedPeriod('monthly');
      return;
    }

    // Verificar se é trimestre atual
    const quarterStart = startOfQuarter(currentDate);
    const quarterEnd = endOfQuarter(currentDate);
    if (from.getTime() === quarterStart.getTime() && to.getTime() === quarterEnd.getTime()) {
      setSelectedPeriod('quarterly');
      return;
    }

    // Verificar se é ano atual
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    if (from.getTime() === yearStart.getTime() && to.getTime() === yearEnd.getTime()) {
      setSelectedPeriod('yearly');
      return;
    }

    // Se não corresponder a nenhum período padrão, é personalizado
    setSelectedPeriod('custom');
  }, [dateRange]);

  const periodOptions = [
    {
      key: 'weekly',
      label: 'Semana',
      getRange: () => ({
        from: startOfWeek(new Date(), { locale: ptBR }),
        to: endOfWeek(new Date(), { locale: ptBR })
      })
    },
    {
      key: 'monthly',
      label: 'Mensal',
      getRange: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      })
    },
    {
      key: 'quarterly',
      label: 'Trimestre',
      getRange: () => ({
        from: startOfQuarter(new Date()),
        to: endOfQuarter(new Date())
      })
    },
    {
      key: 'yearly',
      label: 'Anual',
      getRange: () => ({
        from: startOfYear(new Date()),
        to: endOfYear(new Date())
      })
    },
    {
      key: 'custom',
      label: 'Personalizado',
      getRange: () => dateRange || { from: new Date(), to: new Date() }
    }
  ];

  const handlePeriodSelect = (periodKey: string) => {
    setSelectedPeriod(periodKey);
    
    if (periodKey !== 'custom') {
      const period = periodOptions.find(p => p.key === periodKey);
      if (period) {
        const range = period.getRange();
        onDateRangeChange(range);
      }
    }
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setTempDateRange(range);
    
    // Só atualiza quando o range estiver completo (from e to)
    if (range?.from && range?.to) {
      onDateRangeChange(range);
    }
  };

  const formatDateRange = () => {
    const displayRange = selectedPeriod === 'custom' ? (tempDateRange || dateRange) : dateRange;
    
    if (!displayRange?.from) return 'Selecione o período';
    
    if (displayRange.to) {
      return `${format(displayRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(displayRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    }
    
    return format(displayRange.from, 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="space-y-4">
      {/* Period Buttons */}
      <div className="flex flex-wrap gap-2">
        {periodOptions.map((period) => (
          <Button
            key={period.key}
            variant={selectedPeriod === period.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodSelect(period.key)}
            className="min-w-[100px]"
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Picker */}
      {selectedPeriod === 'custom' && (
        <div className="border rounded-lg p-4 bg-background">
          <div className="space-y-4">
            <div className="text-sm font-medium">Selecione o período personalizado:</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !tempDateRange && !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={tempDateRange?.from || dateRange?.from}
                  selected={tempDateRange || dateRange}
                  onSelect={handleCustomDateChange}
                  numberOfMonths={2}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
};