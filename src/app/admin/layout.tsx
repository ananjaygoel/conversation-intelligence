import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return <div className="min-h-screen bg-[#f7f8fc]"><DashboardNav email={user.email} isAdmin />{children}</div>;
}
