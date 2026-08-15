import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <div className="min-h-screen bg-[#f7f8fc]"><DashboardNav email={user.email} isAdmin={user.role === "ADMIN"} />{children}</div>;
}
