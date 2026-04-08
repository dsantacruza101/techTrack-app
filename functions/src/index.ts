import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

setGlobalOptions({maxInstances: 10, region: "us-central1"});

admin.initializeApp();

// ── Helpers ────────────────────────────────────────────────────────────────────

const REPORT_TYPE_LABELS: Record<string, string> = {
  asset_summary: "Asset Summary",
  maintenance_due: "Maintenance Due",
  wo_status: "Work Order Status",
  it_inventory: "IT Asset Inventory",
  depreciation: "Depreciation Report",
};

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly",
};

const computeNextSendAt = (freq: string): Date => {
  const now = new Date();
  if (freq === "weekly") {
    const d = new Date(now);
    d.setDate(now.getDate() + 7);
    d.setHours(8, 0, 0, 0);
    return d;
  }
  if (freq === "monthly") {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0, 0);
  }
  if (freq === "quarterly") {
    const nextQ = Math.floor(now.getMonth() / 3) + 1;
    const year = nextQ > 3 ? now.getFullYear() + 1 : now.getFullYear();
    return new Date(year, (nextQ % 4) * 3, 1, 8, 0, 0, 0);
  }
  const d = new Date(now);
  d.setDate(now.getDate() + 7);
  return d;
};

// ── Report HTML generators ─────────────────────────────────────────────────────

const emailWrapper = (title: string, body: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1f2e;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#4f8fff;padding:24px 32px;">
            <div style="font-size:22px;font-weight:700;color:#fff;">📦 Facilities TechTrack</div>
            <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px;">${title}</div>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;color:#e2e8f0;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#64748b;">
            This is an automated report from Facilities TechTrack.
            To stop receiving this report, log in and delete it from the Reports page.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

const statBlock = (label: string, value: string | number, color = "#4f8fff") =>
  `<div style="display:inline-block;background:rgba(255,255,255,0.05);border-radius:8px;padding:16px 24px;margin:0 8px 8px 0;min-width:120px;">
    <div style="font-size:28px;font-weight:700;color:${color};">${value}</div>
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#64748b;margin-top:4px;">${label}</div>
  </div>`;

const tableSection = (headers: string[], rows: (string | number)[][]): string => `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:24px;">
    <thead>
      <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
        ${headers.map((h) => `<th style="padding:8px 12px;text-align:left;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#64748b;">${h}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows.map((row, i) => `
        <tr style="border-bottom:${i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none"};">
          ${row.map((cell) => `<td style="padding:10px 12px;font-size:13px;color:#e2e8f0;">${cell}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  </table>
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateReportHtml = (
  reportType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assets: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workOrders: any[],
  catMap: Record<string, string>,
): string => {
  const fmt$ = (n: number) =>
    "$" + n.toLocaleString("en-US", {maximumFractionDigits: 0});

  const title = REPORT_TYPE_LABELS[reportType] ?? reportType;

  if (reportType === "asset_summary") {
    const byStatus = {
      active: assets.filter((a) => a.status === "active").length,
      maintenance: assets.filter((a) => a.status === "maintenance").length,
      storage: assets.filter((a) => a.status === "storage").length,
      retired: assets.filter((a) => a.status === "retired").length,
    };
    const totalValue = assets.reduce((s, a) => s + (a.purchasePrice ?? 0), 0);
    const byCat = categories
      .map((c) => ({
        name: c.name,
        count: assets.filter((a) => a.categoryId === c.id).length,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const body = `
      <h2 style="font-size:18px;font-weight:600;color:#fff;margin:0 0 20px;">Asset Summary</h2>
      <div>
        ${statBlock("Total Assets", assets.length)}
        ${statBlock("Active", byStatus.active, "#22c55e")}
        ${statBlock("Maintenance", byStatus.maintenance, "#f59e0b")}
        ${statBlock("Total Value", fmt$(totalValue))}
      </div>
      <h3 style="font-size:14px;color:#94a3b8;margin:24px 0 8px;font-weight:500;">By Category</h3>
      ${tableSection(["Category", "Assets"], byCat.map((c) => [c.name, c.count]))}
    `;
    return emailWrapper(title, body);
  }

  if (reportType === "maintenance_due") {
    const overdue = assets.filter((a) => {
      const cat = categories.find((c: {id: string}) => c.id === a.categoryId);
      if (!cat?.careTasks?.length) return false;
      const done = Object.keys(a.careCompletions ?? {}).length;
      return done < cat.careTasks.filter((t: {freq: string}) => t.freq !== "asneeded").length;
    });
    const rows = overdue.slice(0, 20).map((a) => {
      const cat = categories.find((c: {id: string}) => c.id === a.categoryId);
      const done = Object.keys(a.careCompletions ?? {}).length;
      const total = (cat?.careTasks ?? []).filter((t: {freq: string}) => t.freq !== "asneeded").length;
      return [a.name ?? "—", catMap[a.categoryId] ?? "—", a.location ?? "—", `${done}/${total} done`];
    });
    const body = `
      <h2 style="font-size:18px;font-weight:600;color:#fff;margin:0 0 8px;">Maintenance Due</h2>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 20px;">${overdue.length} asset(s) have pending care tasks.</p>
      ${rows.length > 0 ? tableSection(["Asset", "Category", "Location", "Care Progress"], rows) : "<p style='color:#64748b;font-size:13px;'>All care tasks are up to date. ✅</p>"}
    `;
    return emailWrapper(title, body);
  }

  if (reportType === "wo_status") {
    const open = workOrders.filter((w) => w.status === "open").length;
    const inProg = workOrders.filter((w) => w.status === "in_progress").length;
    const completed = workOrders.filter((w) => w.status === "completed").length;
    const onhold = workOrders.filter((w) => w.status === "onhold").length;
    const cancelled = workOrders.filter((w) => w.status === "cancelled").length;
    const recent = workOrders
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      .slice(0, 10)
      .map((w) => [w.title ?? "—", w.priority ?? "—", w.status, catMap[w.assetId] ?? "—"]);
    const body = `
      <h2 style="font-size:18px;font-weight:600;color:#fff;margin:0 0 20px;">Work Order Status</h2>
      <div>
        ${statBlock("Open", open, "#4f8fff")}
        ${statBlock("In Progress", inProg, "#f59e0b")}
        ${statBlock("Completed", completed, "#22c55e")}
        ${statBlock("Onhold", onhold, "#94a3b8")}
        ${statBlock("Cancelled", cancelled, "#ef4444")}
      </div>
      <h3 style="font-size:14px;color:#94a3b8;margin:24px 0 8px;font-weight:500;">Recent Work Orders</h3>
      ${recent.length > 0 ? tableSection(["Title", "Priority", "Status", "Category"], recent) : "<p style='color:#64748b;font-size:13px;'>No work orders yet.</p>"}
    `;
    return emailWrapper(title, body);
  }

  if (reportType === "depreciation") {
    const now = Date.now();
    const deprRows = assets
      .map((a) => {
        if (!a.purchaseDate?.toMillis || !a.lifespanYears) return null;
        const elapsed = now - a.purchaseDate.toMillis();
        const totalMs = a.lifespanYears * 365.25 * 24 * 60 * 60 * 1000;
        const pct = Math.min(elapsed / totalMs, 1);
        const bookVal = Math.max((a.purchasePrice ?? 0) * (1 - pct), 0);
        return {name: a.name ?? "—", cat: catMap[a.categoryId] ?? "—", pct, bookVal, purchase: a.purchasePrice ?? 0};
      })
      .filter(Boolean)
      .sort((a, b) => b!.pct - a!.pct)
      .slice(0, 15);

    const totalPurchase = assets.reduce((s, a) => s + (a.purchasePrice ?? 0), 0);
    const totalBook = deprRows.reduce((s, r) => s + r!.bookVal, 0);

    const body = `
      <h2 style="font-size:18px;font-weight:600;color:#fff;margin:0 0 20px;">Depreciation Report</h2>
      <div>
        ${statBlock("Total Purchase Value", fmt$(totalPurchase), "#4f8fff")}
        ${statBlock("Current Book Value", fmt$(totalBook), "#22c55e")}
        ${statBlock("Total Depreciated", fmt$(totalPurchase - totalBook), "#f59e0b")}
      </div>
      ${tableSection(
    ["Asset", "Category", "Purchase", "Book Value", "Depr. %"],
    deprRows.map((r) => [r!.name, r!.cat, fmt$(r!.purchase), fmt$(r!.bookVal), Math.round(r!.pct * 100) + "%"]),
  )}
    `;
    return emailWrapper(title, body);
  }

  // it_inventory fallback
  const itCats = categories.filter((c) =>
    ["MacBooks", "iPads", "Tablets", "Laptops", "Network", "Servers"].some((k) =>
      c.name?.includes(k),
    ),
  );
  const itAssets = itCats.length ?
    assets.filter((a) => itCats.some((c: {id: string}) => c.id === a.categoryId)) :
    assets;
  const body = `
    <h2 style="font-size:18px;font-weight:600;color:#fff;margin:0 0 8px;">IT Asset Inventory</h2>
    <p style="color:#94a3b8;font-size:13px;margin:0 0 20px;">${itAssets.length} IT assets tracked.</p>
    ${tableSection(
    ["Asset", "Category", "Status", "Location", "Serial"],
    itAssets.slice(0, 20).map((a) => [
      a.name ?? "—",
      catMap[a.categoryId] ?? "—",
      a.status ?? "—",
      a.location ?? "—",
      a.serialNumber ?? "—",
    ]),
  )}
  `;
  return emailWrapper(title, body);
};

// ── Callable: inviteUser ───────────────────────────────────────────────────────

export const inviteUser = onCall({cors: true}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  const callerSnap = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();

  if (!callerSnap.exists) {
    throw new HttpsError("permission-denied", "Caller profile not found.");
  }

  const callerRole = callerSnap.data()?.role as string;
  if (callerRole !== "admin" && callerRole !== "superAdmin") {
    throw new HttpsError("permission-denied", "Only admins can invite users.");
  }

  const {email, displayName, role} = request.data as {
    email: string;
    displayName: string;
    role: string;
  };

  if (!email || !displayName || !role) {
    throw new HttpsError(
      "invalid-argument",
      "email, displayName, and role are required.",
    );
  }

  const existing = await admin
    .firestore()
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError(
      "already-exists",
      "A user with this email already exists.",
    );
  }

  const userRecord = await admin.auth().createUser({
    email,
    displayName,
    emailVerified: false,
  });

  await admin.firestore().collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    email,
    displayName,
    role,
    isActive: false,
    permissions: [],
  });

  try {
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const {Resend} = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: process.env.INVITE_FROM_EMAIL ?? "noreply@techtrack.app",
        to: email,
        subject: "You've been invited to TechTrack",
        html: `
          <p>Hi ${displayName},</p>
          <p>You've been added to TechTrack Asset Management. Click below:</p>
          <p><a href="${resetLink}">Set your password</a></p>
          <p>If you didn't expect this email, you can ignore it.</p>
        `,
      });
    } else {
      console.log(`[inviteUser] Password reset link for ${email}: ${resetLink}`);
    }
  } catch (emailErr) {
    console.error("[inviteUser] Failed to send invite email:", emailErr);
  }

  return {uid: userRecord.uid};
});

// ── Scheduled: sendScheduledReports ───────────────────────────────────────────

export const sendScheduledReports = onSchedule(
  {
    schedule: "0 8 * * *", // every day at 08:00 UTC
    region: "us-central1",
    timeZone: "UTC",
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const snap = await db
      .collection("scheduledReports")
      .where("isActive", "==", true)
      .where("nextSendAt", "<=", now)
      .get();

    if (snap.empty) {
      console.log("[sendScheduledReports] No reports due.");
      return;
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn("[sendScheduledReports] RESEND_API_KEY not set — skipping.");
      return;
    }

    const {Resend} = await import("resend");
    const resend = new Resend(resendKey);

    // Load shared data once
    const [assetsSnap, catsSnap, wosSnap] = await Promise.all([
      db.collection("assets").where("isDeleted", "==", false).get(),
      db.collection("categories").where("isDeleted", "==", false).get(),
      db.collection("workOrders").get(),
    ]);

    const assets = assetsSnap.docs.map((d) => ({id: d.id, ...d.data()}));
    const categories = catsSnap.docs.map((d) => ({id: d.id, ...d.data()}));
    const workOrders = wosSnap.docs.map((d) => ({id: d.id, ...d.data()}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catMap: Record<string, string> = Object.fromEntries(categories.map((c: any) => [c.id, c.name]));

    await Promise.allSettled(
      snap.docs.map(async (reportDoc) => {
        const report = reportDoc.data();
        try {
          const html = generateReportHtml(
            report.reportType,
            assets,
            categories,
            workOrders,
            catMap,
          );

          await resend.emails.send({
            from: process.env.INVITE_FROM_EMAIL ?? "reports@techtrack.app",
            to: report.recipientEmail,
            subject: `TechTrack: ${FREQ_LABELS[report.frequency] ?? report.frequency} ${REPORT_TYPE_LABELS[report.reportType] ?? report.reportType} — ${new Date().toLocaleDateString("en-US", {month: "long", year: "numeric"})}`,
            html,
          });

          await reportDoc.ref.update({
            lastSentAt: admin.firestore.Timestamp.now(),
            nextSendAt: admin.firestore.Timestamp.fromDate(
              computeNextSendAt(report.frequency),
            ),
          });

          console.log(
            `[sendScheduledReports] ✓ ${report.reportType} → ${report.recipientEmail}`,
          );
        } catch (err) {
          console.error(
            `[sendScheduledReports] ✗ ${reportDoc.id}:`,
            err,
          );
        }
      }),
    );

    console.log(`[sendScheduledReports] Processed ${snap.size} report(s).`);
  },
);
