"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveClient } from "@/app/actions/clients";
import { CONSTITUTIONS, GST_STATES, gstinInfo, PARTNER_LABEL, type ConstitutionKey } from "@/lib/format";
import { ActionForm, Submit } from "./forms";
import { Field } from "./ui";

type Partner = { name: string; designation: string; email: string; mobile: string; pan: string; din: string };
export type ClientValues = {
  id?: string;
  name: string;
  constitution: ConstitutionKey;
  gstin: string;
  pan: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
  managerId: string;
  partners: Partner[];
};

const blankPartner = (designation = ""): Partner => ({ name: "", designation, email: "", mobile: "", pan: "", din: "" });

export function ClientForm({ initial, employees }: { initial?: ClientValues; employees: { id: string; name: string }[] }) {
  const [constitution, setConstitution] = useState<ConstitutionKey>(initial?.constitution ?? "PROPRIETORSHIP");
  const [gstin, setGstin] = useState(initial?.gstin ?? "");
  const [pan, setPan] = useState(initial?.pan ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [partners, setPartners] = useState<Partner[]>(initial?.partners.length ? initial.partners : [blankPartner(PARTNER_LABEL[constitution])]);

  const info = gstin.length === 15 ? gstinInfo(gstin) : null;
  const role = PARTNER_LABEL[constitution];
  const isCompany = ["PRIVATE_LIMITED", "PUBLIC_LIMITED", "OPC"].includes(constitution);

  const onGstin = (v: string) => {
    const g = v.toUpperCase().replace(/\s/g, "").slice(0, 15);
    setGstin(g);
    const i = g.length === 15 ? gstinInfo(g) : null;
    if (i) {
      if (!pan) setPan(i.pan);
      if (!state && i.state) setState(i.state);
    }
  };

  const update = (i: number, key: keyof Partner, v: string) => setPartners((ps) => ps.map((p, j) => (j === i ? { ...p, [key]: v } : p)));

  return (
    <ActionForm action={saveClient}>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="partners" value={JSON.stringify(partners)} />

      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Business details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Client / business name *" className="sm:col-span-2">
            <input name="name" required defaultValue={initial?.name} className="field" placeholder="e.g. Sharma Textiles Pvt Ltd" />
          </Field>
          <Field label="Constitution type *">
            <select
              name="constitution"
              value={constitution}
              onChange={(e) => {
                const next = e.target.value as ConstitutionKey;
                const oldLabel = PARTNER_LABEL[constitution];
                // Partners still carrying the old default title get the new one (e.g. Proprietor → Partner).
                setPartners((ps) => ps.map((p) => (!p.designation || p.designation === oldLabel ? { ...p, designation: PARTNER_LABEL[next] } : p)));
                setConstitution(next);
              }}
              className="field"
            >
              {Object.entries(CONSTITUTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field
            label="GSTIN"
            hint={
              gstin.length === 15 ? (
                info ? (
                  <span className={info.checksumOk ? "text-emerald-300" : "text-amber-300"}>
                    {info.state ?? "Unknown state"} · PAN {info.pan}{info.checksumOk ? " · checksum OK" : " · check digit looks wrong, please verify"}
                  </span>
                ) : (
                  <span className="text-red-300">Format should be like 27AABCS1429B1Z1</span>
                )
              ) : (
                "15 characters. PAN and state fill in automatically."
              )
            }
          >
            <input name="gstin" value={gstin} onChange={(e) => onGstin(e.target.value)} className="field font-mono uppercase" placeholder="27AABCS1429B1Z1" maxLength={15} />
          </Field>
          <Field label="PAN">
            <input name="pan" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))} className="field font-mono uppercase" placeholder="AABCS1429B" maxLength={10} />
          </Field>
          <Field label="Handled by" hint="Employee responsible for this client">
            <select name="managerId" defaultValue={initial?.managerId ?? ""} className="field">
              <option value="">—</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={initial?.email} className="field" placeholder="accounts@business.in" />
          </Field>
          <Field label="Mobile number">
            <input name="mobile" type="tel" defaultValue={initial?.mobile} className="field" placeholder="98200 11223" />
          </Field>
        </div>
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Address</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Address" className="sm:col-span-2 lg:col-span-4">
            <textarea name="address" rows={2} defaultValue={initial?.address} className="field" placeholder="Building, street, area" />
          </Field>
          <Field label="City"><input name="city" defaultValue={initial?.city} className="field" /></Field>
          <Field label="State">
            <input name="state" list="states" value={state} onChange={(e) => setState(e.target.value)} className="field" />
            <datalist id="states">{Object.values(GST_STATES).map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="PIN code"><input name="pincode" inputMode="numeric" maxLength={6} defaultValue={initial?.pincode} className="field" /></Field>
        </div>
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{role}s</h2>
            <p className="text-xs text-muted">Contact person(s) for this {CONSTITUTIONS[constitution].toLowerCase()}.</p>
          </div>
          <button type="button" onClick={() => setPartners((p) => [...p, blankPartner(role)])} className="btn-ghost"><Plus className="size-4" /> Add {role.toLowerCase()}</button>
        </div>
        <div className="space-y-3">
          {partners.map((p, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-line bg-bg/40 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.4fr_1fr_1fr_auto]">
              <Field label={`${role} name`}><input value={p.name} onChange={(e) => update(i, "name", e.target.value)} className="field" /></Field>
              <Field label="Designation"><input value={p.designation} onChange={(e) => update(i, "designation", e.target.value)} className="field" placeholder={role} /></Field>
              <Field label="Email"><input type="email" value={p.email} onChange={(e) => update(i, "email", e.target.value)} className="field" /></Field>
              <Field label="Mobile"><input type="tel" value={p.mobile} onChange={(e) => update(i, "mobile", e.target.value)} className="field" /></Field>
              <Field label={isCompany ? "DIN" : "PAN"}>
                {isCompany ? (
                  <input value={p.din} onChange={(e) => update(i, "din", e.target.value)} className="field font-mono" maxLength={8} />
                ) : (
                  <input value={p.pan} onChange={(e) => update(i, "pan", e.target.value.toUpperCase())} className="field font-mono uppercase" maxLength={10} />
                )}
              </Field>
              <div className="flex items-end">
                <button type="button" onClick={() => setPartners((ps) => ps.filter((_, j) => j !== i))} className="icon-btn mb-1 hover:text-red-400" aria-label="Remove"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
          {partners.length === 0 && <p className="text-sm text-faint">No {role.toLowerCase()}s added.</p>}
        </div>
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <Field label="Internal notes">
          <textarea name="notes" rows={3} defaultValue={initial?.notes} className="field" placeholder="Fee terms, filing preferences, login details location (don't store passwords here)…" />
        </Field>
      </section>

      <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-line bg-bg/90 py-4 backdrop-blur">
        <a href={initial?.id ? `/clients/${initial.id}` : "/clients"} className="btn-ghost">Cancel</a>
        <Submit>{initial?.id ? "Save changes" : "Add client"}</Submit>
      </div>
    </ActionForm>
  );
}
