import Papa from "papaparse";

/**
 * Utility functions for processing spreadsheet data
 *
 * This module provides helper functions for:
 * - Parsing CSV data with fallback options
 * - Normalizing data between different formats
 * - Resolving column references (A, B, C or names)
 * - Building filter predicates for data filtering
 * - Detecting data types automatically
 * - Processing text transformations
 */

// Regular expressions for detecting different data types and patterns
const CURRENCY_REGEX = /[$]/; // Detects currency symbols
const BOOLEAN_REGEX = /^(true|false|yes|no)$/i; // Detects boolean values
const PREFIX_REGEX = /add prefix "([^"]+)"/i; // Matches "add prefix" instructions
const SUFFIX_REGEX = /add suffix "([^"]+)"/i; // Matches "add suffix" instructions
const REPLACE_WITH_REGEX = /replace\s+['"]?(.+?)['"]?\s+(?:with|to)\s+['"]?(.+?)['"]?/i; // Matches "replace X with Y"
const CHANGE_TO_REGEX = /change\s+['"]?(.+?)['"]?\s+(?:to|with)\s+['"]?(.+?)['"]?/i; // Matches "change X to Y"
const QUOTES_REGEX = /^['"]|['"]$/g; // Removes quotes from strings
const CHANGE_REPLACE_PREFIX_REGEX = /^(change|replace)\s+(column|value|name|entry)?\s*/i; // Matches "change/replace" prefixes
const TO_WITH_PREFIX_REGEX = /^(to|with)\s+/i; // Matches "to/with" prefixes

/**
 * Result of parsing CSV data
 */
type ParsedCsvResult = {
  fields: string[]; // Column names/headers
  rows: Record<string, string>[]; // Data rows as key-value pairs
};

/**
 * Removes quotes from the beginning and end of a string
 * @param value String that may have quotes around it
 * @returns String with quotes removed and trimmed
 */
const stripQuotes = (value: string) => value.replace(QUOTES_REGEX, "").trim();

/**
 * Checks if a value is null, undefined, or empty string
 * @param value Value to check
 * @returns True if value is nullish or empty
 */
const isNullishOrEmpty = (value: UntypedJson) => value == null || value === "";

/**
 * Parses CSV data with intelligent fallback handling
 *
 * This function tries to parse CSV data normally first. If that fails
 * or produces no data, it falls back to parsing without headers and
 * aligns the data to the provided field names.
 *
 * @param csv Raw CSV string to parse
 * @param alignToFields Optional field names to align data to if parsing fails
 * @returns Parsed data with fields and rows
 */
const parseCsvWithFallback = (csv: string, alignToFields?: string[]): ParsedCsvResult => {
  // First attempt: Parse with headers
  const baseParse = Papa.parse(csv, {
    header: true, // Use first row as column names
    skipEmptyLines: true, // Ignore empty lines
    dynamicTyping: false, // Keep everything as strings
  });

  let fields = baseParse.meta.fields ?? [];
  let rows = (baseParse.data ?? []).filter((row: UntypedJson) => Object.values(row).some((value) => !isNullishOrEmpty(value)));

  // Fallback: If no data found and we have field names to align to
  if (rows.length === 0 && alignToFields?.length) {
    const fallbackParse = Papa.parse(csv, {
      header: false, // Don't use first row as headers
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    // Map each row to the expected field structure
    const fallbackRows = fallbackParse.data
      .map((row: UntypedJson) =>
        alignToFields.reduce<Record<string, string>>((acc, field, index) => {
          acc[field] = row?.[index] ?? "";
          return acc;
        }, {})
      )
      .filter((row: UntypedJson) => Object.values(row).some((value) => !isNullishOrEmpty(value)));

    // Use fallback data if we found any
    if (fallbackRows.length > 0) {
      fields = [...alignToFields];
      rows = fallbackRows;
    }
  }

  return { fields, rows };
};

/**
 * Normalizes row data to match a different set of field names
 *
 * This function maps data from one set of column names to another,
 * handling case-insensitive matching. Useful when merging data from
 * different sources with slightly different column names.
 *
 * @param rows Array of data rows to normalize
 * @param fromFields Current field names in the data
 * @param toFields Target field names to normalize to
 * @returns Normalized rows with the target field names
 */
const normalizeRowsToFields = (rows: Record<string, string>[], fromFields: string[], toFields: string[]) => {
  // If field names are already the same, return as-is
  if (fromFields === toFields) {
    return rows;
  }

  return rows.map((row) => {
    const normalizedRow: Record<string, string> = {};
    for (const field of toFields) {
      // Find matching field (case-insensitive)
      const matchingField = fromFields.find((candidate) => candidate.toLowerCase() === field.toLowerCase());
      // Use matching field's value or empty string if no match
      normalizedRow[field] = matchingField ? row[matchingField] || "" : "";
    }
    return normalizedRow;
  });
};

// Regular expressions for column reference parsing
const columnLetterRegex = /^[A-Z]+$/i; // Matches Excel-style column letters (A, B, AA, etc.)
const COLUMN_PATTERN_REGEX = /column\s+([a-z]+)/i; // Matches "column A" or "column B" patterns

/**
 * Converts Excel-style column letters to zero-based index
 *
 * Examples:
 * - "A" -> 0 (first column)
 * - "B" -> 1 (second column)
 * - "AA" -> 26 (27th column)
 * - "AB" -> 27 (28th column)
 *
 * @param letters Excel-style column letters (A, B, AA, etc.)
 * @returns Zero-based column index, or -1 if invalid
 */
const decodeColumnLetters = (letters: string) => {
  const cleaned = letters.toUpperCase();
  if (!columnLetterRegex.test(cleaned)) {
    return -1; // Invalid format
  }

  let index = 0;
  for (let i = 0; i < cleaned.length; i += 1) {
    index = index * 26 + (cleaned.charCodeAt(i) - 64); // A=65, B=66, etc.
  }
  return index - 1; // Convert to zero-based index
};

/**
 * Resolves a column reference to its index and name
 *
 * This function handles multiple ways of referencing columns:
 * - Exact field name match (case-insensitive): "Name", "Age"
 * - Excel-style letters: "A", "B", "AA"
 * - "Column X" pattern: "column A", "column B"
 * - Partial field name match: "nam" matches "Name"
 *
 * @param reference Column reference string
 * @param fields Available field names
 * @returns Object with index and resolved name
 */
const resolveColumnReference = (reference: string, fields: string[]) => {
  const trimmed = reference.trim();

  if (!trimmed) {
    return { index: -1, name: "" };
  }

  // Try exact field name match (case-insensitive)
  const exactIndex = fields.findIndex((field) => field.toLowerCase() === trimmed.toLowerCase());
  if (exactIndex >= 0) {
    return { index: exactIndex, name: fields[exactIndex] };
  }

  // Try Excel-style column letters
  const columnLetterMatch = trimmed.match(COLUMN_PATTERN_REGEX);
  const letters = columnLetterMatch?.[1] ?? trimmed;
  const decodedIndex = decodeColumnLetters(letters);
  if (decodedIndex >= 0 && decodedIndex < fields.length) {
    return { index: decodedIndex, name: fields[decodedIndex] };
  }

  // Try partial field name match
  const partialIndex = fields.findIndex((field) => field.toLowerCase().includes(trimmed.toLowerCase()));

  return {
    index: partialIndex,
    name: partialIndex >= 0 ? fields[partialIndex] : trimmed,
  };
};

// Regular expression for parsing filter criteria
// Matches: "column operator value" patterns like "age > 25", "name contains John"
const OPERATOR_REGEX = /^(.*?)\s*(>=|<=|!=|==|=|>|<|contains|starts_with|ends_with)\s*(.+)$/i;

/**
 * Parses filter criteria string into structured components
 *
 * Examples:
 * - "age > 25" -> { column: "age", operator: ">", value: "25" }
 * - "name contains John" -> { column: "name", operator: "contains", value: "John" }
 * - "salary >= 50000" -> { column: "salary", operator: ">=", value: "50000" }
 *
 * @param criteria Filter criteria string
 * @returns Parsed criteria object or null if invalid
 */
const parseFilterCriteria = (criteria: string) => {
  const match = criteria.match(OPERATOR_REGEX);

  if (!match) {
    return null;
  }

  const [, rawColumn, rawOperator, rawValue] = match;
  const column = rawColumn.trim();
  const operator = rawOperator.toLowerCase();
  const value = stripQuotes(rawValue.trim());

  return { column, operator, value } as const;
};

/**
 * Converts string values to their appropriate data types
 *
 * This function intelligently converts string input to:
 * - Numbers (including currency with $ and commas removed)
 * - Booleans (true/false, yes/no)
 * - Strings (everything else)
 *
 * Examples:
 * - "$1,000" -> 1000 (number)
 * - "true" -> true (boolean)
 * - "hello" -> "hello" (string)
 *
 * @param input String value to convert
 * @returns Converted value (number, boolean, or string)
 */
const coerceValue = (input: string) => {
  const trimmed = input.trim();
  if (trimmed === "") {
    return "";
  }

  // Try to convert currency to number (remove $ and commas)
  const normalizedCurrency = trimmed.replace(/[$,]/g, "");
  if (normalizedCurrency !== "" && !Number.isNaN(Number(normalizedCurrency))) {
    return Number(normalizedCurrency);
  }

  // Try to convert to boolean
  const lower = trimmed.toLowerCase();
  if (lower === "true") {
    return true;
  }
  if (lower === "false") {
    return false;
  }

  // Return as string if no other conversion applies
  return trimmed;
};

/**
 * Builds a filter function from criteria string
 *
 * This function creates a predicate function that can be used to filter
 * rows based on the given criteria. It handles various operators and
 * data types intelligently.
 *
 * Examples:
 * - "age > 25" -> function that returns true for rows where age > 25
 * - "name contains John" -> function that returns true for rows where name includes "John"
 * - "salary >= 50000" -> function that returns true for rows where salary >= 50000
 *
 * @param criteria Filter criteria string
 * @param fields Available field names
 * @returns Filter predicate function or null if criteria is invalid
 */
const buildFilterPredicate = (criteria: string, fields: string[]) => {
  const parsed = parseFilterCriteria(criteria);
  if (!parsed) {
    return null;
  }

  const { column, operator, value } = parsed;
  const { index } = resolveColumnReference(column, fields);
  if (index < 0 || index >= fields.length) {
    return null;
  }

  const fieldName = fields[index];
  const comparisonValue = coerceValue(value);

  // Return a function that tests each row against the criteria
  return (row: Record<string, string>) => {
    const cellValueRaw = row[fieldName] ?? "";
    const cellValue = coerceValue(String(cellValueRaw));

    switch (operator) {
      case ">":
        return Number(cellValue) > Number(comparisonValue);
      case ">=":
        return Number(cellValue) >= Number(comparisonValue);
      case "<":
        return Number(cellValue) < Number(comparisonValue);
      case "<=":
        return Number(cellValue) <= Number(comparisonValue);
      case "=":
      case "==":
        // Handle both numeric and string comparisons
        if (typeof cellValue === "number" && typeof comparisonValue === "number") {
          return cellValue === comparisonValue;
        }
        return String(cellValue).toLowerCase() === String(comparisonValue).toLowerCase();
      case "!=":
        // Handle both numeric and string comparisons
        if (typeof cellValue === "number" && typeof comparisonValue === "number") {
          return cellValue !== comparisonValue;
        }
        return String(cellValue).toLowerCase() !== String(comparisonValue).toLowerCase();
      case "contains":
        return String(cellValue).toLowerCase().includes(String(comparisonValue).toLowerCase());
      case "starts_with":
        return String(cellValue).toLowerCase().startsWith(String(comparisonValue).toLowerCase());
      case "ends_with":
        return String(cellValue).toLowerCase().endsWith(String(comparisonValue).toLowerCase());
      default:
        return true; // Unknown operator, include all rows
    }
  };
};

/**
 * Extracts replacement instructions from text
 *
 * This function parses various formats of replacement instructions:
 * - "replace X with Y"
 * - "change X to Y"
 * - "X -> Y"
 *
 * Examples:
 * - "replace 'old' with 'new'" -> { from: "old", to: "new" }
 * - "change 'John' to 'Jane'" -> { from: "John", to: "Jane" }
 * - "Mr. -> Dr." -> { from: "Mr.", to: "Dr." }
 *
 * @param instruction Text instruction to parse
 * @returns Replacement instruction object or null if invalid
 */
const extractReplacementInstruction = (instruction: string) => {
  // Try "replace X with Y" pattern
  const replaceMatch = instruction.match(REPLACE_WITH_REGEX);
  if (replaceMatch) {
    return {
      from: stripQuotes(replaceMatch[1]),
      to: stripQuotes(replaceMatch[2]),
    };
  }

  // Try "change X to Y" pattern
  const changeMatch = instruction.match(CHANGE_TO_REGEX);
  if (changeMatch) {
    return {
      from: stripQuotes(changeMatch[1]),
      to: stripQuotes(changeMatch[2]),
    };
  }

  // Try "X -> Y" pattern
  if (instruction.includes("->")) {
    const [rawFrom, rawTo] = instruction.split("->").map((segment) => segment.trim());
    if (rawFrom && rawTo) {
      const cleanedFrom = stripQuotes(rawFrom.replace(CHANGE_REPLACE_PREFIX_REGEX, ""));
      const cleanedTo = stripQuotes(rawTo.replace(TO_WITH_PREFIX_REGEX, ""));

      if (cleanedFrom && cleanedTo) {
        return {
          from: cleanedFrom,
          to: cleanedTo,
        };
      }
    }
  }

  return null;
};

/**
 * Automatically detects the data type of a column
 *
 * This function analyzes the values in a column to determine its type:
 * - "currency": Values contain $ symbols and are numeric
 * - "number": All values are numeric (no currency symbols)
 * - "date": 60%+ of values are valid dates
 * - "boolean": All values are true/false or yes/no
 * - "text": Everything else (default)
 *
 * @param values Array of string values from the column
 * @returns Detected column type
 */
const detectColumnType = (values: string[]) => {
  const nonEmptyValues = values.filter((value) => !isNullishOrEmpty(value));
  if (nonEmptyValues.length === 0) {
    return "text" as const;
  }

  // Check if all values are numeric
  const numericMatch = nonEmptyValues.filter((value) => {
    const normalized = value.replace(/[$,]/g, ""); // Remove currency symbols
    return normalized !== "" && !Number.isNaN(Number(normalized));
  }).length;

  if (numericMatch === nonEmptyValues.length) {
    // Check if any values contain currency symbols
    const currencyMatch = nonEmptyValues.some((value) => CURRENCY_REGEX.test(value));
    return currencyMatch ? ("currency" as const) : ("number" as const);
  }

  // Check if most values are valid dates
  const dateMatch = nonEmptyValues.filter((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  }).length;

  if (dateMatch > nonEmptyValues.length * 0.6) {
    return "date" as const;
  }

  // Check if all values are boolean
  const booleanMatch = nonEmptyValues.filter((value) => BOOLEAN_REGEX.test(value)).length;

  if (booleanMatch === nonEmptyValues.length) {
    return "boolean" as const;
  }

  // Default to text
  return "text" as const;
};

const normalizeCsv = (csv: string) => (csv || "").trim().replace(/\r\n/g, "\n");

export {
  parseCsvWithFallback,
  normalizeRowsToFields,
  resolveColumnReference,
  buildFilterPredicate,
  extractReplacementInstruction,
  detectColumnType,
  normalizeCsv,
  isNullishOrEmpty,
  coerceValue,
  PREFIX_REGEX,
  SUFFIX_REGEX,
};
