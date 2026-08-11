/** Seeded platform owner — role cannot be changed by anyone (including self). */
export const SUPER_ADMIN_EMAIL = 'admin@codingdimension.com';

export function isSuperAdminEmail(email?: string | null) {
  return (email || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
