"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CopyIcon, CheckIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type EnvironmentVariablesContextType = {
  showValues: boolean;
  setShowValues: (show: boolean) => void;
};

const EnvironmentVariablesContext = React.createContext<EnvironmentVariablesContextType>({
  showValues: false,
  setShowValues: () => {},
});

export type EnvironmentVariablesProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultShowValues?: boolean;
  onShowValuesChange?: (show: boolean) => void;
};

export const EnvironmentVariables = ({
  className,
  children,
  defaultShowValues = false,
  onShowValuesChange,
  ...props
}: EnvironmentVariablesProps) => {
  const [showValues, setShowValues] = React.useState(defaultShowValues);

  const handleShowValuesChange = (show: boolean) => {
    setShowValues(show);
    onShowValuesChange?.(show);
  };

  return (
    <EnvironmentVariablesContext.Provider
      value={{ showValues, setShowValues: handleShowValuesChange }}
    >
      <div
        className={cn(
          "w-full overflow-hidden rounded-lg border bg-background",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </EnvironmentVariablesContext.Provider>
  );
};

export const EnvironmentVariablesHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex h-10 items-center justify-between border-b bg-muted/40 px-3",
      className
    )}
    {...props}
  />
);

export const EnvironmentVariablesTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("font-medium text-sm", className)} {...props} />
);

export const EnvironmentVariablesToggle = ({
  className,
  ...props
}: React.ComponentProps<typeof Switch>) => {
  const { showValues, setShowValues } = React.useContext(EnvironmentVariablesContext);
  const id = React.useId();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        Show values
      </Label>
      <Switch
        id={id}
        checked={showValues}
        onCheckedChange={setShowValues}
        {...props}
      />
    </div>
  );
};

export const EnvironmentVariablesContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4", className)} {...props} />
);

type EnvironmentVariableContextType = {
  name: string;
  value: string;
};

const EnvironmentVariableContext = React.createContext<EnvironmentVariableContextType>({
  name: "",
  value: "",
});

export const EnvironmentVariable = ({
  className,
  name,
  value,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { name: string; value: string }) => {
  return (
    <EnvironmentVariableContext.Provider value={{ name, value }}>
      <div
        className={cn("flex items-center justify-between gap-4 py-2", className)}
        {...props}
      >
        {children}
      </div>
    </EnvironmentVariableContext.Provider>
  );
};

export const EnvironmentVariableName = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  const { name } = React.useContext(EnvironmentVariableContext);
  return (
    <span className={cn("font-mono text-sm", className)} {...props}>
      {children ?? name}
    </span>
  );
};

export const EnvironmentVariableValue = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  const { showValues } = React.useContext(EnvironmentVariablesContext);
  const { value } = React.useContext(EnvironmentVariableContext);

  return (
    <span
      className={cn("font-mono text-sm text-muted-foreground", className)}
      {...props}
    >
      {children ?? (showValues ? value : "••••••••••••••••")}
    </span>
  );
};

export const EnvironmentVariableCopyButton = ({
  className,
  onCopy,
  timeout = 2000,
  copyFormat = "value",
  ...props
}: React.ComponentProps<typeof Button> & {
  onCopy?: () => void;
  timeout?: number;
  copyFormat?: "value" | "export";
}) => {
  const { name, value } = React.useContext(EnvironmentVariableContext);
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = () => {
    const textToCopy = copyFormat === "export" ? `export ${name}="${value}"` : value;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    onCopy?.();
    setTimeout(() => setIsCopied(false), timeout);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-6 text-muted-foreground", className)}
      onClick={handleCopy}
      {...props}
    >
      {isCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
      <span className="sr-only">Copy</span>
    </Button>
  );
};
