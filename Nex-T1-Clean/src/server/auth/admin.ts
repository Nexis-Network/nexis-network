export type AdminUserLike = {
  role?: string | null;
  app_metadata?: Record<string, UntypedJson> | null;
};

export const isAdminUser = (user: AdminUserLike | null | undefined): boolean => {
  if (!user) return false;

  const role = typeof user.role === "string" ? user.role.toLowerCase() : null;
  if (role === "admin") return true;

  const roles = (user.app_metadata as { roles?: UntypedJson } | null)?.roles;
  if (Array.isArray(roles)) {
    return roles.some((entry) => typeof entry === "string" && entry.toLowerCase() === "admin");
  }

  return false;
};
