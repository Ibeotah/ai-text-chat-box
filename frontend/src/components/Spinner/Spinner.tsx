import styles from "./Spinner.module.css";

function Spinner() {
  return <div className={styles.spinner} aria-label="Loading" />;
}

export default Spinner;