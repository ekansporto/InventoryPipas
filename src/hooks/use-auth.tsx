import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "staff" | "user";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  role: Role;
  canManageStock: boolean;
  profile: { full_name: string | null; kelas: string | null } | null;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [role, setRole] = useState<Role>("user");
  const [profile, setProfile] = useState<AuthCtx["profile"]>(null);

  const loadRoleAndProfile = async (uid: string) => {
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("full_name, kelas").eq("id", uid).maybeSingle(),
    ]);
    const nextRole: Role = roles?.some((r) => r.role === "admin") ? "admin" : roles?.some((r) => r.role === "staff") ? "staff" : "user";
    setRole(nextRole);
    setIsAdmin(nextRole === "admin");
    setIsStaff(nextRole === "staff");
    setProfile(prof ?? null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRoleAndProfile(s.user.id), 0);
      } else {
        setIsAdmin(false);
        setIsStaff(false);
        setRole("user");
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadRoleAndProfile(s.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRole = async () => {
    if (user) await loadRoleAndProfile(user.id);
  };

  return (
    <Ctx.Provider value={{ user, session, loading, isAdmin, isStaff, role, canManageStock: isAdmin || isStaff, profile, signOut, refreshRole }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
