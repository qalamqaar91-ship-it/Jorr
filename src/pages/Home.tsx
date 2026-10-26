import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n";

export default function Home() {
  const { t } = useI18n();
  return (
    <>
      <section className="hero">
        <h1>{t.heroTitle}</h1>
        <p>{t.heroBody}</p>
        <div className="row">
          <Link className="btn" to="/signup">{t.getStarted}</Link>
          <Link className="btn alt" to="/login">{t.logIn}</Link>
        </div>
      </section>
      <section className="pillars">
        {t.pillars.map((title, i) => (
          <article key={title}><h2>{title}</h2><p>{t.pillarsBody[i]}</p></article>
        ))}
      </section>
    </>
  );
}
