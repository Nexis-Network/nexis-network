export function isBuildEvaluation(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.npm_lifecycle_script?.includes("next build") === true
  );
}
