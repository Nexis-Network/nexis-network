import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export type StepStatus = "idle" | "loading" | "success" | "error";

export interface TxStep {
  id: string;
  label: string;
  description?: string;
  status: StepStatus;
}

interface TxProgressStepperProps {
  steps: TxStep[];
}

export function TxProgressStepper({ steps }: TxProgressStepperProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="w-full flex-col gap-4 bg-[#111111] p-4 rounded-xl border border-white/5">
      <h3 className="text-sm font-semibold text-white mb-4">Transaction Progress</h3>
      <div className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="flex items-start gap-3 relative">
              {/* Connector line */}
              {!isLast && (
                <div 
                  className={`absolute left-[11px] top-6 bottom-[-16px] w-[2px] ${
                    step.status === 'success' ? 'bg-[#0062E3]' : 'bg-white/10'
                  }`}
                />
              )}
              
              {/* Icon */}
              <div className="relative z-10 bg-[#111111] mt-0.5">
                {step.status === 'success' ? (
                   <CheckCircle2 className="h-6 w-6 text-[#0062E3]" />
                ) : step.status === 'loading' ? (
                   <Loader2 className="h-6 w-6 text-[#0062E3] animate-spin" />
                ) : step.status === 'error' ? (
                   <Circle className="h-6 w-6 text-red-500 line-through" />
                ) : (
                   <Circle className="h-6 w-6 text-white/20" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex flex-col mt-0.5">
                 <span className={`text-sm font-medium ${
                    step.status === 'success' || step.status === 'loading' 
                      ? 'text-white' 
                      : step.status === 'error' 
                      ? 'text-red-400' 
                      : 'text-white/40'
                 }`}>
                   {step.label}
                 </span>
                 {step.description && (
                   <span className="text-xs text-white/40 mt-0.5">
                     {step.description}
                   </span>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
