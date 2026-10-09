import { useMemo, useState } from "react";
import { useData } from "../../app/data.tsx";
import type { Listing } from "../../app/model.ts";
import { useAppState } from "../../app/state.tsx";
import { useUi } from "../../app/ui.tsx";
import { cellOfPoint } from "../../data/area.ts";
import { Badge, Button, EmptyState, Toggle } from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";
import { type Ranked, rankListings } from "../../lib/budget.ts";
import { TONE } from "../budget/BudgetPanel.tsx";
import { ListingForm, newListing } from "./ListingForm.tsx";

export function LedgerPanel() {
  const { state, dispatch } = useAppState();
  const { area, walkAt, transitAt } = useData();
  const { t } = useT();
  const [editing, setEditing] = useState<Listing | null>(null);
  const [hidePay, setHidePay] = useState(false);

  const cellOf = useMemo(
    () => (l: Listing) =>
      area && l.location ? cellOfPoint(area, l.location) : -1,
    [area],
  );
  const ranked = useMemo(
    () =>
      rankListings(state.listings, state.profile, state.preferences, (l) =>
        walkAt(cellOf(l)),
      ),
    [state.listings, state.profile, state.preferences, walkAt, cellOf],
  );

  if (editing) {
    return <ListingForm initial={editing} onDone={() => setEditing(null)} />;
  }

  return (
    <section className="stack print-area" aria-labelledby="ledger-title">
      <h2 id="ledger-title">{t("listings.title")}</h2>
      {ranked.length === 0 ? (
        <EmptyState
          title={t("listings.empty")}
          body={t("listings.emptyBody")}
          action={
            <Button
              variant="primary"
              onClick={() => setEditing(newListing(state.profile.unitType))}
            >
              {t("listings.add")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="row no-print">
            <Button
              variant="primary"
              onClick={() => setEditing(newListing(state.profile.unitType))}
            >
              {t("listings.add")}
            </Button>
            <Button onClick={() => print()}>{t("listings.print")}</Button>
          </div>
          <div className="no-print">
            <Toggle
              label={t("listings.hideSalary")}
              checked={hidePay}
              onChange={setHidePay}
            />
          </div>
          <ol className="stack plain-list" aria-label={t("listings.title")}>
            {ranked.map((r, i) => (
              <li key={r.listing.id}>
                <ListingCard
                  rank={i + 1}
                  ranked={r}
                  cell={cellOf(r.listing)}
                  transit={transitAt(cellOf(r.listing))}
                  hidePay={hidePay}
                  onEdit={() => setEditing(r.listing)}
                  onRemove={() => {
                    const name = r.listing.address || t("listings.untitled");
                    if (
                      confirm(t("listings.confirmRemove", { address: name }))
                    ) {
                      dispatch({ type: "removeListing", id: r.listing.id });
                    }
                  }}
                />
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function ListingCard({
  rank,
  ranked: r,
  cell,
  transit,
  hidePay,
  onEdit,
  onRemove,
}: {
  rank: number;
  ranked: Ranked;
  cell: number;
  transit: number | null;
  hidePay: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { area } = useData();
  const { flyTo } = useUi();
  const { t, money, percent, minutes, number } = useT();
  const l = r.listing;
  const name = l.address || t("listings.untitled");
  return (
    <article
      className="listing-card"
      aria-label={`${t("listings.rank", { n: rank })}: ${name}`}
    >
      <div className="listing-card__head">
        <span className="rank" aria-hidden="true">
          {rank}
        </span>
        <div>
          <h3>{name}</h3>
          <p className="note">{t(`unit.${l.unitType}`)}</p>
        </div>
      </div>
      <dl className="facts">
        <dt>{t("listings.allIn")}</dt>
        <dd>{money(r.allIn)}</dd>
        <dt>{t("listings.yourShare")}</dt>
        <dd>{money(r.yourShare)}</dd>
        {hidePay ? null : (
          <>
            <dt>{t("listings.ofPay")}</dt>
            <dd>
              <Badge tone={TONE[r.standing]}>
                {r.share === null
                  ? t("standing.unknown")
                  : `${percent(r.share)} · ${t(`standing.${r.standing}`)}`}
              </Badge>
            </dd>
          </>
        )}
        {r.adjustedShare !== r.yourShare ? (
          <>
            <dt>{t("listings.adjusted")}</dt>
            <dd>{money(r.adjustedShare)}</dd>
          </>
        ) : null}
        <dt>{t("listings.walk")}</dt>
        <dd>
          {!l.location
            ? t("listings.noLocation")
            : cell < 0
              ? t("listings.outside")
              : minutes(r.walkMinutes ?? Infinity)}
        </dd>
        {transit !== null && cell >= 0 ? (
          <>
            <dt>{t("listings.muni")}</dt>
            <dd>{minutes(transit)}</dd>
          </>
        ) : null}
        {area && cell >= 0 ? (
          <>
            <dt>{t("listings.violent")}</dt>
            <dd>
              {t("cell.reported", { n: number(area.cells.violent[cell]!) })}
            </dd>
          </>
        ) : null}
      </dl>
      <p>
        {r.missing.length === 0 ? (
          <Badge tone="good">{t("listings.allMet")}</Badge>
        ) : (
          <Badge tone="over">
            {t("listings.missing", {
              list: r.missing.map((f) => t(`feature.${f}`)).join(", "),
            })}
          </Badge>
        )}
      </p>
      {l.notes ? <p className="note">{l.notes}</p> : null}
      <div className="row no-print">
        <Button onClick={onEdit}>{t("common.edit")}</Button>
        {l.location ? (
          <Button onClick={() => flyTo(l.location!, 15.5)}>
            {t("listings.showOnMap")}
          </Button>
        ) : null}
        <Button variant="quiet" onClick={onRemove}>
          {t("common.remove")}
        </Button>
      </div>
    </article>
  );
}
