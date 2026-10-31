import { cn } from "@/lib/utils";

export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  testPrefix,
}: {
  label: string;
  value: T | "";
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  testPrefix: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              data-testid={`${testPrefix}-${option.value}`}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-h-11 max-w-full rounded-[14px] border px-3 py-2 text-left text-[14px] font-semibold",
                selected ? "border-ink bg-lemon text-ink" : "border-line bg-white text-ink hover:bg-mist",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
