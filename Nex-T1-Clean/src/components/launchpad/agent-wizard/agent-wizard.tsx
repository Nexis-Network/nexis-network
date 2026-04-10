"use client";


import { cn } from "@/lib/utils";
import { useAgentWizardStore } from "./store";

import { BasicInfoStep } from "./steps/basic-info-step";
import { PersonalityStep } from "./steps/personality-step";
import { EconomicsStep } from "./steps/economics-step";
import { ReviewStep } from "./steps/review-step";

const STEPS = [
  { id: "basic", title: "Identity" },
  { id: "personality", title: "Personality" },
  { id: "economics", title: "Economics" },
  { id: "review", title: "Review" },
];

export function AgentWizard() {
  const { currentStep } = useAgentWizardStore();

  return (
    <div className="flex flex-col gap-8">
      {/* Stepper Header */}
      <nav aria-label="Progress">
        <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
          {STEPS.map((step, index) => {
            const isCompleted = currentStep > index;
            const isCurrent = currentStep === index;

            return (
              <li key={step.title} className="md:flex-1">
                <div
                  className={cn(
                    "group flex flex-col border-l-4 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4",
                    isCompleted ? "border-primary" : isCurrent ? "border-primary" : "border-muted"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isCompleted || isCurrent ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    Step {index + 1}
                  </span>
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step Content */}
      <div className="mt-4 min-h-[400px]">
        {currentStep === 0 && <BasicInfoStep />}
        {currentStep === 1 && <PersonalityStep />}
        {currentStep === 2 && <EconomicsStep />}
        {currentStep === 3 && <ReviewStep />}
      </div>
    </div>
  );
}
