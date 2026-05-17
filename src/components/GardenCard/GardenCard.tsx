import { A } from "@solidjs/router";
import type { Garden } from "~/models";
import styles from "./GardenCard.module.css";

interface GardenCardProps {
  garden: Garden;
}

export default function GardenCard(props: GardenCardProps) {
  const formattedDate = () => {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
    }).format(props.garden.updatedAt);
  };

  return (
    <A href={`/garden/${props.garden.id}`} class={styles.card}>
      <div class={styles.icon}>🌿</div>
      <div class={styles.content}>
        <h3 class={styles.name}>{props.garden.name}</h3>
        {props.garden.description && (
          <p class={styles.description}>{props.garden.description}</p>
        )}
        <span class={styles.date}>Updated {formattedDate()}</span>
      </div>
      <div class={styles.arrow}>›</div>
    </A>
  );
}
