export type Permission = "owner" | "readwrite" | "readonly" | "temp-readonly";

export const PERMISSION_LEVELS: Record<Permission, number> = {
  owner: 4,
  readwrite: 3,
  readonly: 2,
  "temp-readonly": 1,
};

export function canEdit(permission: Permission): boolean {
  return permission === "owner" || permission === "readwrite";
}

export function canManageAccess(permission: Permission): boolean {
  return permission === "owner";
}

export function canView(permission: Permission): boolean {
  return PERMISSION_LEVELS[permission] >= 1;
}

export function isExpirable(permission: Permission): boolean {
  return permission === "temp-readonly";
}

/** Default expiry duration for temp-readonly shares: 15 days in ms */
export const TEMP_SHARE_DURATION_MS = 15 * 24 * 60 * 60 * 1000;
