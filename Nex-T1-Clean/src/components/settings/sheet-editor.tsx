"use client";

import { useTheme } from "next-themes";
import { parse, unparse } from "papaparse";
import { memo, useEffect, useMemo, useState } from "react";
import {
  DataGrid,
  type Column,
  type RowsChangeData,
  type SortColumn,
  textEditor,
} from "react-data-grid";
import { resolveAppThemeMode } from "@/lib/theme/app-theme";
import { cn } from "@/lib/utils";

import "react-data-grid/lib/styles.css";

type SheetRow = Record<string, string | number>;

type ColumnDef = Column<SheetRow, SheetRow>;

/**
 * Props for the spreadsheet editor component
 */
type SheetEditorProps = {
  content: string; // CSV content to display
  saveContent: (content: string, isCurrentVersion: boolean) => void; // Function to save changes
  currentVersionIndex: number; // Which version of the data we're viewing
  isCurrentVersion: boolean; // Whether this is the latest version
  status: string; // Current status (loading, streaming, etc.)
};

// Minimum dimensions for the spreadsheet grid
const MIN_ROWS = 50; // Always show at least 50 rows
const MIN_COLS = 26; // Always show at least 26 columns (A-Z)

/**
 * Main spreadsheet editor component
 *
 * This component:
 * - Displays CSV data in a spreadsheet-like grid
 * - Allows users to edit cells directly
 * - Supports sorting by columns
 * - Automatically saves changes as the user types
 * - Handles both light and dark themes
 * - Ensures minimum grid size for better UX
 */
const PureSpreadsheetEditor = ({ content, saveContent }: SheetEditorProps) => {
  const { theme, resolvedTheme } = useTheme();
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);

  // Parse CSV content and ensure minimum grid size
  const parseData: string[][] = useMemo(() => {
    // If no content, create empty grid with minimum dimensions
    if (!content) {
      return Array.from({ length: MIN_ROWS }, () => Array.from({ length: MIN_COLS }, () => ""));
    }

    // Parse the CSV content
    const result = parse(content, { skipEmptyLines: true }) as { data: string[][] };

    // Pad each row to ensure minimum column count
    const paddedData = (result.data ?? []).map((row: string[]) => {
      const paddedRow = [...row];
      while (paddedRow.length < MIN_COLS) {
        paddedRow.push("");
      }
      return paddedRow;
    });

    // Add empty rows to ensure minimum row count
    while (paddedData.length < MIN_ROWS) {
      paddedData.push(Array.from({ length: MIN_COLS }, () => ""));
    }

    return paddedData;
  }, [content]);

  // Define the columns for the data grid
  const columns = useMemo(() => {
    // Row number column (frozen on the left)
    const rowNumberColumn: ColumnDef = {
      key: "rowNumber",
      name: "",
      frozen: true, // Stays visible when scrolling horizontally
      width: 50,
      renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1, // Show row numbers starting from 1
      cellClass: "border-t border-r dark:bg-zinc-950 dark:text-zinc-50",
      headerCellClass: "border-t border-r dark:bg-zinc-900 dark:text-zinc-50",
    };

    // Data columns (A, B, C, etc.)
    const dataColumns: ColumnDef[] = Array.from({ length: MIN_COLS }, (_, i) => ({
      key: i.toString(),
      name: String.fromCharCode(65 + i), // Convert index to letter (0=A, 1=B, etc.)
      renderEditCell: textEditor, // Allow editing with text input
      width: 120,
      cellClass: cn("border-t dark:bg-zinc-950 dark:text-zinc-50", {
        "border-l": i !== 0, // Add left border except for first column
      }),
      headerCellClass: cn("border-t dark:bg-zinc-900 dark:text-zinc-50", {
        "border-l": i !== 0, // Add left border except for first column
      }),
    }));

    return [rowNumberColumn, ...dataColumns];
  }, []);

  // Convert parsed data into rows for the data grid
  const initialRows: SheetRow[] = useMemo(
    () =>
      parseData.map((row, rowIndex) => {
        const rowData: SheetRow = {
          id: rowIndex,
          rowNumber: rowIndex + 1,
        };

        // Add data for each column (skip the row number column)
        columns.slice(1).forEach((col, colIndex) => {
          rowData[col.key] = row[colIndex] || "";
        });

        return rowData;
      }),
    [parseData, columns]
  );

  // Track local changes to the data
  const [localRows, setLocalRows] = useState<SheetRow[]>(initialRows);

  // Update local rows when the initial data changes
  useEffect(() => {
    setLocalRows(initialRows);
  }, [initialRows]);

  // Apply sorting to the data while keeping the header row at the top
  const sortedRows: SheetRow[] = useMemo(() => {
    // If no sorting is applied, return rows as-is
    if (sortColumns.length === 0) {
      return localRows;
    }

    // Separate header row from data rows
    if (localRows.length === 0) {
      return localRows;
    }

    const headerRow = localRows[0];
    const dataRows = localRows.slice(1);

    // Sort only the data rows (not the header)
    const sortedDataRows = [...dataRows].sort((rowA, rowB) => {
      // Apply each sort column in order
      for (const sort of sortColumns) {
        const comparator = (a: Record<string, string | number>, b: Record<string, string | number>) => {
          const aVal = a[sort.columnKey];
          const bVal = b[sort.columnKey];

          // Handle empty values - put them at the end
          if (aVal === "" && bVal === "") {
            return 0;
          }
          if (aVal === "") {
            return sort.direction === "ASC" ? 1 : -1;
          }
          if (bVal === "") {
            return sort.direction === "ASC" ? -1 : 1;
          }

          // Try to parse as numbers for numeric comparison
          const aNum = Number.parseFloat(String(aVal));
          const bNum = Number.parseFloat(String(bVal));

          const aIsNumber = !Number.isNaN(aNum);
          const bIsNumber = !Number.isNaN(bNum);
          const bothAreNumbers = aIsNumber && bIsNumber;

          // If both values are numbers, compare numerically
          if (bothAreNumbers) {
            return sort.direction === "ASC" ? aNum - bNum : bNum - aNum;
          }

          // Otherwise, compare as strings (case-insensitive)
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();

          if (aStr < bStr) {
            return sort.direction === "ASC" ? -1 : 1;
          }
          if (aStr > bStr) {
            return sort.direction === "ASC" ? 1 : -1;
          }
          return 0;
        };

        const result = comparator(rowA, rowB);
        if (result !== 0) {
          return result;
        }
      }
      return 0;
    });

    // Return header row + sorted data rows
    return [headerRow, ...sortedDataRows];
  }, [localRows, sortColumns]);

  // Convert 2D array back to CSV format
  const generateCsv = (data: string[][]) => unparse(data);

  // Handle when user edits cells - save changes automatically
  const handleRowsChange = (
    rows: SheetRow[],
    _data: RowsChangeData<SheetRow, SheetRow>
  ) => {
    setLocalRows(rows);

    // Convert grid data back to CSV format
    const updatedData = rows.map((row) => columns.slice(1).map((col) => String(row[col.key] || "")));

    // Generate CSV and save it
    const newCsvContent = generateCsv(updatedData);
    saveContent(newCsvContent, true);
  };

  // Handle when user changes sort settings
  const handleSortColumnsChange = (newSortColumns: readonly SortColumn[]) => {
    setSortColumns(newSortColumns);
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <DataGrid<SheetRow, SheetRow>
        className={
          resolveAppThemeMode(theme, resolvedTheme) === "light"
            ? "rdg-light"
            : "rdg-dark"
        }
        columns={columns}
        defaultColumnOptions={{
          resizable: true, // Allow users to resize columns
          sortable: true, // Allow users to sort by columns
        }}
        enableVirtualization // Only render visible rows for performance
        onCellClick={(args) => {
          // Don't allow editing the row number column
          if (args.column.key !== "rowNumber") {
            args.selectCell(true);
          }
        }}
        onRowsChange={handleRowsChange} // Save changes when user edits
        onSortColumnsChange={handleSortColumnsChange} // Update sort when user clicks headers
        rows={sortedRows} // Display the sorted data
        sortColumns={sortColumns} // Current sort settings
        style={
          {
            height: "100%",
            // Custom CSS variables for theming
            "--rdg-border-color": "hsl(var(--border))",
            "--rdg-header-background-color": "hsl(var(--muted))",
            "--rdg-row-hover-background-color": "hsl(var(--muted) / 0.5)",
            "--rdg-selection-color": "hsl(var(--primary) / 0.2)",
            "--rdg-font-size": "13px",
            "--rdg-line-height": "1.4",
            "--rdg-cell-padding": "8px 12px",
          } as React.CSSProperties
        }
      />
    </div>
  );
};

/**
 * Custom comparison function for React.memo
 * Determines when the component should re-render
 *
 * Only re-renders when:
 * - Version index changes (switching between different versions)
 * - Current version status changes
 * - Content changes (new data from AI)
 * - Save function changes
 * - Status changes (but not during streaming to avoid flicker)
 */
function areEqual(prevProps: SheetEditorProps, nextProps: SheetEditorProps) {
  return (
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === "streaming" && nextProps.status === "streaming") &&
    prevProps.content === nextProps.content &&
    prevProps.saveContent === nextProps.saveContent
  );
}

/**
 * Memoized spreadsheet editor component
 *
 * Uses React.memo to prevent unnecessary re-renders when props haven't changed.
 * This improves performance, especially with large datasets.
 */
export const SpreadsheetEditor = memo(PureSpreadsheetEditor, areEqual);
