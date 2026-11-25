"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

export function RestoreForm() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, number> | null>(null);

  const restore = async () => {
    if (!file) return;
    if (!window.confirm(`Load "${file.name}" into this workspace? You'll be signed out afterwards.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: await file.text() });
      const json = await res.json().catch(() => ({ error: res.status === 413 ? "The file is too large to upload (limit about 4 MB)." : "Unexpected response from the server." }));
      if (!res.ok) setError(json.error ?? "Restore failed.");
      else setDone(json.counts);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mt-4 rounded-xl border border-ok/30 bg-ok/10 p-4 text-sm text-emerald-200">
        <p className="font-medium">Restore complete.</p>
        <p className="mt-1">
          {done.user} users, {done.client} clients, {done.partner} partners, {done.task} tasks, {done.taskComment} comments, {done.message} messages, {done.clientLog} client logs, {done.reminder} reminders.
        </p>
        <a href="/login" className="btn-primary mt-3">Sign in again</a>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <input
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setError(null);
        }}
        className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-panel-2 file:px-3 file:py-2 file:text-sm file:text-fg"
      />
      {error && <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <button onClick={restore} disabled={!file || busy} className="btn-primary mt-4">
        <Upload className="size-4" /> {busy ? "Restoring… keep this page open" : "Restore backup"}
      </button>
    </div>
  );
}
