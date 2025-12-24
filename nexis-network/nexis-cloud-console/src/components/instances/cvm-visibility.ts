"use client";

import { getCsrfToken } from "@/lib/csrf";

export async function updateCvmVisibility(
  appId: string,
  publicSysinfo: boolean,
  publicLogs: boolean
) {
  const token = await getCsrfToken();
  const response = await fetch(`/api/cvms/${appId}/visibility`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify({ public_sysinfo: publicSysinfo, public_logs: publicLogs }),
  });

  if (!response.ok) {
    let message = "Unable to update visibility settings.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      // ignore json parsing errors
    }
    throw new Error(message);
  }

  return response.json();
}
