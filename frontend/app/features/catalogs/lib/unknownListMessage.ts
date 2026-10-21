/**
 * Message for a ?list= deep link that names no available catalog.
 *
 * The value comes from the URL, so anyone can put any text there and send
 * the link. Echoing it verbatim lets that text speak inside the app's own
 * toast (SEC-230-R1-02). Only a value with the shape of a catalog key is
 * shown -- the same pattern the backend router enforces
 * (`_LIST_KEY_PATTERN` in app/core/catalogs/router.py), with a length cap --
 * and anything else gets the generic message.
 *
 * AiutoX ERP Core -- Frankpach
 */

const LIST_KEY_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
const MAX_ECHOED_KEY_LENGTH = 100;

export function unknownListMessage(
  t: (key: string) => string,
  key: string
): string {
  if (key.length > MAX_ECHOED_KEY_LENGTH || !LIST_KEY_PATTERN.test(key)) {
    return t("catalogs.admin.unknownListToastGeneric");
  }
  // A function replacement keeps `$&`, `$'` and the like literal.
  return t("catalogs.admin.unknownListToast").replace("{key}", () => key);
}
