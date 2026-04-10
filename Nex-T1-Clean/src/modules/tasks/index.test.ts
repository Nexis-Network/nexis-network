import { describe, expect, it } from "vitest";

import { normalizeTask } from "./index";

describe("normalizeTask", () => {
  it("collapses unknown backend statuses to unknown", () => {
    const task = normalizeTask({
      id: "task-1",
      title: "Review automation drift",
      status: "brand_new_status",
    });

    expect(task.status).toBe("unknown");
    expect(task.rawStatus).toBe("brand_new_status");
  });
});
