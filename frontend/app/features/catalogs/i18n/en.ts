export const translations = {
  catalogs: {
    select: {
      placeholder: "Select an option",
      loading: "Loading…",
      error: "Could not load",
      retry: "Retry",
      searchPlaceholder: "Search…",
      empty: "No results",
      inactive: "inactive",
      // CountrySelect groups (ISSUE-029, AC-LIB-07)
      frequentGroup: "Frequent",
      allGroup: "All",
      // DivisionSelect (ISSUE-030, AC-LIB-08)
      selectParentFirst: "Select the department first",
    },
    admin: {
      title: "Catalogs",
      unknownListToast:
        "Catalog “{key}” is not available. Showing the first one.",
      unknownListToastGeneric:
        "The requested catalog is not available. Showing the first one.",
      subtitle: "Tailor your organization's option lists.",
      breadcrumbConfig: "Settings",
      searchPlaceholder: "Search catalogs…",
      noSearchMatch: "No catalog matches your search.",
      listNavLabel: "Catalog list",
      lockedTooltip:
        "The platform does not allow your organization to change this catalog.",
      backToList: "Catalogs",
      loadError: {
        title: "Catalogs could not be loaded",
        message: "Check your connection and try again.",
        retry: "Retry",
      },
      empty: {
        title: "No catalogs available yet.",
      },
      groups: {
        users: "Users and organizations",
      },
      detail: {
        historyButton: "History",
      },
      governance: {
        title: "Catalog permissions",
        manageSwitch: "Organizations can manage this catalog",
        manageHelper: "Change labels, reorder and hide items.",
        extensibleSwitch: "Organizations can add items",
        extensibleHelper:
          "Create their own items, visible only to their organization.",
        tenantHelper: "Configured by the platform.",
        platformChip: "Platform",
        superadminSubtitle: "Changes apply to all organizations immediately.",
        lockedIndicator: "Locked by module {owner}",
        lockedTooltip:
          "This catalog is locked by module {owner}: new codes break its validation.",
        confirmTitle: "Change permissions for all organizations",
        confirmEffect: "This applies to all organizations immediately.",
        confirmNarrowing:
          "Organizations' existing changes are kept but stop applying.",
        confirmRule006:
          "Adding items requires managing the catalog, so “Organizations can manage this catalog” will be turned on too.",
        confirmRule006Narrowing:
          "Adding items requires managing the catalog, so “Organizations can add items” will be turned off too.",
        reasonLabel: "Reason for the change",
        reasonHint: "Minimum 10 characters.",
        confirmButton: "Confirm change",
        cancelButton: "Cancel",
        successToast: "Permissions updated for all organizations",
        staleToast:
          "Another administrator changed this catalog. The data was reloaded.",
        errorToast: "Could not update permissions.",
      },
      addDisabled: {
        locked: "This catalog is locked by the module.",
        notManaged: "The platform manages this catalog.",
        notExtensible:
          "The platform does not allow adding items to this catalog.",
      },
      items: {
        // ISSUE-034 items card (AC-UI-13/15/16/17/18)
        title: "Items",
        summary: "{visible} visible of {total}",
        searchPlaceholder: "Search items…",
        showDeprecated: "Show retired",
        addItem: "Add item",
        reorderColumn: "Order",
        codeColumn: "Code",
        spanishColumn: "Spanish",
        englishColumn: "English",
        originColumn: "Origin",
        stateColumn: "Status",
        actionsColumn: "Actions",
        systemBadge: "System",
        customBadge: "Custom",
        retiredBadge: "Retired",
        modifiedBadge: "Modified",
        modifiedTooltip: "Your organization changed this item.",
        codeCopied: "Code copied",
        readOnlyBanner:
          "The platform manages this catalog. Changes are not available to your organization.",
        visibleText: "Visible",
        hiddenText: "Hidden",
        noSearchMatch: "No item matches your search.",
        empty: "This catalog has no items.",
        loadError: "Items could not be loaded.",
        visibilitySwitch: "Visibility of {code}",
        dragHandle: "Reorder {code}",
        rowMenu: "Actions for {code}",
        menu: {
          edit: "Edit",
          history: "View history",
          restore: "Restore default",
          // ISSUE-035 mobile reorder entries (AC-UI-22/27)
          moveUp: "Move up",
          moveDown: "Move down",
        },
        // ISSUE-035 visibility switch and restore default (AC-UI-19/22)
        hideSuccessToast: "Item hidden",
        restoreVisibilityToast: "Item restored",
        lastVisibleErrorToast: "You cannot hide the last visible item.",
        updateErrorToast: "The item could not be updated.",
        restoreSuccessToast: "Item restored to its default values",
        restoreErrorToast: "The item could not be restored.",
        // ISSUE-036 reorder (AC-UI-20/21/22)
        reorderSuccessToast: "Order saved",
        reorderErrorToast:
          "The order could not be saved. The list was reloaded.",
        // Derived copy, pending approval: 422 CATALOG_ORDER_MISMATCH toast.
        reorderMismatchToast:
          "The list changed while you were reordering it. The data was reloaded.",
        // Derived copy, pending approval: drag handle and screen-reader texts.
        reorderRoleDescription: "sortable item",
        reorderInstructions:
          "To reorder, press Space or Enter to pick up the item, use the up and down arrow keys to move it, press Space or Enter to drop it, or Escape to cancel.",
        reorderAnnounceStart:
          "Picked up {name}. Position {position} of {total}.",
        reorderAnnounceOver: "{name} is at position {position} of {total}.",
        reorderAnnounceEnd: "Dropped {name} at position {position} of {total}.",
        reorderAnnounceCancel:
          "Reordering cancelled. {name} returned to position {position}.",
      },
      itemDialog: {
        // ISSUE-037 edit / add item dialog (AC-UI-23/24)
        editTitle: "Edit item",
        addTitle: "Add item",
        addSubtitle: "· visible only to your organization",
        codeAutoHint: "(generated automatically)",
        systemCodeNote:
          "The code does not change: reports and integrations keep working.",
        editSuccessToast: "Label updated",
        addSuccessToast: "Item added",
        // Derived copy, pending approval: preview note, 409 toasts.
        previewHelper: "Preview; the server assigns the final code on save.",
        limitReachedToast:
          "You reached the limit of 200 custom items in this catalog.",
        notExtensibleToast:
          "The platform no longer allows adding items to this catalog.",
        // Derived copy, pending approval: buttons, generic error, field errors.
        saveButton: "Save",
        cancelButton: "Cancel",
        addErrorToast: "The item could not be added.",
        errors: {
          required: "Required",
          tooLong: "100 characters maximum.",
          html: "Do not use the < or > characters.",
          controlChar:
            "This field has invisible characters, usually from text pasted from another document. Clear it and type it again.",
          invalid: "Invalid value.",
        },
      },
    },
    history: {
      // ISSUE-038 history sheet (AC-UI-25)
      systemSync: "System sync",
      emptyState: "No changes recorded.",
      beforeLabel: "Before",
      afterLabel: "After",
      // Derived copy, pending approval: titles, actor, pagination, states, values.
      listTitle: "Catalog history",
      itemTitle: "Item history",
      platformActor: "Platform administrator",
      unknownActor: "Unknown user",
      loadMore: "Load more",
      loadingMore: "Loading…",
      loadError: "The history could not be loaded.",
      loadMoreError: "The older changes could not be loaded.",
      values: {
        yes: "Yes",
        no: "No",
      },
      fields: {
        code: "Code",
        labels: "Labels",
        sort_order: "Order",
        attributes: "Attributes",
        is_hidden: "Hidden",
        tenant_can_manage: "Organizations can manage",
        is_extensible: "Organizations can add items",
        is_locked: "Locked by the module",
        manage_permission: "Manage permission",
      },
      // Derived copy, pending approval: change type labels.
      changeTypes: {
        items: {
          created: "Created",
          synced: "Synced",
          labels_updated: "Labels updated",
          reordered: "Reordered",
          hidden: "Hidden",
          unhidden: "Shown again",
          reset: "Restored to defaults",
          deprecated: "Retired",
          reactivated: "Reactivated",
        },
        lists: {
          created: "Created",
          declaration_synced: "Declaration synced",
          governance_updated: "Permissions updated",
          deprecated: "Retired",
          reactivated: "Reactivated",
        },
      },
    },
  },
};
