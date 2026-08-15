"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Please try again.");
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <Link href="/" className="mb-9 flex items-center gap-2.5 font-semibold tracking-tight text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white">CI</span>
          Conversation Intelligence
        </Link>
        <p className="text-sm font-semibold text-blue-700">{isSignup ? "CREATE YOUR WORKSPACE" : "WELCOME BACK"}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{isSignup ? "Start turning calls into data." : "Log in to your workspace."}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{isSignup ? "Create a private workspace for your conversation data." : "Access your conversations, schemas, and usage."}</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Email<input name="email" type="email" autoComplete="email" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="block text-sm font-medium text-slate-700">Password<input name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
          <button disabled={isSubmitting} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300">{isSubmitting ? "Please wait…" : isSignup ? "Create account" : "Log in"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">{isSignup ? "Already have an account?" : "New to Conversation Intelligence?"} <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-blue-700 hover:text-blue-800">{isSignup ? "Log in" : "Create an account"}</Link></p>
      </section>
    </main>
  );
}
