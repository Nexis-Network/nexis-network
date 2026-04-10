import { DocsSection } from "@/components/docs/docs-primitives";
import { DOCS_CHANGELOG_ENTRIES } from "@/modules/docs/changelog-data";

export function DocsChangelog() {
  return (
    <DocsSection id="recent-platform-updates" title="Recent platform updates">
      <div className="divide-y divide-border/60 border-y border-border/60">
        {DOCS_CHANGELOG_ENTRIES.map((entry) => (
          <article key={entry.id} className="py-5 first:pt-0 last:pb-0">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{entry.date}</p>
              <h3 className="text-lg font-medium text-foreground">{entry.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{entry.summary}</p>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-foreground/80 marker:text-muted-foreground">
              {entry.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </DocsSection>
  );
}
