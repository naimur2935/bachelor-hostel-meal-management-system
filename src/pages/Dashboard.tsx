import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/dashboard/StatCard';
import BalanceIndicator from '@/components/dashboard/BalanceIndicator';
import { UtensilsCrossed, DollarSign, TrendingUp, Users, CalendarDays, Wallet, Loader2 } from 'lucide-react';
import SubscriptionBanner from '@/components/SubscriptionBanner';

const Dashboard = () => {
  const { profile, role, user } = useAuth();
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMeals: 0, mealCost: 0, mealPaid: 0, utilityPaid: 0, balance: 0,
    totalMembers: 0, totalBazar: 0, mealRate: 0,
  });
  const [memberSummary, setMemberSummary] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // Fetch all needed data in parallel
      const [mealsRes, paymentsRes, expensesRes, profilesRes] = await Promise.all([
        supabase.from('meals').select('*').gte('date', `${monthYear}-01`).lte('date', `${monthYear}-31`),
        supabase.from('payments').select('*').eq('month_year', monthYear),
        supabase.from('expenses').select('*').eq('month_year', monthYear),
        supabase.from('profiles').select('*'),
      ]);

      const meals = mealsRes.data || [];
      const payments = paymentsRes.data || [];
      const expenses = expensesRes.data || [];
      const profiles = profilesRes.data || [];

      // Total bazar cost
      const totalBazar = expenses.filter(e => e.category === 'bazar').reduce((s, e) => s + Number(e.amount), 0);

      // All meals count
      const allMealsTotal = meals.reduce((s, m) => s + (m.lunch as number || 0) + (m.dinner as number || 0), 0);
      const mealRate = allMealsTotal > 0 ? Math.round(totalBazar / allMealsTotal) : 0;

      // Current user meals
      const myMeals = meals.filter(m => m.user_id === user.id);
      const myMealCount = myMeals.reduce((s, m) => s + (m.lunch as number || 0) + (m.dinner as number || 0), 0);
      const myMealCost = myMealCount * mealRate;

      // Current user payments
      const myPayments = payments.filter(p => p.user_id === user.id);
      const myMealPaid = myPayments.filter(p => p.type === 'meal').reduce((s, p) => s + Number(p.amount), 0);
      const myUtilityPaid = myPayments.filter(p => p.type === 'utility').reduce((s, p) => s + Number(p.amount), 0);

      setStats({
        totalMeals: myMealCount,
        mealCost: myMealCost,
        mealPaid: myMealPaid,
        utilityPaid: myUtilityPaid,
        balance: myMealCost - myMealPaid,
        totalMembers: profiles.length,
        totalBazar,
        mealRate,
      });

      // Build member summary for admin/manager
      if (role === 'admin' || role === 'manager') {
        const summary = profiles.map(p => {
          const pMeals = meals.filter(m => m.user_id === p.id);
          const mealCount = pMeals.reduce((s, m) => s + (m.lunch as number || 0) + (m.dinner as number || 0), 0);
          const cost = mealCount * mealRate;
          const paid = payments.filter(pm => pm.user_id === p.id).reduce((s, pm) => s + Number(pm.amount), 0);
          return { name: p.full_name, meals: mealCount, cost, paid, balance: cost - paid };
        });
        setMemberSummary(summary);
      }

      setLoading(false);
    };
    load();
  }, [user, role, monthYear]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <SubscriptionBanner />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {role === 'admin' ? '👑 Admin Dashboard' : role === 'manager' ? '🧑‍💼 Manager Dashboard' : '👤 My Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome, {profile?.full_name?.split(' ')[0] || 'User'} — {monthName} Overview
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard title="Meal Rate" value={stats.mealRate > 0 ? `৳${stats.mealRate}` : '—'} subtitle="Per meal this month" icon={<TrendingUp className="w-5 h-5 text-primary" />} />
          <StatCard title="Your Meals" value={stats.totalMeals} subtitle={monthName} icon={<UtensilsCrossed className="w-5 h-5 text-primary" />} />
          <StatCard title="Meal Cost" value={`৳${stats.mealCost.toLocaleString()}`} subtitle={`${stats.totalMeals} × ৳${stats.mealRate}`} icon={<DollarSign className="w-5 h-5 text-primary" />} />
          <StatCard title="Meal Paid" value={`৳${stats.mealPaid.toLocaleString()}`} icon={<Wallet className="w-5 h-5 text-primary" />} />
          {(role === 'admin' || role === 'manager') && (
            <>
              <StatCard title="Total Members" value={stats.totalMembers} icon={<Users className="w-5 h-5 text-primary" />} />
              <StatCard title="Total Bazar Cost" value={`৳${stats.totalBazar.toLocaleString()}`} icon={<DollarSign className="w-5 h-5 text-primary" />} />
            </>
          )}
        </div>

        <div className="stat-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Your Balance</h3>
              <p className="text-sm text-muted-foreground">
                Meal: ৳{stats.mealCost.toLocaleString()} - Paid: ৳{stats.mealPaid.toLocaleString()} - Utility: ৳{stats.utilityPaid.toLocaleString()}
              </p>
            </div>
            <BalanceIndicator amount={stats.balance} size="lg" />
          </div>
        </div>

        {(role === 'admin' || role === 'manager') && memberSummary.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Member Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Meals</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Cost</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Paid</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {memberSummary.map((m, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{m.name}</td>
                      <td className="text-center px-3 py-3 text-muted-foreground">{m.meals}</td>
                      <td className="text-right px-3 py-3 text-muted-foreground">৳{m.cost.toLocaleString()}</td>
                      <td className="text-right px-3 py-3 text-muted-foreground">৳{m.paid.toLocaleString()}</td>
                      <td className="text-right px-5 py-3"><BalanceIndicator amount={m.balance} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
