/**
 * Comments module public exports.
 */

// API
export * from "./api/comments.api";

// Hooks
export * from "./hooks/useComments";

// Types
export * from "./types/comment.types";

// Components
export { CommentForm } from "./components/CommentForm";
export { CommentAttachments } from "./components/CommentAttachments";
export { CommentItem } from "./components/CommentItem";
export { CommentThread } from "./components/CommentThread";

// i18n
export { commentsES } from "./i18n/es";
export { commentsEN } from "./i18n/en";
