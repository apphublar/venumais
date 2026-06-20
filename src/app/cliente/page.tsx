import { redirect } from "next/navigation";

export default function ClientePage() {
  redirect("/app?mode=client");
}
