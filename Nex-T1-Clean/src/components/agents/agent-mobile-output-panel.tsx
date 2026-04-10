import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { AgentType } from "@/lib/types";

interface MobileOutputPanelProps {
  selectedAgent: AgentType;
  loading: boolean;
  outputDrawerOpen: boolean;
  setOutputDrawerOpen: (open: boolean) => void;
  children: ReactNode;
}

export function MobileOutputPanel({
  selectedAgent,
  loading,
  outputDrawerOpen,
  setOutputDrawerOpen,
  children,
}: MobileOutputPanelProps) {
  return (
    <>
      <Drawer onOpenChange={setOutputDrawerOpen} open={outputDrawerOpen}>
        <DrawerContent className="fixed right-0 bottom-0 left-0 flex h-[96vh] flex-col rounded-t-[10px]">
          <DrawerHeader className="flex-none border-b px-4 py-3">
            <DrawerTitle className="flex items-center justify-between gap-2 font-medium text-xs">
              <span>
                {loading ? "Processing..." : `${selectedAgent.name} Output`}
              </span>
            </DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-full flex-col">{children}</div>
            ) : (
              <div className="min-h-full">{children}</div>
            )}
          </div>

          <DrawerFooter className="flex-none border-t px-4 py-3">
            <DrawerClose asChild>
              <Button className="w-full" variant="outline">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
