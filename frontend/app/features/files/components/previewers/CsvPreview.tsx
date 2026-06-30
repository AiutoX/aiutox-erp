/**
 * CsvPreview Component
 * Displays CSV files in a table format
 */

import { useMemo } from "react";
import { useFileContent } from "../../hooks/useFiles";
import { Card, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface CsvPreviewProps {
  fileId: string;
  fileName: string;
}

/**
 * Parse CSV content
 */
function parseCSV(content: string): string[][] {
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentLine += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "\n" && !inQuotes) {
      // End of line
      lines.push(currentLine);
      currentLine = "";
    } else if (char === "\r" && nextChar === "\n" && !inQuotes) {
      // Windows line ending
      lines.push(currentLine);
      currentLine = "";
      i++; // Skip \n
    } else {
      currentLine += char;
    }
  }

  // Add last line
  if (currentLine) {
    lines.push(currentLine);
  }

  // Parse each line into columns
  return lines.map((line) => {
    const columns: string[] = [];
    let currentColumn = "";
    let inColumnQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inColumnQuotes && nextChar === '"') {
          currentColumn += '"';
          i++;
        } else {
          inColumnQuotes = !inColumnQuotes;
        }
      } else if (char === "," && !inColumnQuotes) {
        columns.push(currentColumn.trim());
        currentColumn = "";
      } else {
        currentColumn += char;
      }
    }

    columns.push(currentColumn.trim());
    return columns;
  });
}

/**
 * CsvPreview component
 */
export function CsvPreview({ fileId }: CsvPreviewProps) {
  const { t } = useTranslation();
  const { data: content, isLoading, error } = useFileContent(fileId);

  const parsedData = useMemo(() => {
    if (!content) return [];
    try {
      return parseCSV(content);
    } catch (err) {
      console.error("Error parsing CSV:", err);
      return [];
    }
  }, [content]);

  // Limit rows for preview (first 100 rows)
  const displayData = useMemo(() => {
    return parsedData.slice(0, 100);
  }, [parsedData]);

  const hasMoreRows = parsedData.length > 100;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>{t("files.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive">
            {t("files.error") || "Error loading file content"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!content || parsedData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            {t("files.previewNotAvailable") || "Preview not available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const headers = displayData[0] || [];
  const rows = displayData.slice(1);

  return (
    <Card>
      <CardContent className="p-6">
        {hasMoreRows && (
          <p className="text-sm text-muted-foreground mb-4">
            {t("files.showingFirstRows") || `Showing first 100 rows`}
          </p>
        )}
        <div className="border rounded-md overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={index}>
                    {header || `Column ${index + 1}`}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map((_, colIndex) => (
                    <TableCell key={colIndex}>{row[colIndex] || ""}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
