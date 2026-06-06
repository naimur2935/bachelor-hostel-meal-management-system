import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Search, Mail, Phone, Loader2, Pencil, Trash2, FileUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { UserRole } from '@/types';

const Members = () => {
  const { role, profile } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSuper = role === 'super_admin';

  // Form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('user');
  const [formHostel, setFormHostel] = useState<string>('');
  const [formRoom, setFormRoom] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDoc, setFormDoc] = useState<File | null>(null);
  const [formInvite, setFormInvite] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    let query = supabase.from('profiles' as any).select('*').order('full_name');
    // Admins see only their hostel members and exclude super_admins
    if (!isSuper && profile?.hostel_id) {
      query = query.eq('hostel_id', profile.hostel_id).neq('role', 'super_admin');
    }
    const { data, error } = await query;
    if (!error) setMembers((data as any) || []);
    if (isSuper) {
      const { data: h } = await supabase.from('hostels' as any).select('id, name').order('name');
      setHostels(h || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, [isSuper, profile?.hostel_id]);

  const activeCount = members.filter((m: any) => (m.status || 'active') === 'active').length;

  const filtered = members.filter((m: any) =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormName(''); setFormEmail(''); setFormPassword(''); setFormRole('user');
    setFormHostel(''); setFormRoom(''); setFormPhone(''); setFormDoc(null); setEditMember(null);
    setFormInvite(false);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (m: any) => {
    setEditMember(m);
    setFormName(m.full_name || '');
    setFormEmail(m.email || '');
    setFormPassword('');
    setFormRole(m.role || 'user');
    setFormHostel(m.hostel_id || '');
    setFormRoom(m.room_number || '');
    setFormPhone(m.phone || '');
    setFormDoc(null);
    setDialogOpen(true);
  };

  const callManageMember = async (body: any) => {
    const { data, error } = await supabase.functions.invoke('manage-member', {
      body,
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const uploadDocument = async (userId: string, file: File) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/document.${ext}`;
    const { error } = await supabase.storage.from('member-documents').upload(path, file, { upsert: true });
    if (error) throw error;
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      if (editMember) {
        // Update
        await callManageMember({
          action: 'update',
          user_id: editMember.id,
          full_name: formName,
          phone: formPhone || null,
          room_number: formRoom || null,
          role: formRole,
          password: formPassword || undefined,
          ...(isSuper ? { hostel_id: formHostel || null } : {}),
        });
        if (formDoc) await uploadDocument(editMember.id, formDoc);
        toast({ title: 'Success', description: 'Member updated successfully' });
      } else {
        // Create
        if (!formEmail.trim()) {
          toast({ title: 'Error', description: 'Email is required', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        if (!formInvite && !formPassword.trim()) {
          toast({ title: 'Error', description: 'Password is required (or enable email invite)', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        if (isSuper && !formHostel && formRole !== 'super_admin') {
          toast({ title: 'Error', description: 'Please select a hostel', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        const result = await callManageMember({
          action: 'create',
          email: formEmail,
          password: formPassword || undefined,
          send_invite: formInvite,
          full_name: formName,
          phone: formPhone || null,
          room_number: formRoom || null,
          role: formRole,
          ...(isSuper ? { hostel_id: formHostel || null } : {}),
        });
        if (formDoc && result.user_id) await uploadDocument(result.user_id, formDoc);
        toast({ title: 'Success', description: formInvite ? 'Member created. Invite email sent.' : 'Member created successfully' });
      }
      setDialogOpen(false);
      resetForm();
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await callManageMember({ action: 'delete', user_id: deleteId });
      toast({ title: 'Deleted', description: 'Member has been removed' });
      setDeleteId(null);
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const toggleStatus = async (member: any) => {
    const newStatus = (member.status || 'active') === 'active' ? 'inactive' : 'active';
    try {
      await callManageMember({ action: 'toggle_status', user_id: member.id, status: newStatus });
      toast({ title: 'Updated', description: `Member is now ${newStatus}` });
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Members</h1>
            <p className="text-muted-foreground mt-1">{activeCount} active / {members.length} total members</p>
          </div>
          {role === 'admin' && (
            <Button onClick={openCreate}><UserPlus className="w-4 h-4 mr-2" />Add Member</Button>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="stat-card text-center py-8"><p className="text-muted-foreground">No members found</p></div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="block lg:hidden space-y-3">
              {filtered.map((m: any) => {
                const isActive = (m.status || 'active') === 'active';
                return (
                  <div key={m.id} className={`stat-card ${!isActive ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{m.full_name}</p>
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize mt-1">{m.role}</span>
                      </div>
                      {role === 'admin' && (
                        <div className="flex items-center gap-1">
                          <Switch checked={isActive} onCheckedChange={() => toggleStatus(m)} />
                          <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{m.email}</div>
                      {m.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{m.phone}</div>}
                      {m.room_number && <div className="mt-2"><span>Room: {m.room_number}</span></div>}
                      <div className="mt-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Member</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">Room</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">Phone</th>
                      <th className="text-center px-3 py-3 font-medium text-muted-foreground">Status</th>
                      {role === 'admin' && <th className="text-center px-3 py-3 font-medium text-muted-foreground">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m: any) => {
                      const isActive = (m.status || 'active') === 'active';
                      return (
                        <tr key={m.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
                          <td className="px-5 py-3">
                            <p className="font-medium text-foreground">{m.full_name}</p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">{m.role}</span>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{m.room_number || '—'}</td>
                          <td className="px-3 py-3 text-muted-foreground">{m.phone || '—'}</td>
                          <td className="px-3 py-3 text-center">
                            {role === 'admin' ? (
                              <Switch checked={isActive} onCheckedChange={() => toggleStatus(m)} />
                            ) : (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </td>
                          {role === 'admin' && (
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editMember ? 'Edit Member' : 'Add New Member'}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Full name" />
              </div>
              {!editMember && (
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="email@example.com" />
                </div>
              )}
              {!editMember && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formInvite} onChange={e => setFormInvite(e.target.checked)} />
                  Send email invite (member sets their own password)
                </label>
              )}
              {(!formInvite || editMember) && (
                <div className="space-y-2">
                  <Label>{editMember ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
                  <Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="••••••••" />
                </div>
              )}
              {isSuper && (
                <div className="space-y-2">
                  <Label>Hostel {formRole !== 'super_admin' && '*'}</Label>
                  <Select value={formHostel} onValueChange={setFormHostel}>
                    <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                    <SelectContent>
                      {hostels.map((h: any) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={formRole} onValueChange={(v: UserRole) => setFormRole(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {isSuper && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Room No.</Label>
                  <Input value={formRoom} onChange={e => setFormRoom(e.target.value)} placeholder="101" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="01XXXXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Document (optional)</Label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors text-sm">
                    <FileUp className="w-4 h-4" />
                    {formDoc ? formDoc.name : 'Choose file'}
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setFormDoc(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editMember ? 'Update Member' : 'Create Member'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Member?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently remove this member and their account. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Members;
