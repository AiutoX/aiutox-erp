/**
 * Canales conectados — employee self-service channel linking section.
 * Lists the current user's own linked channel identities (e.g. Telegram),
 * lets them unlink one, and generate a new Telegram linking code.
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { showToast } from "~/components/common/Toast";
import {
  useChannelIdentities,
  useCreateTelegramLinkCode,
  useDeactivateChannelIdentity,
} from "../hooks/useChannelIdentities";

export function ChannelIdentitiesSection() {
  const { t } = useTranslation();
  const { data: identities, isLoading } = useChannelIdentities();
  const deactivate = useDeactivateChannelIdentity();
  const createLinkCode = useCreateTelegramLinkCode();
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const handleUnlink = async (identityId: string) => {
    try {
      await deactivate.mutateAsync(identityId);
      showToast(t("integrations.channelIdentities.unlinkSuccess"), "success");
    } catch {
      showToast(t("integrations.channelIdentities.unlinkError"), "error");
    }
  };

  const handleGenerateCode = async () => {
    try {
      const response = await createLinkCode.mutateAsync();
      setActiveCode(response.data.code);
    } catch {
      showToast(t("integrations.channelIdentities.linkCodeError"), "error");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        {t("integrations.channelIdentities.title")}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t("integrations.channelIdentities.description")}
      </p>

      {isLoading ? (
        <p className="text-sm text-gray-500">
          {t("integrations.channelIdentities.loading")}
        </p>
      ) : identities && identities.length > 0 ? (
        <ul className="space-y-3 mb-6">
          {identities.map((identity) => (
            <li
              key={identity.id}
              className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-md p-3"
            >
              <div>
                <p className="font-medium capitalize">{identity.channel}</p>
                <p className="text-xs text-gray-500">
                  {identity.channel_user_id}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={deactivate.isPending}
                onClick={() => void handleUnlink(identity.id)}
              >
                {t("integrations.channelIdentities.unlink")}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 mb-6">
          {t("integrations.channelIdentities.noneLinked")}
        </p>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-medium mb-2">
          {t("integrations.channelIdentities.linkTelegram")}
        </h3>
        {activeCode ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 text-center">
            <p className="text-2xl font-mono tracking-widest">{activeCode}</p>
            <p className="text-xs text-gray-500 mt-2">
              {t("integrations.channelIdentities.codeInstructions")}
            </p>
          </div>
        ) : (
          <Button
            variant="outline"
            disabled={createLinkCode.isPending}
            onClick={() => void handleGenerateCode()}
          >
            {createLinkCode.isPending
              ? t("integrations.channelIdentities.generating")
              : t("integrations.channelIdentities.generateCode")}
          </Button>
        )}
      </div>
    </div>
  );
}
