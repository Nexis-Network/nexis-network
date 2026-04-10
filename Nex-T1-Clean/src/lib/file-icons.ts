import { FileCode, FileJson, FileText, Code2, type LucideIcon } from "lucide-react";

export type FileIconConfig = {
    icon: LucideIcon;
    color: string;
};

const FILE_ICON_MAP: Record<string, FileIconConfig> = {
    // Solidity
    sol: {
        icon: FileCode,
        color: "#519ABA", // Blue for Solidity
    },
    // JavaScript
    js: {
        icon: Code2,
        color: "#F7DF1E", // Yellow for JS
    },
    jsx: {
        icon: Code2,
        color: "#61DAFB", // React blue
    },
    // TypeScript
    ts: {
        icon: Code2,
        color: "#3178C6", // TypeScript blue
    },
    tsx: {
        icon: Code2,
        color: "#3178C6", // TypeScript blue
    },
    // JSON
    json: {
        icon: FileJson,
        color: "#FFA500", // Orange for JSON
    },
    // Generic text files
    txt: {
        icon: FileText,
        color: "#8C8C8C", // Gray
    },
    md: {
        icon: FileText,
        color: "#8C8C8C", // Gray
    },
};

const DEFAULT_ICON: FileIconConfig = {
    icon: FileText,
    color: "#CCCCCC",
};

export function getFileIcon(fileName: string): FileIconConfig {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return FILE_ICON_MAP[extension] || DEFAULT_ICON;
}
