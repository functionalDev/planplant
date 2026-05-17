import { A } from "@solidjs/router";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
  return (
    <nav class={styles.bottomNav}>
      <A href="/garden" class={styles.tab} activeClass={styles.active}>
        <span class={styles.icon}>🌿</span>
        <span class={styles.label}>Gardens</span>
      </A>
      <A href="/camera" class={styles.tab} activeClass={styles.active}>
        <span class={styles.icon}>📷</span>
        <span class={styles.label}>Camera</span>
      </A>
      <A href="/settings" class={styles.tab} activeClass={styles.active}>
        <span class={styles.icon}>⚙️</span>
        <span class={styles.label}>Settings</span>
      </A>
    </nav>
  );
}
