/**
 * TypeScript types for User management and related entities
 *
 * Aligned with backend schemas:
 * - app/schemas/user.py
 * - app/schemas/organization.py
 * - app/schemas/contact.py
 * - app/schemas/contact_method.py
 * - app/schemas/auth.py
 */

/**
 * User types
 */

export interface User {
  id: string;
  email: string;
  tenant_id: string;
  tenant_name?: string | null;
  full_name: string | null;
  // Información personal
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  date_of_birth: string | null; // ISO date string
  gender: string | null;
  nationality: string | null; // ISO 3166-1 alpha-2
  marital_status: string | null;
  // Información laboral
  job_title: string | null;
  department: string | null;
  employee_id: string | null;
  // Preferencias
  preferred_language: string;
  timezone: string | null;
  avatar_url: string | null;
  bio: string | null;
  notes: string | null;
  // Autenticación
  last_login_at: string | null; // ISO datetime string
  email_verified_at: string | null; // ISO datetime string
  phone_verified_at: string | null; // ISO datetime string
  two_factor_enabled: boolean;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  // Relaciones
  contact_methods?: ContactMethod[];
  roles?: UserRole[];
  module_roles?: ModuleRole[];
  delegated_permissions?: DelegatedPermission[];
  // Permisos (calculados)
  permissions?: string[];
}

export interface UserCreate {
  email: string;
  password: string;
  tenant_id: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  date_of_birth?: string | null; // ISO date string
  gender?: string | null;
  nationality?: string | null;
  marital_status?: string | null;
  job_title?: string | null;
  department?: string | null;
  employee_id?: string | null;
  preferred_language?: string;
  timezone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  notes?: string | null;
}

export interface UserUpdate {
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  full_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  marital_status?: string | null;
  job_title?: string | null;
  department?: string | null;
  employee_id?: string | null;
  preferred_language?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  notes?: string | null;
  is_active?: boolean;
  two_factor_enabled?: boolean;
}

/**
 * Parameters for listing users
 */
export interface UsersListParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  tenant_id?: string;
  saved_filter_id?: string;
}

/**
 * Tenant types
 */

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

/**
 * Organization types
 */

export type OrganizationType = "customer" | "supplier" | "partner" | "other";

export interface Organization {
  id: string;
  tenant_id: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  organization_type: OrganizationType;
  industry: string | null;
  website: string | null;
  logo_url: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  contacts?: Contact[];
  contact_methods?: ContactMethod[];
}

export interface OrganizationCreate {
  tenant_id: string;
  name: string;
  legal_name?: string | null;
  tax_id?: string | null;
  organization_type: OrganizationType;
  industry?: string | null;
  website?: string | null;
  logo_url?: string | null;
  notes?: string | null;
}

export interface OrganizationUpdate {
  name?: string | null;
  legal_name?: string | null;
  tax_id?: string | null;
  organization_type?: OrganizationType | null;
  industry?: string | null;
  website?: string | null;
  logo_url?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
}

/**
 * OrgContact types — M:M junction between organizations and contacts
 */

export type OrgContactRole =
  | "legal_rep"
  | "billing"
  | "operations"
  | "admin"
  | "technical"
  | "other";

export interface OrgContact {
  id: string;
  contact_id: string;
  organization_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  department: string | null;
  role_tag: OrgContactRole | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgContactCreate {
  contact_id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  department?: string | null;
  role_tag?: OrgContactRole | null;
  is_primary?: boolean;
  notes?: string | null;
}

export interface OrgContactUpdate {
  job_title?: string | null;
  department?: string | null;
  role_tag?: OrgContactRole | null;
  is_primary?: boolean;
  notes?: string | null;
}

/**
 * OrgMembershipSummary — compact summary of a contact's membership in an org
 */
export interface OrgMembershipSummary {
  organization_id: string;
  organization_name: string | null;
  job_title: string | null;
  role_tag: OrgContactRole | null;
  is_primary: boolean;
}

/**
 * Contact types
 */

export interface Contact {
  id: string;
  tenant_id: string;
  /** Backward-compat: primary org's id. Use org_memberships for full list. */
  organization_id: string | null;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  full_name: string | null;
  job_title: string | null;
  department: string | null;
  is_primary_contact: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  org_memberships: OrgMembershipSummary[];
  contact_methods?: ContactMethod[];
}

export interface ContactCreate {
  tenant_id: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  full_name?: string | null;
  job_title?: string | null;
  department?: string | null;
  is_primary_contact?: boolean;
  notes?: string | null;
}

export interface ContactUpdate {
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  full_name?: string | null;
  job_title?: string | null;
  department?: string | null;
  is_primary_contact?: boolean | null;
  notes?: string | null;
  is_active?: boolean | null;
}

/**
 * ContactMethod types (polymorphic)
 */

export type ContactMethodType =
  | "email"
  | "phone"
  | "mobile"
  | "whatsapp"
  | "telegram"
  | "linkedin"
  | "twitter"
  | "facebook"
  | "instagram"
  | "address"
  | "website"
  | "fax";

export type EntityType =
  | "user"
  | "contact"
  | "organization"
  | "employee"
  | "tenant";

export interface ContactMethod {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  method_type: ContactMethodType;
  value: string;
  label: string | null;
  is_primary: boolean;
  is_verified: boolean;
  verified_at: string | null; // ISO datetime string
  notes: string | null;
  // Address fields (when method_type is "address")
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null; // ISO 3166-1 alpha-2
  created_at: string;
  updated_at: string;
}

export interface ContactMethodCreate {
  entity_type: EntityType;
  entity_id: string;
  method_type: ContactMethodType;
  value: string;
  label?: string | null;
  is_primary?: boolean;
  is_verified?: boolean;
  notes?: string | null;
  // Address fields
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface ContactMethodUpdate {
  value?: string | null;
  label?: string | null;
  is_primary?: boolean | null;
  is_verified?: boolean | null;
  verified_at?: string | null;
  notes?: string | null;
  // Address fields
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

/**
 * Role types
 */

export type GlobalRole = "owner" | "admin" | "manager" | "staff" | "viewer";

export interface UserRole {
  role: GlobalRole;
  granted_by: string | null; // User ID
  created_at: string;
}

export interface ModuleRole {
  module_id: string;
  role: string; // e.g., "internal.manager", "internal.editor"
  granted_by: string | null;
  created_at: string;
}

export interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  tenant_id: string;
  created_by: string; // User ID
  created_at: string;
  updated_at: string;
}

export interface CustomRoleCreate {
  name: string;
  description?: string | null;
  permissions: string[];
  tenant_id: string;
}

export interface CustomRoleUpdate {
  name?: string | null;
  description?: string | null;
  permissions?: string[];
}

/**
 * Permission types
 */

export interface Permission {
  permission: string; // e.g., "inventory.view"
  module_id?: string;
  description?: string;
}

export interface PermissionGroup {
  module_id: string;
  module_name: string;
  category?: string;
  permissions: Permission[];
}

export interface DelegatedPermission {
  id: string;
  user_id: string;
  permission: string;
  granted_by: string; // User ID
  expires_at: string | null; // ISO datetime string
  created_at: string;
}

export interface PermissionDelegation {
  target_user_id: string;
  permission: string;
  expires_at: string | null; // ISO datetime string
}

/**
 * User permissions summary
 */

export interface UserPermissionsSummary {
  user_id: string;
  // Permissions from global roles
  global_role_permissions: string[];
  // Permissions from module roles
  module_role_permissions: Map<string, string[]>; // module_id -> permissions[]
  // Delegated permissions
  delegated_permissions: DelegatedPermission[];
  // All effective permissions (union of all above)
  effective_permissions: string[];
}
