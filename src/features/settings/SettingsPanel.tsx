import { useId, useRef, useState } from "react";
import type { Appearance, Language } from "../../app/model.ts";
import { parseState } from "../../app/parse.ts";
import { useAppState } from "../../app/state.tsx";
import {
  Button,
  Field,
  SectionLabel,
  Segmented,
  Toggle,
} from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";
import { encodeShare } from "../../lib/share.ts";
import { RememberToggle } from "../budget/inputs.tsx";

export function SettingsPanel() {
  const { state, dispatch, hasPassphrase, setPassphrase, deleteEverything } =
    useAppState();
  const { t } = useT();
  const [passphrase, setPassphraseDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const linkId = useId();
  const languageId = useId();

  const link = `${location.origin}${location.pathname}#${encodeShare(state)}`;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "casaperfecto.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <section className="stack" aria-labelledby="settings-title">
        <h2 id="settings-title">{t("settings.title")}</h2>
        <div className="field">
          <label htmlFor={languageId}>{t("settings.language")}</label>
          <select
            id={languageId}
            className="select"
            value={state.settings.language}
            onChange={(e) =>
              dispatch({
                type: "setSettings",
                settings: { language: e.target.value as Language },
              })
            }
          >
            <option value="en" lang="en">
              English
            </option>
            <option value="es" lang="es">
              Español
            </option>
          </select>
        </div>
        <Segmented<Appearance>
          legend={t("settings.appearance")}
          value={state.settings.appearance}
          onChange={(appearance) =>
            dispatch({ type: "setSettings", settings: { appearance } })
          }
          options={[
            { value: "system", label: t("appearance.system") },
            { value: "light", label: t("appearance.light") },
            { value: "dark", label: t("appearance.dark") },
          ]}
        />
      </section>

      <section className="stack" aria-labelledby="privacy-title">
        <SectionLabel>
          <span id="privacy-title">{t("settings.privacy")}</span>
        </SectionLabel>
        <RememberToggle />
        <div className="stack">
          <p className="segmented__legend">{t("settings.lock")}</p>
          <p className="field__hint">{t("settings.lockHint")}</p>
          {!state.settings.remember ? (
            <p className="note">{t("settings.lockNeedsRemember")}</p>
          ) : hasPassphrase ? (
            <div className="row">
              <p>{t("settings.locked")}</p>
              <Button onClick={() => void setPassphrase(null)}>
                {t("settings.removeLock")}
              </Button>
            </div>
          ) : (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                if (!passphrase) return;
                void setPassphrase(passphrase).then(() =>
                  setPassphraseDraft(""),
                );
              }}
            >
              <Field
                label={t("settings.passphrase")}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passphrase}
                onChange={(e) => setPassphraseDraft(e.target.value)}
              />
              <Button type="submit" disabled={passphrase.length < 8}>
                {t("settings.setLock")}
              </Button>
            </form>
          )}
        </div>
      </section>

      <section className="stack" aria-labelledby="share-title">
        <SectionLabel>
          <span id="share-title">{t("settings.share")}</span>
        </SectionLabel>
        <p className="field__hint">{t("settings.shareHint")}</p>
        <Toggle
          label={t("settings.shareBudget")}
          checked={state.settings.shareBudget}
          onChange={(shareBudget) =>
            dispatch({ type: "setSettings", settings: { shareBudget } })
          }
        />
        <div className="field">
          <label htmlFor={linkId}>{t("settings.shareLabel")}</label>
          <textarea
            id={linkId}
            className="textarea"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div>
          <Button
            onClick={() =>
              navigator.clipboard.writeText(link).then(
                () => setStatus(t("settings.copied")),
                () => setStatus(t("settings.copyFailed")),
              )
            }
          >
            {t("settings.copy")}
          </Button>
        </div>
      </section>

      <section className="stack" aria-labelledby="data-title">
        <SectionLabel>
          <span id="data-title">{t("settings.data")}</span>
        </SectionLabel>
        <div className="row">
          <Button onClick={exportJson}>{t("settings.export")}</Button>
          <Button onClick={() => fileInput.current?.click()}>
            {t("settings.import")}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label={t("settings.import")}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const imported = parseState(JSON.parse(await file.text()));
                // Keep this device's storage choice; the file cannot opt in.
                dispatch({
                  type: "replace",
                  state: {
                    ...imported,
                    onboarded: true,
                    settings: {
                      ...imported.settings,
                      remember: state.settings.remember,
                    },
                  },
                });
                setStatus(t("settings.imported"));
              } catch {
                setStatus(t("settings.importFailed"));
              }
            }}
          />
        </div>
        <div>
          <Button
            variant="quiet"
            onClick={() => {
              if (confirm(t("settings.confirmDelete"))) deleteEverything();
            }}
          >
            {t("settings.delete")}
          </Button>
        </div>
        <output className="note">{status}</output>
        <p className="note">
          {t("settings.about")}{" "}
          <a
            href="https://github.com/arieltyson/CasaPerfecto"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
        </p>
      </section>
    </>
  );
}
