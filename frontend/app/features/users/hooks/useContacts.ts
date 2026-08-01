/**
 * React hooks for contact management
 *
 * Provides CRUD operations for contacts
 */

import { useCallback, useState, useEffect } from "react";
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from "../api/contacts.api";
import type {
  Contact,
  ContactCreate,
  ContactUpdate,
} from "../types/user.types";

interface ContactsListParams {
  page?: number;
  page_size?: number;
  search?: string;
  organization_id?: string;
  is_active?: boolean;
}

/**
 * Hook to list contacts with pagination
 */
export function useContacts(params?: ContactsListParams) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  } | null>(null);

  const page = params?.page;
  const page_size = params?.page_size;
  const search = params?.search;
  const organization_id = params?.organization_id;
  const is_active = params?.is_active;

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const currentParams = { page, page_size, search, organization_id, is_active };

    try {
      const response = await listContacts(currentParams);
      setContacts(response.data);
      if (response.meta && "total" in response.meta) {
        setPagination({
          total: response.meta.total,
          page: response.meta.page,
          page_size: response.meta.page_size,
          total_pages: response.meta.total_pages,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load contacts")
      );
    } finally {
      setLoading(false);
    }
   
  }, [page, page_size, search, organization_id, is_active]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    pagination,
    refresh: fetchContacts,
  };
}

/**
 * Hook to get a single contact by ID
 */
export function useContact(contactId: string | null) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchContact = useCallback(async () => {
    if (!contactId) {
      setContact(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getContact(contactId);
      setContact(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load contact")
      );
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  return {
    contact,
    loading,
    error,
    refresh: fetchContact,
  };
}

/**
 * Hook to create a contact
 */
export function useCreateContact() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (data: ContactCreate): Promise<Contact | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await createContact(data);
        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to create contact")
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    create,
    loading,
    error,
  };
}

/**
 * Hook to update a contact
 */
export function useUpdateContact() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (contactId: string, data: ContactUpdate): Promise<Contact | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await updateContact(contactId, data);
        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to update contact")
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    update,
    loading,
    error,
  };
}

/**
 * Hook to delete a contact
 */
export function useDeleteContact() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async (contactId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await deleteContact(contactId);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to delete contact")
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    remove,
    loading,
    error,
  };
}
