import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const callerRoles = (roleRows || []).map((r: any) => r.role);
    const isSuperAdmin = callerRoles.includes("super_admin");
    const isAdmin = callerRoles.includes("admin");
    if (!isSuperAdmin && !isAdmin) return json({ error: "Admin access required" }, 403);

    let callerHostelId: string | null = null;
    if (!isSuperAdmin) {
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles").select("hostel_id").eq("id", caller.id).single();
      callerHostelId = callerProfile?.hostel_id ?? null;
    }

    const body = await req.json();
    const { action } = body;
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";

    if (action === "create") {
      const { email, password, full_name, phone, room_number, role, hostel_id, send_invite } = body;
      if (!email || !full_name) return json({ error: "Email and name are required" }, 400);

      const targetHostel = isSuperAdmin ? hostel_id : callerHostelId;
      if (!targetHostel && role !== "super_admin") return json({ error: "Hostel is required" }, 400);

      let assignedRole = role || "user";
      if (!isSuperAdmin && (assignedRole === "admin" || assignedRole === "super_admin")) {
        assignedRole = "user";
      }

      // If send_invite, generate temp password but tell user to reset via magic link/recovery
      const useInvite = !!send_invite;
      const tempPassword = password || (useInvite ? crypto.randomUUID() + "Aa1!" : null);
      if (!tempPassword) return json({ error: "Password required" }, 400);

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name, role: assignedRole, hostel_id: targetHostel || "" },
      });
      if (createError) return json({ error: createError.message }, 400);

      if (newUser?.user) {
        const update: Record<string, any> = { phone, room_number };
        if (targetHostel) update.hostel_id = targetHostel;
        await supabaseAdmin.from("profiles").update(update).eq("id", newUser.user.id);
      }

      // Send invite/recovery email so user can set their own password
      if (useInvite) {
        const redirectTo = origin ? `${origin}/login` : undefined;
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: redirectTo ? { redirectTo } : undefined,
        });
      }

      return json({ success: true, user_id: newUser?.user?.id });
    }

    if (action === "update") {
      const { user_id, full_name, phone, room_number, role, status, password, hostel_id, email } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);

      const profileUpdate: Record<string, any> = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (phone !== undefined) profileUpdate.phone = phone;
      if (room_number !== undefined) profileUpdate.room_number = room_number;
      if (email !== undefined) profileUpdate.email = email;
      if (role !== undefined) profileUpdate.role = isSuperAdmin ? role : (role === 'admin' || role === 'super_admin' ? undefined : role);
      if (status !== undefined) profileUpdate.status = status;
      if (isSuperAdmin && hostel_id !== undefined) profileUpdate.hostel_id = hostel_id;

      if (Object.keys(profileUpdate).length > 0) {
        await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", user_id);
      }

      if (role !== undefined) {
        await supabaseAdmin.from("user_roles").update({ role }).eq("user_id", user_id);
      }

      const authUpdate: any = {};
      if (password) authUpdate.password = password;
      if (email) authUpdate.email = email;
      if (Object.keys(authUpdate).length > 0) {
        const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdate);
        if (pwError) return json({ error: pwError.message }, 400);
      }

      return json({ success: true });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      await supabaseAdmin.from("profiles").delete().eq("id", user_id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteError) return json({ error: deleteError.message }, 400);
      return json({ success: true });
    }

    if (action === "toggle_status") {
      const { user_id, status } = body;
      if (!user_id || !status) return json({ error: "user_id and status required" }, 400);
      await supabaseAdmin.from("profiles").update({ status }).eq("id", user_id);
      if (status === 'inactive') {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: '876600h' });
      } else {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: 'none' });
      }
      return json({ success: true });
    }

    if (action === "send_password_reset") {
      if (!isSuperAdmin && !isAdmin) return json({ error: "Forbidden" }, 403);
      const { email } = body;
      if (!email) return json({ error: "email required" }, 400);
      const redirectTo = origin ? `${origin}/login` : undefined;
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
