import { Roboto, Roboto_Mono } from "next/font/google";

export const hobbesFooterSans = Roboto({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

export const hobbesFooterMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false,
});
