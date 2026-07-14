import { redirect } from "next/navigation";

// Rota mantida só por compatibilidade com links antigos que ainda apontem
// para /app?mode=vendor ou /app?mode=client. Não existe mais uma tela de
// escolha entre vendedor e cliente — cada um tem login próprio e separado.
type AppPageProps = {
  searchParams: Promise<{
    mode?: string;
    next?: string;
    step?: string;
  }>;
};

export default async function AppPage({ searchParams }: AppPageProps) {
  const params = await searchParams;

  if (params.mode === "client") {
    const query = new URLSearchParams();
    if (params.step) {
      query.set("step", params.step);
    }
    const suffix = query.toString();
    redirect(suffix ? `/cliente?${suffix}` : "/cliente");
  }

  const query = new URLSearchParams();
  if (params.next) {
    query.set("next", params.next);
  }
  const suffix = query.toString();
  redirect(suffix ? `/entrar?${suffix}` : "/entrar");
}
