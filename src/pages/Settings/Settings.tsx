import { Show, createSignal, Suspense } from "solid-js";
import { useDevice, updateDeviceDisplayName } from "~/stores";
import styles from "./Settings.module.css";

export default function Settings() {
  const { device, loading } = useDevice();
  const [editing, setEditing] = createSignal(false);
  const [displayName, setDisplayName] = createSignal("");

  const startEditing = () => {
    const dev = device();
    if (!dev) return;
    setDisplayName(dev.displayName);
    setEditing(true);
  };

  const saveDisplayName = async () => {
    const name = displayName().trim();
    if (!name) return;
    await updateDeviceDisplayName(name);
    setEditing(false);
  };

  return (
    <div class={styles.container}>
      <h1 class={styles.title}>Settings</h1>

      <Suspense fallback={<div class={styles.loading}>Loading...</div>}>
        <Show when={device()}>
          {(dev) => (
            <section class={styles.section}>
              <h2 class={styles.sectionTitle}>Device Identity</h2>
              <div class={styles.field}>
                <span class={styles.label}>Device ID</span>
                <code class={styles.deviceId}>{dev().deviceId}</code>
              </div>
              <div class={styles.field}>
                <span class={styles.label}>Display Name</span>
                <Show
                  when={editing()}
                  fallback={
                    <div class={styles.valueRow}>
                      <span>{dev().displayName}</span>
                      <button
                        class={styles.editButton}
                        onClick={startEditing}
                      >
                        Edit
                      </button>
                    </div>
                  }
                >
                  <div class={styles.editRow}>
                    <input
                      type="text"
                      class={styles.input}
                      value={displayName()}
                      onInput={(e) =>
                        setDisplayName(e.currentTarget.value)
                      }
                      autofocus
                    />
                    <button
                      class={styles.saveButton}
                      onClick={saveDisplayName}
                    >
                      Save
                    </button>
                    <button
                      class={styles.cancelButton}
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </Show>
              </div>
            </section>
          )}
        </Show>
      </Suspense>

      <section class={styles.section}>
        <h2 class={styles.sectionTitle}>About</h2>
        <p class={styles.aboutText}>
          PlanPlant v0.1.0 — Document your garden, identify plants, and share
          with your family.
        </p>
        <p class={styles.aboutNote}>
          Data is stored locally on this device using IndexedDB. Cloud sync
          coming soon.
        </p>
      </section>
    </div>
  );
}
