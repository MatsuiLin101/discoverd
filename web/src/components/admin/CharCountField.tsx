"use client";

/**
 * Shared controlled text field with a live character counter (#3).
 *
 * Renders label + input/textarea + a footer row that shows an optional hint on
 * the left and a live `used / max` counter on the right. The counter turns rose
 * once the limit is reached, and `maxLength` caps input at the browser level.
 *
 * `maxLength` values mirror the server-side Zod limits where they exist
 * (description 500, seoTitle 100, seoDescription 160). Fields without a server
 * limit use a proposed advisory cap pending client confirmation — see the
 * per-form call sites.
 */

const DEFAULT_INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-300 focus:ring-2 focus:ring-[#D12351] focus:border-transparent";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

type CharCountFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  required?: boolean;
  placeholder?: string;
  /** Helper text shown to the left of the counter (e.g. slug rules). */
  hint?: string;
  id?: string;
  /** Override the control's class; defaults to the shared admin input style. */
  className?: string;
} & (
  | { multiline: true; rows?: number; type?: never }
  | { multiline?: false; rows?: never; type?: "text" | "email" | "url" }
);

export default function CharCountField(props: CharCountFieldProps) {
  const {
    label,
    value,
    onChange,
    maxLength,
    required,
    placeholder,
    hint,
    id,
    className = DEFAULT_INPUT_CLASS,
  } = props;

  const atLimit = value.length >= maxLength;
  const countId = id ? `${id}-count` : undefined;

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>

      {props.multiline ? (
        <textarea
          id={id}
          rows={props.rows ?? 4}
          required={required}
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          aria-describedby={countId}
        />
      ) : (
        <input
          id={id}
          type={props.type ?? "text"}
          required={required}
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          aria-describedby={countId}
        />
      )}

      <div className="mt-1 flex items-center justify-between gap-3 text-xs">
        <span className="text-gray-400">{hint}</span>
        <span
          id={countId}
          className={atLimit ? "font-medium text-rose-500" : "text-gray-400"}
        >
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}
