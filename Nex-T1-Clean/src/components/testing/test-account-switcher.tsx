"use client";

import { useState } from "react";

export function TestAccountSwitcher() {
  const [open, setOpen] = useState(false);

  const setActive = (orgId: string) => {
    document.cookie = `org_active_account=${orgId}; path=/`;
    setOpen(false);
  };

  return (
    <div className="p-4">
      <button
        type="button"
        className="rounded border px-3 py-2 text-sm font-medium"
        onClick={() => setOpen((prev) => !prev)}
      >
        Manage account
      </button>
      {open ? (
        <div role="menu" className="mt-2 grid gap-1 rounded border bg-white p-2 text-sm text-black">
          <button role="menuitem" onClick={() => setActive("acc_A")} className="rounded px-2 py-1 text-left hover:bg-gray-100">
            Alpha
          </button>
          <button role="menuitem" onClick={() => setActive("acc_B")} className="rounded px-2 py-1 text-left hover:bg-gray-100">
            Beta
          </button>
        </div>
      ) : null}
    </div>
  );
}
