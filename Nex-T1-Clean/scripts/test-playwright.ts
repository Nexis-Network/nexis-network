import { chromium } from "@playwright/test";
import path from "path";

async function run() {
    console.log("Starting Playwright test via tsx...");
    const browser = await chromium.launch({ headless: false }); // Launch visible
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log("Navigating to temp-mail...");
        await page.goto("https://temp-mail.org/en/");

        // Wait for the email input to be populated
        console.log("Waiting for email generation...");
        await page.waitForTimeout(5000);
        const emailLocator = page.locator("#mail");
        await emailLocator.waitFor({ state: "visible", timeout: 30000 });
        let email = await emailLocator.inputValue();
        let retries = 0;

        while ((!email || email.includes("Loading")) && retries < 10) {
            await page.waitForTimeout(3000);
            email = await emailLocator.inputValue();
            retries++;
        }

        if (!email || email.includes("Loading")) {
            throw new Error("Failed to grab temp mail after wait.");
        }
        console.log(`Generated Temp Email: ${email}`);

        // Open new tab for nex-t1.ai signup
        console.log("Navigating to nex-t1.ai signup...");
        const appPage = await context.newPage();
        await appPage.goto("https://nex-t1.ai/app");

        // Attempt Sign Up - Wait for auth form
        await appPage.waitForTimeout(5000);
        console.log("Waiting for auth form to load...");

        // Ensure "Sign Up" mode is active
        const signUpTab = appPage.locator(
            'button[role="tab"]:has-text("Sign up")',
        );
        if (await signUpTab.isVisible()) {
            await signUpTab.click();
            await appPage.waitForTimeout(1000);
        }

        // Click "View more"
        const viewMoreBtn = appPage.locator('button:has-text("View more")');
        if (await viewMoreBtn.isVisible()) {
            await viewMoreBtn.click();
            await appPage.waitForTimeout(1000);
        }

        // Click "Continue with Email"
        const emailBtn = appPage.getByRole("button", {
            name: "Continue with Email",
            exact: true,
        });
        if (await emailBtn.isVisible()) {
            await emailBtn.click();
            await appPage.waitForTimeout(1000);
        }

        // Ensure inputs are visible
        const emailInput = appPage.locator(
            'input[type="email"], input[name="email"], input[placeholder*="email" i]',
        );
        await emailInput.waitFor({ state: "visible", timeout: 30000 });

        console.log("Filling form...");
        await emailInput.fill(email);

        // Click Continue/Submit on the identifier step
        const continueBtn = appPage.locator('button:has-text("Continue")');
        if (await continueBtn.isVisible()) {
            await continueBtn.click();
            await appPage.waitForTimeout(1500);
        }

        const passwordInput = appPage.locator(
            'input[type="password"], input[name="password"]',
        );
        if (await passwordInput.isVisible()) {
            await passwordInput.fill("TestingCDP2026!");

            // Check for a confirm password input
            const confirmPasswords = await appPage.locator(
                'input[type="password"]',
            ).all();
            if (confirmPasswords.length > 1) {
                await confirmPasswords[1].fill("TestingCDP2026!");
            }

            // check privacy policy
            const checkbox = appPage.locator(
                'button[role="checkbox"], input[type="checkbox"]',
            );
            if (await checkbox.first().isVisible()) {
                await checkbox.first().click();
            }

            // Try to find the sign up button
            await appPage.waitForTimeout(1000);
            const signUpButton = appPage.locator(
                'button:has-text("Sign up"), button:has-text("Create Account")',
            );
            if (await signUpButton.first().isVisible()) {
                await signUpButton.first().click();
            } else {
                await appPage.press('input[type="password"]', "Enter");
            }
        }

        console.log("Submitted signup. Waiting for UI...");
        await appPage.waitForTimeout(15000); // give it time to register and fetch metadata

        // Take screenshot after signup
        const screenshotPathSignup = path.join(
            "/Users/0xnexis/Downloads/Nexis-Network/Nex-T1-Enterprise/output",
            "signup_result.png",
        );
        await appPage.screenshot({ path: screenshotPathSignup });
        console.log("Captured signup_result.png");

        // Checking back on temp-mail for verification
        console.log("Checking back on temp-mail for verification...");
        await page.bringToFront();
        await page.waitForTimeout(10000);
        const screenshotPathInbox = path.join(
            "/Users/0xnexis/Downloads/Nexis-Network/Nex-T1-Enterprise/output",
            "temp_mail_inbox.png",
        );
        await page.screenshot({ path: screenshotPathInbox });
        console.log("Captured temp_mail_inbox.png");

        console.log("App Page URL:", appPage.url());

        // Try to click profile menu / wallet sidebar to snapshot what's there
        await appPage.bringToFront();
        await appPage.waitForTimeout(2000);

        const screenshotPathDashboard = path.join(
            "/Users/0xnexis/Downloads/Nexis-Network/Nex-T1-Enterprise/output",
            "app_dashboard.png",
        );
        await appPage.screenshot({
            path: screenshotPathDashboard,
            fullPage: true,
        });

        // Force wait to see it manually if needed, then close
        await appPage.waitForTimeout(10000);
        console.log("Done script.");
    } catch (e) {
        console.error("Test Failed:", e);
    } finally {
        await browser.close();
    }
}

run();
