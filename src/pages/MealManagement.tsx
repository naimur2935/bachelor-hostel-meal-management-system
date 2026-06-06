import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Sun, Moon, ChevronLeft, ChevronRight, Clock, Plus, Minus, Loader2, Users, Settings } from 'lucide-react';

const MealManagement = () => {
  const { role, user, profile } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meals, setMeals] = useState<Record<string, { id?: string; lunch: number; dinner: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [deadlineTime, setDeadlineTime] = useState<string>('12:00');
  const [deadlineDay, setDeadlineDay] = useState<'previous' | 'current'>('previous');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const today = new Date();

  const isAdminOrManager = role === 'admin' || role === 'manager';
  const isAdmin = role === 'admin';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Fetch hostel deadline settings
  useEffect(() => {
    const loadHostel = async () => {
      if (!profile?.hostel_id) return;
      const { data } = await supabase.from('hostels' as any)
        .select('meal_deadline_time, meal_deadline_day')
        .eq('id', profile.hostel_id).single();
      if (data) {
        setDeadlineTime(((data as any).meal_deadline_time || '12:00:00').slice(0, 5));
        setDeadlineDay(((data as any).meal_deadline_day as any) || 'previous');
      }
    };
    loadHostel();
  }, [profile?.hostel_id]);

  // Fetch members for admin/manager (only own hostel, exclude super_admin)
  useEffect(() => {
    if (!isAdminOrManager) {
      if (user) setSelectedMember(user.id);
      return;
    }
    const load = async () => {
      let q = supabase.from('profiles' as any).select('id, full_name, email, status, hostel_id, role').eq('status', 'active').neq('role', 'super_admin').order('full_name');
      if (profile?.hostel_id) q = q.eq('hostel_id', profile.hostel_id);
      const { data } = await q;
      setMembers(data || []);
      if (user) setSelectedMember(user.id);
    };
    load();
  }, [isAdminOrManager, user, profile?.hostel_id]);

  const fetchMeals = useCallback(async () => {
    if (!selectedMember) return;
    setLoading(true);
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('meals').select('*')
      .eq('user_id', selectedMember)
      .gte('date', startDate).lte('date', endDate);
    if (error) {
      toast({ title: 'Error', description: 'Failed to load meals', variant: 'destructive' });
    } else {
      const map: Record<string, { id: string; lunch: number; dinner: number }> = {};
      data?.forEach(m => {
        const day = new Date(m.date).getDate().toString();
        map[day] = { id: m.id, lunch: m.lunch as number, dinner: m.dinner as number };
      });
      setMeals(map);
    }
    setLoading(false);
  }, [selectedMember, year, month, daysInMonth, toast]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  // Deadline based on hostel settings
  const isEditable = (day: number) => {
    if (isAdminOrManager) return true;
    const [h, m] = deadlineTime.split(':').map(Number);
    // 'previous' => deadline is the day BEFORE meal date; 'current' => same day as meal date
    const offset = deadlineDay === 'previous' ? 1 : 0;
    const deadline = new Date(year, month, day - offset, h, m, 0, 0);
    return new Date() < deadline;
  };

  const saveMeal = async (day: number, type: 'lunch' | 'dinner', newValue: number) => {
    if (!selectedMember) return;
    const key = day.toString();
    const current = meals[key] || { lunch: 0, dinner: 0 };
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSaving(`${day}-${type}`);
    const updated = { ...current, [type]: newValue };

    if (current.id) {
      const { error } = await supabase.from('meals').update({ [type]: newValue }).eq('id', current.id);
      if (error) { toast({ title: 'Error', description: 'Failed to save meal', variant: 'destructive' }); setSaving(null); return; }
    } else {
      const { data, error } = await supabase.from('meals').insert({
        user_id: selectedMember, date: dateStr, lunch: updated.lunch, dinner: updated.dinner,
        hostel_id: profile?.hostel_id as string,
      }).select().single();
      if (error) { toast({ title: 'Error', description: 'Failed to save meal', variant: 'destructive' }); setSaving(null); return; }
      updated.id = data.id;
    }
    setMeals(prev => ({ ...prev, [key]: { ...prev[key], ...updated } }));
    setSaving(null);
  };

  const changeMealCount = (day: number, type: 'lunch' | 'dinner', delta: number) => {
    if (!isEditable(day) && !isAdminOrManager) return;
    const current = meals[day.toString()]?.[type] ?? 0;
    const newVal = Math.max(0, Math.min(10, current + delta));
    saveMeal(day, type, newVal);
  };

  const setMealCount = (day: number, type: 'lunch' | 'dinner', value: number) => {
    if (!isEditable(day) && !isAdminOrManager) return;
    saveMeal(day, type, Math.max(0, Math.min(10, value)));
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const totalLunch = Object.values(meals).reduce((s, m) => s + (m.lunch || 0), 0);
  const totalDinner = Object.values(meals).reduce((s, m) => s + (m.dinner || 0), 0);
  const totalMeals = totalLunch + totalDinner;

  const selectedName = members.find(m => m.id === selectedMember)?.full_name || 'You';

  const deadlineLabel = `${deadlineDay === 'previous' ? 'previous' : 'same'} day at ${deadlineTime}`;

  const saveDeadline = async () => {
    if (!profile?.hostel_id) return;
    setSavingSettings(true);
    const { error } = await supabase.from('hostels' as any)
      .update({ meal_deadline_time: deadlineTime + ':00', meal_deadline_day: deadlineDay })
      .eq('id', profile.hostel_id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deadline updated' }); setSettingsOpen(false); }
    setSavingSettings(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Meal Management</h1>
            <p className="text-muted-foreground mt-1">
              {isAdminOrManager ? `Managing meals for ${selectedName}` : 'Set your daily meal count'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />Deadline
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{monthName}</span>
            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        {isAdminOrManager && members.length > 0 && (
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="w-full max-w-xs"><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {members.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="stat-card text-center"><p className="text-2xl sm:text-3xl font-bold">{totalMeals}</p><p className="text-xs sm:text-sm text-muted-foreground mt-1">Total Meals</p></div>
          <div className="stat-card text-center"><p className="text-2xl sm:text-3xl font-bold">{totalLunch}</p><p className="text-xs sm:text-sm text-muted-foreground mt-1">Lunches</p></div>
          <div className="stat-card text-center"><p className="text-2xl sm:text-3xl font-bold">{totalDinner}</p><p className="text-xs sm:text-sm text-muted-foreground mt-1">Dinners</p></div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-warning/10 border border-warning/20">
          <Clock className="w-4 h-4 text-warning shrink-0" />
          <p className="text-sm text-warning">
            {isAdminOrManager
              ? `Members must set meals before ${deadlineLabel}.`
              : `Today's meal must be set before the ${deadlineLabel}.`}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground"><span className="flex items-center justify-center gap-1.5"><Sun className="w-4 h-4" /> Lunch</span></th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground"><span className="flex items-center justify-center gap-1.5"><Moon className="w-4 h-4" /> Dinner</span></th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const date = new Date(year, month, day);
                    const isToday = date.toDateString() === today.toDateString();
                    const canEdit = isEditable(day);
                    const dayMeals = meals[day.toString()] || { lunch: 0, dinner: 0 };
                    const dayName = date.toLocaleDateString('en', { weekday: 'short' });
                    const dayTotal = (dayMeals.lunch || 0) + (dayMeals.dinner || 0);
                    return (
                      <tr key={day} className={`border-b border-border/50 transition-colors ${isToday ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{day}</span>
                            <span className="text-muted-foreground text-xs">{dayName}</span>
                          </div>
                        </td>
                        <td className="text-center px-2 sm:px-4 py-2">
                          <MealCounter value={dayMeals.lunch || 0} disabled={!canEdit} isSaving={saving === `${day}-lunch`}
                            onIncrement={() => changeMealCount(day, 'lunch', 1)}
                            onDecrement={() => changeMealCount(day, 'lunch', -1)}
                            onChange={(v) => setMealCount(day, 'lunch', v)} />
                        </td>
                        <td className="text-center px-2 sm:px-4 py-2">
                          <MealCounter value={dayMeals.dinner || 0} disabled={!canEdit} isSaving={saving === `${day}-dinner`}
                            onIncrement={() => changeMealCount(day, 'dinner', 1)}
                            onDecrement={() => changeMealCount(day, 'dinner', -1)}
                            onChange={(v) => setMealCount(day, 'dinner', v)} />
                        </td>
                        <td className="text-center px-4 py-3">
                          {!canEdit && !isAdminOrManager ? (
                            <span className="text-xs text-destructive font-medium">Locked</span>
                          ) : (
                            <span className={`text-sm font-semibold ${dayTotal > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{dayTotal}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deadline settings dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Meal Edit Deadline</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Set when general users can no longer edit a meal.</p>
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={deadlineDay} onValueChange={(v: any) => setDeadlineDay(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previous">Previous day (e.g. tomorrow's meal locks today)</SelectItem>
                    <SelectItem value="current">Same day as the meal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cutoff time</Label>
                <Input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Current rule: A meal for date <strong>D</strong> can be edited until{' '}
                <strong>{deadlineDay === 'previous' ? 'D − 1' : 'D'}</strong> at <strong>{deadlineTime}</strong>.
              </p>
              <Button onClick={saveDeadline} disabled={savingSettings} className="w-full">
                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

const MealCounter = ({ value, disabled, isSaving, onIncrement, onDecrement, onChange }: {
  value: number; disabled: boolean; isSaving?: boolean;
  onIncrement: () => void; onDecrement: () => void; onChange: (v: number) => void;
}) => (
  <div className="flex items-center justify-center gap-1">
    <button type="button" onClick={onDecrement} disabled={disabled || value <= 0 || isSaving}
      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
    </button>
    <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      disabled={disabled || isSaving} min={0} max={10}
      className="w-10 sm:w-12 h-7 sm:h-8 text-center text-sm font-semibold rounded-lg border border-border bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
    <button type="button" onClick={onIncrement} disabled={disabled || value >= 10 || isSaving}
      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
    </button>
  </div>
);

export default MealManagement;
