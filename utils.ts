
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const MONTHS_BR = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const calculateTotalExpenses = (exp: any): number => {
  if (!exp) return 0;
  return Number(exp.inter || 0) + 
         Number(exp.nubank || 0) + 
         Number(exp.mPago || 0) + 
         Number(exp.agua || 0) + 
         Number(exp.energia || 0) + 
         Number(exp.outros || 0) + 
         Number(exp.pix || 0);
};

export const calculateTotalIncome = (inc: any): number => {
  if (!inc) return 0;
  return Number(inc.salario || 0) + 
         Number(inc.bonus || 0) + 
         Number(inc.outros || 0) + 
         Number(inc.recargaPay || 0);
};

export const getNextMonthSalary = (currentMonthName: string, allMonths: any[]): number => {
  const currentIdx = MONTHS_BR.indexOf(currentMonthName);
  if (currentIdx === -1) return 0;
  
  const nextIdx = (currentIdx + 1) % 12;
  const nextMonthName = MONTHS_BR[nextIdx];
  
  const nextMonthData = allMonths.find(m => m.month === nextMonthName);
  return nextMonthData ? Number(nextMonthData.income.salario || 0) : 0;
};
