import { DocsSection } from "@/components/docs/docs-primitives";
import { DOCS_ROADMAP_ITEMS } from "@/modules/docs/roadmap-data";

export function DocsRoadmap() {
  return (
    <DocsSection id="directional-workstreams" title="Directional workstreams">
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        {DOCS_ROADMAP_ITEMS.map((item) => (
          <article key={item.id} className="border-t border-border/60 pt-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-medium text-foreground">{item.title}</h3>
              <span className="text-[11px] font-medium text-muted-foreground">
                {item.stage}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </div>
    </DocsSection>
  );
}
