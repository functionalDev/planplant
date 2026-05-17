import { Show, For, Suspense } from "solid-js";
import { A } from "@solidjs/router";
import { useGardens } from "~/stores";
import GardenCard from "~/components/GardenCard/GardenCard";
import styles from "./GardenList.module.css";

export default function GardenList() {
  const { gardens, loading } = useGardens();

  return (
    <div class={styles.container}>
      <div class={styles.header}>
        <h1 class={styles.title}>🌿 Gardens</h1>
        <A href="/garden/new" class={styles.addButton}>
          + New
        </A>
      </div>

      <Suspense fallback={<div class={styles.loading}>Loading...</div>}>
        <Show
          when={gardens() && gardens()!.length > 0}
          fallback={
            <div class={styles.empty}>
              <p>No gardens yet.</p>
              <A href="/garden/new" class={styles.emptyButton}>
                Create your first garden
              </A>
            </div>
          }
        >
          <div class={styles.gardenList}>
            <For each={gardens()}>
              {(garden) => <GardenCard garden={garden} />}
            </For>
          </div>
        </Show>
      </Suspense>
    </div>
  );
}
