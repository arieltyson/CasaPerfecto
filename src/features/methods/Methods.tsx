import { useEffect, useRef } from "react";
import { useOptionalData } from "../../app/data.tsx";
import { RENT_SOURCES } from "../../data/rents.ts";
import { Button, Panel } from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";

const SOURCES = [
  ["OpenStreetMap", "https://www.openstreetmap.org/copyright"],
  ["Protomaps", "https://protomaps.com"],
  ["USGS 3D Elevation Program", "https://www.usgs.gov/3d-elevation-program"],
  [
    "DataSF: Police Department Incident Reports",
    "https://data.sf.gov/d/wg3w-h783",
  ],
  ["DataSF: 311 Cases", "https://data.sf.gov/d/vw6y-z8j6"],
  ["SFMTA GTFS", "https://www.sfmta.com/reports/gtfs-transit-data"],
  [
    "SF 2026 Point-in-Time Count",
    "https://www.sf.gov/2026-point-in-time-count-preliminary-results",
  ],
  ["Zumper", RENT_SOURCES.zumper.url],
  ["PadMapper", RENT_SOURCES.padmapper.url],
  [
    "BJS, Criminal Victimization 2024",
    "https://bjs.ojp.gov/library/publications/criminal-victimization-2024",
  ],
  [
    "HUD, Rental Burdens",
    "https://www.huduser.gov/portal/pdredge/pdr_edge_featd_article_092214.html",
  ],
  [
    "Bohannon and Andrews (2011), Physiotherapy",
    "https://doi.org/10.1016/j.physio.2010.12.004",
  ],
  [
    "Pollack et al. (2010), Am J Prev Med",
    "https://doi.org/10.1016/j.amepre.2010.08.002",
  ],
  [
    "Meltzer and Schwartz (2016), Housing Policy Debate",
    "https://doi.org/10.1080/10511482.2015.1020321",
  ],
] as const;

/** Method notes for every layer, as a dialog. Uses area dates when loaded. */
export function Methods({ onClose }: { onClose: () => void }) {
  const { t, date } = useT();
  const area = useOptionalData();
  const dialog = useRef<HTMLDialogElement>(null);

  // The native modal dialog traps focus, closes on Escape and restores focus
  // to the opener.
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  const w = area?.area?.windows;
  const range = (from?: string, to?: string) =>
    from && to ? { from: date(from), to: date(to) } : { from: "…", to: "…" };
  const serviceDate = area?.commute?.serviceDate;

  return (
    <dialog
      ref={dialog}
      className="dialog-native"
      aria-labelledby="methods-title"
      onClose={onClose}
    >
      <Panel floating className="dialog__panel methods">
        <div className="dialog__head">
          <h1 id="methods-title">{t("methods.title")}</h1>
          <Button onClick={() => dialog.current?.close()}>
            {t("common.close")}
          </Button>
        </div>
        <section>
          <h2>{t("methods.walkTitle")}</h2>
          <p>{t("methods.walkBody")}</p>
          <p>{t("methods.areaBody")}</p>
        </section>
        <section>
          <h2>{t("methods.muniTitle")}</h2>
          <p>
            {t("methods.muniBody", {
              date: serviceDate ? date(serviceDate) : "…",
            })}
          </p>
        </section>
        <section>
          <h2>{t("methods.incidentTitle")}</h2>
          <p>
            {t("methods.incidentBody", range(w?.incidentsFrom, w?.incidentsTo))}
          </p>
          <p>{t("methods.bandsBody")}</p>
        </section>
        <section>
          <h2>{t("methods.dangerTitle")}</h2>
          <p>{t("methods.dangerBody")}</p>
        </section>
        <section>
          <h2>{t("methods.encampmentTitle")}</h2>
          <p>
            {t(
              "methods.encampmentBody",
              range(w?.encampmentsFrom, w?.encampmentsTo),
            )}
          </p>
        </section>
        <section>
          <h2>{t("methods.rentTitle")}</h2>
          <p>
            {t("methods.rentBody", {
              zumper: date(RENT_SOURCES.zumper.asOf),
              padmapper: date(RENT_SOURCES.padmapper.asOf),
            })}
          </p>
        </section>
        <section>
          <h2>{t("methods.budgetTitle")}</h2>
          <p>{t("methods.budgetBody")}</p>
        </section>
        <section>
          <h2>{t("methods.privacyTitle")}</h2>
          <p>{t("methods.privacyBody")}</p>
        </section>
        <section>
          <h2>{t("methods.sources")}</h2>
          <ul>
            {SOURCES.map(([name, url]) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer noopener">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </Panel>
    </dialog>
  );
}
