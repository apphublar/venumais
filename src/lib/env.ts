function requirePublicEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return value;
}

export function getAppUrl() {
  return requirePublicEnv(
    "NEXT_PUBLIC_APP_URL",
    process.env.NEXT_PUBLIC_APP_URL
  ).replace(/\/$/, "");
}

export function getPublicSupabaseEnv() {
  return {
    url: requirePublicEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
    publishableKey: requirePublicEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )
  };
}

export function getSecretSupabaseEnv() {
  return {
    ...getPublicSupabaseEnv(),
    secretKey: requirePublicEnv(
      "SUPABASE_SECRET_KEY",
      process.env.SUPABASE_SECRET_KEY
    )
  };
}
