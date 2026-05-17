import { A } from "@solidjs/router";
import styles from "./NotFound.module.css";

export default function NotFound() {
  return (
    <div class={styles.container}>
      <h1 class={styles.title}>404</h1>
      <p class={styles.message}>Page not found</p>
      <A href="/" class={styles.link}>
        ← Back to Home
      </A>
    </div>
  );
}
