import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { requestPasswordResetAction } from "@/lib/auth/actions";

export default function RecuperarSenhaPage() {
  return (
    <AuthForm
      action={requestPasswordResetAction}
      description="Enviaremos um link para redefinir sua senha."
      footer={
        <p>
          Lembrou a senha? <Link href="/entrar">Voltar ao login</Link>
        </p>
      }
      submitLabel="Enviar link"
      title="Recuperar senha"
    >
      <label className="field">
        <span>Email</span>
        <input autoComplete="email" name="email" required type="email" />
      </label>
    </AuthForm>
  );
}
