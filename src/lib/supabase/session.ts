import { cache } from "react";
import { createClient } from "./server";

// Deduplica chamadas repetidas dentro do mesmo request (layout + page, por
// exemplo). auth.getUser() revalida o token com o servidor do Supabase — sem
// isso, cada Server Component que precisa do usuário/negócio dispararia sua
// própria chamada de rede na mesma navegação.
export const getAuthedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getOwnBusiness = cache(async () => {
  const user = await getAuthedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  return business;
});

export const getOwnProfile = cache(async () => {
  const user = await getAuthedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return profile;
});
