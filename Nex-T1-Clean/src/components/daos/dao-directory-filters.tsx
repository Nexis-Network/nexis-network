import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DaoDirectoryFiltersProps = {
  values: {
    q?: string;
    category?: string;
    chainFamily?: string;
    ownershipMode?: string;
    importSource?: string;
    lifecycleState?: string;
    mineOnly?: string;
  };
};

function SelectField(props: {
  name: string;
  placeholder: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select defaultValue={props.value} name={props.name}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={props.placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {props.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DaoDirectoryFilters({
  values,
}: DaoDirectoryFiltersProps) {
  return (
    <form className="grid gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm lg:grid-cols-[1.6fr_repeat(5,minmax(0,1fr))_auto_auto]">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={values.q}
          className="pl-9"
          placeholder="Search DAOs, tags, treasury models, chains..."
        />
      </label>

      <SelectField
        name="category"
        placeholder="Category"
        value={values.category}
        options={[
          { value: "all", label: "All categories" },
          { value: "investment", label: "Investment" },
          { value: "protocol", label: "Protocol" },
          { value: "community", label: "Community" },
          { value: "media", label: "Media" },
        ]}
      />

      <SelectField
        name="chainFamily"
        placeholder="Chain"
        value={values.chainFamily}
        options={[
          { value: "all", label: "All chains" },
          { value: "evm", label: "EVM" },
          { value: "solana", label: "Solana" },
        ]}
      />

      <SelectField
        name="ownershipMode"
        placeholder="Ownership"
        value={values.ownershipMode}
        options={[
          { value: "all", label: "All ownership" },
          { value: "user", label: "User owned" },
          { value: "agent", label: "Agent owned" },
          { value: "hybrid", label: "Hybrid" },
        ]}
      />

      <SelectField
        name="importSource"
        placeholder="Source"
        value={values.importSource}
        options={[
          { value: "all", label: "All sources" },
          { value: "app", label: "Created here" },
          { value: "imported", label: "Imported" },
        ]}
      />

      <SelectField
        name="lifecycleState"
        placeholder="State"
        value={values.lifecycleState}
        options={[
          { value: "all", label: "All states" },
          { value: "draft", label: "Draft" },
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
          { value: "detached", label: "Detached" },
        ]}
      />

      <SelectField
        name="mineOnly"
        placeholder="Scope"
        value={values.mineOnly}
        options={[
          { value: "false", label: "All DAOs" },
          { value: "true", label: "My DAOs" },
        ]}
      />

      <Button type="submit" className="min-w-24">
        Apply
      </Button>

      <Button type="reset" variant="outline" asChild>
        <Link href="/daos">Reset</Link>
      </Button>
    </form>
  );
}
