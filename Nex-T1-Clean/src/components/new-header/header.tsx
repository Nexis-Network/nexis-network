"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { HeaderLogo } from "@/components/new-header/logo";
import { useScroll } from "@/hooks/use-scroll";
import { hobbesHeaderOutlinePillActionClassName } from "@/components/new-header/hobbes-header-action-styles";
import { MobileNav } from "@/components/new-header/mobile-nav";
import { publicHeaderLoginDarkButtonClassName } from "@/components/navigation/public-header-login-button-classes";

export const navLinks = [
	{
		label: "Features",
		href: "#",
	},
	{
		label: "Pricing",
		href: "#",
	},
	{
		label: "About",
		href: "#",
	},
];

const primaryAction = { label: "Get Started", href: "#" };
const secondaryAction = { label: "Sign In", href: "#" };

export function Header() {
	const { scrolled, progress } = useScroll(10);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const mobileProgress = mobileMenuOpen ? 1 : progress;
	const headerState: "resting" | "transitioning" | "compact" | "menu-open" =
		mobileMenuOpen ? "menu-open" : mobileProgress > 0.84 ? "compact" : mobileProgress > 0.04 ? "transitioning" : "resting";
	const mobilePanelTop = scrolled ? 60 : 68;

	return (
		<header
			className={cn(
				"sticky top-0 z-50 mx-auto w-full max-w-[72.8rem] border-transparent border-b md:rounded-md md:border md:transition-all md:ease-out",
				{
					"border-border bg-background/95 backbackdrop-blur-lg supports-backdrop-filter:bg-background/50 md:top-2 md:max-w-[62.4rem] md:shadow":
						scrolled || mobileMenuOpen,
				}
			)}
		>
			<nav
				className={cn(
					"flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out",
					{
						"md:px-2": scrolled,
					}
				)}
				>
					<a className="rounded-md p-2 hover:bg-muted" href="#">
						<HeaderLogo progress={mobileProgress} />
					</a>
				<div className="hidden items-center gap-2 md:flex">
					<div className="menubar h-auto w-auto">
						{navLinks.map((link) => (
							<a key={link.label} href={link.href} className="menubar-item !text-sm">
								{link.label}
							</a>
						))}
					</div>
					<a className={publicHeaderLoginDarkButtonClassName} href={secondaryAction.href}>
						{secondaryAction.label}
					</a>
					<a className={hobbesHeaderOutlinePillActionClassName} href={primaryAction.href}>
						{primaryAction.label}
					</a>
				</div>
				<MobileNav
					open={mobileMenuOpen}
					onOpenChange={setMobileMenuOpen}
					navLinks={navLinks}
					primaryAction={primaryAction}
					secondaryAction={secondaryAction}
					progress={mobileProgress}
					panelTop={mobilePanelTop}
					state={headerState}
				/>
			</nav>
		</header>
	);
}
