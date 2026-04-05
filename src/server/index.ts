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

type TestUser = {
  name: string;
  email: string;
  password: string;
  phone: string;
  dob: string;
  city: string;
  interest: string;
  notifications: string[];
  genres: string[];
  bio: string;
};

type TestEvent = {
  id: string;
  name: string;
  city: string;
  genre: string;
  date: string;
  venue: string;
  owner: string;
};

type TestSearchFilters = {
  city: string;
  genre: string;
};

type TestSessionPayload = {
  users?: TestUser[];
  events?: TestEvent[];
  currentUserEmail?: string | null;
  searchFilters?: Partial<TestSearchFilters> | null;
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeTestUser(candidate: unknown): TestUser | null {
  const value = candidate as Partial<TestUser>;
  if (
    typeof value?.name !== "string" ||
    typeof value?.email !== "string" ||
    typeof value?.password !== "string" ||
    typeof value?.phone !== "string" ||
    typeof value?.dob !== "string" ||
    typeof value?.city !== "string" ||
    typeof value?.interest !== "string" ||
    !isStringArray(value?.notifications) ||
    !isStringArray(value?.genres) ||
    typeof value?.bio !== "string"
  ) {
    return null;
  }

  return {
    name: value.name.trim(),
    email: value.email.trim().toLowerCase(),
    password: value.password,
    phone: value.phone.trim(),
    dob: value.dob.trim(),
    city: value.city.trim(),
    interest: value.interest.trim(),
    notifications: value.notifications,
    genres: value.genres,
    bio: value.bio.trim()
  };
}

function normalizeTestEvent(candidate: unknown): TestEvent | null {
  const value = candidate as Partial<TestEvent>;
  if (
    typeof value?.id !== "string" ||
    typeof value?.name !== "string" ||
    typeof value?.city !== "string" ||
    typeof value?.genre !== "string" ||
    typeof value?.date !== "string" ||
    typeof value?.venue !== "string" ||
    typeof value?.owner !== "string"
  ) {
    return null;
  }

  return {
    id: value.id.trim(),
    name: value.name.trim(),
    city: value.city.trim(),
    genre: value.genre.trim(),
    date: value.date.trim(),
    venue: value.venue.trim(),
    owner: value.owner.trim().toLowerCase()
  };
}

function createTestSessionStorage(payload: unknown): Record<string, string> | null {
  const candidate = payload as TestSessionPayload;
  const users = Array.isArray(candidate?.users)
    ? candidate.users.map(normalizeTestUser)
    : [];
  const events = Array.isArray(candidate?.events)
    ? candidate.events.map(normalizeTestEvent)
    : [];

  if (users.some((user) => !user) || events.some((eventItem) => !eventItem)) {
    return null;
  }

  const currentUserEmail =
    candidate?.currentUserEmail === null || candidate?.currentUserEmail === undefined
      ? null
      : String(candidate.currentUserEmail).trim().toLowerCase();
  const currentUser = currentUserEmail
    ? users.find((user) => user?.email === currentUserEmail) ?? null
    : null;
  const searchFilters: TestSearchFilters = {
    city: typeof candidate?.searchFilters?.city === "string" ? candidate.searchFilters.city : "",
    genre:
      typeof candidate?.searchFilters?.genre === "string" ? candidate.searchFilters.genre : ""
  };

  const storage: Record<string, string> = {
    bliss_users: JSON.stringify(users),
    bliss_events: JSON.stringify(events),
    bliss_search_filters: JSON.stringify(searchFilters)
  };

  if (currentUser) {
    storage.bliss_current_user = JSON.stringify({
      name: currentUser.name,
      email: currentUser.email
    });
  }

  return storage;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/test/session") {
    try {
      const storage = createTestSessionStorage(await readJsonBody(req));
      if (!storage) {
        sendJson(res, 400, { ok: false, error: "Invalid test session payload." });
        return;
      }

      sendJson(res, 200, { ok: true, storage });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create test session.";
      sendJson(res, 500, { ok: false, error: message });
      return;
    }
  }

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
