import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, CalendarClock, Loader2, RefreshCw, Pencil, FileUp, Search, KeyRound } from 'lucide-react';

interface Hostel {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  document_urls: string[] | null;
}
interface Subscription {
  id: string;
  hostel_id: string;
  plan: string;
  start_date: string;
  end_date: string;
  status: string;
  amount: number | null;
}

const planDays: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };

const SuperAdmin = () => {
  const { toast } = useToast();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Hostel dialog
  const [hostelOpen, setHostelOpen] = useState(false);
  const [editHostel, setEditHostel] = useState<Hostel | null>(null);
  const [hName, setHName] = useState('');
  const [hAddress, setHAddress] = useState('');
  const [hCity, setHCity] = useState('');
  const [hCountry, setHCountry] = useState('');
  const [hPostal, setHPostal] = useState('');
  const [hDescription, setHDescription] = useState('');
  const [hEmail, setHEmail] = useState('');
  const [hPhone, setHPhone] = useState('');
  const [hLogo, setHLogo] = useState<File | null>(null);
  const [hDocs, setHDocs] = useState<FileList | null>(null);

  // Admin section (only when creating new hostel)
  const [createAdmin, setCreateAdmin] = useState(true);
  const [aName, setAName] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aPhone, setAPhone] = useState('');
  const [aPasswordMode, setAPasswordMode] = useState<'invite' | 'manual'>('invite');
  const [aPassword, setAPassword] = useState('');

  // Subscription dialog
  const [subOpen, setSubOpen] = useState(false);
  const [subHostel, setSubHostel] = useState('');
  const [subPlan, setSubPlan] = useState('monthly');
  const [subAmount, setSubAmount] = useState('');
  const [subStart, setSubStart] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Member filters
  const [filterHostel, setFilterHostel] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState('');

  // Edit admin/member dialog
  const [memberEditOpen, setMemberEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [emName, setEmName] = useState('');
  const [emEmail, setEmEmail] = useState('');
  const [emPhone, setEmPhone] = useState('');
  const [emRoom, setEmRoom] = useState('');
  const [emRole, setEmRole] = useState<string>('user');
  const [emHostel, setEmHostel] = useState<string>('');
  const [emPassword, setEmPassword] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    const [h, s, m] = await Promise.all([
      supabase.from('hostels' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions' as any).select('*').order('end_date', { ascending: false }),
      supabase.from('profiles' as any).select('*').order('full_name'),
    ]);
    if (!h.error) setHostels((h.data as any) || []);
    if (!s.error) setSubs((s.data as any) || []);
    if (!m.error) setMembers((m.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const activeSubFor = (hostelId: string) =>
    subs.filter(s => s.hostel_id === hostelId && s.status === 'active')
      .sort((a, b) => b.end_date.localeCompare(a.end_date))[0];

  const resetHostelForm = () => {
    setEditHostel(null);
    setHName(''); setHAddress(''); setHCity(''); setHCountry(''); setHPostal('');
    setHDescription(''); setHEmail(''); setHPhone(''); setHLogo(null); setHDocs(null);
    setCreateAdmin(true); setAName(''); setAEmail(''); setAPhone(''); setAPasswordMode('invite'); setAPassword('');
  };

  const openCreateHostel = () => { resetHostelForm(); setHostelOpen(true); };
  const openEditHostel = (h: Hostel) => {
    resetHostelForm();
    setEditHostel(h);
    setHName(h.name); setHAddress(h.address || ''); setHCity(h.city || ''); setHCountry(h.country || '');
    setHPostal(h.postal_code || ''); setHDescription(h.description || '');
    setHEmail(h.contact_email || ''); setHPhone(h.contact_phone || '');
    setCreateAdmin(false);
    setHostelOpen(true);
  };

  const uploadFile = async (file: File, prefix: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('hostel-assets').upload(path, file);
    if (error) { console.error(error); return null; }
    const { data } = supabase.storage.from('hostel-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSaveHostel = async () => {
    if (!hName.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      let hostelId = editHostel?.id;
      let logoUrl = editHostel?.logo_url || null;
      let docUrls: string[] = (editHostel?.document_urls as any) || [];

      if (hLogo) {
        const url = await uploadFile(hLogo, 'logos');
        if (url) logoUrl = url;
      }
      if (hDocs && hDocs.length > 0) {
        for (let i = 0; i < hDocs.length; i++) {
          const url = await uploadFile(hDocs[i], 'documents');
          if (url) docUrls.push(url);
        }
      }

      const payload: any = {
        name: hName,
        address: hAddress || null,
        city: hCity || null,
        country: hCountry || null,
        postal_code: hPostal || null,
        description: hDescription || null,
        contact_email: hEmail || null,
        contact_phone: hPhone || null,
        logo_url: logoUrl,
        document_urls: docUrls,
      };

      if (editHostel) {
        const { error } = await supabase.from('hostels' as any).update(payload).eq('id', editHostel.id);
        if (error) throw error;
        toast({ title: 'Hostel updated' });
      } else {
        const { data, error } = await supabase.from('hostels' as any).insert(payload).select().single();
        if (error) throw error;
        hostelId = (data as any).id;

        // Create admin if requested
        if (createAdmin && aEmail.trim() && aName.trim() && hostelId) {
          const useInvite = aPasswordMode === 'invite';
          const password = useInvite ? '' : aPassword;
          if (!useInvite && !password) {
            toast({ title: 'Admin password required', variant: 'destructive' });
            setSubmitting(false);
            return;
          }
          const { error: aErr } = await supabase.functions.invoke('manage-member', {
            body: {
              action: 'create',
              email: aEmail,
              full_name: aName,
              phone: aPhone || null,
              role: 'admin',
              hostel_id: hostelId,
              password: password || undefined,
              send_invite: useInvite,
            },
          });
          if (aErr) toast({ title: 'Hostel created, admin failed', description: aErr.message, variant: 'destructive' });
          else toast({ title: 'Hostel & admin created', description: useInvite ? 'Admin will receive an email to set their password.' : 'Admin created with the password you set.' });
        } else {
          toast({ title: 'Hostel created' });
        }
      }
      setHostelOpen(false); resetHostelForm(); fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleCreateSub = async () => {
    if (!subHostel) { toast({ title: 'Select hostel', variant: 'destructive' }); return; }
    setSubmitting(true);
    const start = new Date(subStart);
    const end = new Date(start);
    end.setDate(end.getDate() + (planDays[subPlan] || 30));
    await supabase.from('subscriptions' as any)
      .update({ status: 'expired' }).eq('hostel_id', subHostel).eq('status', 'active');
    const { error } = await supabase.from('subscriptions' as any).insert({
      hostel_id: subHostel, plan: subPlan, start_date: subStart,
      end_date: end.toISOString().split('T')[0], status: 'active',
      amount: subAmount ? parseFloat(subAmount) : 0, notified_3day: false,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Subscription created' }); setSubOpen(false); setSubHostel(''); setSubAmount(''); fetchAll(); }
    setSubmitting(false);
  };

  const renew = (hostelId: string) => {
    setSubHostel(hostelId);
    setSubStart(new Date().toISOString().split('T')[0]);
    setSubOpen(true);
  };

  // Member edit
  const openEditMember = (m: any) => {
    setEditMember(m);
    setEmName(m.full_name || ''); setEmEmail(m.email || ''); setEmPhone(m.phone || '');
    setEmRoom(m.room_number || ''); setEmRole(m.role || 'user'); setEmHostel(m.hostel_id || '');
    setEmPassword('');
    setMemberEditOpen(true);
  };
  const handleSaveMember = async () => {
    if (!editMember) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('manage-member', {
        body: {
          action: 'update',
          user_id: editMember.id,
          full_name: emName,
          phone: emPhone || null,
          room_number: emRoom || null,
          role: emRole,
          hostel_id: emHostel || null,
          password: emPassword || undefined,
        },
      });
      if (error) throw new Error(error.message);
      toast({ title: 'Member updated' });
      setMemberEditOpen(false); setEditMember(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const sendReset = async (email: string) => {
    const { error } = await supabase.functions.invoke('manage-member', {
      body: { action: 'send_password_reset', email },
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Password reset email sent', description: email });
  };

  const filteredMembers = members.filter((m: any) => {
    if (filterHostel !== 'all' && m.hostel_id !== filterHostel) return false;
    if (filterRole !== 'all' && m.role !== filterRole) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!(m.full_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const hostelName = (id: string | null) => hostels.find(h => h.id === id)?.name || '—';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Super Admin</h1>
            <p className="text-muted-foreground mt-1">Manage hostels, subscriptions, and members</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSubOpen(true)}>
              <CalendarClock className="w-4 h-4 mr-2" />New Subscription
            </Button>
            <Button onClick={openCreateHostel}>
              <Plus className="w-4 h-4 mr-2" />New Hostel
            </Button>
          </div>
        </div>

        <Tabs defaultValue="hostels">
          <TabsList>
            <TabsTrigger value="hostels">Hostels</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="hostels" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : hostels.length === 0 ? (
              <div className="stat-card text-center py-12">
                <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hostels yet. Create your first hostel.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {hostels.map(h => {
                  const sub = activeSubFor(h.id);
                  const today = new Date();
                  const daysLeft = sub ? Math.ceil((new Date(sub.end_date).getTime() - today.getTime()) / 86400000) : null;
                  const expired = daysLeft !== null && daysLeft < 0;
                  const warning = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
                  return (
                    <div key={h.id} className="stat-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {h.logo_url ? (
                            <img src={h.logo_url} alt={h.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">{h.name}</h3>
                            {(h.city || h.country) && <p className="text-xs text-muted-foreground">{[h.city, h.country].filter(Boolean).join(', ')}</p>}
                            {h.address && <p className="text-sm text-muted-foreground">{h.address}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openEditHostel(h)}><Pencil className="w-4 h-4" /></Button>
                      </div>
                      <div className="mt-3 text-sm space-y-1 text-muted-foreground">
                        {h.contact_email && <p>📧 {h.contact_email}</p>}
                        {h.contact_phone && <p>📞 {h.contact_phone}</p>}
                        {h.document_urls && h.document_urls.length > 0 && (
                          <p className="text-xs">📎 {h.document_urls.length} document{h.document_urls.length === 1 ? '' : 's'}</p>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        {sub ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase text-muted-foreground">Plan</span>
                              <span className="text-sm font-medium capitalize">{sub.plan}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase text-muted-foreground">Ends</span>
                              <span className="text-sm font-medium">{sub.end_date}</span>
                            </div>
                            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${expired ? 'bg-destructive/10 text-destructive' : warning ? 'bg-yellow-500/10 text-yellow-700' : 'bg-green-500/10 text-green-600'}`}>
                              {expired ? 'Expired' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">No active subscription</span>
                        )}
                        <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => renew(h.id)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-2" />Renew / New
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by name or email" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
              </div>
              <Select value={filterHostel} onValueChange={setFilterHostel}>
                <SelectTrigger><SelectValue placeholder="Hostel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All hostels</SelectItem>
                  {hostels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Member</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">Hostel</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-center px-3 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No members found</td></tr>
                    ) : filteredMembers.map((m: any) => (
                      <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-5 py-3">
                          <p className="font-medium">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{m.role?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{hostelName(m.hostel_id)}</td>
                        <td className="px-3 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(m.status || 'active') === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                            {m.status || 'active'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditMember(m)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" title="Send password reset" onClick={() => sendReset(m.email)}><KeyRound className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Hostel Dialog */}
        <Dialog open={hostelOpen} onOpenChange={(v) => { setHostelOpen(v); if (!v) resetHostelForm(); }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editHostel ? 'Edit Hostel' : 'New Hostel'}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2 sm:col-span-2"><Label>Name *</Label><Input value={hName} onChange={e => setHName(e.target.value)} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input value={hAddress} onChange={e => setHAddress(e.target.value)} /></div>
                <div className="space-y-2"><Label>City</Label><Input value={hCity} onChange={e => setHCity(e.target.value)} /></div>
                <div className="space-y-2"><Label>Country</Label><Input value={hCountry} onChange={e => setHCountry(e.target.value)} /></div>
                <div className="space-y-2"><Label>Postal Code</Label><Input value={hPostal} onChange={e => setHPostal(e.target.value)} /></div>
                <div className="space-y-2"><Label>Contact Phone</Label><Input value={hPhone} onChange={e => setHPhone(e.target.value)} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Contact Email</Label><Input type="email" value={hEmail} onChange={e => setHEmail(e.target.value)} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Description / Notes</Label><Textarea rows={3} value={hDescription} onChange={e => setHDescription(e.target.value)} /></div>
                <div className="space-y-2"><Label>Logo</Label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50 cursor-pointer hover:bg-muted text-sm">
                    <FileUp className="w-4 h-4" />{hLogo ? hLogo.name : 'Choose image'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => setHLogo(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="space-y-2"><Label>Registration Documents</Label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50 cursor-pointer hover:bg-muted text-sm">
                    <FileUp className="w-4 h-4" />{hDocs && hDocs.length ? `${hDocs.length} file(s)` : 'Choose files'}
                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={e => setHDocs(e.target.files)} />
                  </label>
                </div>
              </div>

              {!editHostel && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Hostel Admin</h3>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" checked={createAdmin} onChange={e => setCreateAdmin(e.target.checked)} />
                      Create admin account
                    </label>
                  </div>
                  {createAdmin && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Full Name *</Label><Input value={aName} onChange={e => setAName(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Email *</Label><Input type="email" value={aEmail} onChange={e => setAEmail(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Phone</Label><Input value={aPhone} onChange={e => setAPhone(e.target.value)} /></div>
                      <div className="space-y-2">
                        <Label>Password Setup</Label>
                        <Select value={aPasswordMode} onValueChange={(v: any) => setAPasswordMode(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="invite">Email invite (admin sets password)</SelectItem>
                            <SelectItem value="manual">Set password manually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {aPasswordMode === 'manual' && (
                        <div className="space-y-2 sm:col-span-2"><Label>Password *</Label><Input type="password" value={aPassword} onChange={e => setAPassword(e.target.value)} /></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button onClick={handleSaveHostel} disabled={submitting} className="w-full">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editHostel ? 'Update Hostel' : 'Create Hostel'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Subscription Dialog */}
        <Dialog open={subOpen} onOpenChange={setSubOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New Subscription</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2"><Label>Hostel *</Label>
                <Select value={subHostel} onValueChange={setSubHostel}>
                  <SelectTrigger><SelectValue placeholder="Choose hostel" /></SelectTrigger>
                  <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Plan</Label>
                <Select value={subPlan} onValueChange={setSubPlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                    <SelectItem value="quarterly">Quarterly (90 days)</SelectItem>
                    <SelectItem value="yearly">Yearly (365 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={subStart} onChange={e => setSubStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>Amount (optional)</Label><Input type="number" value={subAmount} onChange={e => setSubAmount(e.target.value)} placeholder="0" /></div>
              <Button onClick={handleCreateSub} disabled={submitting} className="w-full">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create Subscription
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog (super admin) */}
        <Dialog open={memberEditOpen} onOpenChange={(v) => { setMemberEditOpen(v); if (!v) setEditMember(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-2"><Label>Full Name</Label><Input value={emName} onChange={e => setEmName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={emEmail} disabled /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Phone</Label><Input value={emPhone} onChange={e => setEmPhone(e.target.value)} /></div>
                <div className="space-y-2"><Label>Room</Label><Input value={emRoom} onChange={e => setEmRoom(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Role</Label>
                <Select value={emRole} onValueChange={setEmRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Hostel</Label>
                <Select value={emHostel} onValueChange={setEmHostel}>
                  <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                  <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>New Password (optional)</Label><Input type="password" value={emPassword} onChange={e => setEmPassword(e.target.value)} /></div>
              <Button onClick={handleSaveMember} disabled={submitting} className="w-full">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default SuperAdmin;
