import Link from "next/link";
import { Brand } from "@/components/brand";

export function AuthShell({
  children,
  description,
  title
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Brand inverse />
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
        <div className="auth-back">
          <Link href="/">← Voltar ao site</Link>
        </div>
      </div>
    </main>
  );
}
