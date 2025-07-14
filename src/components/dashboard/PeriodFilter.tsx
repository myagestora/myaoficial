
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface PeriodFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export const PeriodFilter = ({ dateRange, onDateRangeChange }: PeriodFilterProps) => {
  const presetRanges = [
    {
      label: 'Últimos 7 dias',
      range: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
      }
    },
    {
      label: 'Últimos 30 dias',
      range: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date()
      }
    },
    {
      label: 'Este mês',
      range: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date()
      }
    },
    {
      label: 'Últimos 3 meses',
      range: {
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        to: new Date()
      }
    }
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex gap-2 flex-wrap">
        {presetRanges.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => onDateRangeChange(preset.range)}
            className={cn(
              dateRange?.from?.toDateString() === preset.range.from.toDateString() &&
              dateRange?.to?.toDateString() === preset.range.to.toDateString() &&
              "bg-primary text-primary-foreground"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              <span>Período personalizado</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
