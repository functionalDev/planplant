import { Show, createSignal, createResource, For, Suspense } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { loadGarden, updateGarden, removeGarden } from "~/stores";
import { indexedDBAdapter } from "~/db";
import { createShareService } from "~/services";
import type { ShareLink } from "~/models";
import styles from "./GardenSettings.module.css";

const shareService = createShareService(indexedDBAdapter);

export default function GardenSettings() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [garden, { refetch }] = createResource(
    () => params.id,
    (id) => loadGarden(id),
  );

  const [shareLinks] = createResource(
    () => params.id,
    (id) => shareService.getShareLinksForGarden(id),
  );

  const [accessRecords] = createResource(
    () => params.id,
    (id) => shareService.getAccessForGarden(id),
  );

  const [editing, setEditing] = createSignal(false);
  const [name, setName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [confirmDelete, setConfirmDelete] = createSignal(false);

  const startEditing = () => {
    const g = garden();
    if (!g) return;
    setName(g.name);
    setDescription(g.description);
    setEditing(true);
  };

  const saveChanges = async () => {
    const g = garden();
    if (!g) return;
    await updateGarden(g.id, {
      name: name().trim(),
      description: description().trim(),
    });
    setEditing(false);
    refetch();
  };

  const handleDelete = async () => {
    const g = garden();
    if (!g) return;
    await removeGarden(g.id);
    navigate("/");
  };

  const handleGenerateLink = async (
    permission: "temp-readonly" | "readonly" | "readwrite",
  ) => {
    const g = garden();
    if (!g) return;
    const link = await shareService.generateShareLink(g.id, permission);
    const url = shareService.buildShareUrl(link.id);
    await navigator.clipboard.writeText(url);
    alert(`Share link copied to clipboard!\n\n${url}\n\n(Note: Sharing requires a cloud backend to work.)`);
  };

  return (
    <Suspense fallback={<div class={styles.loading}>Loading...</div>}>
      <Show
        when={garden()}
        fallback={
          <div class={styles.notFound}>
            <h2>Garden not found</h2>
            <A href="/">← Back to Home</A>
          </div>
        }
      >
        {(g) => (
          <div class={styles.container}>
            <div class={styles.breadcrumb}>
              <A href={`/garden/${g().id}`}>← Back to {g().name}</A>
            </div>

            <h1 class={styles.title}>Garden Settings</h1>

            {/* Garden Info Section */}
            <section class={styles.section}>
              <h2 class={styles.sectionTitle}>Garden Info</h2>
              <Show
                when={editing()}
                fallback={
                  <div class={styles.infoDisplay}>
                    <div>
                      <strong>{g().name}</strong>
                      {g().description && <p>{g().description}</p>}
                    </div>
                    <button class={styles.editButton} onClick={startEditing}>
                      Edit
                    </button>
                  </div>
                }
              >
                <div class={styles.editForm}>
                  <input
                    type="text"
                    class={styles.input}
                    value={name()}
                    onInput={(e) => setName(e.currentTarget.value)}
                    placeholder="Garden name"
                  />
                  <textarea
                    class={styles.textarea}
                    value={description()}
                    onInput={(e) => setDescription(e.currentTarget.value)}
                    placeholder="Description (optional)"
                    rows={2}
                  />
                  <div class={styles.editActions}>
                    <button class={styles.saveButton} onClick={saveChanges}>
                      Save
                    </button>
                    <button
                      class={styles.cancelButton}
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </Show>
            </section>

            {/* Sharing Section */}
            <section class={styles.section}>
              <h2 class={styles.sectionTitle}>Sharing</h2>
              <p class={styles.sectionNote}>
                ⚠️ Sharing is currently in preview. Links are generated but
                require a cloud backend to work.
              </p>
              <div class={styles.shareButtons}>
                <button
                  class={styles.shareButton}
                  onClick={() => handleGenerateLink("temp-readonly")}
                >
                  🔗 Temporary View (15 days)
                </button>
                <button
                  class={styles.shareButton}
                  onClick={() => handleGenerateLink("readonly")}
                >
                  🔗 Permanent View
                </button>
                <button
                  class={styles.shareButton}
                  onClick={() => handleGenerateLink("readwrite")}
                >
                  🔗 Edit Access
                </button>
              </div>

              <Show when={shareLinks() && shareLinks()!.length > 0}>
                <h3 class={styles.subTitle}>Active Share Links</h3>
                <div class={styles.linkList}>
                  <For each={shareLinks()}>
                    {(link: ShareLink) => (
                      <div class={styles.linkItem}>
                        <span class={styles.linkPermission}>
                          {link.permission}
                        </span>
                        <span class={styles.linkExpiry}>
                          {link.expiresAt
                            ? `Expires ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(link.expiresAt)}`
                            : "No expiry"}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </section>

            {/* Access Section */}
            <section class={styles.section}>
              <h2 class={styles.sectionTitle}>Access</h2>
              <Show
                when={accessRecords() && accessRecords()!.length > 0}
                fallback={
                  <p class={styles.emptyText}>
                    Only you have access to this garden.
                  </p>
                }
              >
                <div class={styles.accessList}>
                  <For each={accessRecords()}>
                    {(access) => (
                      <div class={styles.accessItem}>
                        <span class={styles.accessDevice}>
                          {access.deviceId.slice(0, 8)}...
                        </span>
                        <span class={styles.accessPermission}>
                          {access.permission}
                        </span>
                        <span class={styles.accessOrigin}>
                          via {access.origin}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </section>

            {/* Danger Zone */}
            <section class={`${styles.section} ${styles.dangerSection}`}>
              <h2 class={styles.sectionTitle}>Danger Zone</h2>
              <Show
                when={confirmDelete()}
                fallback={
                  <button
                    class={styles.deleteButton}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete Garden
                  </button>
                }
              >
                <p class={styles.deleteWarning}>
                  Are you sure? This will permanently delete "{g().name}" and
                  all its data.
                </p>
                <div class={styles.deleteActions}>
                  <button
                    class={styles.confirmDeleteButton}
                    onClick={handleDelete}
                  >
                    Yes, delete it
                  </button>
                  <button
                    class={styles.cancelButton}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              </Show>
            </section>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
