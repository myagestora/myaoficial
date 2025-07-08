import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

export interface TransactionData {
  date: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description?: string;
}

export interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  transactions: TransactionData[];
  dateRange: {
    from: string;
    to: string;
  };
}

export const exportToCSV = (data: ReportData) => {
  const headers = ['Data', 'Título', 'Categoria', 'Tipo', 'Valor', 'Descrição'];
  
  // Criar linhas de dados
  const rows = data.transactions.map(transaction => [
    format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR }),
    transaction.title,
    transaction.category,
    transaction.type === 'income' ? 'Receita' : 'Despesa',
    `R$ ${transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    transaction.description || ''
  ]);

  // Adicionar resumo no final
  const summaryRows = [
    ['', '', '', '', '', ''],
    ['RESUMO DO PERÍODO', '', '', '', '', ''],
    ['Total de Receitas', '', '', '', `R$ ${data.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, ''],
    ['Total de Despesas', '', '', '', `R$ ${data.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, ''],
    ['Saldo', '', '', '', `R$ ${data.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, ''],
    ['Taxa de Poupança', '', '', '', `${data.savingsRate.toFixed(1)}%`, ''],
    ['Período', '', '', '', `${data.dateRange.from} a ${data.dateRange.to}`, '']
  ];

  const csvContent = [headers, ...rows, ...summaryRows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToPDF = async (data: ReportData) => {
  // Buscar logo e nome da aplicação
  let logoUrl = '';
  let appName = 'MYA Gestora';
  
  try {
    const { data: systemConfig, error } = await supabase
      .from('system_config')
      .select('*')
      .in('key', ['app_logo', 'app_name']);
    
    if (!error && systemConfig) {
      const configObj: Record<string, string> = {};
      systemConfig.forEach(item => {
        configObj[item.key] = typeof item.value === 'string' ? 
          item.value.replace(/^"|"$/g, '') : 
          JSON.stringify(item.value).replace(/^"|"$/g, '');
      });
      
      logoUrl = configObj.app_logo || '';
      appName = configObj.app_name || 'MYA Gestora';
    }
  } catch (error) {
    console.error('Erro ao buscar configurações do sistema:', error);
  }

  // Criar conteúdo HTML para o PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório Financeiro - ${appName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .logo { margin-bottom: 15px; }
        .logo img { max-height: 80px; max-width: 200px; object-fit: contain; }
        .app-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #333; }
        .report-title { font-size: 20px; margin-bottom: 10px; }
        .summary { margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px; }
        .summary-item { display: flex; justify-content: space-between; margin: 10px 0; }
        .summary-item.total { font-weight: bold; border-top: 1px solid #ccc; padding-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .income { color: #10b981; }
        .expense { color: #ef4444; }
        .positive { color: #10b981; font-weight: bold; }
        .negative { color: #ef4444; font-weight: bold; }
        .period { text-align: center; margin: 20px 0; font-style: italic; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoUrl ? `
          <div class="logo">
            <img src="${logoUrl}" alt="${appName} Logo" />
          </div>
        ` : ''}
        <div class="app-name">${appName}</div>
        <div class="report-title">Relatório Financeiro</div>
        <div class="period">Período: ${data.dateRange.from} a ${data.dateRange.to}</div>
      </div>
      
      <div class="summary">
        <h2>Resumo Financeiro</h2>
        <div class="summary-item">
          <span>Total de Receitas:</span>
          <span class="income">R$ ${data.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-item">
          <span>Total de Despesas:</span>
          <span class="expense">R$ ${data.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-item total">
          <span>Saldo:</span>
          <span class="${data.balance >= 0 ? 'positive' : 'negative'}">R$ ${data.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-item">
          <span>Taxa de Poupança:</span>
          <span>${data.savingsRate.toFixed(1)}%</span>
        </div>
      </div>

      <h2>Detalhamento das Transações</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Título</th>
            <th>Categoria</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          ${data.transactions.map(transaction => `
            <tr>
              <td>${format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}</td>
              <td>${transaction.title}</td>
              <td>${transaction.category}</td>
              <td class="${transaction.type}">${transaction.type === 'income' ? 'Receita' : 'Despesa'}</td>
              <td class="${transaction.type}">R$ ${transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td>${transaction.description || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        Relatório gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} | ${appName}
      </div>
    </body>
    </html>
  `;

  // Criar um iframe oculto para imprimir
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    
    // Aguardar o carregamento e imprimir
    iframe.onload = () => {
      iframe.contentWindow?.print();
      // Remover o iframe após um tempo
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
  }
};
