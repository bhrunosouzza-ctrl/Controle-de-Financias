
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
  return (exp.inter || 0) + (exp.nubank || 0) + (exp.mPago || 0) + 
         (exp.agua || 0) + (exp.energia || 0) + (exp.outros || 0) + (exp.pix || 0);
};

export const calculateTotalIncome = (inc: any): number => {
  return (inc.salario || 0) + (inc.bonus || 0) + (inc.outros || 0) + (inc.recargaPay || 0);
};

export const getNextMonthSalary = (currentMonthName: string, allMonths: any[]): number => {
  const currentIdx = MONTHS_BR.indexOf(currentMonthName);
  if (currentIdx === -1) return 0;
  
  const nextIdx = (currentIdx + 1) % 12;
  const nextMonthName = MONTHS_BR[nextIdx];
  
  // Try to find the next month in the data set to get its salary
  const nextMonthData = allMonths.find(m => m.month === nextMonthName);
  return nextMonthData ? (nextMonthData.income.salario || 0) : 0;
};
