import { useMemo, useState } from "react";
import { Mail, Phone, Eye, Pencil, Power, Plus, Search, Filter } from "lucide-react";
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
import { ContactViewDialog, ContactEditDialog } from "~/features/crm/components/ContactDialog";
import { useContacts, useUpdateContact, useDeleteContact } from "~/features/users/hooks/useContacts";
import { useOrganizations } from "~/features/users/hooks/useOrganizations";
import type { Contact, ContactMethod } from "~/features/users/types/user.types";
import { Skeleton } from "~/components/ui/skeleton";
import { showToast } from "~/components/common/Toast";

export function meta() {
  return [{ title: "Contactos - AiutoX ERP" }];
}

function getInitials(contact: Contact): string {
  const first = contact.first_name?.trim() || "";
  const last = contact.last_name?.trim() || "";
  if (first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }
  const full = contact.full_name?.trim() || "";
  if (full.includes(" ")) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0]!.slice(0, 2).toUpperCase();
    }
  }
  return full.slice(0, 2).toUpperCase() || "—";
}

function getAvatarColor(contact: Contact): string {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
  ];
  const name = (contact.full_name || contact.first_name || contact.id).toLowerCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? "bg-blue-500";
}

function getPrimaryMethod(contact: Contact, methodType: string): string | null {
  const methods = contact.contact_methods ?? [];
  const match = methods.find((m) => m.method_type === methodType && m.is_primary) ||
                methods.find((m) => m.method_type === methodType);
  return match?.value || null;
}

interface ContactsListProps {
  contacts: Contact[];
  getContactName: (c: Contact) => string;
  getPrimaryOrgName: (c: Contact) => string;
  getAvatarColor: (c: Contact) => string;
  getInitials: (c: Contact) => string;
  getPrimaryMethod: (c: Contact, methodType: string) => string | null;
  canWrite: boolean;
  openView: (c: Contact) => void;
  openEdit: (c: Contact) => void;
  handleDeactivate: (c: Contact) => void;
  handleReactivate: (c: Contact) => void;
  t: (key: string) => string;
}

function ContactsList({
  contacts,
  getContactName,
  getPrimaryOrgName,
  getAvatarColor,
  getInitials,
  getPrimaryMethod,
  canWrite,
  openView,
  openEdit,
  handleDeactivate,
  handleReactivate,
  t,
}: ContactsListProps) {
  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) =>
      getContactName(a).localeCompare(getContactName(b), undefined, { sensitivity: "base" })
    );
  }, [contacts, getContactName]);

  return (
    <div className="rounded-md border divide-y divide-border overflow-hidden">
      {sortedContacts.map((contact) => {
        const email = getPrimaryMethod(contact, "email");
        const phone = getPrimaryMethod(contact, "phone") || getPrimaryMethod(contact, "mobile");
        return (
          <div
            key={contact.id}
            id={`contact-row-${contact.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors duration-200 cursor-pointer"
          >
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 ${getAvatarColor(contact)}`}
            >
              {getInitials(contact)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{getContactName(contact)}</p>
                {contact.is_primary_contact && (
                  <span className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 shrink-0">
                    {t("contacts.is_primary")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {contact.job_title ?? ""}
                {contact.job_title && getPrimaryOrgName(contact) ? " · " : ""}
                {getPrimaryOrgName(contact)}
              </p>
              {(email || phone) && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {email && (
                    <span className="inline-flex items-center gap-1 mr-3">
                      <Mail className="h-3 w-3" />
                      {email}
                    </span>
                  )}
                  {phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {phone}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="flex gap-1 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => openView(contact)}
                title={t("contacts.actions.view")}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {canWrite && contact.is_active && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(contact)}
                    title={t("contacts.actions.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:border-destructive"
                    onClick={() => handleDeactivate(contact)}
                    title={t("contacts.actions.delete")}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </>
              )}
              {canWrite && !contact.is_active && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:border-green-600"
                  onClick={() => handleReactivate(contact)}
                  title="Reactivar"
                >
                  <Power className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ContactsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("auth.manage_users");

  const [search, setSearch] = useState("");
  const [filterOrgId, setFilterOrgId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const [viewContact, setViewContact] = useState<Contact | null>(null);
  const [viewMethods, setViewMethods] = useState<ContactMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const [contactToDeactivate, setContactToDeactivate] = useState<Contact | null>(null);
  const [contactToReactivate, setContactToReactivate] = useState<Contact | null>(null);

  const contactsParams = useMemo(
    () => ({
      is_active: statusFilter === "all" ? undefined : statusFilter === "active",
      organization_id: filterOrgId || undefined,
      search: search || undefined,
    }),
    [filterOrgId, search, statusFilter]
  );
  const tenantId = useAuthStore((s) => s.user?.tenant_id ?? "");
  const orgParams = useMemo(() => ({ is_active: true, page_size: 500 }), []);

  const { contacts, loading, refresh } = useContacts(contactsParams);
  const { organizations } = useOrganizations(orgParams);
  const { update } = useUpdateContact();
  const { remove } = useDeleteContact();

  async function openView(contact: Contact) {
    setViewContact(contact);
    setViewMethods([]);
    setLoadingMethods(true);
    try {
      const res = await getContactMethods("contact", contact.id);
      setViewMethods(res.data ?? []);
    } catch {
      // show contact without methods
    } finally {
      setLoadingMethods(false);
    }
  }

  function closeView() {
    setViewContact(null);
    setViewMethods([]);
  }

  function openCreate() {
    setEditing(null);
    setIsEditOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setIsEditOpen(true);
  }

  function closeEdit() {
    setIsEditOpen(false);
    setEditing(null);
  }

  function handleDeactivate(contact: Contact) {
    setContactToDeactivate(contact);
  }

  async function confirmDeactivate() {
    if (!contactToDeactivate) return;
    const success = await remove(contactToDeactivate.id);
    if (success) {
      showToast(t("contacts.deactivate_success"), "success");
      refresh();
    } else {
      showToast(t("contacts.deactivate_error"), "error");
    }
    setContactToDeactivate(null);
  }

  function handleReactivate(contact: Contact) {
    setContactToReactivate(contact);
  }

  async function confirmReactivate() {
    if (!contactToReactivate) return;
    try {
      const result = await update(contactToReactivate.id, { is_active: true });
      if (result) {
        showToast(t("contacts.reactivate_success"), "success");
        refresh();
      } else {
        showToast(t("contacts.reactivate_error"), "error");
      }
    } catch {
      showToast(t("contacts.reactivate_error"), "error");
    }
    setContactToReactivate(null);
  }

  function getContactName(c: Contact) {
    return c.full_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "—";
  }

  function getPrimaryOrgName(contact: Contact): string {
    const memberships = contact.org_memberships ?? [];
    if (memberships.length === 0) return "";
    const primary = memberships.find((m) => m.is_primary) ?? memberships[0];
    if (!primary) return "";
    return primary.organization_name ?? organizations.find((o) => o.id === primary.organization_id)?.name ?? "";
  }

  return (
    <PageLayout title={t("contacts.title")}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("contacts.search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="w-35 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("contacts.status_filter.all")}</SelectItem>
                  <SelectItem value="active">{t("contacts.status_filter.active")}</SelectItem>
                  <SelectItem value="inactive">{t("contacts.status_filter.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select
              value={filterOrgId || "__all__"}
              onValueChange={(v) => setFilterOrgId(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="sm:max-w-55 h-9">
                <SelectValue placeholder={t("contacts.all_organizations")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("contacts.all_organizations")}</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canWrite && statusFilter !== "inactive" && (
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("contacts.create")}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="rounded-md border divide-y divide-border overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-45" />
                  <Skeleton className="h-3 w-65" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-md border py-12 text-center">
            <p className="text-sm text-muted-foreground">{t("contacts.empty")}</p>
          </div>
        ) : (
          <ContactsList
            contacts={contacts}
            getContactName={getContactName}
            getPrimaryOrgName={getPrimaryOrgName}
            getAvatarColor={getAvatarColor}
            getInitials={getInitials}
            getPrimaryMethod={getPrimaryMethod}
            canWrite={canWrite}
            openView={openView}
            openEdit={openEdit}
            handleDeactivate={handleDeactivate}
            handleReactivate={handleReactivate}
            t={t}
          />
        )}
      </div>

      <ContactViewDialog
        contact={viewContact}
        methods={viewMethods}
        loadingMethods={loadingMethods}
        onClose={closeView}
        onEdit={(c) => { closeView(); openEdit(c); }}
        canWrite={canWrite}
      />

      <ContactEditDialog
        open={isEditOpen}
        contact={editing}
        organizations={organizations}
        canWrite={canWrite}
        tenantId={tenantId}
        onClose={closeEdit}
        onSaved={() => { refresh(); closeEdit(); }}
      />

      <Dialog open={!!contactToDeactivate} onOpenChange={(open) => !open && setContactToDeactivate(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("contacts.confirm_deactivate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {contactToDeactivate ? getContactName(contactToDeactivate) : ""}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setContactToDeactivate(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDeactivate}>
                {t("contacts.actions.delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!contactToReactivate} onOpenChange={(open) => !open && setContactToReactivate(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("contacts.confirm_reactivate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {contactToReactivate ? getContactName(contactToReactivate) : ""}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setContactToReactivate(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" onClick={confirmReactivate}>
                Reactivar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
