// Light theme per prompting-rules/style-guide.json (light_theme_market_overview.layout_and_cards):
// light: card bg #EBEBEB with 1px #EBEBEB frame + subtle inset shadow; overlay #FFFFFF/50.
// dark fallback retains existing neutral glass.
export const TOKEN_PANEL_FRAME_CLASS =
  "box-border flex w-full flex-col rounded-[12px] border border-[#EBEBEB] bg-[#EBEBEB] p-[1px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] dark:border-[rgba(232,232,227,0.05)] dark:bg-[#191A1A] dark:shadow-none";

export const TOKEN_PANEL_INNER_CLASS =
  "rounded-[11px] bg-white/70 backdrop-blur-[2px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:bg-[#191A1A]";

export const TOKEN_PANEL_MAX_WIDTH_CLASS = "w-full max-w-[861.09px]";

export const TOKEN_RIGHT_RAIL_WIDTH_CLASS = "w-full lg:w-[322.91px]";
