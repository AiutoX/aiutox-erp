/**
 * English translations for mentions module.
 */

export const translations = {
  mentions: {
    // Actions
    create: "Create Mention",
    mention: "Mention",
    resolve: "Mark as Read",
    resolved: "Resolved",
    unresolved: "Unresolved",
    delete: "Delete Mention",
    deleteConfirm: "Delete this mention?",
    deleteConfirmDescription: "This action cannot be undone.",

    // Status
    empty: "No mentions yet",
    noMentions: "You don't have any mentions",
    unreadCount: "{{count}} unread mention",
    unreadCountPlural: "{{count}} unread mentions",
    allRead: "All mentions read",
    markAllAsRead: "Mark all as read",

    // Entity types
    inComment: "mentioned in a comment",
    inTask: "mentioned in a task",
    inActivity: "mentioned in an activity",
    inTemplate: "mentioned in a template",

    // Labels
    mentionedBy: "Mentioned by {{user}}",
    createdAt: "Created {{date}}",
    resolvedAt: "Resolved {{date}}",
    from: "From",
    in: "In",
    user: "User",
    entity: "Entity",
    time: "Time",
    status: "Status",

    // Messages
    createSuccess: "Mention created successfully",
    createError: "Failed to create mention",
    resolveSuccess: "Mention marked as read",
    resolveError: "Failed to mark mention as read",
    deleteSuccess: "Mention deleted successfully",
    deleteError: "Failed to delete mention",
    loadingError: "Failed to load mentions",

    // Notification
    notify: "Send notification",
    notificationSent: "Notification sent",
    notificationFailed: "Failed to send notification",
    mentionNotification: "{{user}} mentioned you",
    mentionNotificationBody: "You were mentioned {{where}}",

    // Filters
    filter: "Filter",
    showResolved: "Show resolved",
    hideResolved: "Hide resolved",
    showAll: "Show all",
    unresolvedOnly: "Unresolved only",

    // Sorting
    newestFirst: "Newest first",
    oldestFirst: "Oldest first",
    unresolvedFirst: "Unresolved first",

    // Permissions
    noPermission: "No permission to manage mentions",
    readError: "Cannot read mentions",
    writeError: "Cannot create or update mentions",
    permissionDeleteError: "Cannot delete mentions",

    // Placeholders
    searchPlaceholder: "Search mentions...",
    selectEntity: "Select entity type",

    // Details
    details: "Mention Details",
    view: "View Mention",
    edit: "Edit Mention",
    goToEntity: "Go to {{entityType}}",

    // Batch actions
    batchResolve: "Mark as read",
    batchDelete: "Delete selected",
    selectAll: "Select all",
    noneSelected: "No mentions selected",

    // Error messages
    mentionYourself: "You cannot mention yourself",
    userNotFound: "User not found",
    entityNotFound: "Entity not found",
    alreadyMentioned: "User already mentioned in this entity",
  },
};
