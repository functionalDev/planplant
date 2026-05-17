import styles from "./Camera.module.css";

export default function Camera() {
  return (
    <div class={styles.container}>
      <h1 class={styles.title}>📷 Camera</h1>
      <p class={styles.description}>
        Take a photo of a plant, insect, animal, or garden view to identify and
        document it.
      </p>
      <div class={styles.placeholder}>
        <span>Camera feature coming soon...</span>
      </div>
    </div>
  );
}
