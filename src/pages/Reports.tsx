import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import BalanceIndicator from '@/components/dashboard/BalanceIndicator';
import { Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Reports = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[]>([]);
  const [mealRate, setMealRate] = useState(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [mealsRes, paymentsRes, expensesRes, profilesRes] = await Promise.all([
        supabase.from('meals').select('*').gte('date', `${monthYear}-01`).lte('date', `${monthYear}-31`),
        supabase.from('payments').select('*').eq('month_year', monthYear),
        supabase.from('expenses').select('*').eq('month_year', monthYear),
        supabase.from('profiles').select('id, full_name'),
      ]);

      const meals = mealsRes.data || [];
      const payments = paymentsRes.data || [];
      const expenses = expensesRes.data || [];
      const profiles = profilesRes.data || [];

      const totalBazar = expenses.filter(e => e.category === 'bazar').reduce((s, e) => s + Number(e.amount), 0);
      const allMeals = meals.reduce((s, m) => s + (m.lunch as number || 0) + (m.dinner as number || 0), 0);
      const rate = allMeals > 0 ? Math.round(totalBazar / allMeals) : 0;
      setMealRate(rate);

      const data = profiles.map(p => {
        const pMeals = meals.filter(m => m.user_id === p.id);
        const mealCount = pMeals.reduce((s, m) => s + (m.lunch as number || 0) + (m.dinner as number || 0), 0);
        const cost = mealCount * rate;
        const mealPaid = payments.filter(pm => pm.user_id === p.id && pm.type === 'meal').reduce((s, pm) => s + Number(pm.amount), 0);
        const utilityPaid = payments.filter(pm => pm.user_id === p.id && pm.type === 'utility').reduce((s, pm) => s + Number(pm.amount), 0);
        return { name: p.full_name, meals: mealCount, cost, mealPaid, utilityPaid, balance: cost - mealPaid };
      });
      setReportData(data);
      setLoading(false);
    };
    load();
  }, [monthYear]);

  const totalMeals = reportData.reduce((s, m) => s + m.meals, 0);
  const totalCost = reportData.reduce((s, m) => s + m.cost, 0);
  const totalPaid = reportData.reduce((s, m) => s + m.mealPaid + m.utilityPaid, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">Monthly summaries & data</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{monthName}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{totalMeals}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Meals</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{mealRate > 0 ? `৳${mealRate}` : '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Meal Rate</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">৳{totalCost.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Cost</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">৳{totalPaid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Collected</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Member Report</h3>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Meals</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">Cost</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Paid</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((m, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                      <td className="text-center px-3 py-3 text-muted-foreground">{m.meals}</td>
                      <td className="text-right px-3 py-3 text-muted-foreground hidden sm:table-cell">৳{m.cost.toLocaleString()}</td>
                      <td className="text-right px-3 py-3 text-muted-foreground">৳{(m.mealPaid + m.utilityPaid).toLocaleString()}</td>
                      <td className="text-right px-4 py-3"><BalanceIndicator amount={m.balance} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
                {reportData.length > 0 && (
                  <tfoot>
                    <tr className="bg-muted/30 font-semibold">
                      <td className="px-4 py-3 text-foreground">Total</td>
                      <td className="text-center px-3 py-3 text-foreground">{totalMeals}</td>
                      <td className="text-right px-3 py-3 text-foreground hidden sm:table-cell">৳{totalCost.toLocaleString()}</td>
                      <td className="text-right px-3 py-3 text-foreground">৳{totalPaid.toLocaleString()}</td>
                      <td className="text-right px-4 py-3"><BalanceIndicator amount={totalCost - totalPaid} size="sm" /></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Reports;
