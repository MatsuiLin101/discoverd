import { redirect } from "next/navigation";
import "../../../admin.css";
import { getSession } from "@/lib/auth";
import { adminUrl } from "@/lib/admin-path";
import { geistSans, geistMono } from "@/lib/admin-fonts";
import LoginForm from "./LoginForm";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect(adminUrl());
  return (
    <div className={`${geistSans.variable} ${geistMono.variable}`}>
      <LoginForm redirectTo={adminUrl()} />
    </div>
  );
}
