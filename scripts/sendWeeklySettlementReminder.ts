import net from "node:net";
import tls from "node:tls";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma";
import { currentWeekRange, formatDate } from "../lib/dates";
import { money } from "../lib/money";

loadEnvFile();

const DEFAULT_TO = "ryanrenjr@outlook.com";
const DEFAULT_SMTP_HOST = "smtp.gmail.com";
const DEFAULT_SMTP_PORT = 587;

type PaymentRow = {
  paymentDate: Date;
  amountGBP: number;
  partnerShareGBP: number;
  currencyLabel: string;
  paymentType: string;
  order: {
    customerName: string;
    itemSummary: string;
  };
};

async function main() {
  const { start, end } = currentWeekRange();
  const payments = await prisma.payment.findMany({
    where: {
      settlementStatus: "UNSETTLED",
      partnerName: "Xiong",
      paymentDate: { gte: start, lte: end },
      order: { orderStatus: { not: "CANCELLED" } }
    },
    include: {
      order: {
        select: {
          customerName: true,
          itemSummary: true
        }
      }
    },
    orderBy: { paymentDate: "asc" }
  });

  const totalReceived = payments.reduce(
    (sum, payment) => sum + Number(payment.amountGBP),
    0
  );
  const fayShare = payments.reduce(
    (sum, payment) => sum + Number(payment.partnerShareGBP),
    0
  );

  const to = process.env.SETTLEMENT_REMINDER_TO || DEFAULT_TO;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = `每周结算提醒：本周需要给 Fay £${money(fayShare)}`;
  const body = buildEmailBody({
    start,
    end,
    payments,
    totalReceived,
    fayShare
  });

  if (
    !from ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    process.env.SMTP_PASS === "your-outlook-app-password" ||
    process.env.SMTP_PASS === "your-gmail-app-password"
  ) {
    throw new Error(
      [
        "Missing email settings.",
        "Please set SMTP_USER, SMTP_PASS, and optionally SMTP_FROM in .env.",
        "For Gmail, SMTP_HOST=smtp.gmail.com and SMTP_PORT=587 are used by default."
      ].join(" ")
    );
  }

  await sendSmtpMail({
    host: process.env.SMTP_HOST || DEFAULT_SMTP_HOST,
    port: Number(process.env.SMTP_PORT || DEFAULT_SMTP_PORT),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from,
    to,
    subject,
    body
  });

  console.log(`Settlement reminder sent to ${to}: Fay gets £${money(fayShare)}.`);
}

function buildEmailBody(input: {
  start: Date;
  end: Date;
  payments: PaymentRow[];
  totalReceived: number;
  fayShare: number;
}) {
  const lines = [
    "Ryan，",
    "",
    `这是每周结算提醒。本周收款周期：${formatDate(input.start)} - ${formatDate(input.end)}。`,
    "",
    `本周实际收到：£${money(input.totalReceived)}`,
    `本周需要给 Fay：£${money(input.fayShare)}`,
    `待结算收款笔数：${input.payments.length}`,
    ""
  ];

  if (input.payments.length) {
    lines.push("明细：");
    for (const payment of input.payments) {
      lines.push(
        `- ${formatDate(payment.paymentDate)} | ${payment.order.customerName} | ${payment.order.itemSummary} | 收到 £${money(payment.amountGBP)} ${payment.currencyLabel} | Fay £${money(payment.partnerShareGBP)}`
      );
    }
  } else {
    lines.push("本周没有 Fay 合作期的未结算收款。");
  }

  lines.push("", "打开系统的 Settlements 页面确认后，可以生成本周结算单。");
  return lines.join("\r\n");
}

async function sendSmtpMail(input: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}) {
  let socket: net.Socket | tls.TLSSocket = net.createConnection({
    host: input.host,
    port: input.port
  });

  const client = new SmtpClient(socket);
  await client.expect(220);
  await client.command(`EHLO ${input.host}`, 250);
  await client.command("STARTTLS", 220);

  socket = tls.connect({
    socket,
    servername: input.host
  });
  client.replaceSocket(socket);

  await client.command(`EHLO ${input.host}`, 250);
  await client.command("AUTH LOGIN", 334);
  await client.command(Buffer.from(input.user).toString("base64"), 334);
  await client.command(Buffer.from(input.pass).toString("base64"), 235);
  await client.command(`MAIL FROM:<${input.from}>`, 250);
  await client.command(`RCPT TO:<${input.to}>`, 250);
  await client.command("DATA", 354);
  await client.command(buildMimeMessage(input), 250, true);
  await client.command("QUIT", 221);
}

function buildMimeMessage(input: {
  from: string;
  to: string;
  subject: string;
  body: string;
}) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(input.subject).toString("base64")}?=`;
  const safeBody = input.body.replace(/^\./gm, "..");

  return [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    safeBody,
    "."
  ].join("\r\n");
}

class SmtpClient {
  private buffer = "";
  private waiters: Array<(line: string) => void> = [];

  constructor(private socket: net.Socket | tls.TLSSocket) {
    this.attach(socket);
  }

  replaceSocket(socket: net.Socket | tls.TLSSocket) {
    this.socket.removeAllListeners("data");
    this.socket = socket;
    this.attach(socket);
  }

  async command(command: string, expectedCode: number, raw = false) {
    this.socket.write(`${command}${raw ? "\r\n" : "\r\n"}`);
    await this.expect(expectedCode);
  }

  async expect(expectedCode: number) {
    const lines: string[] = [];

    while (true) {
      const line = await this.nextLine();
      lines.push(line);
      const code = Number(line.slice(0, 3));
      const isLastLine = line[3] !== "-";

      if (isLastLine) {
        if (code !== expectedCode) {
          throw new Error(
            `SMTP expected ${expectedCode}, received ${code}: ${lines.join(" | ")}`
          );
        }
        return lines;
      }
    }
  }

  private attach(socket: net.Socket | tls.TLSSocket) {
    socket.on("data", (chunk) => {
      this.buffer += chunk.toString("utf8");
      this.flush();
    });
  }

  private nextLine() {
    return new Promise<string>((resolveLine) => {
      this.waiters.push(resolveLine);
      this.flush();
    });
  }

  private flush() {
    while (this.waiters.length) {
      const index = this.buffer.indexOf("\r\n");
      if (index === -1) return;
      const line = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + 2);
      this.waiters.shift()?.(line);
    }
  }
}

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const env = readFileSync(envPath, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
