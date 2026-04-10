"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MENU_CONTENT, NAVIGATION_ITEMS } from "@/components/landing/menu-data";
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants";

// shadcn-like accordion primitives using Framer Motion
const AccordionItem = ({ 
  title, 
  isOpen, 
  onClick, 
  children 
}: { 
  title: string; 
  isOpen: boolean; 
  onClick: () => void; 
  children: React.ReactNode; 
}) => {
  return (
    <div className="border-b border-border/10 last:border-0">
      <button 
        onClick={onClick}
        className="flex w-full items-center justify-between py-4 text-left font-medium text-foreground transition-all hover:text-foreground/80"
      >
        <span className="text-xl font-medium tracking-tight">{title}</span>
        <ChevronRight className={cn("size-5 text-muted-foreground transition-transform duration-300", isOpen && "rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="pb-6 pt-2 pl-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MobileMenuV2({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const LANDING_LOGIN_HREF = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-background/95 backdrop-blur-2xl"
        >
            {/* Header / Config Area */}
           <div className="flex h-[72px] items-center justify-between border-b border-border/10 bg-card/50 px-6">
                <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/60">Menu</span>
                <button 
                  onClick={onClose}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                    <X className="size-6" />
                </button>
           </div>
           
           {/* Scrollable Content */}
           <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-none">
              <div className="flex flex-col">
                  {NAVIGATION_ITEMS.map((key) => {
                    const section = MENU_CONTENT[key];
                    if (!section) return null;
                    
                    return (
                        <AccordionItem 
                            key={key} 
                            title={key} 
                            isOpen={openSection === key} 
                            onClick={() => toggleSection(key)}
                        >
                            <div className="flex flex-col gap-6">
                                {/* Group 1 */}
                                <div className="space-y-3">
                                   <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">{section.firstUl.title}</span>
                                    <div className="grid gap-3">
                                        {section.firstUl.items.map(subItem => (
                                          <Link 
                                            key={subItem.href} 
                                            href={subItem.href} 
                                            onClick={onClose}
                                            className="group -ml-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/50"
                                          >
                                            <div className="flex size-8 items-center justify-center rounded-md border border-border/10 bg-muted/20 text-muted-foreground transition-colors group-hover:border-border/20 group-hover:bg-muted/30">
                                              {subItem.icon}
                                            </div>
                                            <span className="text-sm font-medium text-foreground/90">{subItem.label}</span>
                                          </Link>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Group 2 (if exists) */}
                                {section.secondUl && (
                                   <div className="space-y-3">
                                   <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">{section.secondUl.title}</span>
                                    <div className="grid gap-3">
                                        {section.secondUl.items.map(subItem => (
                                          <Link 
                                            key={subItem.href} 
                                            href={subItem.href} 
                                            onClick={onClose}
                                            className="group -ml-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/50"
                                          >
                                            <div className="flex size-8 items-center justify-center rounded-md border border-border/10 bg-muted/20 text-muted-foreground transition-colors group-hover:border-border/20 group-hover:bg-muted/30">
                                              {subItem.icon}
                                            </div>
                                            <span className="text-sm font-medium text-foreground/90">{subItem.label}</span>
                                          </Link>
                                        ))}
                                    </div>
                                </div> 
                                )}
                                
                                {/* Group 3 (if exists) */}
                                {section.thirdUl && (
                                   <div className="space-y-3">
                                   <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">{section.thirdUl.title}</span>
                                    <div className="grid gap-3">
                                        {section.thirdUl.items.map(subItem => (
                                          <Link 
                                            key={subItem.href} 
                                            href={subItem.href} 
                                            onClick={onClose}
                                            className="group -ml-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/50"
                                          >
                                            <div className="flex size-8 items-center justify-center rounded-md border border-border/10 bg-muted/20 text-muted-foreground transition-colors group-hover:border-border/20 group-hover:bg-muted/30">
                                              {subItem.icon}
                                            </div>
                                            <span className="text-sm font-medium text-foreground/90">{subItem.label}</span>
                                          </Link>
                                        ))}
                                    </div>
                                </div> 
                                )}
                            </div>
                        </AccordionItem>
                    );
                  })}
              </div>
           </div>

           {/* Footer Actions */}
           <div className="border-t border-border/10 bg-card/20 p-6 backdrop-blur-lg">
                <Link 
                    href={LANDING_LOGIN_HREF} 
                    onClick={onClose}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    Try Nex
                    <ChevronRight className="size-4" />
                </Link>
                <div className="mt-6 flex justify-center gap-6">
                    <Link href="https://twitter.com/nexis_network" target="_blank" className="text-muted-foreground/60 transition-colors hover:text-foreground">
                        <span className="sr-only">Twitter</span>
                        {/* Simple Social Icon Replacement or use existing */}
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                        </svg>
                    </Link>
                     <Link href="https://discord.gg/nexis" target="_blank" className="text-muted-foreground/60 transition-colors hover:text-foreground">
                        <span className="sr-only">Discord</span>
                         <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                             <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"></path>
                         </svg>
                    </Link>
                </div>
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
