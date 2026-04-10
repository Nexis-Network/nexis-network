import type { CreateProjectRecord, ResolvedCreateActor } from "./types";

export function canAccessCreateProject(
  actor: ResolvedCreateActor,
  project: CreateProjectRecord,
): boolean {
  if (actor.kind === "user") {
    return (
      project.user_id === actor.userId ||
      (!!actor.guestSessionId && project.guest_session_id === actor.guestSessionId)
    );
  }

  if (actor.kind === "guest") {
    return project.guest_session_id === actor.guestSessionId;
  }

  return false;
}
