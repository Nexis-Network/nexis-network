import { cn } from "@/lib/utils";
import { CHAT_THREAD_ASSISTANT_TEXT_MAX_WIDTH_CLASSNAME } from "./thread-layout";

export const ASSISTANT_STREAMDOWN_CLASSNAME = cn(
  CHAT_THREAD_ASSISTANT_TEXT_MAX_WIDTH_CLASSNAME,
  "min-w-0 w-full break-words text-foreground font-light text-[16px] leading-[26px] tracking-[0.16px] [overflow-wrap:anywhere] dark:text-[#F0F0F0]",
  "selection:bg-foreground/12 selection:text-foreground dark:selection:bg-[#F0F0F0]/12 dark:selection:text-[#F0F0F0]",
  "[&_p]:break-words [&_p]:text-foreground [&_p]:text-[16px] [&_p]:leading-[26px] [&_p]:tracking-[0.16px] dark:[&_p]:text-[#F0F0F0]",
  "[&_h1]:mt-4 [&_h1]:text-[22px] [&_h1]:leading-[30px] [&_h1]:font-medium [&_h1]:tracking-[0.16px] [&_h1]:text-foreground dark:[&_h1]:text-[#F0F0F0]",
  "[&_h2]:mt-4 [&_h2]:text-[18px] [&_h2]:leading-[28px] [&_h2]:font-medium [&_h2]:tracking-[0.16px] [&_h2]:text-foreground dark:[&_h2]:text-[#F0F0F0]",
  "[&_h3]:mt-4 [&_h3]:text-[16px] [&_h3]:leading-[26px] [&_h3]:font-medium [&_h3]:tracking-[0.16px] [&_h3]:text-foreground dark:[&_h3]:text-[#F0F0F0]",
  "[&_strong]:font-medium [&_strong]:text-foreground dark:[&_strong]:text-[#F0F0F0]",
  "[&_ul]:pl-[26px] [&_ul]:my-2 [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:list-outside",
  "[&_ol]:pl-[26px] [&_ol]:my-2 [&_ol]:space-y-2 [&_ol]:list-decimal [&_ol]:list-outside",
  "[&_li]:break-words [&_li]:text-foreground [&_li]:leading-[26px] [&_li]:tracking-[0.16px] dark:[&_li]:text-[#F0F0F0]",
  "[&_a]:break-all [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-border/60 hover:[&_a]:decoration-border dark:[&_a]:text-[#F0F0F0]",
  "[&_code]:rounded-[5px] [&_code]:bg-muted/40 [&_code]:px-1 [&_code]:py-[1px] [&_code]:text-[14px] [&_code]:leading-[23px] [&_code]:font-normal",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border/40 [&_pre]:bg-muted/20 [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[14px] [&_pre_code]:leading-[23px]",
  "[&_hr]:my-4 [&_hr]:border-border/40",
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[14px] [&_table]:leading-[24px]",
  "[&_thead]:bg-muted/20",
  "[&_th]:break-words [&_th]:border [&_th]:border-border/40 [&_th]:p-2 [&_th]:font-semibold [&_th]:text-foreground dark:[&_th]:text-[#F0F0F0]",
  "[&_td]:break-words [&_td]:border [&_td]:border-border/40 [&_td]:p-2 [&_td]:font-light [&_td]:text-foreground dark:[&_td]:text-[#F0F0F0]",
  "[&_blockquote]:border-l [&_blockquote]:border-border/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground dark:[&_blockquote]:text-[#F0F0F0]",
);
