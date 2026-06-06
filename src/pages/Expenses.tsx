import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Zap, Flame, Home, Loader2 } from 'lucide-react';

const categoryIcons: Record<string, any> = {
  bazar: ShoppingCart, electricity: Zap, gas: Flame, rent: Home, extra: Plus,
};
const categoryColors: Record<string, string> = {
  bazar: 'bg-primary/10 text-primary', electricity: 'bg-warning/10 text-warning',
  gas: 'bg-destructive/10 text-destructive', rent: 'bg-accent text-accent-foreground',
  extra: 'bg-muted text-muted-foreground',
};

const Expenses = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    if (!error) setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleSubmit = async () => {
    if (!category || !amount || !user) {
      toast({ title: 'Error', description: 'Category and amount are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('expenses').insert({
      category,
      amount: parseFloat(amount),
      description: description || null,
      date: new Date().toISOString().split('T')[0],
      month_year: monthYear,
      added_by: user.id,
      hostel_id: profile?.hostel_id as string,
    });
    if (error) {
      toast({ title: 'Error', description: 'Failed to save expense', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Expense added' });
      setDialogOpen(false);
      setCategory(''); setAmount(''); setDescription('');
      fetchExpenses();
    }
    setSubmitting(false);
  };

  const totalBazar = expenses.filter(e => e.category === 'bazar').reduce((s, e) => s + Number(e.amount), 0);
  const totalUtility = expenses.filter(e => e.category !== 'bazar').reduce((s, e) => s + Number(e.amount), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Expenses</h1>
            <p className="text-muted-foreground mt-1">Track bazar & utility costs</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bazar">Bazar</SelectItem>
                        <SelectItem value="gas">Gas</SelectItem>
                        <SelectItem value="electricity">Electricity</SelectItem>
                        <SelectItem value="rent">Rent</SelectItem>
                        <SelectItem value="extra">Extra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="What was purchased?" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Total Bazar</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">৳{totalBazar.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Total Utility</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">৳{totalUtility.toLocaleString()}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : expenses.length === 0 ? (
          <div className="stat-card text-center py-8">
            <p className="text-muted-foreground">No expenses recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map(exp => {
              const Icon = categoryIcons[exp.category] || Plus;
              const colorClass = categoryColors[exp.category] || categoryColors.extra;
              return (
                <div key={exp.id} className="stat-card flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg shrink-0 ${colorClass}`}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{exp.description || exp.category}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="capitalize">{exp.category}</span>
                      <span>•</span>
                      <span>{exp.date}</span>
                    </div>
                  </div>
                  <p className="font-mono font-semibold text-foreground shrink-0">৳{Number(exp.amount).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Expenses;
