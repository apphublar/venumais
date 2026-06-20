import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateStoreForm } from "@/components/auth/create-store-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentUser, getActiveStore } from "@/lib/auth/session";

type CriarContaPageProps = {
  searchParams: Promise<{
    step?: string;
  }>;
};

export default async function CriarContaPage({ searchParams }: CriarContaPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const store = user ? await getActiveStore(user.id) : null;

  if (store) {
    redirect("/painel");
  }

  const step = params.step === "loja" && user ? "loja" : "conta";

  if (step === "loja") {
    if (!user) {
      redirect("/criar-conta");
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

  return (
    <SignUpForm
      footer={
        <p>
          Já possui conta? <Link href="/entrar">Entrar</Link>
        </p>
      }
    />
  );
}
