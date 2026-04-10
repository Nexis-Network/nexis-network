"use client";

import * as React from "react";

import {
  DropdownMenu as DropdownMenuPrimitive,
  DropdownMenuCheckboxItem as DropdownMenuCheckboxItemPrimitive,
  DropdownMenuContent as DropdownMenuContentPrimitive,
  DropdownMenuGroup as DropdownMenuGroupPrimitive,
  DropdownMenuItem as DropdownMenuItemPrimitive,
  DropdownMenuLabel as DropdownMenuLabelPrimitive,
  DropdownMenuRadioGroup as DropdownMenuRadioGroupPrimitive,
  DropdownMenuRadioItem as DropdownMenuRadioItemPrimitive,
  DropdownMenuSeparator as DropdownMenuSeparatorPrimitive,
  DropdownMenuShortcut as DropdownMenuShortcutPrimitive,
  DropdownMenuSub as DropdownMenuSubPrimitive,
  DropdownMenuSubContent as DropdownMenuSubContentPrimitive,
  DropdownMenuSubTrigger as DropdownMenuSubTriggerPrimitive,
  DropdownMenuTrigger as DropdownMenuTriggerPrimitive,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type DropdownMenuProps = React.ComponentProps<typeof DropdownMenuPrimitive>;

function DropdownMenu(props: DropdownMenuProps) {
  return <DropdownMenuPrimitive {...props} />;
}

type DropdownMenuTriggerProps = React.ComponentProps<
  typeof DropdownMenuTriggerPrimitive
>;

function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
  return <DropdownMenuTriggerPrimitive {...props} />;
}

type DropdownMenuContentProps = React.ComponentProps<
  typeof DropdownMenuContentPrimitive
>;

function DropdownMenuContent({
  sideOffset = 4,
  className,
  style,
  ...props
}: DropdownMenuContentProps) {
  return (
    <DropdownMenuContentPrimitive
      sideOffset={sideOffset}
      className={cn("mt-1", className)}
      style={style}
      {...props}
    />
  );
}

type DropdownMenuGroupProps = React.ComponentProps<typeof DropdownMenuGroupPrimitive>;

function DropdownMenuGroup(props: DropdownMenuGroupProps) {
  return <DropdownMenuGroupPrimitive {...props} />;
}

type DropdownMenuItemProps = React.ComponentProps<typeof DropdownMenuItemPrimitive>;

function DropdownMenuItem({
  className,
  asChild,
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuItemPrimitive
      asChild={asChild}
      className={cn(
        asChild
          ? "rounded-sm px-0 py-0 text-sm hover:bg-transparent focus:bg-transparent"
          : "rounded-sm py-1.5 text-sm",
        className,
      )}
      {...props}
    />
  );
}

type DropdownMenuCheckboxItemProps = React.ComponentProps<
  typeof DropdownMenuCheckboxItemPrimitive
>;

function DropdownMenuCheckboxItem({
  className,
  ...props
}: DropdownMenuCheckboxItemProps) {
  return (
    <DropdownMenuCheckboxItemPrimitive
      className={cn("rounded-sm py-1.5 text-sm", className)}
      {...props}
    />
  );
}

type DropdownMenuRadioGroupProps = React.ComponentProps<
  typeof DropdownMenuRadioGroupPrimitive
>;

function DropdownMenuRadioGroup(props: DropdownMenuRadioGroupProps) {
  return <DropdownMenuRadioGroupPrimitive {...props} />;
}

type DropdownMenuRadioItemProps = React.ComponentProps<
  typeof DropdownMenuRadioItemPrimitive
>;

function DropdownMenuRadioItem({
  className,
  ...props
}: DropdownMenuRadioItemProps) {
  return (
    <DropdownMenuRadioItemPrimitive
      className={cn("rounded-sm py-1.5 text-sm", className)}
      {...props}
    />
  );
}

type DropdownMenuLabelProps = React.ComponentProps<typeof DropdownMenuLabelPrimitive>;

function DropdownMenuLabel({ className, ...props }: DropdownMenuLabelProps) {
  return (
    <DropdownMenuLabelPrimitive
      className={cn("text-sm", className)}
      {...props}
    />
  );
}

type DropdownMenuSeparatorProps = React.ComponentProps<
  typeof DropdownMenuSeparatorPrimitive
>;

function DropdownMenuSeparator({
  className,
  ...props
}: DropdownMenuSeparatorProps) {
  return (
    <DropdownMenuSeparatorPrimitive
      className={cn("bg-[var(--auth-menu-separator)]", className)}
      {...props}
    />
  );
}

type DropdownMenuShortcutProps = React.ComponentProps<
  typeof DropdownMenuShortcutPrimitive
>;

function DropdownMenuShortcut({
  className,
  ...props
}: DropdownMenuShortcutProps) {
  return (
    <DropdownMenuShortcutPrimitive
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

type DropdownMenuSubProps = React.ComponentProps<typeof DropdownMenuSubPrimitive>;

function DropdownMenuSub(props: DropdownMenuSubProps) {
  return <DropdownMenuSubPrimitive {...props} />;
}

type DropdownMenuSubTriggerProps = React.ComponentProps<
  typeof DropdownMenuSubTriggerPrimitive
>;

function DropdownMenuSubTrigger({
  className,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <DropdownMenuSubTriggerPrimitive
      className={cn("rounded-sm py-1.5 text-sm", className)}
      {...props}
    />
  );
}

type DropdownMenuSubContentProps = React.ComponentProps<
  typeof DropdownMenuSubContentPrimitive
>;

function DropdownMenuSubContent({
  className,
  style,
  ...props
}: DropdownMenuSubContentProps) {
  return (
    <DropdownMenuSubContentPrimitive
      className={cn(className)}
      style={style}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  type DropdownMenuProps,
  type DropdownMenuTriggerProps,
  type DropdownMenuContentProps,
  type DropdownMenuGroupProps,
  type DropdownMenuItemProps,
  type DropdownMenuCheckboxItemProps,
  type DropdownMenuRadioGroupProps,
  type DropdownMenuRadioItemProps,
  type DropdownMenuLabelProps,
  type DropdownMenuSeparatorProps,
  type DropdownMenuShortcutProps,
  type DropdownMenuSubProps,
  type DropdownMenuSubTriggerProps,
  type DropdownMenuSubContentProps,
};
