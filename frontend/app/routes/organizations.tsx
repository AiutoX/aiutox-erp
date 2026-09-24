import { useMemo, useState, useRef } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { getContactMethods } from "~/features/users/api/contactMethods.api";
import { getContact, listContacts } from "~/features/users/api/contacts.api";
import { useOrganizations, useCreateOrganization, useUpdateOrganization, useDeleteOrganization } from "~/features/users/hooks/useOrganizations";
import { listOrgContacts, addOrgContact, removeOrgContact } from "~/features/users/api/organizations.api";
import type { Organization, OrganizationType, OrgContact, OrgContactRole, ContactMethod, Contact as ContactType } from "~/features/users/types/user.types";
import { Skeleton } from "~/components/ui/skeleton";
import { Eye, Pencil, Power, Plus, Search, Filter, ChevronsUpDown, Check, ChevronDown, Mail, Phone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { showToast } from "~/components/common/Toast";
import { ContactViewDialog, ContactEditDialog } from "~/features/crm/components/ContactDialog";

export function meta() {
  return [{ title: "Organizaciones - AiutoX ERP" }];
}

const ORG_TYPES: OrganizationType[] = ["customer", "supplier", "partner", "other"];

interface OrgFormState {
  name: string;
  legal_name: string;
  tax_id: string;
  organization_type: OrganizationType;
  industry: string;
  website: string;
  notes: string;
}

function emptyForm(): OrgFormState {
  return {
    name: "",
    legal_name: "",
    tax_id: "",
    organization_type: "customer",
    industry: "",
    website: "",
    notes: "",
  };
}

function orgToForm(org: Organization): OrgFormState {
  return {
    name: org.name,
    legal_name: org.legal_name ?? "",
    tax_id: org.tax_id ?? "",
    organization_type: org.organization_type,
    industry: org.industry ?? "",
    website: org.website ?? "",
    notes: org.notes ?? "",
  };
}

const METHOD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Teléfono",
  mobile: "Celular",
  whatsapp: "WhatsApp",
  website: "Sitio Web",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter/X",
  other: "Otro",
};

function methodHref(m: ContactMethod): string | null {
  switch (m.method_type) {
    case "email": return `mailto:${m.value}`;
    case "phone":
    case "mobile": return `tel:${m.value}`;
    case "whatsapp": return `https://wa.me/${m.value.replace(/\D/g, "")}`;
    case "website": return m.value.startsWith("http") ? m.value : `https://${m.value}`;
    default: return null;
  }
}

export default function OrganizationsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("auth.manage_users");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | OrganizationType>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [form, setForm] = useState<OrgFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View modal state (org details)
  const [viewOrg, setViewOrg] = useState<Organization | null>(null);
  const [viewMethods, setViewMethods] = useState<ContactMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  // Deactivate confirmation
  const [orgToDeactivate, setOrgToDeactivate] = useState<Organization | null>(null);

  // Org contacts state
  const [viewContacts, setViewContacts] = useState<OrgContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [linkingContact, setLinkingContact] = useState(false);

  // Contact methods per contact for the list (keyed by contact_id)
  const [contactMethodsMap, setContactMethodsMap] = useState<Record<string, ContactMethod[]>>({});

  // Edit modal tab
  const [editTab, setEditTab] = useState<"data" | "contacts">("data");

  // Accordion open state for "Vincular Contacto"
  const [linkAccordionOpen, setLinkAccordionOpen] = useState(false);

  // Link-contact form state
  const [contactOpen, setContactOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<ContactType[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactType | null>(null);
  const [newContactRole, setNewContactRole] = useState<OrgContactRole | "">("");
  const [newContactIsPrimary, setNewContactIsPrimary] = useState(false);
  const [newContactJobTitle, setNewContactJobTitle] = useState("");
  const [newContactDepartment, setNewContactDepartment] = useState("");
  const [newContactNotes, setNewContactNotes] = useState("");
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared contact dialogs state (ContactViewDialog + ContactEditDialog)
  const [viewingContact, setViewingContact] = useState<ContactType | null>(null);
  const [viewingMethods, setViewingMethods] = useState<ContactMethod[]>([]);
  const [loadingViewingMethods, setLoadingViewingMethods] = useState(false);
  const [isContactEditOpen, setIsContactEditOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactType | null>(null);

  const tenantId = useAuthStore((s) => s.user?.tenant_id ?? "");

  const orgParams = useMemo(() => ({
    page,
    page_size: pageSize,
    search: search || undefined,
    organization_type: typeFilter !== "all" ? typeFilter : undefined,
    is_active: statusFilter === "all" ? undefined : statusFilter === "active",
  }), [page, pageSize, search, typeFilter, statusFilter]);

  const { organizations, loading, pagination, refresh } = useOrganizations(orgParams);
  const orgListParams = useMemo(() => ({ is_active: true, page_size: 500 }), []);
  const { organizations: allOrganizations } = useOrganizations(orgListParams);
  const { create } = useCreateOrganization();
  const { update } = useUpdateOrganization();
  const { remove } = useDeleteOrganization();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setIsModalOpen(true);
  }

  async function reloadOrgContacts(orgId: string) {
    setLoadingContacts(true);
    try {
      const res = await listOrgContacts(orgId);
      const contacts = res.data ?? [];
      setViewContacts(contacts);
      const entries = await Promise.all(
        contacts.map(async (c) => {
          try {
            const r = await getContactMethods("contact", c.contact_id);
            return [c.contact_id, r.data ?? []] as [string, ContactMethod[]];
          } catch {
            return [c.contact_id, []] as [string, ContactMethod[]];
          }
        })
      );
      setContactMethodsMap(Object.fromEntries(entries));
    } catch {
      setViewContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }

  function openEdit(org: Organization) {
    setEditing(org);
    setForm(orgToForm(org));
    setError(null);
    setEditTab("data");
    setViewContacts([]);
    setContactMethodsMap({});
    setLinkAccordionOpen(false);
    setIsModalOpen(true);
    reloadOrgContacts(org.id);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditing(null);
    setError(null);
    setEditTab("data");
    setContactOpen(false);
    setContactQuery("");
    setSelectedContact(null);
    setContactResults([]);
    setNewContactRole("");
    setNewContactIsPrimary(false);
    setNewContactJobTitle("");
    setNewContactDepartment("");
    setNewContactNotes("");
    setContactMethodsMap({});
    setLinkAccordionOpen(false);
  }

  function setField<K extends keyof OrgFormState>(key: K, value: OrgFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t("organizations.name_required"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        legal_name: form.legal_name.trim() || null,
        tax_id: form.tax_id.trim() || null,
        organization_type: form.organization_type,
        industry: form.industry.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const result = await update(editing.id, payload);
        if (!result) throw new Error("update failed");
      } else {
        const result = await create({ ...payload, tenant_id: tenantId });
        if (!result) throw new Error("create failed");
      }
      refresh();
      closeModal();
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function openView(org: Organization) {
    setViewOrg(org);
    setViewMethods([]);
    setViewContacts([]);
    setLoadingMethods(true);
    setLoadingContacts(true);
    try {
      const contactsRes = await listOrgContacts(org.id);
      const contacts = contactsRes.data ?? [];
      setViewContacts(contacts);
      const primary = contacts.find((c) => c.is_primary);
      if (primary) {
        const methodsRes = await getContactMethods("contact", primary.contact_id);
        setViewMethods(methodsRes.data ?? []);
      }
    } catch {
      setViewMethods([]);
      setViewContacts([]);
    } finally {
      setLoadingMethods(false);
      setLoadingContacts(false);
    }
  }

  function closeView() {
    setViewOrg(null);
    setViewMethods([]);
    setViewContacts([]);
    if (searchRef.current) clearTimeout(searchRef.current);
  }

  function handleContactQueryChange(value: string) {
    setContactQuery(value);
    setSelectedContact(null);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!value.trim()) {
      setContactResults([]);
      return;
    }
    searchRef.current = setTimeout(async () => {
      try {
        const res = await listContacts({ search: value.trim(), is_active: true, page_size: 10 });
        setContactResults(res.data ?? []);
      } catch {
        setContactResults([]);
      }
    }, 300);
  }

  function selectContact(contact: ContactType) {
    setSelectedContact(contact);
    setContactQuery(contact.full_name ?? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim());
    setContactOpen(false);
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !selectedContact) return;
    setLinkingContact(true);
    try {
      await addOrgContact(editing.id, {
        contact_id: selectedContact.id,
        role_tag: newContactRole || null,
        is_primary: newContactIsPrimary,
        job_title: newContactJobTitle.trim() || null,
        department: newContactDepartment.trim() || null,
        notes: newContactNotes.trim() || null,
      });
      setContactQuery("");
      setSelectedContact(null);
      setNewContactRole("");
      setNewContactIsPrimary(false);
      setNewContactJobTitle("");
      setNewContactDepartment("");
      setNewContactNotes("");
      setLinkAccordionOpen(false);
      await reloadOrgContacts(editing.id);
    } catch {
      showToast(t("organizations.member_update_error"), "error");
    } finally {
      setLinkingContact(false);
    }
  }

  async function handleUnlinkContact(contactId: string) {
    if (!editing) return;
    if (!confirm(t("organizations.confirm_unlink"))) return;
    try {
      await removeOrgContact(editing.id, contactId);
      setViewContacts((prev) => prev.filter((c) => c.contact_id !== contactId));
    } catch {
      showToast(t("organizations.member_update_error"), "error");
    }
  }

  async function openContactView(c: OrgContact) {
    setLoadingViewingMethods(true);
    try {
      const [contactRes, methodsRes] = await Promise.all([
        getContact(c.contact_id),
        getContactMethods("contact", c.contact_id),
      ]);
      setViewingContact(contactRes.data ?? null);
      setViewingMethods(methodsRes.data ?? []);
    } catch {
      setViewingContact(null);
      setViewingMethods([]);
    } finally {
      setLoadingViewingMethods(false);
    }
  }

  function openContactEdit(c: ContactType) {
    setEditingContact(c);
    setIsContactEditOpen(true);
  }

  function openContactCreate() {
    setEditingContact(null);
    setIsContactEditOpen(true);
  }

  function handleDeactivate(org: Organization) {
    setOrgToDeactivate(org);
  }

  async function confirmDeactivate() {
    if (!orgToDeactivate) return;
    const success = await remove(orgToDeactivate.id);
    if (success) {
      showToast(t("organizations.deactivate_success"), "success");
      refresh();
    } else {
      showToast(t("organizations.deactivate_error"), "error");
    }
    setOrgToDeactivate(null);
  }

  return (
    <PageLayout title={t("organizations.title")}>
      <div className="space-y-4">
        {/* Action bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("organizations.search_placeholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
            >
              <SelectTrigger className="w-35 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("organizations.status_filter.all")}</SelectItem>
                <SelectItem value="active">{t("organizations.status_filter.active")}</SelectItem>
                <SelectItem value="inactive">{t("organizations.status_filter.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select
            value={typeFilter}
            onValueChange={(v) => { setTypeFilter(v as typeof typeFilter); setPage(1); }}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder={t("organizations.type_filter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("organizations.all_types")}</SelectItem>
              {ORG_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`organizations.organization_type.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t("organizations.create")}
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="rounded-md border divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-50" />
                  <Skeleton className="h-3 w-75" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <div className="rounded-md border py-12 text-center">
            <p className="text-sm text-muted-foreground">{t("organizations.empty")}</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border divide-y divide-border">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors duration-200 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{org.name}</p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          org.is_active
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {t(`organizations.status.${org.is_active ? "active" : "inactive"}`)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 mr-1">
                        {t(`organizations.organization_type.${org.organization_type}`)}
                      </span>
                      {org.tax_id && ` · ${org.tax_id}`}
                      {org.industry && ` · ${org.industry}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openView(org)}
                      title={t("organizations.actions.view")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canWrite && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(org)}
                        title={t("organizations.actions.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canWrite && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:border-destructive"
                        onClick={() => handleDeactivate(org)}
                        title={t("organizations.actions.delete")}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  {t("organizations.showing")}{" "}
                  {(pagination.page - 1) * pagination.page_size + 1}{" "}
                  {t("organizations.to")}{" "}
                  {Math.min(pagination.page * pagination.page_size, pagination.total)}{" "}
                  {t("organizations.of")} {pagination.total}{" "}
                  {t("organizations.results")}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                  >
                    {t("organizations.previous")}
                  </Button>
                  <span className="text-sm">
                    {t("organizations.page")} {pagination.page} {t("organizations.of")} {pagination.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                    disabled={pagination.page >= pagination.total_pages}
                  >
                    {t("organizations.next")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Modal — org details */}
      <Dialog open={!!viewOrg} onOpenChange={(open) => !open && closeView()}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewOrg?.name}</DialogTitle>
          </DialogHeader>
          {viewOrg && (
            <div className="space-y-5 mt-2">
              <div className="space-y-1 text-sm">
                {viewOrg.legal_name && (
                  <p className="text-muted-foreground">{viewOrg.legal_name}</p>
                )}
                <p className="text-muted-foreground">
                  {t(`organizations.organization_type.${viewOrg.organization_type}`)}
                  {viewOrg.tax_id ? ` · ${viewOrg.tax_id}` : ""}
                  {viewOrg.industry ? ` · ${viewOrg.industry}` : ""}
                </p>
                {viewOrg.website && (
                  <a
                    href={viewOrg.website.startsWith("http") ? viewOrg.website : `https://${viewOrg.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all"
                  >
                    {viewOrg.website}
                  </a>
                )}
                {viewOrg.notes && (
                  <p className="text-muted-foreground italic">{viewOrg.notes}</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {t("organizations.contact_methods")}
                  {viewContacts.find((c) => c.is_primary) && (
                    <span className="ml-2 normal-case font-normal text-muted-foreground">
                      — {viewContacts.find((c) => c.is_primary)?.full_name ?? `${viewContacts.find((c) => c.is_primary)?.first_name ?? ""} ${viewContacts.find((c) => c.is_primary)?.last_name ?? ""}`.trim()}
                    </span>
                  )}
                </p>
                {loadingMethods ? (
                  <p className="text-sm text-muted-foreground">{t("organizations.loading")}</p>
                ) : !viewContacts.find((c) => c.is_primary) ? (
                  <p className="text-sm text-muted-foreground">{t("organizations.no_contacts")}</p>
                ) : viewMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("organizations.no_methods")}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {viewMethods.map((m) => {
                      const href = methodHref(m);
                      return (
                        <li key={m.id} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground w-20 shrink-0 text-xs">
                            {METHOD_LABELS[m.method_type] ?? m.method_type}
                          </span>
                          {href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                              {m.label ?? m.value}
                            </a>
                          ) : (
                            <span>{m.label ?? m.value}</span>
                          )}
                          {m.is_primary && (
                            <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                              {t("organizations.primary")}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {canWrite && (
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={() => { closeView(); openEdit(viewOrg); }}>
                    {t("organizations.actions.edit")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <Dialog open={!!orgToDeactivate} onOpenChange={(open) => !open && setOrgToDeactivate(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("organizations.confirm_deactivate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">{orgToDeactivate?.name}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOrgToDeactivate(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDeactivate}>
                {t("organizations.actions.delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className={editing ? "sm:max-w-lg max-h-[90vh] overflow-y-auto" : "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle>
              {editing ? t("organizations.edit") : t("organizations.create")}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="flex border-b -mx-6 px-6">
              <button
                type="button"
                onClick={() => setEditTab("data")}
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${editTab === "data" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t("organizations.tab_details")}
              </button>
              <button
                type="button"
                onClick={() => setEditTab("contacts")}
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${editTab === "contacts" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t("organizations.tab_contacts")}
              </button>
            </div>
          )}

          {(!editing || editTab === "data") && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="org-name">{t("organizations.name")} *</Label>
                <Input
                  id="org-name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder={t("organizations.name_placeholder")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-legal">{t("organizations.legal_name")}</Label>
                <Input
                  id="org-legal"
                  value={form.legal_name}
                  onChange={(e) => setField("legal_name", e.target.value)}
                  placeholder={t("organizations.legal_name_placeholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="org-tax">{t("organizations.tax_id")}</Label>
                  <Input
                    id="org-tax"
                    value={form.tax_id}
                    onChange={(e) => setField("tax_id", e.target.value)}
                    placeholder={t("organizations.tax_id_placeholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("organizations.type")}</Label>
                  <Select
                    value={form.organization_type}
                    onValueChange={(v) => setField("organization_type", v as OrganizationType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`organizations.organization_type.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-industry">{t("organizations.industry")}</Label>
                <Input
                  id="org-industry"
                  value={form.industry}
                  onChange={(e) => setField("industry", e.target.value)}
                  placeholder={t("organizations.industry_placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-website">{t("organizations.website")}</Label>
                <Input
                  id="org-website"
                  value={form.website}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder={t("organizations.website_placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-notes">{t("organizations.notes")}</Label>
                <Input
                  id="org-notes"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder={t("organizations.notes_placeholder")}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </form>
          )}

          {/* Contacts tab */}
          {editing && editTab === "contacts" && (
            <div className="space-y-4 mt-2">

              {/* Accordion: Vincular Contacto */}
              {canWrite && (
                <div className="border rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLinkAccordionOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    <span>{t("organizations.add_contact")}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${linkAccordionOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {linkAccordionOpen && (
                    <div className="border-t px-3 py-3 space-y-3">
                      {/* Link existing contact form */}
                      <form onSubmit={handleAddContact} className="space-y-3">
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{t("contacts.full_name")}</Label>
                            <Popover open={contactOpen} onOpenChange={setContactOpen}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  role="combobox"
                                  aria-expanded={contactOpen}
                                  className="flex h-8 w-full items-center justify-between rounded-(--input-radius,var(--radius)) border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
                                >
                                  <span className={selectedContact ? "text-foreground" : "text-muted-foreground opacity-70"}>
                                    {selectedContact
                                      ? (selectedContact.full_name ?? `${selectedContact.first_name ?? ""} ${selectedContact.last_name ?? ""}`.trim())
                                      : t("organizations.contact_name_placeholder")}
                                  </span>
                                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-72" align="start">
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder={t("organizations.contact_name_placeholder")}
                                    value={contactQuery}
                                    onChange={(e) => handleContactQueryChange(e.target.value)}
                                  />
                                  <CommandList>
                                    {contactQuery.trim() && contactResults.length === 0 && (
                                      <CommandEmpty>{t("common.noData")}</CommandEmpty>
                                    )}
                                    {contactResults.length > 0 && (
                                      <CommandGroup>
                                        {contactResults.map((c) => {
                                          const name = c.full_name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
                                          return (
                                            <CommandItem
                                              key={c.id}
                                              value={c.id}
                                              onSelect={() => selectContact(c)}
                                            >
                                              <Check className={`mr-2 h-4 w-4 ${selectedContact?.id === c.id ? "opacity-100" : "opacity-0"}`} />
                                              <div className="flex flex-col">
                                                <span>{name}</span>
                                                {c.job_title && <span className="text-xs text-muted-foreground">{c.job_title}</span>}
                                              </div>
                                            </CommandItem>
                                          );
                                        })}
                                      </CommandGroup>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("organizations.role_placeholder")}</Label>
                            <Select value={newContactRole} onValueChange={(v) => setNewContactRole(v as OrgContactRole)}>
                              <SelectTrigger className="w-28 h-8 text-sm">
                                <SelectValue placeholder={t("organizations.role_placeholder")} />
                              </SelectTrigger>
                              <SelectContent>
                                {(["legal_rep", "billing", "operations", "admin", "technical", "other"] as OrgContactRole[]).map((r) => (
                                  <SelectItem key={r} value={r}>{t(`organizations.role.${r}`)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{t("organizations.job_title_label")}</Label>
                            <Input value={newContactJobTitle} onChange={(e) => setNewContactJobTitle(e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("organizations.department_label")}</Label>
                            <Input value={newContactDepartment} onChange={(e) => setNewContactDepartment(e.target.value)} className="h-8 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("organizations.notes_label")}</Label>
                          <Input value={newContactNotes} onChange={(e) => setNewContactNotes(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                            <input
                              type="checkbox"
                              checked={newContactIsPrimary}
                              onChange={(e) => setNewContactIsPrimary(e.target.checked)}
                              className="h-4 w-4 rounded border-border accent-primary"
                            />
                            {t("organizations.is_primary_label")}
                          </label>
                          <Button type="submit" size="sm" className="h-8 shrink-0" disabled={linkingContact || !selectedContact}>
                            {linkingContact ? t("organizations.linking") : t("organizations.add_contact")}
                          </Button>
                        </div>
                      </form>

                      {/* Divider + Nuevo contacto */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">o</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={openContactCreate}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        {t("contacts.create")}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Contacts list */}
              {loadingContacts ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted/40 rounded px-3 py-2">
                      <Skeleton className="h-4 w-32" />
                      <div className="flex-1" />
                      <Skeleton className="h-7 w-7 rounded" />
                      <Skeleton className="h-7 w-7 rounded" />
                      <Skeleton className="h-7 w-7 rounded" />
                    </div>
                  ))}
                </div>
              ) : viewContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("organizations.no_contacts")}</p>
              ) : (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {t("organizations.contacts_section")} ({viewContacts.length})
                  </p>
                  <ul className="space-y-2">
                    {viewContacts.map((c) => {
                      const methods = contactMethodsMap[c.contact_id] ?? [];
                      const primaryMethod = methods.find((m) => m.is_primary) ?? methods[0];
                      const contactName = c.full_name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
                      return (
                        <li key={c.id} className="flex items-start gap-2 text-sm bg-muted/40 rounded px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium">{contactName}</span>
                              {c.is_primary && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                                  {t("organizations.primary")}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                              {c.role_tag && <span>{t(`organizations.role.${c.role_tag}`)}</span>}
                              {c.job_title && <span>· {c.job_title}</span>}
                              {c.department && <span>· {c.department}</span>}
                            </div>
                            {primaryMethod && (
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                {(primaryMethod.method_type === "email") ? (
                                  <Mail className="h-3 w-3 shrink-0" />
                                ) : (
                                  <Phone className="h-3 w-3 shrink-0" />
                                )}
                                {methodHref(primaryMethod) ? (
                                  <a href={methodHref(primaryMethod)!} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate">
                                    {primaryMethod.label ?? primaryMethod.value}
                                  </a>
                                ) : (
                                  <span className="truncate">{primaryMethod.label ?? primaryMethod.value}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0 mt-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={t("contacts.actions.view")}
                              onClick={() => openContactView(c)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {canWrite && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title={t("organizations.edit_contact")}
                                  onClick={async () => {
                                    try {
                                      const res = await getContact(c.contact_id);
                                      if (res.data) openContactEdit(res.data);
                                    } catch {
                                      showToast(t("common.error"), "error");
                                    }
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  title={t("organizations.unlink_contact")}
                                  onClick={() => handleUnlinkContact(c.contact_id)}
                                >
                                  <Power className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Shared contact dialogs — stacked on top of the org modal */}
          <ContactViewDialog
            contact={viewingContact}
            methods={viewingMethods}
            loadingMethods={loadingViewingMethods}
            onClose={() => { setViewingContact(null); setViewingMethods([]); }}
            onEdit={(c) => { setViewingContact(null); openContactEdit(c); }}
            canWrite={canWrite}
          />

          <ContactEditDialog
            open={isContactEditOpen}
            contact={editingContact}
            organizations={allOrganizations}
            canWrite={canWrite}
            tenantId={tenantId}
            onClose={() => { setIsContactEditOpen(false); setEditingContact(null); }}
            onSaved={async (savedContact) => {
              setIsContactEditOpen(false);
              setEditingContact(null);
              if (!editing) return;
              // If it's a newly created contact, link it to the org first
              if (!editingContact) {
                try {
                  const existing = await listOrgContacts(editing.id);
                  const alreadyLinked = existing.data?.some((c) => c.contact_id === savedContact.id);
                  if (!alreadyLinked) {
                    await addOrgContact(editing.id, {
                      contact_id: savedContact.id,
                      role_tag: null,
                      is_primary: viewContacts.length === 0,
                    });
                  }
                } catch {
                  // link failure is non-fatal
                }
              }
              await reloadOrgContacts(editing.id);
            }}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
