import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Plus, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';

const Payments = () => {
  const { user, role, profile } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const fetchData = async () => {
    setLoading(true);
    const [paymentsRes, profilesRes] = await Promise.all([
      supabase.from('payments').select('*').order('date', { ascending: false }),
      supabase.from('profiles').select('id, full_name'),
    ]);
    if (!paymentsRes.error) setPayments(paymentsRes.data || []);
    if (!profilesRes.error) setProfiles(profilesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getMemberName = (userId: string) => profiles.find(p => p.id === userId)?.full_name || 'Unknown';

  const handleSubmit = async () => {
    if (!selectedMember || !amount || !type || !user) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('payments').insert({
      user_id: selectedMember,
      amount: parseFloat(amount),
      type,
      month_year: monthYear,
      collected_by: user.id,
      hostel_id: profile?.hostel_id as string,
    });
    if (error) {
      toast({ title: 'Error', description: 'Failed to record payment', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Payment recorded' });
      setDialogOpen(false);
      setSelectedMember(''); setAmount(''); setType('');
      fetchData();
    }
    setSubmitting(false);
  };

  const mealPayments = payments.filter(p => p.type === 'meal');
  const utilityPayments = payments.filter(p => p.type === 'utility');
  const totalMeal = mealPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalUtility = utilityPayments.reduce((s, p) => s + Number(p.amount), 0);

  const PaymentTable = ({ items }: { items: any[] }) => (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No payments found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Collected By</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{getMemberName(p.user_id)}</td>
                  <td className="text-right px-4 py-3 font-mono font-medium text-foreground">৳{Number(p.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.date}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{getMemberName(p.collected_by)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payments</h1>
            <p className="text-muted-foreground mt-1">Manage meal & utility payments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Record Payment</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Member</Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meal">Meal</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Meal Collected</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">৳{totalMeal.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Utility Collected</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">৳{totalUtility.toLocaleString()}</p>
          </div>
          <div className="stat-card col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-warning" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">৳{(totalMeal + totalUtility).toLocaleString()}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="meal">Meal</TabsTrigger>
              <TabsTrigger value="utility">Utility</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4"><PaymentTable items={payments} /></TabsContent>
            <TabsContent value="meal" className="mt-4"><PaymentTable items={mealPayments} /></TabsContent>
            <TabsContent value="utility" className="mt-4"><PaymentTable items={utilityPayments} /></TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default Payments;
