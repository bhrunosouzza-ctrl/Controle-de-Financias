
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  Table as TableIcon, 
  CreditCard, 
  Plane, 
  Car, 
  PiggyBank, 
  Plus, 
  Download, 
  Upload, 
  Sun, 
  Moon,
  ChevronRight,
  X,
  Trash2,
  FileSpreadsheet,
  Fuel,
  Wrench,
  FileText,
  Tag,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  MonthData, 
  Loan, 
  TripExpense, 
  VehicleExpense, 
  SavingsTransaction, 
  AppState, 
  VehicleType,
  VehicleCategory,
  CategorizedExpense
} from './types';
import { 
  formatCurrency, 
  MONTHS_BR, 
  calculateTotalExpenses, 
  calculateTotalIncome,
  getNextMonthSalary
} from './utils';

const CATEGORIES = [
  'Alimentação',
  'Saúde',
  'Lazer',
  'Educação',
  'Transporte',
  'Vestuário',
  'Presentes',
  'Assinaturas',
  'Outros'
];

const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': '#fb923c',
  'Saúde': '#f87171',
  'Lazer': '#c084fc',
  'Educação': '#60a5fa',
  'Transporte': '#4ade80',
  'Vestuário': '#f472b6',
  'Presentes': '#fbbf24',
  'Assinaturas': '#2dd4bf',
  'Outros': '#94a3b8'
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b dark:border-slate-700">
          <h2 className="text-xl font-bold dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 dark:text-slate-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
      active 
        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    {icon}
    <span className="hidden md:inline">{label}</span>
  </button>
);

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm ${className}`}>
    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">{title}</h3>
    {children}
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monthly' | 'categories' | 'loans' | 'travel' | 'vehicle' | 'savings'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  
  const [data, setData] = useState<AppState>({
    months: [],
    loans: [],
    trips: [],
    vehicleExpenses: [],
    savings: [],
    categorizedExpenses: []
  });

  const selectedMonth = useMemo(() => 
    data.months.find(m => m.id === selectedMonthId) || null, 
    [data.months, selectedMonthId]
  );

  useEffect(() => {
    const saved = localStorage.getItem('finance_app_data_v11');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed);
      } catch (e) { console.error("Erro ao carregar dados:", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_app_data_v11', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const stats = useMemo(() => {
    const vehicle = {
      car: { fuel: 0, maintenance: 0 },
      moto: { fuel: 0, maintenance: 0 }
    };
    data.vehicleExpenses.forEach(exp => {
      const type = exp.type === VehicleType.CAR ? 'car' : 'moto';
      const cat = exp.category === VehicleCategory.FUEL ? 'fuel' : 'maintenance';
      vehicle[type][cat] += exp.value;
    });

    const loans = {
      paid: data.loans.reduce((acc, l) => acc + (l.paidInstallments * l.installmentValue), 0),
      remaining: data.loans.reduce((acc, l) => acc + ((l.installments - l.paidInstallments) * l.installmentValue), 0)
    };

    const savings = {
      total: data.savings.reduce((acc, s) => {
        if (s.type === 'entrada' || s.type === 'rendimento') return acc + s.value;
        return acc - s.value;
      }, 0),
      earnings: data.savings.reduce((acc, s) => s.type === 'rendimento' ? acc + s.value : acc, 0)
    };

    const travel = data.trips.reduce((acc, t) => acc + t.carRental + t.fuel + t.food + t.others + t.creditCard + t.pix, 0);
    const catExpenses = data.categorizedExpenses.reduce((acc, c) => acc + c.value, 0);

    return { vehicle, loans, savings, travel, catExpenses };
  }, [data]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(14, 165, 233); 
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Relatório Financeiro Consolidado', 15, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, 30);
    doc.text('FinanceMaster Pro', pageWidth - 50, 30);

    let currentY = 50;

    // Seção 1: Resumo Geral
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('1. Resumo Executivo', 15, currentY);
    currentY += 10;

    autoTable(doc, {
      startY: currentY,
      head: [['Categoria', 'Valor Total']],
      body: [
        ['Patrimônio na Poupança', formatCurrency(stats.savings.total)],
        ['Saldo Devedor de Empréstimos', formatCurrency(stats.loans.remaining)],
        ['Gastos Variáveis por Categoria', formatCurrency(stats.catExpenses)],
        ['Investimento em Viagens', formatCurrency(stats.travel)],
        ['Gastos Totais com Veículos', formatCurrency(stats.vehicle.car.fuel + stats.vehicle.car.maintenance + stats.vehicle.moto.fuel + stats.vehicle.moto.maintenance)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233] }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Seção 2: Controle Mensal
    doc.setFontSize(16);
    doc.text('2. Controle Mensal Detalhado', 15, currentY);
    currentY += 10;

    const monthlyBody = data.months.map(m => {
      const fixedExp = calculateTotalExpenses(m.expenses);
      const catExp = data.categorizedExpenses.filter(c => c.month === m.month).reduce((acc, curr) => acc + curr.value, 0);
      const totalExp = fixedExp + catExp;
      const totalInc = calculateTotalIncome(m.income);
      return [
        m.month,
        formatCurrency(totalExp),
        formatCurrency(totalInc),
        formatCurrency(totalInc - totalExp)
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Mês', 'Total Despesas', 'Total Receitas', 'Balanço']],
      body: monthlyBody,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233] }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Seção 3: Gastos por Categoria
    if (currentY > 200) { doc.addPage(); currentY = 20; }
    doc.setFontSize(16);
    doc.text('3. Gastos por Categoria', 15, currentY);
    currentY += 10;

    const catBody = data.categorizedExpenses.map(c => [
      c.category,
      c.month,
      c.description,
      formatCurrency(c.value)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Categoria', 'Mês', 'Descrição', 'Valor']],
      body: catBody,
      theme: 'striped',
      headStyles: { fillColor: [168, 85, 247] } // Purple 500
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Rodapé em todas as páginas
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save('relatorio_financeiro_completo.pdf');
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const wb = XLSX.read(dataBuffer, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws);
        
        const importedMonths: MonthData[] = json.map((row: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          month: row.Mes || row.Mês || MONTHS_BR[0],
          year: row.Ano || new Date().getFullYear(),
          expenses: {
            inter: Number(row.Inter) || 0,
            nubank: Number(row.Nubank) || 0,
            mPago: Number(row.MPago) || 0,
            agua: Number(row.Agua) || 0,
            energia: Number(row.Energia) || 0,
            outros: Number(row.Outros_Gastos) || 0,
            pix: Number(row.Pix) || 0,
          },
          income: {
            salario: Number(row.Salario || row.Salário) || 0,
            bonus: Number(row.Bonus || row.Bônus) || 0,
            outros: Number(row.Outros_Ganhos) || 0,
            recargaPay: Number(row.RecargaPay) || 0,
          }
        }));

        setData(prev => ({ ...prev, months: [...prev.months, ...importedMonths] }));
        alert(`${importedMonths.length} registros importados!`);
      } catch (err) { alert("Erro ao ler Excel."); }
    };
    reader.readAsBinaryString(file);
  };

  const handleJSONImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const importedData = JSON.parse(evt.target?.result as string);
        setData(importedData);
        alert("Backup restaurado com sucesso!");
      } catch (err) { 
        alert("Erro no arquivo JSON. Verifique se o formato é válido."); 
      }
    };
    reader.readAsText(file);
  };

  const addMonth = () => {
    const lastMonth = data.months[data.months.length - 1];
    let nextIndex = lastMonth ? (MONTHS_BR.indexOf(lastMonth.month) + 1) % 12 : new Date().getMonth();
    const monthName = MONTHS_BR[nextIndex];
    
    const newMonth: MonthData = {
      id: Math.random().toString(36).substr(2, 9),
      month: monthName,
      year: new Date().getFullYear(),
      expenses: { inter: 0, nubank: 0, mPago: 0, agua: 0, energia: 0, outros: 0, pix: 0 },
      income: { salario: 0, bonus: 0, outros: 0, recargaPay: 0 }
    };
    setData(prev => ({ ...prev, months: [...prev.months, newMonth] }));
    setSelectedMonthId(newMonth.id);
  };

  const addCategorizedExpense = () => {
    const currentMonth = data.months[data.months.length - 1]?.month || MONTHS_BR[new Date().getMonth()];
    setData(prev => ({
      ...prev,
      categorizedExpenses: [...prev.categorizedExpenses, {
        id: Math.random().toString(36).substr(2, 9),
        category: CATEGORIES[0],
        value: 0,
        month: currentMonth,
        description: "Novo gasto"
      }]
    }));
  };

  const chartData = useMemo(() => {
    return data.months.map((m) => {
      const fixedExpenses = calculateTotalExpenses(m.expenses);
      const categorizedExp = data.categorizedExpenses.filter(c => c.month === m.month).reduce((acc, curr) => acc + curr.value, 0);
      const totalExp = fixedExpenses + categorizedExp;
      const incomeTotal = calculateTotalIncome(m.income);
      return {
        name: m.month,
        gastos: totalExp,
        ganhos: incomeTotal,
        balanco: incomeTotal - totalExp
      };
    });
  }, [data.months, data.categorizedExpenses]);

  const categoryChartData = useMemo(() => {
    const totals: Record<string, number> = {};
    data.categorizedExpenses.forEach(c => {
      totals[c.category] = (totals[c.category] || 0) + c.value;
    });
    return Object.keys(totals).map(cat => ({ name: cat, value: totals[cat] }));
  }, [data.categorizedExpenses]);

  return (
    <div className="min-h-screen transition-colors duration-200 dark:bg-slate-900 bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <PiggyBank className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold dark:text-white hidden sm:block">FinanceMaster</h1>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer" title="Alternar Tema">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            
            <button onClick={exportToPDF} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer" title="Gerar Relatório PDF">
              <FileText className="w-5 h-5 text-red-500" />
            </button>

            <label className="cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400" title="Importar Excel">
              <FileSpreadsheet className="w-5 h-5" />
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleExcelImport} />
            </label>

            <label className="cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400" title="Restaurar Backup JSON">
              <Upload className="w-5 h-5" />
              <input type="file" className="hidden" accept=".json" onChange={handleJSONImport} />
            </label>

            <button onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
              a.click();
            }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer" title="Exportar Backup JSON">
              <Download className="w-5 h-5" />
            </button>

            <button onClick={() => window.confirm("ATENÇÃO: Isso apagará TODOS os dados cadastrados. Deseja prosseguir?") && setData({ months: [], loans: [], trips: [], vehicleExpenses: [], savings: [], categorizedExpenses: [] })} className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer" title="Limpar Tudo">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-24">
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 custom-scrollbar border-b dark:border-slate-800">
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard className="w-5 h-5" />} label="Painel" />
          <TabButton active={activeTab === 'monthly'} onClick={() => setActiveTab('monthly')} icon={<TableIcon className="w-5 h-5" />} label="Fixos" />
          <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Tag className="w-5 h-5" />} label="Categorias" />
          <TabButton active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} icon={<CreditCard className="w-5 h-5" />} label="Empréstimos" />
          <TabButton active={activeTab === 'travel'} onClick={() => setActiveTab('travel')} icon={<Plane className="w-5 h-5" />} label="Viagens" />
          <TabButton active={activeTab === 'vehicle'} onClick={() => setActiveTab('vehicle')} icon={<Car className="w-5 h-5" />} label="Veículos" />
          <TabButton active={activeTab === 'savings'} onClick={() => setActiveTab('savings')} icon={<PiggyBank className="w-5 h-5" />} label="Poupança" />
        </div>

        <div className="space-y-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <Card title="Patrimônio Poupança">
                    <p className="text-3xl font-black text-emerald-500">{formatCurrency(stats.savings.total)}</p>
                    <p className="text-xs text-slate-400 mt-1">Acumulado total</p>
                 </Card>
                 <Card title="Saldo Devedor">
                    <p className="text-3xl font-black text-amber-500">{formatCurrency(stats.loans.remaining)}</p>
                    <p className="text-xs text-slate-400 mt-1">Empréstimos pendentes</p>
                 </Card>
                 <Card title="Gastos Variáveis">
                    <p className="text-3xl font-black text-purple-500">{formatCurrency(stats.catExpenses)}</p>
                    <p className="text-xs text-slate-400 mt-1">Soma das categorias</p>
                 </Card>
                 <Card title="Custo Veicular">
                    <p className="text-3xl font-black text-red-500">{formatCurrency(stats.vehicle.car.fuel + stats.vehicle.car.maintenance + stats.vehicle.moto.fuel + stats.vehicle.moto.maintenance)}</p>
                    <p className="text-xs text-slate-400 mt-1">Carro + Moto</p>
                 </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Evolução Financeira Mensal" className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="name" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                      <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                      <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                      <Legend />
                      <Bar dataKey="gastos" fill="#f43f5e" name="Total Gastos" radius={[6,6,0,0]} />
                      <Bar dataKey="ganhos" fill="#10b981" name="Total Ganhos" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Distribuição por Categoria" className="h-[400px]">
                  {categoryChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 italic">Nenhum gasto categorizado.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                        <XAxis type="number" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                        <YAxis dataKey="name" type="category" width={100} stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                        <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                        <Bar dataKey="value" name="Valor">
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <Card title="Gastos Variáveis por Categoria" className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6 flex justify-between items-center">
                <p className="text-xs text-slate-500 italic">Gerencie gastos como alimentação, lazer e saúde.</p>
                <button onClick={addCategorizedExpense} className="bg-purple-500 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-purple-600 transition-all shadow-lg active:scale-95 cursor-pointer">
                  <Plus className="w-5 h-5" /> Novo Gasto
                </button>
              </div>

              <div className="overflow-x-auto border dark:border-slate-700 rounded-2xl shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Mês</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {data.categorizedExpenses.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3">
                          <select 
                            value={item.category} 
                            onChange={(e) => setData(prev => ({...prev, categorizedExpenses: prev.categorizedExpenses.map(c => c.id === item.id ? {...c, category: e.target.value} : c)}))}
                            className="bg-transparent dark:text-white outline-none font-medium p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            style={{ color: CATEGORY_COLORS[item.category] }}
                          >
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={item.month} 
                            onChange={(e) => setData(prev => ({...prev, categorizedExpenses: prev.categorizedExpenses.map(c => c.id === item.id ? {...c, month: e.target.value} : c)}))}
                            className="bg-transparent dark:text-white outline-none p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {MONTHS_BR.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={item.description} 
                            onChange={(e) => setData(prev => ({...prev, categorizedExpenses: prev.categorizedExpenses.map(c => c.id === item.id ? {...c, description: e.target.value} : c)}))}
                            className="bg-transparent dark:text-white outline-none border-b border-transparent focus:border-purple-500 w-full p-1"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            step="any"
                            value={item.value === 0 ? "" : item.value} 
                            onChange={(e) => setData(prev => ({...prev, categorizedExpenses: prev.categorizedExpenses.map(c => c.id === item.id ? {...c, value: parseFloat(e.target.value) || 0} : c)}))}
                            className="bg-transparent text-purple-600 dark:text-purple-400 font-bold outline-none w-24 p-1"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setData(prev => ({...prev, categorizedExpenses: prev.categorizedExpenses.filter(c => c.id !== item.id)}))} className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {data.categorizedExpenses.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">Nenhum gasto registrado. Clique em "Novo Gasto" para começar.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'monthly' && (
            <Card title="Controle Mensal">
              <div className="mb-4 flex justify-between items-center">
                <p className="text-xs text-slate-500 italic">* Clique em um mês para abrir os detalhes.</p>
                <button onClick={addMonth} className="bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-600 transition-all shadow-md cursor-pointer">
                  <Plus className="w-4 h-4" /> Novo Mês
                </button>
              </div>
              <div className="overflow-x-auto border dark:border-slate-700 rounded-xl shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Mês</th>
                      <th className="px-4 py-3">Gastos Totais</th>
                      <th className="px-4 py-3">Ganhos Totais</th>
                      <th className="px-4 py-3">Balanço Mensal</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {data.months.map((m) => {
                      const fixedExp = calculateTotalExpenses(m.expenses);
                      const catExp = data.categorizedExpenses.filter(c => c.month === m.month).reduce((acc, curr) => acc + curr.value, 0);
                      const totalExp = fixedExp + catExp;
                      const totalInc = calculateTotalIncome(m.income);
                      const balance = totalInc - totalExp;
                      
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group" onClick={() => setSelectedMonthId(m.id)}>
                          <td className="px-4 py-4 font-semibold dark:text-white">{m.month}</td>
                          <td className="px-4 py-4 text-red-500 font-medium">{formatCurrency(totalExp)}</td>
                          <td className="px-4 py-4 text-emerald-500 font-medium">{formatCurrency(totalInc)}</td>
                          <td className={`px-4 py-4 font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {formatCurrency(balance)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end">
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'loans' && (
            <Card title="Empréstimos Ativos">
              <div className="mb-4"><button onClick={() => setData(prev => ({...prev, loans: [...prev.loans, { id: Math.random().toString(36).substr(2,9), description: "Novo Empréstimo", totalValue: 0, installments: 1, paidInstallments: 0, installmentValue: 0, interestMonthly: 0 }]}))} className="bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-primary-600 transition-all shadow-md"><Plus className="w-4 h-4" /> Novo Empréstimo</button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.loans.map(loan => (
                  <div key={loan.id} className="p-5 border dark:border-slate-700 rounded-2xl space-y-4 relative group bg-white dark:bg-slate-800 shadow-sm">
                    <button onClick={(e) => { e.stopPropagation(); setData(prev => ({...prev, loans: prev.loans.filter(l => l.id !== loan.id)})); }} className="absolute top-3 right-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4"/></button>
                    <input type="text" value={loan.description} onChange={(e) => setData(prev => ({...prev, loans: prev.loans.map(l => l.id === loan.id ? {...l, description: e.target.value} : l)}))} className="bg-transparent font-bold w-full dark:text-white outline-none border-b border-transparent focus:border-primary-500 text-lg" />
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1"><label className="text-slate-400 uppercase font-semibold tracking-tighter">Valor Total</label><input type="number" step="any" value={loan.totalValue === 0 ? "" : loan.totalValue} onChange={(e) => setData(prev => ({...prev, loans: prev.loans.map(l => l.id === loan.id ? {...l, totalValue: parseFloat(e.target.value) || 0} : l)}))} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl dark:text-white border dark:border-slate-700 outline-none focus:ring-1" /></div>
                      <div className="space-y-1"><label className="text-slate-400 uppercase font-semibold tracking-tighter">Valor Parcela</label><input type="number" step="any" value={loan.installmentValue === 0 ? "" : loan.installmentValue} onChange={(e) => setData(prev => ({...prev, loans: prev.loans.map(l => l.id === loan.id ? {...l, installmentValue: parseFloat(e.target.value) || 0} : l)}))} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl dark:text-white border dark:border-slate-700 outline-none focus:ring-1" /></div>
                      <div className="space-y-1"><label className="text-slate-400 uppercase font-semibold tracking-tighter">Total Parcelas</label><input type="number" value={loan.installments === 0 ? "" : loan.installments} onChange={(e) => setData(prev => ({...prev, loans: prev.loans.map(l => l.id === loan.id ? {...l, installments: parseInt(e.target.value) || 0} : l)}))} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl dark:text-white border dark:border-slate-700 outline-none focus:ring-1" /></div>
                      <div className="space-y-1"><label className="text-slate-400 uppercase font-semibold tracking-tighter">Pagas</label><input type="number" value={loan.paidInstallments === 0 ? "" : loan.paidInstallments} onChange={(e) => setData(prev => ({...prev, loans: prev.loans.map(l => l.id === loan.id ? {...l, paidInstallments: parseInt(e.target.value) || 0} : l)}))} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl dark:text-white border dark:border-slate-700 outline-none focus:ring-1" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'travel' && (
            <Card title="Registro de Viagens">
              <div className="mb-6"><button onClick={() => setData(prev => ({...prev, trips: [...prev.trips, { id: Math.random().toString(36).substr(2,9), destination: "Nova Viagem", month: MONTHS_BR[new Date().getMonth()], carRental: 0, fuel: 0, food: 0, others: 0, creditCard: 0, pix: 0 }] }))} className="bg-primary-500 text-white px-6 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-primary-600 transition-all active:scale-95 shadow-md"><Plus className="w-5 h-5" /> Nova Viagem</button></div>
              <div className="grid grid-cols-1 gap-6">
                {data.trips.map(trip => (
                  <div key={trip.id} className="p-6 border dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 relative group shadow-sm">
                    <button onClick={() => setData(prev => ({...prev, trips: prev.trips.filter(t => t.id !== trip.id)}))} className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-opacity cursor-pointer"><Trash2 className="w-5 h-5"/></button>
                    <div className="flex flex-wrap items-center gap-4 mb-4 border-b dark:border-slate-700 pb-4">
                      <input type="text" value={trip.destination} onChange={(e) => setData(prev => ({...prev, trips: prev.trips.map(t => t.id === trip.id ? {...t, destination: e.target.value} : t)}))} className="bg-transparent font-bold dark:text-white outline-none border-b border-transparent focus:border-primary-500 text-xl flex-1 py-1" />
                      <select value={trip.month} onChange={(e) => setData(prev => ({...prev, trips: prev.trips.map(t => t.id === trip.id ? {...t, month: e.target.value} : t)}))} className="bg-slate-100 dark:bg-slate-900 rounded-lg px-3 py-1.5 outline-none text-sm dark:text-white border dark:border-slate-700 font-medium">
                        {MONTHS_BR.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      {[
                        { label: 'Aluguel Carro', field: 'carRental' },
                        { label: 'Combustível', field: 'fuel' },
                        { label: 'Alimentação', field: 'food' },
                        { label: 'Outros', field: 'others' },
                        { label: 'Cartão', field: 'creditCard' },
                        { label: 'Pix / Dinheiro', field: 'pix' }
                      ].map(f => (
                        <div key={f.field}>
                          <label className="text-slate-400 text-[10px] uppercase font-bold tracking-tight mb-1 block">{f.label}</label>
                          <input type="number" step="any" value={(trip as any)[f.field] === 0 ? "" : (trip as any)[f.field]} onChange={(e) => setData(prev => ({...prev, trips: prev.trips.map(t => t.id === trip.id ? {...t, [f.field]: parseFloat(e.target.value) || 0} : t)}))} className="w-full p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700 dark:text-white outline-none focus:ring-1 focus:ring-primary-500 font-medium" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'vehicle' && (
            <Card title="Gastos com Veículos">
              <div className="flex gap-2 mb-4">
                <button onClick={() => setData(prev => ({...prev, vehicleExpenses: [...prev.vehicleExpenses, { id: Math.random().toString(36).substr(2, 9), type: VehicleType.CAR, category: VehicleCategory.FUEL, description: "Novo Gasto Carro", value: 0, month: MONTHS_BR[new Date().getMonth()] }] }))} className="bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-primary-600 shadow-md">
                  <Plus className="w-4 h-4" /> Gasto Carro
                </button>
                <button onClick={() => setData(prev => ({...prev, vehicleExpenses: [...prev.vehicleExpenses, { id: Math.random().toString(36).substr(2, 9), type: VehicleType.MOTORCYCLE, category: VehicleCategory.FUEL, description: "Novo Gasto Moto", value: 0, month: MONTHS_BR[new Date().getMonth()] }] }))} className="bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-amber-600 shadow-md">
                  <Plus className="w-4 h-4" /> Gasto Moto
                </button>
              </div>
              
              <div className="overflow-x-auto border dark:border-slate-700 rounded-2xl shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Veículo</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Mês</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {data.vehicleExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3">
                           <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${exp.type === VehicleType.CAR ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                             {exp.type}
                           </span>
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={exp.category} 
                            onChange={(e) => setData(prev => ({...prev, vehicleExpenses: prev.vehicleExpenses.map(v => v.id === exp.id ? {...v, category: e.target.value as VehicleCategory} : v)}))}
                            className="bg-transparent dark:text-white outline-none"
                          >
                            {Object.values(VehicleCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={exp.month} 
                            onChange={(e) => setData(prev => ({...prev, vehicleExpenses: prev.vehicleExpenses.map(v => v.id === exp.id ? {...v, month: e.target.value} : v)}))}
                            className="bg-transparent dark:text-white outline-none"
                          >
                            {MONTHS_BR.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={exp.description} 
                            onChange={(e) => setData(prev => ({...prev, vehicleExpenses: prev.vehicleExpenses.map(v => v.id === exp.id ? {...v, description: e.target.value} : v)}))}
                            className="bg-transparent dark:text-white outline-none border-b border-transparent focus:border-primary-500 w-full"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            step="any"
                            value={exp.value === 0 ? "" : exp.value} 
                            onChange={(e) => setData(prev => ({...prev, vehicleExpenses: prev.vehicleExpenses.map(v => v.id === exp.id ? {...v, value: parseFloat(e.target.value) || 0} : v)}))}
                            className="bg-transparent text-primary-600 dark:text-primary-400 font-bold outline-none w-24"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setData(prev => ({...prev, vehicleExpenses: prev.vehicleExpenses.filter(v => v.id !== exp.id)}))} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {data.vehicleExpenses.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">Nenhum gasto veicular registrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'savings' && (
            <Card title="Controle de Poupança">
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setData(prev => ({...prev, savings: [...prev.savings, { id: Math.random().toString(36).substr(2, 9), type: 'entrada', value: 0, description: "Depósito", month: MONTHS_BR[new Date().getMonth()] }] }))} className="bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-emerald-600 shadow-md">
                  <Plus className="w-4 h-4" /> Entrada
                </button>
                <button onClick={() => setData(prev => ({...prev, savings: [...prev.savings, { id: Math.random().toString(36).substr(2, 9), type: 'retirada', value: 0, description: "Retirada", month: MONTHS_BR[new Date().getMonth()] }] }))} className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-red-600 shadow-md">
                  <Plus className="w-4 h-4" /> Retirada
                </button>
                <button onClick={() => setData(prev => ({...prev, savings: [...prev.savings, { id: Math.random().toString(36).substr(2, 9), type: 'rendimento', value: 0, description: "Rendimento", month: MONTHS_BR[new Date().getMonth()] }] }))} className="bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-primary-600 shadow-md">
                  <Plus className="w-4 h-4" /> Rendimento
                </button>
              </div>

              <div className="overflow-x-auto border dark:border-slate-700 rounded-2xl shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Mês</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {data.savings.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3">
                           <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${s.type === 'entrada' ? 'bg-emerald-100 text-emerald-600' : s.type === 'rendimento' ? 'bg-primary-100 text-primary-600' : 'bg-red-100 text-red-600'}`}>
                             {s.type}
                           </span>
                        </td>
                        <td className="px-4 py-3">
                           <select 
                            value={s.month} 
                            onChange={(e) => setData(prev => ({...prev, savings: prev.savings.map(item => item.id === s.id ? {...item, month: e.target.value} : item)}))}
                            className="bg-transparent dark:text-white outline-none"
                          >
                            {MONTHS_BR.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={s.description} 
                            onChange={(e) => setData(prev => ({...prev, savings: prev.savings.map(item => item.id === s.id ? {...item, description: e.target.value} : item)}))}
                            className="bg-transparent dark:text-white outline-none border-b border-transparent focus:border-emerald-500 w-full"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            step="any"
                            value={s.value === 0 ? "" : s.value} 
                            onChange={(e) => setData(prev => ({...prev, savings: prev.savings.map(item => item.id === s.id ? {...item, value: parseFloat(e.target.value) || 0} : item)}))}
                            className="bg-transparent font-bold outline-none w-24 text-slate-700 dark:text-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setData(prev => ({...prev, savings: prev.savings.filter(item => item.id !== s.id)}))} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {data.savings.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">Nenhuma transação registrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>

      <Modal isOpen={!!selectedMonthId} onClose={() => setSelectedMonthId(null)} title={`Detalhes: ${selectedMonth?.month || ''}`}>
        {selectedMonth && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <h4 className="font-black text-red-500 border-b-2 border-red-500/20 pb-2 flex items-center gap-2 uppercase tracking-widest text-sm">Contas Fixas (Saídas)</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(selectedMonth.expenses).map(key => (
                    <div key={key}>
                      <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{key}</label>
                      <input 
                        type="number" 
                        step="any"
                        value={(selectedMonth.expenses as any)[key] === 0 ? "" : (selectedMonth.expenses as any)[key]} 
                        onChange={(e) => setData(prev => ({...prev, months: prev.months.map(m => m.id === selectedMonth.id ? {...m, expenses: {...m.expenses, [key]: parseFloat(e.target.value) || 0}} : m)}))} 
                        className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl dark:text-white outline-none border border-slate-100 dark:border-slate-600 font-bold" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-emerald-500 border-b-2 border-emerald-500/20 pb-2 flex items-center gap-2 uppercase tracking-widest text-sm">Receitas (Entradas)</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(selectedMonth.income).map(key => (
                    <div key={key}>
                      <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{key}</label>
                      <input 
                        type="number" 
                        step="any"
                        value={(selectedMonth.income as any)[key] === 0 ? "" : (selectedMonth.income as any)[key]} 
                        onChange={(e) => setData(prev => ({...prev, months: prev.months.map(m => m.id === selectedMonth.id ? {...m, income: {...m.income, [key]: parseFloat(e.target.value) || 0}} : m)}))} 
                        className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl dark:text-white outline-none border border-slate-100 dark:border-slate-600 font-bold" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 dark:bg-black/90 rounded-3xl flex flex-wrap gap-6 justify-between items-center text-white border border-slate-800 shadow-2xl">
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Resultado Final</p>
                <p className={`text-3xl font-black ${calculateTotalIncome(selectedMonth.income) - (calculateTotalExpenses(selectedMonth.expenses) + data.categorizedExpenses.filter(c => c.month === selectedMonth.month).reduce((a, b) => a + b.value, 0)) >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
                   {formatCurrency(calculateTotalIncome(selectedMonth.income) - (calculateTotalExpenses(selectedMonth.expenses) + data.categorizedExpenses.filter(c => c.month === selectedMonth.month).reduce((a, b) => a + b.value, 0)))}
                </p>
                <p className="text-[10px] text-slate-500">* Incluindo gastos categorizados do mês.</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <footer className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t dark:border-slate-800 p-2 grid grid-cols-7 gap-1 z-40 shadow-lg">
        <button onClick={() => setActiveTab('dashboard')} className={`p-2 flex flex-col items-center cursor-pointer ${activeTab === 'dashboard' ? 'text-primary-500' : 'text-slate-400'}`}><LayoutDashboard className="w-5 h-5" /><span className="text-[8px] font-bold">Painel</span></button>
        <button onClick={() => setActiveTab('monthly')} className={`p-2 flex flex-col items-center cursor-pointer ${activeTab === 'monthly' ? 'text-primary-500' : 'text-slate-400'}`}><TableIcon className="w-5 h-5" /><span className="text-[8px] font-bold">Fixos</span></button>
        <button onClick={() => setActiveTab('categories')} className={`p-2 flex flex-col items-center cursor-pointer ${activeTab === 'categories' ? 'text-primary-500' : 'text-slate-400'}`}><Tag className="w-5 h-5" /><span className="text-[8px] font-bold">Cats</span></button>
        <button onClick={() => setActiveTab('loans')} className={`p-2 flex flex-col items-center cursor-pointer ${activeTab === 'loans' ? 'text-primary-500' : 'text-slate-400'}`}><CreditCard className="w-5 h-5" /><span className="text-[8px] font-bold">Emp.</span></button>
        <button onClick={() => setActiveTab('travel')} className={`p-2 flex flex-col items-center cursor-pointer ${activeTab === 'travel' ? 'text-primary-500' : 'text-slate-400'}`}><Plane className="w-5 h-5" /><span className="text-[8px] font-bold">Viagem</span></button>
        <button onClick={() => setActiveTab('vehicle')} className={`p-2 flex flex-col items-center cursor-pointer ${activeTab === 'vehicle' ? 'text-primary-500' : 'text-slate-400'}`}><Car className="w-5 h-5" /><span className="text-[8px] font-bold">Auto</span></button>
        <button onClick={() => setActiveTab('savings')} className={`p-2 flex flex-col items-center cursor-pointer ${activeTab === 'savings' ? 'text-primary-500' : 'text-slate-400'}`}><PiggyBank className="w-5 h-5" /><span className="text-[8px] font-bold">Poupa</span></button>
      </footer>
    </div>
  );
}
