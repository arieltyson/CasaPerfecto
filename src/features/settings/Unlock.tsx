import { useState } from "react";
import { useAppState } from "../../app/state.tsx";
import { Button, Field, Mark } from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";

export function Unlock() {
  const { unlockWith, deleteEverything } = useAppState();
  const { t } = useT();
  const [passphrase, setPassphrase] = useState("");
  const [working, setWorking] = useState(false);
  const [wrong, setWrong] = useState(false);

  return (
    <main className="welcome">
      <form
        className="welcome__card"
        onSubmit={async (e) => {
          e.preventDefault();
          setWorking(true);
          const ok = await unlockWith(passphrase);
          setWorking(false);
          setWrong(!ok);
        }}
      >
        <Mark size={48} />
        <h1>{t("unlock.title")}</h1>
        <p>{t("unlock.body")}</p>
        <Field
          label={t("unlock.passphrase")}
          type="password"
          autoComplete="current-password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          aria-invalid={wrong}
        />
        {wrong ? <p role="alert">{t("unlock.wrong")}</p> : null}
        <div className="row">
          <Button
            type="submit"
            variant="primary"
            disabled={working || !passphrase}
          >
            {working ? t("unlock.working") : t("unlock.submit")}
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              if (confirm(t("unlock.freshConfirm"))) deleteEverything();
            }}
          >
            {t("unlock.fresh")}
          </Button>
        </div>
      </form>
    </main>
  );
}
