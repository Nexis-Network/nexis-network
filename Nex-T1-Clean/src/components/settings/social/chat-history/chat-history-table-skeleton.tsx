import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
  SettingsTableShell,
} from "@/components/settings/shared/settings-table";

const SKELETON_ROWS = Array.from({ length: 6 }, (_, index) => index);

export function ChatHistoryTableSkeleton() {
  return (
    <SettingsTableShell>
      <SettingsTable className="min-w-[980px]">
        <SettingsTableHeader>
          <SettingsTableHeaderRow>
            {[
              "Conversation",
              "Latest message",
              "Messages",
              "Date",
              "Time",
              "Status",
            ].map((heading) => (
              <SettingsTableHead key={heading}>{heading}</SettingsTableHead>
            ))}
          </SettingsTableHeaderRow>
        </SettingsTableHeader>

        <SettingsTableBody>
          {SKELETON_ROWS.map((row) => (
            <SettingsTableRow key={row}>
              <SettingsTableCell>
                <div className="space-y-2">
                  <div className="h-4 w-44 animate-pulse rounded-full bg-[var(--settings-elevated)]" />
                  <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--settings-elevated)]" />
                </div>
              </SettingsTableCell>
              <SettingsTableCell>
                <div className="space-y-2">
                  <div className="h-4 w-full max-w-[360px] animate-pulse rounded-full bg-[var(--settings-elevated)]" />
                  <div className="h-4 w-56 animate-pulse rounded-full bg-[var(--settings-elevated)]" />
                </div>
              </SettingsTableCell>
              <SettingsTableCell>
                <div className="h-4 w-10 animate-pulse rounded-full bg-[var(--settings-elevated)]" />
              </SettingsTableCell>
              <SettingsTableCell>
                <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--settings-elevated)]" />
              </SettingsTableCell>
              <SettingsTableCell>
                <div className="h-4 w-[72px] animate-pulse rounded-full bg-[var(--settings-elevated)]" />
              </SettingsTableCell>
              <SettingsTableCell>
                <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--settings-elevated)]" />
              </SettingsTableCell>
            </SettingsTableRow>
          ))}
        </SettingsTableBody>
      </SettingsTable>
    </SettingsTableShell>
  );
}
