import { type RouteSectionProps } from "@solidjs/router";
import { A } from "@solidjs/router";
import BottomNav from "~/components/BottomNav/BottomNav";
import styles from "./Layout.module.css";

export default function Layout(props: RouteSectionProps) {
  return (
    <div class={styles.layout}>
      <header class={styles.header}>
        <A href="/" class={styles.logo}>
          🌱 PlanPlant
        </A>
        <nav class={styles.desktopNav}>
          <A href="/garden" class={styles.navLink} activeClass={styles.active}>
            Gardens
          </A>
          <A href="/camera" class={styles.navLink} activeClass={styles.active}>
            Camera
          </A>
          <A
            href="/settings"
            class={styles.navLink}
            activeClass={styles.active}
          >
            Settings
          </A>
        </nav>
      </header>
      <main class={styles.main}>{props.children}</main>
      <BottomNav />
    </div>
  );
}
