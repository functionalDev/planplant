import { Show, For, Suspense } from "solid-js";
import { A } from "@solidjs/router";
import { useGardens } from "~/stores";
import GardenCard from "~/components/GardenCard/GardenCard";
import styles from "./Home.module.css";

export default function Home() {
  const { gardens, loading } = useGardens();

  return (
    <div class={styles.container}>
      <div class={styles.header}>
        <h1 class={styles.title}>My Gardens</h1>
        <A href="/garden/new" class={styles.addButton}>
          + New Garden
        </A>
      </div>

      <Suspense fallback={<div class={styles.loading}>Loading...</div>}>
        <Show
          when={gardens() && gardens()!.length > 0}
          fallback={
            <div class={styles.empty}>
              <span class={styles.emptyIcon}>🌱</span>
              <h2>No gardens yet</h2>
              <p>Create your first garden to start documenting your plants.</p>
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
