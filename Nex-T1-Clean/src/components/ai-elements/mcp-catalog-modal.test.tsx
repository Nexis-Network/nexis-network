/**
 * @vitest-environment jsdom
 */

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { McpCatalogModal } from "@/components/ai-elements/mcp-catalog-modal";

vi.mock("@/components/mcp/mcp-catalog", () => ({
  McpCatalog: () => <div data-testid="mcp-catalog" />,
}));

const registryPayload = {
  version: "1.0.0",
  servers: [],
};

describe("McpCatalogModal", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => registryPayload,
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not fetch the MCP registry while the dialog is closed", () => {
    render(<McpCatalogModal open={false} onOpenChange={() => undefined} />);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses responsive wide/tall dialog sizing so the catalog is not squished", async () => {
    render(<McpCatalogModal open onOpenChange={() => undefined} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content).not.toBeNull();

    const className = content?.getAttribute("class") ?? "";
    expect(className).toContain("w-[min(1280px,calc(100vw-2rem))]");
    expect(className).toContain("h-[min(920px,calc(100vh-2rem))]");
    expect(className).toContain("sm:!max-w-none");
    expect(className).toContain("flex");
    expect(className).toContain("flex-col");
  });

  it("renders the custom MCP server card with the specified dimensions and controls", async () => {
    const { getByTestId, getByRole, getByText } = render(<McpCatalogModal open onOpenChange={() => undefined} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const card = getByTestId("mcp-custom-server-card");
    const cardClassName = card.getAttribute("class") ?? "";
    expect(cardClassName).toContain("h-[228px]");
    expect(cardClassName).toContain("w-[1520px]");
    expect(cardClassName).toContain("max-w-full");
    expect(cardClassName).toContain("border-dashed");
    expect(cardClassName).toContain("border-[#2E2E2E]");
    expect(cardClassName).toContain("bg-[rgba(18,18,18,0.25)]");
    expect(cardClassName).toContain("rounded-[8px]");
    expect(cardClassName).toContain("shadow-[0px_1px_2px_rgba(0,0,0,0.05)]");

    const backgroundLayer = getByTestId("mcp-custom-server-card-background");
    const backgroundClassName = backgroundLayer.getAttribute("class") ?? "";
    expect(backgroundClassName).toContain("-inset-[63px]");
    expect(backgroundClassName).toContain("opacity-50");

    const gradientOverlay = getByTestId("mcp-custom-server-card-gradient-overlay");
    const gradientClassName = gradientOverlay.getAttribute("class") ?? "";
    expect(gradientClassName).toContain("bg-[linear-gradient(90deg,#0F0F0F_0%,rgba(15,15,15,0)_100%)]");

    expect(getByText("Add Custom MCP Server")).toBeInTheDocument();
    expect(
      getByText(
        "Deploy and integrate your own custom MCP server using E2B. Compatible with Node.js, Python, and Go to provide you a limitless on-chain experience.",
      ),
    ).toBeInTheDocument();
    expect(getByRole("link", { name: "Deploy server" })).toBeInTheDocument();
    expect(getByRole("link", { name: "Learn more" })).toBeInTheDocument();
  });
});
