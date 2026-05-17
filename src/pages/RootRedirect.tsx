import { createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useGardens } from "~/stores";
import type { Garden } from "~/models";

/**
 * Root redirect: opens last-used garden or falls back to garden list.
 */
export default function RootRedirect() {
  const navigate = useNavigate();
  const { gardens } = useGardens();

  createEffect(() => {
    const list: Garden[] | undefined = gardens();
    if (list === undefined) return; // Still loading

    const lastId = localStorage.getItem("planplant:lastGarden");

    if (lastId && list.some((g) => g.id === lastId)) {
      navigate(`/garden/${lastId}`, { replace: true });
    } else if (list.length > 0) {
      navigate(`/garden/${list[0].id}`, { replace: true });
    } else {
      navigate("/garden", { replace: true });
    }
  });

  return null;
}
