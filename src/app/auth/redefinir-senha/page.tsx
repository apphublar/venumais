import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { updatePasswordAction } from "@/lib/auth/actions";

export default function RedefinirSenhaPage() {
  return (
    <AuthForm
      action={updatePasswordAction}
      description="Escolha uma nova senha para sua conta."
      footer={
        <p>
          <Link href="/entrar">Voltar ao login</Link>
        </p>
      }
      submitLabel="Salvar nova senha"
      title="Nova senha"
    >
      <label className="field">
        <span>Nova senha</span>
        <input
          autoComplete="new-password"
          minLength={6}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="field">
        <span>Confirmar senha</span>
        <input
          autoComplete="new-password"
          minLength={6}
          name="confirmPassword"
          required
          type="password"
        />
      </label>
    </AuthForm>
  );
}
