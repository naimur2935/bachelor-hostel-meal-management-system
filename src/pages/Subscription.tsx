import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { initializePaddle, getPaddlePriceId } from '@/lib/paddle';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { toast } from 'sonner';
import { CheckCircle2, Calendar, CreditCard, Sparkles } from 'lucide-react';

type Sub = {
  id: string;
  plan: string;
  status: string;
  start_date: string;
  end_date: string;
  amount: number | null;
  created_at: string;
};

const PLANS = [
  { id: 'hostel_monthly', name: 'Monthly', price: 20, interval: 'month', perks: ['Unlimited members', 'Meal tracking', 'Reports'] },
  { id: 'hostel_yearly', name: 'Yearly', price: 200, interval: 'year', perks: ['Everything in Monthly', 'Save $40/year', 'Priority support'], highlight: true },
];

const Subscription = () => {
  const { profile, user } = useAuth();
  const [history, setHistory] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const load = async () => {
    if (!profile?.hostel_id) return;
    const { data } = await supabase
      .from('subscriptions' as any)
      .select('*')
      .eq('hostel_id', profile.hostel_id)
      .order('created_at', { ascending: false });
    setHistory((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile?.hostel_id]);

  const active = history.find(s => s.status === 'active' && new Date(s.end_date) >= new Date());

  const handleCheckout = async (priceId: string) => {
    if (!profile?.hostel_id) return;
    setPaying(priceId);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(priceId);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: user?.email ? { email: user.email } : undefined,
        customData: { hostelId: profile.hostel_id, userId: user?.id || '' },
        settings: {
          displayMode: 'overlay',
          successUrl: `${window.location.origin}/subscription?status=success`,
          allowLogout: false,
          variant: 'one-page',
        },
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to open checkout');
    } finally {
      setPaying(null);
    }
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('status') === 'success') {
      toast.success('Payment successful! Your subscription will activate shortly.');
      setTimeout(load, 3000);
    }
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="text-muted-foreground mt-1">Manage your hostel subscription and view payment history</p>
        </div>

        <PaymentTestModeBanner />

        {active && (
          <Card className="p-6 border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">Active subscription</h3>
                  <Badge variant="secondary" className="capitalize">{active.plan}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Renews on {new Date(active.end_date).toLocaleDateString()} · ${Number(active.amount || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4">Choose a plan</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {PLANS.map(p => (
              <Card key={p.id} className={`p-6 relative ${p.highlight ? 'border-primary shadow-md' : ''}`}>
                {p.highlight && (
                  <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Best value
                  </div>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${p.price}</span>
                  <span className="text-muted-foreground">/{p.interval}</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.perks.map(perk => (
                    <li key={perk} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-6"
                  onClick={() => handleCheckout(p.id)}
                  disabled={paying === p.id}
                  variant={p.highlight ? 'default' : 'outline'}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {paying === p.id ? 'Opening checkout…' : active ? 'Renew / switch plan' : 'Subscribe'}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Payment history</h2>
          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No subscription payments yet.</div>
            ) : (
              <div className="divide-y">
                {history.map(s => (
                  <div key={s.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{s.plan} plan</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.start_date).toLocaleDateString()} → {new Date(s.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">${Number(s.amount || 0).toFixed(2)}</span>
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="capitalize">{s.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Subscription;
