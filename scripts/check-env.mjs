// Runs before the build: checks DATABASE_URL / DIRECT_URL / AUTH_SECRET and explains problems
// in plain words. Passwords are never printed.

const problems = [];

function check(name, { port, pgbouncer }) {
  const raw = process.env[name];
  if (!raw) return problems.push(`${name} is missing. Add it in Vercel → Settings → Environment Variables.`);
  const v = raw;
  if (v !== v.trim()) problems.push(`${name} has a space or line break at the start or end. Delete it.`);
  if (/^["']|["']$/.test(v.trim())) problems.push(`${name} has quote marks around it. In Vercel, paste the value without quotes.`);
  if (/[\[\]]/.test(v)) problems.push(`${name} contains [ or ]. Remove the brackets around the password.`);
  if (/\bPASSWORD\b|YOUR-PASSWORD/.test(v)) problems.push(`${name} still contains the word PASSWORD. Replace it with your real database password.`);
  if (/@HOST[:/]/.test(v)) problems.push(`${name} still contains the word HOST. Replace it with the pooler host from Supabase → Connect.`);
  if (!/^postgres(ql)?:\/\//.test(v.trim())) problems.push(`${name} must start with postgresql://`);

  const body = v.trim().replace(/^postgres(ql)?:\/\//, "");
  const ats = (body.match(/@/g) || []).length;
  if (ats > 1) problems.push(`${name}: the password contains "@". Replace each @ inside the password with %40 (keep the last @ before the server name).`);

  const at = body.lastIndexOf("@");
  const creds = at >= 0 ? body.slice(0, at) : "";
  const rest = at >= 0 ? body.slice(at + 1) : body;
  const user = creds.split(":")[0];
  const pass = creds.slice(user.length + 1);
  const hostPort = rest.split(/[/?]/)[0];
  const [host, p] = hostPort.split(":");

  for (const ch of ["#", "/", "?", " "]) {
    if (pass.includes(ch)) problems.push(`${name}: the password contains "${ch === " " ? "a space" : ch}". Encode it (# → %23, / → %2F, ? → %3F, space → %20) or reset the password to letters and numbers only.`);
  }
  if (host && !/^[a-z0-9.-]+$/i.test(host)) problems.push(`${name}: the server name "${host}" has invalid characters. Usually part of the password leaked into it; see the password tips above.`);
  if (host?.startsWith("db.") && host.endsWith(".supabase.co")) problems.push(`${name} uses Supabase's "Direct connection" (db.….supabase.co), which Vercel cannot reach. Use the Transaction/Session pooler host (….pooler.supabase.com).`);
  if (port && p && p !== port) problems.push(`${name} should use port ${port} (it uses ${p}).`);
  if (pgbouncer && host?.includes("pooler.supabase.com") && !/pgbouncer=true/.test(v)) problems.push(`${name} should end with ?pgbouncer=true`);

  console.log(`  ${name}: postgresql://${user || "?"}:${pass ? "****" : "(no password)"}@${host || "?"}:${p || "?"}`);
}

console.log("Checking environment variables…");
check("DATABASE_URL", { port: process.env.DATABASE_URL?.includes("pooler.supabase.com") ? "6543" : undefined, pgbouncer: true });
check("DIRECT_URL", { port: process.env.DIRECT_URL?.includes("pooler.supabase.com") ? "5432" : undefined });
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) problems.push("AUTH_SECRET is missing or shorter than 32 characters. Generate one at https://generate-secret.vercel.app/32");

if (problems.length) {
  console.error("\n✖ Fix these in Vercel → Settings → Environment Variables, then redeploy:\n");
  for (const m of new Set(problems)) console.error("  • " + m);
  console.error("");
  process.exit(1);
}
console.log("✔ Environment variables look good");
