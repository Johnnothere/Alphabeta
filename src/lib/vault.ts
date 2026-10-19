import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseProgress } from "@/lib/eligibility";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const user = u.user;
    if (!user) return null;
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);
    const r = (roles ?? []).map((x) => x.role);
    return {
      id: user.id,
      email: user.email ?? "",
      roles: r,
      isFounder: r.includes("founder"),
      isMember: r.length > 0,
      profile,
    };
  },
});

export const progressQuery = (uid: string) =>
  queryOptions({
    queryKey: ["progress", uid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("member_progress", { _uid: uid });
      if (error) throw error;
      return parseProgress(data);
    },
  });

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async () =>
    (await supabase.from("profiles").select("id, handle, display_name").order("handle")).data ?? [],
});
