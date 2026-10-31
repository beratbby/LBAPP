import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentMember, memberCount } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage() {
  if (await getCurrentMember()) redirect("/");
  if ((await memberCount()) === 0) redirect("/setup");
  return <LoginForm />;
}
