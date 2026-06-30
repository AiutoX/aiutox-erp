/**
 * Comments mentions page
 * Displays user mentions and notifications
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CommentThread } from "~/features/comments/components/CommentThread";
import {
  useMentions,
  useComments,
  useCreateComment,
} from "~/features/comments/hooks/useComments";
import type { CommentMention } from "~/features/comments/types/comment.types";

export default function CommentsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("mentions");

  // Query hooks
  const {
    data: mentionsData,
    isLoading: mentionsLoading,
    refetch: refetchMentions,
  } = useMentions({
    page: 1,
    page_size: 20,
  });

  const {
    data: commentsData,
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = useComments({
    page: 1,
    page_size: 20,
  });

  const createCommentMutation = useCreateComment();

  const handleReply = (commentId: string, content: string) => {
    createCommentMutation.mutate(
      {
        entity_type: "comment",
        entity_id: commentId,
        content,
        parent_id: commentId,
      },
      {
        onSuccess: () => {
          void refetchMentions();
          void refetchComments();
        },
      }
    );
  };

  const handleEdit = (commentId: string, content: string) => {
    // Handle edit logic
    console.warn("Edit comment:", commentId, content);
  };

  const handleDelete = (commentId: string) => {
    // Handle delete logic
    console.warn("Delete comment:", commentId);
  };

  const mentions = mentionsData?.data || [];
  const comments = commentsData?.data || [];

  return (
    <PageLayout
      title={t("comments.title")}
      description={t("comments.description")}
      loading={mentionsLoading || commentsLoading}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mentions">
              {t("comments.mentions.title")}
              {mentions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {mentions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent">
              {t("comments.recent.title")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mentions" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {t("comments.mentions.subtitle")}
                </h2>
                <Button onClick={() => void refetchMentions()}>
                  {t("common.refresh")}
                </Button>
              </div>

              {mentions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-muted-foreground">
                      {t("comments.mentions.empty")}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {mentions.map((mention: CommentMention) => (
                    <Card key={mention.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {mention.user_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {t("comments.mentionedIn")} {mention.comment_id}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(
                                mention.created_at
                              ).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to comment
                              console.warn(
                                "Navigate to comment:",
                                mention.comment_id
                              );
                            }}
                          >
                            {t("comments.view")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {t("comments.recent.subtitle")}
                </h2>
                <Button onClick={() => void refetchComments()}>
                  {t("common.refresh")}
                </Button>
              </div>

              {comments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-muted-foreground">
                      {t("comments.recent.empty")}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <CommentThread
                      key={comment.id}
                      thread={{
                        comment,
                        replies: [],
                        total_replies: 0,
                      }}
                      onReply={handleReply}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
