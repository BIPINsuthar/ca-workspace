import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { Calculator } from "lucide-react";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r border-line bg-panel lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white"><Calculator className="size-5" /></span>
          <div>
            <p className="font-semibold">{process.env.FIRM_NAME || "LedgerPulse"}</p>
            <p className="text-xs text-muted">{process.env.FIRM_TAGLINE || "CA Workspace Manager"}</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Every client, filing and deadline — in one place.</h2>
          <ul className="mt-6 space-y-3 text-sm text-muted">
            <li>• Client register with GSTIN, PAN, constitution and partners</li>
            <li>• Assign compliance work and track it to completion</li>
            <li>• Recurring GST, TDS and ROC tasks that schedule themselves</li>
            <li>• Team messages, client call logs and reminders</li>
          </ul>
        </div>
        <p className="relative text-xs text-faint">Private workspace · authorised staff only</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white"><Calculator className="size-5" /></span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Use the login your firm admin created for you.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
