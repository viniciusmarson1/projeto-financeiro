import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { AUTH_COOKIE } from "@/src/lib/auth-cookie";

export { AUTH_COOKIE } from "@/src/lib/auth-cookie";

function getAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const allowedEmail = process.env.FINANCE_AUTH_EMAIL?.trim().toLowerCase();

  if (!url || !anonKey || !allowedEmail) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e FINANCE_AUTH_EMAIL.");
  }

  return { url, anonKey, allowedEmail };
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const { url, anonKey, allowedEmail } = getAuthConfig();
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(accessToken);

    if (error || !data.user.email || data.user.email.toLowerCase() !== allowedEmail) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  return Boolean(await getAuthenticatedUser());
}

export async function signInWithPassword(email: string, password: string) {
  const { url, anonKey, allowedEmail } = getAuthConfig();

  if (email.trim().toLowerCase() !== allowedEmail) {
    return { accessToken: null, error: "Este e-mail não está autorizado." };
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  return { accessToken: data.session?.access_token ?? null, error: error?.message ?? null };
}
