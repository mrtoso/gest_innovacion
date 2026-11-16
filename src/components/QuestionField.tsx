"use client";

import { otherKey, type Question } from "@/data/questionnaire";
import { listValue, textValue, type Answers } from "@/lib/validate";

type Props = {
  question: Question;
  /** Número de orden visible (1, 2, 3…), no el del PDF. */
  number: number;
  answers: Answers;
  error?: string;
  onChange: (id: string, value: string | string[]) => void;
};

const choiceCard =
  "flex min-h-[3.25rem] cursor-pointer items-start gap-3 rounded-md border-2 border-line bg-white px-4 py-3 " +
  "transition-colors hover:border-navy/60 has-[:checked]:border-navy has-[:checked]:bg-navy-soft " +
  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold";

const textInput =
  "w-full rounded-md border-2 border-line bg-white px-4 py-3 text-base text-ink placeholder:text-muted/70 " +
  "focus:border-navy focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold";

export function QuestionField({ question: q, number, answers, error, onChange }: Props) {
  const errorId = `${q.id}-error`;
  const helpId = `${q.id}-help`;
  const describedBy = [error ? errorId : null, helpId].filter(Boolean).join(" ");

  const labelId = `${q.id}-label`;

  const hint =
    q.type === "multi"
      ? "Puede marcar varias opciones."
      : q.help
        ? q.help
        : q.type === "scale"
          ? "Elija un número del 1 al 5."
          : null;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      data-question={q.id}
      aria-describedby={describedBy || undefined}
      className={`rounded-md border-2 bg-white p-4 sm:p-5 ${
        error ? "border-danger bg-danger-soft/40" : "border-transparent"
      }`}
    >
      <p id={labelId}>
        <span className="mr-2 font-serif text-navy/70">{number}.</span>
        <span className="font-serif text-lg font-semibold leading-snug text-navy-dark">{q.text}</span>
      </p>
      {hint && (
        <p id={helpId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}

      <div className="mt-3">
        {q.type === "single" && (
          <div className="grid gap-2">
            {q.options.map((o) => (
              <div key={o.label}>
                <label className={choiceCard}>
                  <input
                    type="radio"
                    name={q.id}
                    value={o.label}
                    checked={textValue(answers, q.id) === o.label}
                    onChange={() => onChange(q.id, o.label)}
                    className="mt-1 h-5 w-5 shrink-0 accent-navy"
                  />
                  <span>{o.label}</span>
                </label>
                {o.other && textValue(answers, q.id) === o.label && (
                  <OtherInput q={q} answers={answers} onChange={onChange} />
                )}
              </div>
            ))}
          </div>
        )}

        {q.type === "multi" && (
          <div className="grid gap-2">
            {q.options.map((o) => {
              const selected = listValue(answers, q.id);
              const checked = selected.includes(o.label);
              return (
                <div key={o.label}>
                  <label className={choiceCard}>
                    <input
                      type="checkbox"
                      name={q.id}
                      value={o.label}
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          onChange(q.id, selected.filter((v) => v !== o.label));
                        } else if (o.exclusive) {
                          onChange(q.id, [o.label]);
                        } else {
                          const exclusiveLabels = q.options.filter((x) => x.exclusive).map((x) => x.label);
                          onChange(q.id, [...selected.filter((v) => !exclusiveLabels.includes(v)), o.label]);
                        }
                      }}
                      className="mt-1 h-5 w-5 shrink-0 accent-navy"
                    />
                    <span>{o.label}</span>
                  </label>
                  {o.other && checked && <OtherInput q={q} answers={answers} onChange={onChange} />}
                </div>
              );
            })}
          </div>
        )}

        {q.type === "text" && (
          <input
            type="text"
            name={q.id}
            aria-label={q.text}
            value={textValue(answers, q.id)}
            onChange={(e) => onChange(q.id, e.target.value)}
            maxLength={q.maxLength ?? 200}
            autoComplete="off"
            className={textInput}
          />
        )}

        {q.type === "textarea" && (
          <textarea
            name={q.id}
            aria-label={q.text}
            value={textValue(answers, q.id)}
            onChange={(e) => onChange(q.id, e.target.value)}
            maxLength={q.maxLength ?? 2000}
            rows={4}
            className={`${textInput} resize-y`}
          />
        )}

        {q.type === "number" && (
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              name={q.id}
              aria-label={q.text}
              value={textValue(answers, q.id)}
              onChange={(e) => onChange(q.id, e.target.value)}
              maxLength={12}
              autoComplete="off"
              placeholder="Por ejemplo, 250"
              className={`${textInput} max-w-48`}
            />
            {q.unit && <span className="text-muted">{q.unit}</span>}
          </div>
        )}

        {q.type === "scale" && (
          <div>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: q.max - q.min + 1 }, (_, i) => String(q.min + i)).map((n) => (
                <label key={n} className={`${choiceCard} justify-center items-center! text-xl font-semibold`}>
                  <input
                    type="radio"
                    name={q.id}
                    value={n}
                    checked={textValue(answers, q.id) === n}
                    onChange={() => onChange(q.id, n)}
                    className="sr-only"
                  />
                  <span>{n}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex justify-between gap-4 text-sm text-muted">
              <span>{q.minLabel}</span>
              <span className="text-right">{q.maxLabel}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-3 flex items-start gap-2 font-medium text-danger">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function OtherInput({
  q,
  answers,
  onChange,
}: {
  q: Question;
  answers: Answers;
  onChange: Props["onChange"];
}) {
  const id = otherKey(q.id);
  return (
    <div className="mt-2 pl-2 sm:pl-4">
      <label htmlFor={id} className="mb-1 block text-sm text-muted">
        Escriba cuál
      </label>
      <input
        id={id}
        type="text"
        value={textValue(answers, id)}
        onChange={(e) => onChange(id, e.target.value)}
        maxLength={200}
        autoComplete="off"
        className={textInput}
      />
    </div>
  );
}
