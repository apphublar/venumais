import { VendorLoginPage } from "@/components/auth/vendor-login-page";

type EntrarPageProps = {
  searchParams: Promise<{
    next?: string;
    tab?: string;
  }>;
};

export default async function EntrarPage({ searchParams }: EntrarPageProps) {
  const params = await searchParams;
  const initialTab = params.tab === "criar" ? "criar" : "entrar";
  const nextPath = params.next ?? "/painel";

  return (
    <VendorLoginPage
      initialTab={initialTab}
      key={`${initialTab}:${nextPath}`}
      nextPath={nextPath}
    />
  );
}
