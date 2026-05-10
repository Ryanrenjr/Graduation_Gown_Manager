"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Option = [string, string];

export function OrderFilterPanel({
  params,
  labels
}: {
  params: Record<string, string | undefined>;
  labels: Record<string, string>;
}) {
  const hasFilters = [
    "businessPeriod",
    "customerSource",
    "paymentStatus",
    "returnStatus",
    "degreeType",
    "currencyLabel",
    "startDate",
    "endDate"
  ].some((key) => params[key]);
  const [open, setOpen] = useState(hasFilters);

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="search-trigger"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <Search className="h-5 w-5" />
          <span>{labels.search}</span>
          {hasFilters ? <span className="search-dot" /> : null}
        </button>
        {hasFilters ? (
          <Link href="/orders" className="btn-secondary">
            <X className="mr-2 h-4 w-4" />
            {labels.reset}
          </Link>
        ) : null}
      </div>

      {open ? (
        <form className="card mt-4 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="lg:col-span-6 flex items-center gap-2 text-sm font-bold text-app-secondary">
            <SlidersHorizontal className="h-4 w-4" />
            {labels.filters}
          </div>
          <Select name="businessPeriod" label={labels.period} value={params.businessPeriod} options={[
            ["", labels.all],
            ["XIONG_PERIOD", "Fay"],
            ["RYAN_SOLO", "Ryan Solo"],
            ["GAO_PERIOD", "Gao"]
          ]} />
          <Select name="customerSource" label={labels.source} value={params.customerSource} options={[
            ["", labels.all],
            ["Ryan", "Ryan"],
            ["Xiong", "Fay"],
            ["Gao", "Gao"]
          ]} />
          <Select name="paymentStatus" label={labels.payment} value={params.paymentStatus} options={[
            ["", labels.all],
            ["UNPAID", "Unpaid"],
            ["PARTIAL", "Partial"],
            ["PAID", "Paid"],
            ["OVERPAID", "Overpaid"]
          ]} />
          <Select name="returnStatus" label={labels.return} value={params.returnStatus} options={[
            ["", labels.all],
            ["NOT_COLLECTED", "Not collected"],
            ["COLLECTED_NOT_RETURNED", "Out"],
            ["RETURNED", "Returned"],
            ["ISSUE", "Issue"]
          ]} />
          <Select name="degreeType" label={labels.degree} value={params.degreeType} options={[
            ["", labels.all],
            ["Master", "Master"],
            ["Bachelor", "Bachelor"]
          ]} />
          <Select name="currencyLabel" label={labels.currency} value={params.currencyLabel} options={[
            ["", labels.all],
            ["GBP", "GBP"],
            ["RMB", "RMB"]
          ]} />
          <label>
            <span className="label">{labels.start}</span>
            <input className="input" type="date" name="startDate" defaultValue={params.startDate} />
          </label>
          <label>
            <span className="label">{labels.end}</span>
            <input className="input" type="date" name="endDate" defaultValue={params.endDate} />
          </label>
          <div className="flex items-end gap-2">
            <button className="btn-primary" type="submit">{labels.filter}</button>
            <Link className="btn-secondary" href="/orders">{labels.reset}</Link>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function Select({
  name,
  label,
  value,
  options
}: {
  name: string;
  label: string;
  value?: string;
  options: Option[];
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="select" name={name} defaultValue={value ?? ""}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
