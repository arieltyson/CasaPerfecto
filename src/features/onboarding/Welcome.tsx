import { Button, Mark } from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";

export function Welcome({
  onStart,
  onMethods,
}: {
  onStart: () => void;
  onMethods: () => void;
}) {
  const { t } = useT();
  return (
    <main className="welcome">
      <div className="welcome__card">
        <Mark size={56} />
        <div className="stack">
          <p className="section-label">{t("app.name")}</p>
          <h1>{t("welcome.title")}</h1>
          <p className="tagline">{t("app.tagline")}</p>
        </div>
        <p>{t("welcome.body")}</p>
        <ul className="welcome__promise">
          <li>{t("welcome.promise1")}</li>
          <li>{t("welcome.promise2")}</li>
          <li>{t("welcome.promise3")}</li>
        </ul>
        <div className="row">
          <Button variant="primary" onClick={onStart}>
            {t("welcome.start")}
          </Button>
          <Button variant="quiet" onClick={onMethods}>
            {t("welcome.methods")}
          </Button>
        </div>
      </div>
    </main>
  );
}
