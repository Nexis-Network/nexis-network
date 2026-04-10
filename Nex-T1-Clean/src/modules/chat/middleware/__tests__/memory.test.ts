/**
 * Memory System Integration Tests
 *
 * Tests directory resolution, frontmatter parsing, MEMORY.md index operations,
 * file writing with frontmatter, path traversal prevention, and concurrent writes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  getMemoryDir,
  ensureMemoryDir,
  readIndex,
  buildMemoryPrompt,
  writeMemoryFile,
  updateIndex,
  scanMemoryFiles,
} from "../memory/store";

import type { MemoryFrontmatter } from "../memory/types";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "nex-memory-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

const validFrontmatter: MemoryFrontmatter = {
  name: "Test Memory",
  description: "A test memory entry",
  type: "user",
};

// ---------------------------------------------------------------------------
// Directory resolution
// ---------------------------------------------------------------------------

describe("getMemoryDir", () => {
  it("returns a path under ~/.nex-t1/projects/<slug>/memory/", () => {
    const dir = getMemoryDir("/home/dev/my-project");
    expect(dir).toContain(".nex-t1");
    expect(dir).toContain("projects");
    expect(dir).toContain("memory");
  });

  it("sanitizes path traversal characters from project root", () => {
    const dir = getMemoryDir("/../../etc/passwd");
    expect(dir).not.toContain("..");
    expect(dir).not.toContain("/etc/passwd");
  });

  it("produces consistent slugs for the same path", () => {
    const a = getMemoryDir("/home/dev/project");
    const b = getMemoryDir("/home/dev/project");
    expect(a).toBe(b);
  });

  it("produces different slugs for different paths", () => {
    const a = getMemoryDir("/home/dev/project-a");
    const b = getMemoryDir("/home/dev/project-b");
    expect(a).not.toBe(b);
  });

  it("truncates extremely long project paths", () => {
    const longPath = "/home/dev/" + "a".repeat(500);
    const dir = getMemoryDir(longPath);
    // The slug component should be capped at 120 chars
    const parts = dir.split("/");
    const slugPart = parts.find((p) => p.includes("aaa"));
    if (slugPart) {
      expect(slugPart.length).toBeLessThanOrEqual(120);
    }
  });
});

// ---------------------------------------------------------------------------
// Frontmatter parsing (via writeMemoryFile + scanMemoryFiles)
// ---------------------------------------------------------------------------

describe("Frontmatter parsing", () => {
  it("writes and reads back valid frontmatter", async () => {
    await writeMemoryFile(tempDir, "test.md", validFrontmatter, "Body text");
    const files = await scanMemoryFiles(tempDir);

    expect(files.length).toBe(1);
    expect(files[0].frontmatter.name).toBe("Test Memory");
    expect(files[0].frontmatter.type).toBe("user");
    expect(files[0].content).toContain("Body text");
  });

  it("skips files with missing frontmatter fields", async () => {
    // Write a file manually with incomplete frontmatter
    const bad = "---\nname: Only Name\n---\nBody";
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, "bad.md"), bad, "utf-8");

    const files = await scanMemoryFiles(tempDir);
    expect(files.length).toBe(0);
  });

  it("handles CRLF line endings in frontmatter", async () => {
    const content = "---\r\nname: Win\r\ndescription: Windows file\r\ntype: project\r\n---\r\nContent here";
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, "crlf.md"), content, "utf-8");

    const files = await scanMemoryFiles(tempDir);
    expect(files.length).toBe(1);
    expect(files[0].frontmatter.name).toBe("Win");
  });

  it("strips surrounding quotes from YAML values", async () => {
    const content = '---\nname: "Quoted Name"\ndescription: \'Single Quoted\'\ntype: feedback\n---\nBody';
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, "quoted.md"), content, "utf-8");

    const files = await scanMemoryFiles(tempDir);
    expect(files.length).toBe(1);
    expect(files[0].frontmatter.name).toBe("Quoted Name");
    expect(files[0].frontmatter.description).toBe("Single Quoted");
  });

  it("rejects invalid memory type in frontmatter", async () => {
    const content = "---\nname: Bad Type\ndescription: Test\ntype: invalid\n---\nBody";
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, "badtype.md"), content, "utf-8");

    const files = await scanMemoryFiles(tempDir);
    expect(files.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Index (MEMORY.md) operations
// ---------------------------------------------------------------------------

describe("MEMORY.md index", () => {
  it("reads empty string when index does not exist", async () => {
    const content = await readIndex(tempDir);
    expect(content).toBe("");
  });

  it("reads existing index content", async () => {
    await ensureMemoryDir(tempDir);
    await writeFile(
      join(tempDir, "MEMORY.md"),
      "- [Entry](file.md) -- Description\n",
      "utf-8",
    );

    const content = await readIndex(tempDir);
    expect(content).toContain("Entry");
  });

  it("truncates index exceeding max lines", async () => {
    await ensureMemoryDir(tempDir);
    const lines = Array.from({ length: 300 }, (_, i) => `Line ${i}`).join("\n");
    await writeFile(join(tempDir, "MEMORY.md"), lines, "utf-8");

    const content = await readIndex(tempDir);
    // Default max is 200 lines; content should be truncated
    expect(content.split("\n").length).toBeLessThan(305);
    expect(content).toContain("truncated");
  });

  it("adds new entries to the index", async () => {
    await ensureMemoryDir(tempDir);

    await updateIndex(tempDir, {
      title: "First Entry",
      filename: "first.md",
      description: "The first memory",
    });

    const content = await readFile(join(tempDir, "MEMORY.md"), "utf-8");
    expect(content).toContain("First Entry");
    expect(content).toContain("first.md");
  });

  it("updates existing entries (duplicate detection)", async () => {
    await ensureMemoryDir(tempDir);

    await updateIndex(tempDir, {
      title: "Entry V1",
      filename: "entry.md",
      description: "Version 1",
    });

    await updateIndex(tempDir, {
      title: "Entry V2",
      filename: "entry.md",
      description: "Version 2",
    });

    const content = await readFile(join(tempDir, "MEMORY.md"), "utf-8");
    // Should have only one line for entry.md, updated to V2
    const matches = content.split("\n").filter((l) => l.includes("entry.md"));
    expect(matches.length).toBe(1);
    expect(matches[0]).toContain("Entry V2");
  });
});

// ---------------------------------------------------------------------------
// Memory prompt building
// ---------------------------------------------------------------------------

describe("buildMemoryPrompt", () => {
  it("returns empty string for empty index content", () => {
    expect(buildMemoryPrompt("")).toBe("");
    expect(buildMemoryPrompt("   ")).toBe("");
  });

  it("includes memory index in prompt", () => {
    const prompt = buildMemoryPrompt("- [Test](test.md) -- A test memory");
    expect(prompt).toContain("auto memory");
    expect(prompt).toContain("Test");
  });

  it("escapes heading injection in memory content", () => {
    const prompt = buildMemoryPrompt("# Injected Heading\n> Blockquote");
    expect(prompt).toContain("\\#");
    expect(prompt).toContain("\\>");
  });
});

// ---------------------------------------------------------------------------
// Path traversal prevention
// ---------------------------------------------------------------------------

describe("Path traversal prevention", () => {
  it("rejects filenames with directory separators", async () => {
    await expect(
      writeMemoryFile(tempDir, "../escape.md", validFrontmatter, "evil"),
    ).rejects.toThrow("directory separators");
  });

  it("rejects filenames without .md extension", async () => {
    await expect(
      writeMemoryFile(tempDir, "test.txt", validFrontmatter, "content"),
    ).rejects.toThrow(".md extension");
  });

  it("rejects writing to the index file directly", async () => {
    await expect(
      writeMemoryFile(tempDir, "MEMORY.md", validFrontmatter, "content"),
    ).rejects.toThrow("index file");
  });

  it("rejects hidden filenames", async () => {
    await expect(
      writeMemoryFile(tempDir, ".hidden.md", validFrontmatter, "content"),
    ).rejects.toThrow("Unsafe");
  });

  it("rejects empty filename", async () => {
    await expect(
      writeMemoryFile(tempDir, "", validFrontmatter, "content"),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Write validation
// ---------------------------------------------------------------------------

describe("Write validation", () => {
  it("rejects empty frontmatter name", async () => {
    await expect(
      writeMemoryFile(
        tempDir,
        "test.md",
        { ...validFrontmatter, name: "" },
        "content",
      ),
    ).rejects.toThrow("name must not be empty");
  });

  it("rejects empty frontmatter description", async () => {
    await expect(
      writeMemoryFile(
        tempDir,
        "test.md",
        { ...validFrontmatter, description: "" },
        "content",
      ),
    ).rejects.toThrow("description must not be empty");
  });

  it("rejects invalid memory type", async () => {
    await expect(
      writeMemoryFile(
        tempDir,
        "test.md",
        { ...validFrontmatter, type: "invalid" as any },
        "content",
      ),
    ).rejects.toThrow("Invalid memory type");
  });

  it("sanitizes frontmatter to prevent YAML delimiter injection", async () => {
    const injectionFm: MemoryFrontmatter = {
      name: "Name---with---delimiters",
      description: "Desc with\nnewlines",
      type: "user",
    };

    await writeMemoryFile(tempDir, "safe.md", injectionFm, "content");
    const raw = await readFile(join(tempDir, "safe.md"), "utf-8");

    // Frontmatter delimiters should not appear in field values
    const lines = raw.split("\n");
    const nameLines = lines.filter((l) => l.startsWith("name:"));
    expect(nameLines.length).toBe(1);
    expect(nameLines[0]).not.toContain("---");
  });
});

// ---------------------------------------------------------------------------
// Concurrent write serialization
// ---------------------------------------------------------------------------

describe("Concurrent writes", () => {
  it("serializes concurrent index updates without corruption", async () => {
    await ensureMemoryDir(tempDir);

    // Fire 10 concurrent updates
    const promises = Array.from({ length: 10 }, (_, i) =>
      updateIndex(tempDir, {
        title: `Entry ${i}`,
        filename: `entry_${i}.md`,
        description: `Description ${i}`,
      }),
    );

    await Promise.all(promises);

    const content = await readFile(join(tempDir, "MEMORY.md"), "utf-8");
    const lines = content
      .split("\n")
      .filter((l) => l.startsWith("- ["));

    // All 10 entries should be present
    expect(lines.length).toBe(10);
  });
});
