import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

const SubscriptionBanner = () => {
  const { profile, role } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.hostel_id || role === 'super_admin') return;
    (async () => {
      const { data } = await supabase
        .from('subscriptions' as any)
        .select('end_date, status')
        .eq('hostel_id', profile.hostel_id)
        .eq('status', 'active')
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const d = data as any;
        const today = new Date();
        const end = new Date(d.end_date);
        const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        setEndDate(d.end_date);
        setDaysLeft(diff);
      }
    })();
  }, [profile?.hostel_id, role]);

  if (daysLeft === null || daysLeft > 3) return null;

  const expired = daysLeft < 0;
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${expired ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400'}`}>
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold">
          {expired
            ? 'Subscription expired'
            : `Subscription ending in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
        </p>
        <p className="opacity-80">
          {expired
            ? 'Your hostel subscription has ended. Members can no longer log in. Contact the super admin to renew.'
            : `Your hostel subscription ends on ${endDate}. Please renew to avoid service interruption.`}
        </p>
      </div>
    </div>
  );
};

export default SubscriptionBanner;
