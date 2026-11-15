import { RoleCode } from "@clario/shared-contracts";

export function isRoleCode(value: string): value is RoleCode {
  return Object.values(RoleCode).includes(value as RoleCode);
}

/**
 * Narrows a persisted role code (Prisma enum / JSON state) back to the shared
 * `RoleCode` union. Throws on unknown values so a corrupted session or
 * database row fails closed instead of silently carrying an invalid role.
 */
export function toRoleCode(value: string): RoleCode {
  if (!isRoleCode(value)) {
    throw new Error(`Unknown role code: ${value}`);
  }
  return value;
}
