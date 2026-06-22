import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateStoreForm } from "@/components/auth/create-store-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentUser, getActiveStore } from "@/lib/auth/session";

type CriarContaPageProps = {
  searchParams: Promise<{
    step?: string;
    next?: string;
  }>;
};

function safeNextPath(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

export default async function CriarContaPage({ searchParams }: CriarContaPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const user = await getCurrentUser();
  const store = user ? await getActiveStore(user.id) : null;

  if (store) {
    redirect("/painel");
  }

  if (user && nextPath) {
    redirect(nextPath);
  }

  const step = params.step === "loja" && user ? "loja" : "conta";

  if (step === "loja") {
    if (!user) {
      redirect(nextPath ? `/criar-conta?next=${encodeURIComponent(nextPath)}` : "/criar-conta");
    }

    return (
      <CreateStoreForm
        footer={
          <p>
            Já possui conta? <Link href="/app">Entrar</Link>
          </p>
        }
      />
    );
  }

  const signUpNext = nextPath ?? "/criar-conta?step=loja";
  const loginHref = nextPath
    ? `/app?mode=vendor&next=${encodeURIComponent(nextPath)}`
    : "/entrar";

  return (
    <SignUpForm
      footer={
        <p>
          Já possui conta? <Link href={loginHref}>Entrar</Link>
        </p>
      }
      nextPath={signUpNext}
    />
  );
}
