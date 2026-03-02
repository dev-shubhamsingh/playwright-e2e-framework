import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";

const HOST = process.env.HOST;
const parsedPort = Number(process.env.PORT);
if (!HOST) {
  throw new Error("Missing HOST environment variable. Set it in .env.");
}
if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
  throw new Error("Invalid PORT environment variable. Set a value between 0 and 65535 in .env.");
}
const PORT = parsedPort;
const CLIENT_DIR = path.resolve(process.cwd(), "dist", "client");
const ETHEREAL_USER = process.env.ETHEREAL_USER;
const ETHEREAL_PASS = process.env.ETHEREAL_PASS;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

type BookingPayload = {
  eventName: string;
  eventDate: string;
  eventVenue: string;
  eventCity: string;
  eventGenre: string;
  ticketCount: number;
  passType: string;
  buyerEmail: string;
};

type MailContext = {
  transporter: Transporter;
  accountUser: string;
};

let mailContext: MailContext | null = null;

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
): void {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        reject(new Error("Invalid JSON payload"));
      }
    });
    req.on("error", reject);
  });
}

async function getMailContext(): Promise<MailContext> {
  if (mailContext) return mailContext;

  if (ETHEREAL_USER && ETHEREAL_PASS) {
    mailContext = {
      transporter: nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: ETHEREAL_USER,
          pass: ETHEREAL_PASS
        }
      }),
      accountUser: ETHEREAL_USER
    };
    return mailContext;
  }

  const account = await nodemailer.createTestAccount();
  mailContext = {
    transporter: nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: account.user,
        pass: account.pass
      }
    }),
    accountUser: account.user
  };

  console.log(
    `[mail] Created Ethereal account for testing.\n` +
      `[mail] user: ${account.user}\n` +
      `[mail] pass: ${account.pass}`
  );
  return mailContext;
}

async function warmMailContext(): Promise<void> {
  try {
    await getMailContext();
    console.log("[mail] Ethereal mail transport is ready.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[mail] Failed to initialize mail transport: ${message}`);
  }
}

function validateBookingPayload(payload: unknown): BookingPayload | null {
  const candidate = payload as Partial<BookingPayload>;
  if (
    typeof candidate?.eventName !== "string" ||
    typeof candidate?.eventDate !== "string" ||
    typeof candidate?.eventVenue !== "string" ||
    typeof candidate?.eventCity !== "string" ||
    typeof candidate?.eventGenre !== "string" ||
    typeof candidate?.passType !== "string" ||
    typeof candidate?.buyerEmail !== "string" ||
    typeof candidate?.ticketCount !== "number"
  ) {
    return null;
  }

  return {
    eventName: candidate.eventName.trim(),
    eventDate: candidate.eventDate.trim(),
    eventVenue: candidate.eventVenue.trim(),
    eventCity: candidate.eventCity.trim(),
    eventGenre: candidate.eventGenre.trim(),
    passType: candidate.passType.trim(),
    buyerEmail: candidate.buyerEmail.trim().toLowerCase(),
    ticketCount: candidate.ticketCount
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/bookings") {
    try {
      const payload = validateBookingPayload(await readJsonBody(req));
      if (!payload) {
        sendJson(res, 400, { ok: false, error: "Invalid booking payload." });
        return;
      }

      if (!payload.eventName || !payload.eventDate || !payload.eventVenue) {
        sendJson(res, 400, { ok: false, error: "Missing event details." });
        return;
      }
      if (!payload.passType || !payload.buyerEmail || payload.ticketCount < 1) {
        sendJson(res, 400, { ok: false, error: "Invalid ticket selection." });
        return;
      }

      const bookingId = `BK-${Date.now()}`;
      const paymentLink = `https://payments.bliss.test/checkout/${bookingId}`;
      const { transporter, accountUser } = await getMailContext();

      const mailInfo = await transporter.sendMail({
        from: '"Bliss Tickets" <no-reply@bliss.test>',
        to: payload.buyerEmail,
        subject: `Bliss Booking Created: ${payload.eventName}`,
        text:
          `Hi,\n\n` +
          `Your booking is created for ${payload.eventName}.\n` +
          `City: ${payload.eventCity}\n` +
          `Venue: ${payload.eventVenue}\n` +
          `Date: ${payload.eventDate}\n` +
          `Pass: ${payload.passType}\n` +
          `Tickets: ${payload.ticketCount}\n\n` +
          `Complete payment: ${paymentLink}\n\n` +
          `Booking ID: ${bookingId}\n`,
        html:
          `<p>Your booking is created for <strong>${payload.eventName}</strong>.</p>` +
          `<ul>` +
          `<li>City: ${payload.eventCity}</li>` +
          `<li>Venue: ${payload.eventVenue}</li>` +
          `<li>Date: ${payload.eventDate}</li>` +
          `<li>Pass: ${payload.passType}</li>` +
          `<li>Tickets: ${payload.ticketCount}</li>` +
          `</ul>` +
          `<p><a href="${paymentLink}">Complete payment</a></p>` +
          `<p>Booking ID: <strong>${bookingId}</strong></p>`
      });

      const previewUrl = nodemailer.getTestMessageUrl(mailInfo);
      sendJson(res, 201, {
        ok: true,
        bookingId,
        paymentLink,
        previewUrl,
        mailAccount: accountUser
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to process booking.";
      sendJson(res, 500, { ok: false, error: message });
      return;
    }
  }

  const urlPath = req.url ?? "/";
  const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.join(CLIENT_DIR, requestedPath);

  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Server Error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`
--------------------------------------------------
Server started successfully
Environment : ${process.env.NODE_ENV || 'development'}
Host        : ${HOST}
Port        : ${PORT}
URL         : http://${HOST}:${PORT}
Started at  : ${new Date().toISOString()}
--------------------------------------------------
`);
  void warmMailContext();
});
