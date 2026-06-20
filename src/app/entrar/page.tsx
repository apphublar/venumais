import { redirect } from "next/navigation";

type EntrarPageProps = {
  searchParams: Promise<{
    mode?: string;
    next?: string;
    error?: string;
  }>;
};

export default async function EntrarPage({ searchParams }: EntrarPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params.mode) {
    query.set("mode", params.mode);
  } else {
    query.set("mode", "vendor");
  }
  if (params.next) {
    query.set("next", params.next);
  }

  redirect(`/app?${query.toString()}`);
}
