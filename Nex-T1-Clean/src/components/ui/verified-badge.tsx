import { cn } from "@/lib/utils";

type VerifiedBadgeProps = {
  className?: string;
};

/**
 * Small corner badge for verified assets. Designed to sit in the bottom-right of a logo container.
 */
export function VerifiedBadge({ className }: VerifiedBadgeProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-card shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.12)] dark:bg-[#0E0F0F] dark:shadow-[0_0_0_1px_rgba(0,0,0,0.32),0_1px_2px_rgba(0,0,0,0.28)]",
        className,
      )}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
      >
        <path
          d="M5.01668 13.125L3.90834 11.2583L1.80834 10.7917L2.01251 8.63333L0.583344 7L2.01251 5.36667L1.80834 3.20833L3.90834 2.74167L5.01668 0.875L7.00001 1.72083L8.98334 0.875L10.0917 2.74167L12.1917 3.20833L11.9875 5.36667L13.4167 7L11.9875 8.63333L12.1917 10.7917L10.0917 11.2583L8.98334 13.125L7.00001 12.2792L5.01668 13.125ZM6.38751 9.07083L9.68334 5.775L8.86668 4.92917L6.38751 7.40833L5.13334 6.18333L4.31668 7L6.38751 9.07083Z"
          fill="#0786FF"
        />
        <path
          d="M6.38751 9.07087L9.68335 5.77503L8.86668 4.9292L6.38751 7.40837L5.13335 6.1542L4.31668 6.97087L6.38751 9.07087Z"
          fill="white"
        />
      </svg>
    </span>
  );
}
