
export enum VehicleType {
  CAR = 'Carro',
  MOTORCYCLE = 'Moto'
}

export enum VehicleCategory {
  MAINTENANCE = 'Manutenção',
  FUEL = 'Combustível'
}

export interface MonthlyExpense {
  inter: number;
  nubank: number;
  mPago: number;
  agua: number;
  energia: number;
  outros: number;
  pix: number;
}

export interface MonthlyIncome {
  salario: number;
  bonus: number;
  outros: number;
  recargaPay: number;
}

export interface MonthData {
  id: string;
  month: string;
  year: number;
  expenses: MonthlyExpense;
  income: MonthlyIncome;
}

export interface Loan {
  id: string;
  description: string;
  totalValue: number;
  installments: number;
  paidInstallments: number;
  installmentValue: number;
  interestMonthly: number;
}

export interface TripExpense {
  id: string;
  destination: string;
  month: string;
  carRental: number;
  fuel: number;
  food: number;
  others: number;
  creditCard: number;
  pix: number;
}

export interface VehicleExpense {
  id: string;
  type: VehicleType;
  category: VehicleCategory;
  description: string;
  value: number;
  month: string;
}

export interface SavingsTransaction {
  id: string;
  type: 'entrada' | 'retirada' | 'rendimento';
  value: number;
  month: string;
  description: string;
}

export interface CategorizedExpense {
  id: string;
  category: string;
  value: number;
  month: string;
  description: string;
}

export interface AppState {
  months: MonthData[];
  loans: Loan[];
  trips: TripExpense[];
  vehicleExpenses: VehicleExpense[];
  savings: SavingsTransaction[];
  categorizedExpenses: CategorizedExpense[];
}
