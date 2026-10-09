// The small set of primitives every screen is assembled from. Each carries its
// own accessible name and reflows at large text sizes.
import {
  type ComponentProps,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
} from "react";

export function Panel({
  floating = false,
  label,
  children,
  className = "",
  as: Tag = "section",
}: {
  floating?: boolean;
  label?: string;
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside" | "header";
}) {
  return (
    <Tag
      className={`panel ${floating ? "panel--floating" : "panel--inset"} ${className}`}
      aria-label={label}
    >
      {children}
    </Tag>
  );
}

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button
      type="button"
      className={`button button--${variant} ${className}`}
      {...props}
    />
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="section-label">{children}</h3>;
}

export function Field({
  label,
  hint,
  prefix,
  className = "",
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  prefix?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field__control">
        {prefix ? (
          <span className="field__prefix" aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          aria-describedby={hint ? hintId : undefined}
          {...input}
        />
      </div>
      {hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function MoneyField({
  label,
  hint,
  value,
  onValue,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onValue: (value: number | null) => void;
  placeholder?: string;
}) {
  return (
    <Field
      label={label}
      {...(hint ? { hint } : {})}
      prefix="$"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={value === null ? "" : String(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, "");
        onValue(digits === "" ? null : Math.min(10_000_000, Number(digits)));
      }}
    />
  );
}

export interface Option<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** A radio group drawn as a segmented control. */
export function Segmented<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  hideLegend = false,
  hint,
}: {
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  hideLegend?: boolean;
  hint?: string;
}) {
  const name = useId();
  return (
    <fieldset className="segmented">
      <legend className={hideLegend ? "visually-hidden" : "segmented__legend"}>
        {legend}
      </legend>
      <div className="segmented__options">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={`segmented__option ${o.disabled ? "is-disabled" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={String(o.value)}
              checked={o.value === value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {hint ? <p className="field__hint">{hint}</p> : null}
    </fieldset>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="toggle">
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
      {hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="stat">
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      {detail ? <p className="stat__detail">{detail}</p> : null}
    </div>
  );
}

export type BadgeTone = "good" | "near" | "over" | "neutral";

const BADGE_GLYPH: Record<BadgeTone, string> = {
  good: "✓",
  near: "≈",
  over: "↑",
  neutral: "·",
};

/** Status text with a glyph, so color is never the only carrier. */
export function Badge({
  tone,
  children,
}: {
  tone: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span className={`badge badge--${tone}`}>
      <span aria-hidden="true">{BADGE_GLYPH[tone]}</span> {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {body ? <p className="empty__body">{body}</p> : null}
      {action}
    </div>
  );
}

export function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg
      className="mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="mark__ring" cx="32" cy="32" r="30" />
      <path className="mark__door" d="M24 62 V40 a8 8 0 0 1 16 0 V62 Z" />
    </svg>
  );
}
