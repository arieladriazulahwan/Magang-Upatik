import { router } from "expo-router";

type ReplaceTarget = Parameters<typeof router.replace>[0];

export function safeBack(fallback: ReplaceTarget = "/(main)") {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
