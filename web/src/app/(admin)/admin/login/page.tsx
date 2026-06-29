import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { adminUrl } from "@/lib/admin-path";
import LoginForm from "./LoginForm";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect(adminUrl());
  return <LoginForm redirectTo={adminUrl()} />;
}
