import { addPayment, updatePayment } from "@/app/actions";
import { isoDate } from "@/lib/dates";
import { getT, Locale } from "@/lib/i18n";
import { money } from "@/lib/money";

type PaymentFormRecord = {
  id: number;
  paymentDate: Date;
  amountGBP: number;
  currencyLabel: string;
  paymentType: string;
  actualPaymentNote: string | null;
  notes: string | null;
};

export function PaymentForm({
  orderId,
  payment,
  locale = "en"
}: {
  orderId: number;
  payment?: PaymentFormRecord;
  locale?: Locale;
}) {
  const t = getT(locale);
  const action = payment
    ? updatePayment.bind(null, payment.id)
    : addPayment.bind(null, orderId);

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <span className="label">{t("paymentDate")}</span>
          <input
            className="input"
            type="date"
            name="paymentDate"
            defaultValue={payment ? isoDate(payment.paymentDate) : new Date().toISOString().slice(0, 10)}
            required
          />
        </label>
        <label>
          <span className="label">{t("amountGBP")}</span>
          <input
            className="input"
            type="number"
            step="0.01"
            name="amountGBP"
            defaultValue={payment ? money(payment.amountGBP) : undefined}
            required
          />
        </label>
        <label>
          <span className="label">{t("currency")}</span>
          <select className="select" name="currencyLabel" defaultValue={payment?.currencyLabel ?? "GBP"}>
            <option value="GBP">GBP</option>
            <option value="RMB">RMB</option>
          </select>
        </label>
        <label>
          <span className="label">{t("paymentType")}</span>
          <select className="select" name="paymentType" defaultValue={payment?.paymentType ?? "DEPOSIT"}>
            <option value="DEPOSIT">{t("deposit")}</option>
            <option value="BALANCE">{t("balance")}</option>
            <option value="FULL_PAYMENT">{t("fullPayment")}</option>
            <option value="EXTRA">{t("extra")}</option>
            <option value="REFUND">{t("refund")}</option>
          </select>
        </label>
      </div>
      <label>
        <span className="label">{t("actualPaymentNote")}</span>
        <input
          className="input"
          name="actualPaymentNote"
          placeholder={t("actualPaymentPlaceholder")}
          defaultValue={payment?.actualPaymentNote ?? ""}
        />
      </label>
      <label>
        <span className="label">{t("notes")}</span>
        <textarea className="textarea" name="notes" defaultValue={payment?.notes ?? ""} />
      </label>
      <div className="flex justify-end">
        <button className="btn-primary" type="submit">
          {payment ? t("savePayment") : t("addPayment")}
        </button>
      </div>
    </form>
  );
}
