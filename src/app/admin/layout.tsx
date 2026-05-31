import { redirect } from "next/navigation";
import { getAdminSessionFromCookies } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getAdminSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  return children;
}
