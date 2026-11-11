"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { deleteClient, toggleClientActive } from "@/app/actions/clients";
import { ConfirmButton } from "@/components/forms";

export function ClientAdminActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  return (
    <>
      <ConfirmButton
        action={() => toggleClientActive(id)}
        label={active ? "Mark inactive" : "Reactivate"}
        confirm={active ? `Mark ${name} as inactive? It will be hidden from lists but its history is kept.` : `Reactivate ${name}?`}
        className="btn-ghost"
      >
        {active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />} {active ? "Deactivate" : "Reactivate"}
      </ConfirmButton>
      <ConfirmButton
        action={() => deleteClient(id)}
        label="Delete client"
        confirm={`Permanently delete ${name}? Partners and communication logs are deleted; tasks are kept but unlinked. Consider "Deactivate" instead.`}
        className="btn-danger px-2.5"
      >
        <Trash2 className="size-4" />
      </ConfirmButton>
    </>
  );
}
