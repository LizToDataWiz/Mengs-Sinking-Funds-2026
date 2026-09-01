import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  contributions,
  loanTransactions,
  members,
  settings,
} from "@/db/schema";
import { clearSession, createSession, currentUser, hashPin } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) =>
  NextResponse.json({ error }, { status });
function calculateStatuses(rows: any[]) {
  const paymentsByMember = new Map<number, number>();
  const loansByMember = new Map<number, any[]>();

  for (const row of rows) {
    if (row.type === "payment") {
      paymentsByMember.set(
        row.memberId,
        (paymentsByMember.get(row.memberId) || 0) + Number(row.amount || 0),
      );
    } else if (row.type === "loan") {
      const memberLoans = loansByMember.get(row.memberId) || [];
      memberLoans.push(row);
      loansByMember.set(row.memberId, memberLoans);
    }
  }

  const automaticallyPaid = new Set<number>();
  for (const [memberId, memberLoans] of loansByMember) {
    let availablePayments = paymentsByMember.get(memberId) || 0;
    memberLoans.sort(
      (a, b) => a.date.localeCompare(b.date) || Number(a.id) - Number(b.id),
    );
    for (const loan of memberLoans) {
      const amountDue = Number(loan.amount || 0);
      if (availablePayments + 0.005 >= amountDue) {
        automaticallyPaid.add(loan.id);
        availablePayments -= amountDue;
      } else {
        availablePayments = 0;
      }
    }
  }

  return rows.map((row) => ({
    ...row,
    status:
      row.type === "payment" ||
      String(row.status).toLowerCase() === "paid" ||
      automaticallyPaid.has(row.id)
        ? "paid"
        : "open",
  }));
}
async function state() {
  const db = getDb(),
    user = await currentUser();
  if (!user) return { user: null };
  const [memberRows, loanRows, contributionRows, bank] = await Promise.all([
    db
      .select({
        id: members.id,
        name: members.name,
        email: members.email,
        role: members.role,
        active: members.active,
        contributions: sql<number>`coalesce(sum(${contributions.amount}),0)`,
      })
      .from(members)
      .leftJoin(contributions, eq(contributions.memberId, members.id))
      .groupBy(members.id)
      .orderBy(asc(members.name)),
    db
      .select({
        ...getTableColumns(loanTransactions),
        member_name: members.name,
      })
      .from(loanTransactions)
      .innerJoin(members, eq(loanTransactions.memberId, members.id))
      .orderBy(desc(loanTransactions.date), desc(loanTransactions.id)),
    db
      .select({ ...getTableColumns(contributions), member_name: members.name })
      .from(contributions)
      .innerJoin(members, eq(contributions.memberId, members.id))
      .orderBy(desc(contributions.date), desc(contributions.id)),
    db.select().from(settings).where(eq(settings.key, "bank_balance")).limit(1),
  ]);
  return {
    user,
    members: memberRows,
    loans: calculateStatuses(loanRows),
    contributions: contributionRows,
    bankBalance: Number(bank[0]?.value || 0),
  };
}
export async function GET() {
  try {
    await ensureSeeded();
    return NextResponse.json(await state());
  } catch (e) {
    console.error(e);
    return bad("The database is not connected yet.", 503);
  }
}
export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const db = getDb(),
      b = await req.json();
    if (b.action === "login") {
      const email = String(b.email || "")
          .trim()
          .toLowerCase(),
        pin = String(b.pin || "");
      const row = (
        await db
          .select()
          .from(members)
          .where(
            and(
              sql`lower(${members.email})=${email}`,
              eq(members.active, true),
            ),
          )
          .limit(1)
      )[0];
      if (!row || row.pinHash !== (await hashPin(email, pin)))
        return bad("Email or PIN is incorrect.", 401);
      await createSession(row.id);
      return NextResponse.json(await state());
    }
    if (b.action === "logout") {
      await clearSession();
      return NextResponse.json({ ok: true });
    }
    const user = await currentUser();
    if (!user) return bad("Please sign in again.", 401);
    const finance = user.role === "admin" || user.role === "treasurer";
    if (b.action === "change_pin") {
      const currentPin = String(b.currentPin || "");
      const newPin = String(b.newPin || "");
      if (!/^\d{4,10}$/.test(newPin))
        return bad("Use a PIN containing 4 to 10 numbers.");
      if (!user.email) return bad("Your account does not have an email.");
      const member = (
        await db.select().from(members).where(eq(members.id, user.id)).limit(1)
      )[0];
      if (!member || member.pinHash !== (await hashPin(user.email, currentPin)))
        return bad("Your current PIN is incorrect.", 401);
      await db
        .update(members)
        .set({ pinHash: await hashPin(user.email, newPin) })
        .where(eq(members.id, user.id));
    } else if (b.action === "save_member" || b.action === "save_members") {
      if (user.role !== "admin")
        return bad("Only the admin can manage members.", 403);
      const updates =
        b.action === "save_members" && Array.isArray(b.updates)
          ? b.updates
          : [b];
      for (const item of updates) {
        const email =
            String(item.email || "")
              .trim()
              .toLowerCase() || null,
          pin = String(item.pin || "");
        const existing = (
          await db
            .select({ email: members.email })
            .from(members)
            .where(eq(members.id, Number(item.memberId)))
            .limit(1)
        )[0];
        if (existing?.email !== email && !pin)
          return bad("Enter a PIN when changing a member's email.");
        const update: any = {
          email,
          role: ["admin", "treasurer", "member"].includes(item.role)
            ? item.role
            : "member",
          active: Boolean(item.active),
        };
        if (email && pin) update.pinHash = await hashPin(email, pin);
        await db
          .update(members)
          .set(update)
          .where(eq(members.id, Number(item.memberId)));
      }
    } else if (
      ["add_contribution", "add_loan", "edit_loan"].includes(b.action)
    ) {
      if (!finance)
        return bad("Only the admin or treasurer can manage transactions.", 403);
      if (b.action === "add_contribution")
        await db.insert(contributions).values({
          memberId: Number(b.memberId),
          date: b.date,
          amount: b.amount === "" ? null : Number(b.amount),
          note: b.note || null,
        });
      else {
        const principal = b.type === "loan" ? Number(b.principal) : null,
          term = b.type === "loan" ? Number(b.term) : null,
          interest = b.type === "loan" ? principal! * term! * 0.03 : null,
          total = b.type === "loan" ? principal! + interest! : Number(b.amount),
          d = new Date(`${b.date}T00:00:00Z`);
        if (term) d.setUTCMonth(d.getUTCMonth() + term);
        const values = {
          memberId: Number(b.memberId),
          date: b.date,
          type: b.type,
          principal,
          termMonths: term,
          interest,
          amount: total,
          dueDate: term ? d.toISOString().slice(0, 10) : null,
          status: b.type === "payment" ? "paid" : b.status || "open",
          note: b.note || null,
          updatedAt: new Date(),
        };
        if (b.action === "edit_loan")
          await db
            .update(loanTransactions)
            .set(values)
            .where(eq(loanTransactions.id, Number(b.id)));
        else await db.insert(loanTransactions).values(values);
      }
    } else if (b.action === "bank") {
      if (!finance)
        return bad(
          "Only the admin or treasurer can update the bank balance.",
          403,
        );
      await db
        .update(settings)
        .set({ value: String(Number(b.amount) || 0) })
        .where(eq(settings.key, "bank_balance"));
    } else if (b.action === "delete") {
      if (user.role !== "admin")
        return bad("Only the admin can delete records.", 403);
      if (b.kind === "contribution")
        await db
          .delete(contributions)
          .where(eq(contributions.id, Number(b.id)));
      else
        await db
          .delete(loanTransactions)
          .where(eq(loanTransactions.id, Number(b.id)));
    } else return bad("Unknown action");
    return NextResponse.json(await state());
  } catch (e) {
    console.error(e);
    return bad("The database request could not be completed.", 500);
  }
}
