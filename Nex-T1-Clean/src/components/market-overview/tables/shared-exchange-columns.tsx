import Image from "next/image";

import type { PaginatedGridColumn } from "./paginated-grid-table";

type CommonExchangeFields = {
  image?: string | null;
  name: string;
  yearEstablished?: number | null;
  country?: string | null;
};

export const buildExchangeIdentityColumns = <T extends CommonExchangeFields>(
  opts: { key: string; header: string },
): Array<PaginatedGridColumn<T>> => [
  {
    key: opts.key,
    header: opts.header,
    width: "minmax(0, 2.2fr)",
    render: (ex) => (
      <div className="flex items-center gap-3">
        <div className="relative h-8 w-8 overflow-hidden rounded-full border border-border/60 bg-muted/60">
          {ex.image ? <Image src={ex.image} alt={ex.name} fill sizes="32px" /> : null}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-medium">{ex.name}</span>
          <span className="text-[11px] uppercase text-muted-foreground">{ex.yearEstablished ?? "—"}</span>
        </div>
      </div>
    ),
  },
  {
    key: "country",
    header: "Country",
    width: "minmax(0, 1.4fr)",
    render: (ex) => <span className="text-sm text-muted-foreground">{ex.country ?? "—"}</span>,
  },
];
