"use client";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BadgePercent,
  CalendarDays,
  Cat,
  CircleDollarSign,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  ReceiptText,
  ShieldCheck,
  Trash2,
  Users,
  WifiOff,
} from "lucide-react";
const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n || 0);
const formatDueDate = (date: string) =>
  new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
async function api(body?: any) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch("/api/app", {
      ...(body
        ? {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Something went wrong");
    return j;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("The connection took too long. Please try again.");
    }
    if (error instanceof TypeError) {
      throw new Error("We couldn’t connect. Check your internet connection.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
export default function App() {
  const [d, setD] = useState<any>(null),
    [error, setError] = useState(""),
    [reloadKey, setReloadKey] = useState(0),
    [tab, setTab] = useState("overview"),
    [greetingPlayed, setGreetingPlayed] = useState(false),
    [modal, setModal] = useState(false),
    [form, setForm] = useState<any>({
      date: new Date().toISOString().slice(0, 10),
      type: "contribution",
    });
  useEffect(() => {
    let cancelled = false;
    setError("");
    setD(null);

    const load = async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const state = await api();
          if (!cancelled) setD(state);
          return;
        } catch (loadError: any) {
          if (attempt === 0) {
            await new Promise((resolve) => window.setTimeout(resolve, 700));
          } else if (!cancelled) {
            setError(loadError.message || "The fund could not be opened.");
          }
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);
  useLayoutEffect(() => {
    if (!d?.user) return;

    // Keep authenticated page loads at the top while mobile browser chrome and
    // the software keyboard finish resizing the viewport.
    (document.activeElement as HTMLElement | null)?.blur();
    const hasSignInMarker = new URLSearchParams(window.location.search).has(
      "signed-in",
    );
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const resetView = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.scrollingElement?.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
      document.getElementById("portal-top")?.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: "auto",
      });
    };
    resetView();
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      resetView();
      secondFrame = window.requestAnimationFrame(resetView);
    });
    const timers = [80, 220, 450, 800].map((delay) =>
      window.setTimeout(resetView, delay),
    );
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", resetView);
    window.addEventListener("resize", resetView);
    window.addEventListener("orientationchange", resetView);
    const stopWatching = window.setTimeout(() => {
      viewport?.removeEventListener("resize", resetView);
      window.removeEventListener("resize", resetView);
      window.removeEventListener("orientationchange", resetView);
      if (hasSignInMarker) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }, 1000);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      timers.forEach(window.clearTimeout);
      window.clearTimeout(stopWatching);
      viewport?.removeEventListener("resize", resetView);
      window.removeEventListener("resize", resetView);
      window.removeEventListener("orientationchange", resetView);
    };
  }, [d?.user?.id]);
  const summary = useMemo(() => {
    if (!d?.members) return [];
    const tx = d.loans || [],
      interest = tx
        .filter((x: any) => x.type === "loan")
        .reduce((s: number, x: any) => s + (x.interest || 0), 0);
    return d.members.map((m: any) => {
      const mine = tx.filter((x: any) => x.memberId === m.id),
        principal = mine
          .filter((x: any) => x.type === "loan")
          .reduce((s: number, x: any) => s + (x.principal || 0), 0),
        pay = mine
          .filter((x: any) => x.type === "payment")
          .reduce((s: number, x: any) => s + (x.amount || 0), 0),
        ownInterest = mine
          .filter((x: any) => x.type === "loan")
          .reduce((s: number, x: any) => s + (x.interest || 0), 0);
      return {
        ...m,
        principal,
        pay,
        share:
          Number(m.contributions || 0) -
          principal -
          ownInterest +
          pay +
          interest / d.members.length,
      };
    });
  }, [d]);
  if (!d)
    return (
      <LoadingScreen
        error={error}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    );
  if (!d.user) return <Login error={error} setError={setError} />;
  const admin = d.user.role === "admin",
    finance = admin || d.user.role === "treasurer",
    tc = summary.reduce((s: number, m: any) => s + Number(m.contributions), 0),
    pl = d.loans
      .filter((x: any) => x.type === "loan")
      .reduce((s: number, x: any) => s + (x.principal || 0), 0),
    py = d.loans
      .filter((x: any) => x.type === "payment")
      .reduce((s: number, x: any) => s + (x.amount || 0), 0),
    totalInterest = d.loans
      .filter((x: any) => x.type === "loan")
      .reduce((s: number, x: any) => s + (x.interest || 0), 0),
    openLoanRows = d.loans.filter(
      (x: any) =>
        x.type === "loan" && String(x.status).toLowerCase() !== "paid",
    ),
    outstandingLoans = openLoanRows
      .reduce(
        (s: number, x: any) => s + (x.principal || 0) + (x.interest || 0),
        0,
      ),
    myOpenLoans = openLoanRows
      .filter((x: any) => x.memberId === d.user.id)
      .sort((a: any, b: any) =>
        String(a.dueDate || "9999-12-31").localeCompare(
          String(b.dueDate || "9999-12-31"),
        ),
      ),
    fund = tc - pl + py;
  const submit = async (e: any) => {
    e.preventDefault();
    try {
      const action = form.id
        ? "edit_loan"
        : form.type === "contribution"
          ? "add_contribution"
          : "add_loan";
      setD(await api({ action, ...form }));
      setModal(false);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        type: "contribution",
      });
    } catch (x: any) {
      setError(x.message);
    }
  };
  const openTransaction = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      type: "contribution",
    });
    setModal(true);
  };
  return (
    <div className="shell" id="portal-top">
      <header>
        <Brand />
        <nav>
          {[
            { id: "overview", label: "Overview", icon: <LayoutDashboard /> },
            {
              id: "contributions",
              label: "Contributions",
              icon: <ReceiptText />,
            },
            { id: "loans", label: "Loans", icon: <HandCoins /> },
            { id: "members", label: "Members", icon: <Users /> },
          ].map((x) => (
            <button
              key={x.id}
              className={tab === x.id ? "active" : ""}
              onClick={() => setTab(x.id)}
            >
              {x.icon}
              <span>{x.label}</span>
            </button>
          ))}
        </nav>
        <div className="account">
          <span>
            {d.user.name}
            <small>
              {admin
                ? "Admin"
                : d.user.role === "treasurer"
                  ? "Treasurer"
                  : "Member"}
            </small>
          </span>
          <button
            onClick={async () => {
              await api({ action: "logout" });
              location.reload();
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main>
        <div className="title">
          <div>
            <p>2026 FUND</p>
            <h1 className={tab === "overview" ? "greeting" : undefined}>
              {tab === "overview"
                ? <TypingGreeting
                    name={d.user.name}
                    animate={!greetingPlayed}
                    onDone={() => setGreetingPlayed(true)}
                  />
                : tab[0].toUpperCase() + tab.slice(1)}
            </h1>
            <span>
              {tab === "overview"
                ? "Here’s where the fund stands today."
                : "All records are visible to registered members."}
            </span>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        {tab === "overview" && (
          <>
            <section className="stats" aria-label="Fund summary">
              <Stat
                icon={<Landmark />}
                label="Fund balance"
                value={peso(fund)}
                tone="blue"
              />
              <Stat
                icon={<ArrowDownToLine />}
                label="Total contributions"
                value={peso(tc)}
                tone="green"
              />
              <Stat
                icon={<ArrowUpRight />}
                label="Loans released"
                value={peso(pl)}
                tone="orange"
              />
              <Stat
                icon={<BadgePercent />}
                label="Total Interest"
                value={peso(totalInterest)}
                tone="purple"
              />
              <Stat
                icon={<CircleDollarSign />}
                label="Outstanding loans"
                value={peso(outstandingLoans)}
                tone="red"
              />
            </section>
            {myOpenLoans.length > 0 && (
              <section
                className="my-loans-dashboard"
                aria-label="Your outstanding loans"
              >
                <div className="my-loans-heading">
                  <i>
                    <CalendarDays aria-hidden="true" />
                  </i>
                  <div>
                    <h2>Your outstanding loan</h2>
                    <p>A friendly reminder for your current balance.</p>
                  </div>
                </div>
                <div className="my-loans-list">
                  {myOpenLoans.map((loan: any) => (
                    <article key={loan.id}>
                      <p>
                        Friendly reminder! Your outstanding loan balance is{" "}
                        <strong>
                          {peso((loan.principal || 0) + (loan.interest || 0))}
                        </strong>
                        .{" "}
                        {loan.dueDate ? (
                          <>
                            Please settle it by{" "}
                            <strong>{formatDueDate(loan.dueDate)}</strong>. Thank
                            you! 😊
                          </>
                        ) : (
                          <>
                            Please check with the treasurer for the due date.
                            Thank you! 😊
                          </>
                        )}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}
            <section className="grid">
              <div className="panel wide">
                <Heading
                  title="Member shares"
                  sub="Contributions, loans and interest share"
                />
                <Summary rows={summary} />
              </div>
              <div className="panel">
                <Heading
                  title="Recent activity"
                  sub="Latest fund transactions"
                />
                <Activity
                  rows={[
                    ...d.contributions.map((x: any) => ({
                      ...x,
                      type: "contribution",
                    })),
                    ...d.loans,
                  ]
                    .sort((a: any, b: any) => b.date.localeCompare(a.date))
                    .slice(0, 7)}
                />
              </div>
            </section>
          </>
        )}
        {tab === "contributions" && (
          <>
            {finance && (
              <div className="transaction-toolbar">
                <button
                  className="add-transaction-outline"
                  type="button"
                  onClick={openTransaction}
                >
                  <Plus /> Add transaction
                </button>
              </div>
            )}
            <div className="panel">
              <Contributions
                rows={d.contributions}
                admin={admin}
                refresh={setD}
              />
            </div>
          </>
        )}
        {tab === "loans" && (
          <>
            {finance && (
              <div className="transaction-toolbar">
                <button
                  className="add-transaction-outline"
                  type="button"
                  onClick={openTransaction}
                >
                  <Plus /> Add transaction
                </button>
              </div>
            )}
            <div className="panel">
              <Loans
                rows={d.loans}
                members={d.members}
                admin={admin}
                finance={finance}
                refresh={setD}
                edit={(r: any) => {
                  setForm({
                    id: r.id,
                    memberId: r.memberId,
                    date: r.date,
                    type: r.type,
                    principal: r.principal,
                    term: r.termMonths,
                    amount: r.amount,
                    status: r.status,
                    note: r.note || "",
                  });
                  setModal(true);
                }}
              />
            </div>
          </>
        )}
        {tab === "members" && (
          <div className="panel">
            <Members rows={d.members} admin={admin} refresh={setD} />
          </div>
        )}
        <AppCredit />
      </main>
      {modal && (
        <div className="backdrop" onMouseDown={() => setModal(false)}>
          <form
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <h2>{form.id ? "Edit loan details" : "Add transaction"}</h2>
            <label>
              Transaction type
              <select
                disabled={Boolean(form.id)}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="contribution">Contribution</option>
                <option value="loan">Loan</option>
                <option value="payment">Loan payment</option>
              </select>
            </label>
            <label>
              Member
              <select
                required
                value={form.memberId || ""}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              >
                <option value="">Choose member</option>
                {d.members.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            {form.type === "loan" ? (
              <>
                <label>
                  Principal
                  <input
                    type="number"
                    required
                    value={form.principal || ""}
                    onChange={(e) =>
                      setForm({ ...form, principal: e.target.value })
                    }
                  />
                </label>
                <label>
                  Term in months
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.term || ""}
                    onChange={(e) => setForm({ ...form, term: e.target.value })}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={form.status || "open"}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="open">Open</option>
                    <option value="paid">Paid</option>
                  </select>
                </label>
              </>
            ) : (
              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  value={form.amount || ""}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>
            )}
            <label>
              Note
              <input
                value={form.note || ""}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
            <div className="actions">
              <button type="button" onClick={() => setModal(false)}>
                Cancel
              </button>
              <button className="primary">Save transaction</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="mark" aria-hidden="true">
        <Cat />
      </span>
      <div>
        <strong>Mengs</strong>
        <small>Sinking Fund</small>
      </div>
    </div>
  );
}
function Heading({ title, sub }: any) {
  return (
    <div className="panelhead">
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
    </div>
  );
}
function Stat({ icon, label, value, tone }: any) {
  return (
    <article className={`stat ${tone}`}>
      <i>{icon}</i>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
function TypingGreeting({
  name,
  animate,
  onDone,
}: {
  name: string;
  animate: boolean;
  onDone: () => void;
}) {
  const message = `Hello, ${name}!`;
  const [visible, setVisible] = useState(animate ? "" : message);
  const [typing, setTyping] = useState(animate);

  useEffect(() => {
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(message);
      setTyping(false);
      onDone();
      return;
    }

    let index = 0;
    let typeTimer = 0;
    let finishTimer = 0;
    setVisible("");
    setTyping(true);

    const typeNextCharacter = () => {
      index += 1;
      setVisible(message.slice(0, index));
      if (index < message.length) {
        typeTimer = window.setTimeout(typeNextCharacter, 65);
      } else {
        finishTimer = window.setTimeout(() => {
          setTyping(false);
          onDone();
        }, 450);
      }
    };

    typeTimer = window.setTimeout(typeNextCharacter, 180);
    return () => {
      window.clearTimeout(typeTimer);
      window.clearTimeout(finishTimer);
    };
  }, [animate, message]);

  return (
    <span className="typing-greeting" aria-label={message}>
      <span aria-hidden="true">{visible}</span>
      {typing && <i className="typing-caret" aria-hidden="true" />}
    </span>
  );
}
function LoadingScreen({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <main className="loading-screen">
      <div className="loading-card" role={error ? "alert" : "status"}>
        <Brand />
        {error ? (
          <>
            <i className="connection-icon">
              <WifiOff aria-hidden="true" />
            </i>
            <h1>We couldn’t open the fund</h1>
            <p>{error}</p>
            <button className="primary" type="button" onClick={onRetry}>
              <RefreshCw aria-hidden="true" />
              Try again
            </button>
            <small>
              If you opened the link in Messenger, you can also try opening it
              in Safari or Chrome.
            </small>
          </>
        ) : (
          <>
            <span className="loading-spinner" aria-hidden="true" />
            <h1>Opening your fund…</h1>
            <p>This may take a moment on a mobile connection.</p>
          </>
        )}
      </div>
    </main>
  );
}
function Login({ error, setError }: any) {
  const [f, setF] = useState({ email: "", pin: "" }),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <section>
        <Brand />
        <div className="login-copy">
          <p>MEMBER PORTAL</p>
          <h1>Welcome to Mengs Sinking Fund!</h1>
          <span>
            View contributions, loans, payments and each member’s share in one
            private place.
          </span>
        </div>
        <div className="trust">
          <ShieldCheck />
          Only members registered by the admin can enter.
        </div>
      </section>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          // Dismiss the mobile keyboard and clear the login form's scroll
          // position before swapping in the much shorter portal header.
          (document.activeElement as HTMLElement | null)?.blur();
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          try {
            await api({ action: "login", ...f });
            // A fresh URL prevents iOS and in-app browsers from restoring the
            // login form's scroll position onto the authenticated dashboard.
            window.location.replace(`/?signed-in=${Date.now()}`);
          } catch (x: any) {
            setError(x.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Member sign in</h2>
        <p>Sign in with the email and PIN given by your admin.</p>
        {error && <div className="error">{error}</div>}
        <label>
          Email address
          <input
            type="email"
            required
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
        </label>
        <label>
          Private PIN
          <input
            type="password"
            inputMode="numeric"
            required
            minLength={4}
            value={f.pin}
            onChange={(e) => setF({ ...f, pin: e.target.value })}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <small>Your records are view-only unless you are the admin.</small>
        <AppCredit compact />
      </form>
    </main>
  );
}
function AppCredit({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`app-credit${compact ? " compact" : ""}`}>
      <span>© 2026</span>
      <strong>L3R Digital Studio</strong>
      <span aria-hidden="true">·</span>
      <span>All rights reserved</span>
      <span aria-hidden="true">·</span>
      <span>v1.0</span>
    </footer>
  );
}
function Summary({ rows }: any) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Contributions</th>
            <th>Loans</th>
            <th>Payments</th>
            <th>Total share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id}>
              <td>
                <b>{r.name}</b>
              </td>
              <td>{peso(r.contributions)}</td>
              <td>{peso(r.principal)}</td>
              <td>{peso(r.pay)}</td>
              <td>
                <strong>{peso(r.share)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Contributions({ rows, admin, refresh }: any) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Member</th>
            <th>Amount</th>
            {admin && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id}>
              <td>{r.date}</td>
              <td>
                <b>{r.member_name}</b>
              </td>
              <td>
                {r.amount == null ? (
                  <span className="pending">Pending</span>
                ) : (
                  peso(r.amount)
                )}
              </td>
              {admin && (
                <td>
                  <button
                    className="danger"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Delete ${r.member_name}'s contribution of ${peso(r.amount)}? This cannot be undone.`,
                      );
                      if (!confirmed) return;
                      refresh(
                        await api({
                          action: "delete",
                          kind: "contribution",
                          id: r.id,
                        }),
                      );
                    }}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Loans({ rows, members, admin, finance, refresh, edit }: any) {
  const [filter, setFilter] = useState("all");
  const loanBalances = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const openLoans = rows.filter(
      (row: any) =>
        row.type === "loan" &&
        String(row.status).toLowerCase() !== "paid",
    );

    return members
      .map((member: any) => {
        const memberLoans = openLoans
          .filter((row: any) => row.memberId === member.id)
          .sort((a: any, b: any) =>
            String(a.dueDate || "9999-12-31").localeCompare(
              String(b.dueDate || "9999-12-31"),
            ),
          );
        return {
          id: member.id,
          name: member.name,
          openLoans: memberLoans.length,
          nextDueDate: memberLoans[0]?.dueDate || null,
          isPastDue:
            Boolean(memberLoans[0]?.dueDate) && memberLoans[0].dueDate < today,
          balance: memberLoans.reduce(
            (sum: number, loan: any) =>
              sum +
              Number(
                loan.amount ??
                  Number(loan.principal || 0) + Number(loan.interest || 0),
              ),
            0,
          ),
        };
      })
      .sort((a: any, b: any) => {
        if (Boolean(a.openLoans) !== Boolean(b.openLoans)) {
          return a.openLoans ? -1 : 1;
        }
        return (
          String(a.nextDueDate || "9999-12-31").localeCompare(
            String(b.nextDueDate || "9999-12-31"),
          ) || a.name.localeCompare(b.name)
        );
      });
  }, [members, rows]);
  const filteredRows =
    filter === "all" ? rows : rows.filter((r: any) => r.type === filter);
  const visibleRows = [...filteredRows].sort((a: any, b: any) => {
    const aPaid = String(a.status).toLowerCase() === "paid";
    const bPaid = String(b.status).toLowerCase() === "paid";
    if (aPaid !== bPaid) return aPaid ? 1 : -1;
    return b.date.localeCompare(a.date);
  });
  return (
    <>
      <div className="table-filters" aria-label="Filter loan records">
        {[
          ["all", "All"],
          ["loan", "Loans"],
          ["payment", "Payments"],
          ...(finance ? [["balance", "Loan balances"]] : []),
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "active" : ""}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {filter === "balance" && finance ? (
        <div className="loan-balances" aria-label="Outstanding loan balances">
          <div className="loan-balances-heading">
            <div>
              <h2>Outstanding loan balances</h2>
              <p>Unpaid principal and interest for each member.</p>
            </div>
            <strong>
              {peso(
                loanBalances.reduce(
                  (sum: number, member: any) => sum + member.balance,
                  0,
                ),
              )}
              <small>Total outstanding</small>
            </strong>
          </div>
          <div className="tablewrap">
            <table className="loan-balances-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>
                    <span className="full-label">Open loans</span>
                    <span className="short-label">Open</span>
                  </th>
                  <th>
                    <span className="full-label">Next due date</span>
                    <span className="short-label">Due date</span>
                  </th>
                  <th>
                    <span className="full-label">Loan balance</span>
                    <span className="short-label">Balance</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loanBalances.map((member: any) => (
                  <tr
                    key={member.id}
                    className={member.isPastDue ? "past-due-row" : undefined}
                  >
                    <td>
                      <b>{member.name}</b>
                    </td>
                    <td>{member.openLoans}</td>
                    <td>
                      {member.nextDueDate
                        ? <span className="due-date-with-status">
                            {formatDueDate(member.nextDueDate)}
                            {member.isPastDue && (
                              <small className="past-due-badge">Past due</small>
                            )}
                          </span>
                        : "—"}
                    </td>
                    <td>
                      <strong
                        className={
                          member.balance ? "balance-due" : "balance-clear"
                        }
                      >
                        {peso(member.balance)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Type</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Payment amount</th>
              <th>Due</th>
              <th>Status</th>
              {finance && <th />}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r: any) => (
            <tr
              key={r.id}
              className={
                r.type === "loan" &&
                String(r.status).toLowerCase() === "paid"
                  ? "paid-row"
                  : ""
              }
            >
              <td>{r.date}</td>
              <td>
                <b>{r.member_name}</b>
              </td>
              <td>
                <span className={`pill ${r.type}`}>{r.type}</span>
              </td>
              <td>{r.principal ? peso(r.principal) : "—"}</td>
              <td>{r.type === "loan" ? peso(r.interest) : "—"}</td>
              <td>{r.type === "payment" ? peso(r.amount) : "—"}</td>
              <td>{r.dueDate || "—"}</td>
              <td>{r.status}</td>
              {finance && (
                <td className="row-actions">
                  <button
                    className="icon-action edit-action"
                    type="button"
                    title="Edit transaction"
                    aria-label={`Edit ${r.member_name} ${r.type}`}
                    onClick={() => edit(r)}
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                  {admin && (
                    <button
                      className="icon-action delete-action"
                      type="button"
                      title="Delete transaction"
                      aria-label={`Delete ${r.member_name} ${r.type}`}
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Delete ${r.member_name}'s ${r.type} transaction? This cannot be undone.`,
                        );
                        if (!confirmed) return;
                        refresh(
                          await api({
                            action: "delete",
                            kind: "loan",
                            id: r.id,
                          }),
                        );
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  )}
                </td>
              )}
            </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </>
  );
}
function Activity({ rows }: any) {
  return (
    <div className="activity">
      {rows.map((r: any, i: number) => (
        <div key={i}>
          <i className={r.type}>
            {r.type === "contribution" ? <ArrowDownToLine /> : <ArrowUpRight />}
          </i>
          <span>
            <b>{r.member_name}</b>
            <small>
              {r.type} · {r.date}
            </small>
          </span>
          <strong>{peso(r.amount || r.principal)}</strong>
        </div>
      ))}
    </div>
  );
}
function Members({ rows, admin, refresh }: any) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pinModal, setPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: "",
  });
  return (
    <>
      <form
        className="membermanager"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          const fd = new FormData(e.currentTarget);
          const updates = rows.map((m: any) => ({
            memberId: m.id,
            email: fd.get(`email-${m.id}`),
            pin: fd.get(`pin-${m.id}`),
            role: fd.get(`role-${m.id}`),
            active: fd.get(`active-${m.id}`) === "on",
          }));
          try {
            refresh(await api({ action: "save_members", updates }));
            setMessage("Member changes saved. Existing PINs were kept.");
          } catch (error: any) {
            setMessage(error.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="panelhead">
          <div>
            <h2>Registered members</h2>
            <p>
              {admin
                ? "Leave a PIN blank to keep the current PIN."
                : "Member accounts and access status."}
            </p>
          </div>
          <div className="member-actions">
            <button type="button" onClick={() => setPinModal(true)}>
              Change my PIN
            </button>
            {admin && (
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </div>
        {message && <div className="save-message">{message}</div>}
        <div className="membercards">
          {rows.map((m: any) => (
            <div className="memberrow" key={m.id}>
              <div className="avatar">{m.name[0]}</div>
              <div className="membername">
                <b>{m.name}</b>
                <small className={`member-role ${m.role}`}>
                  {m.role === "admin"
                    ? "Admin"
                    : m.role === "treasurer"
                      ? "Treasurer"
                      : "Member"}
                </small>
              </div>
              {admin && (
                <>
                  <input
                    name={`email-${m.id}`}
                    type="email"
                    defaultValue={m.email || ""}
                    placeholder="Member email"
                  />
                  <input
                    name={`pin-${m.id}`}
                    inputMode="numeric"
                    minLength={4}
                    placeholder="Initial / reset PIN"
                  />
                  <select name={`role-${m.id}`} defaultValue={m.role}>
                    <option value="member">Member</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label className="check">
                    <input
                      name={`active-${m.id}`}
                      type="checkbox"
                      defaultChecked={m.active}
                    />{" "}
                    Active
                  </label>
                </>
              )}
            </div>
          ))}
        </div>
      </form>
      {pinModal && (
        <div className="backdrop" onMouseDown={() => setPinModal(false)}>
          <form
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              setMessage("");
              if (pinForm.newPin !== pinForm.confirmPin) {
                setMessage("The new PINs do not match.");
                setPinModal(false);
                return;
              }
              try {
                refresh(await api({ action: "change_pin", ...pinForm }));
                setPinForm({ currentPin: "", newPin: "", confirmPin: "" });
                setPinModal(false);
                setMessage("Your PIN was changed successfully.");
              } catch (error: any) {
                setMessage(error.message);
                setPinModal(false);
              }
            }}
          >
            <h2>Change my PIN</h2>
            <label>
              Current PIN
              <input
                type="password"
                inputMode="numeric"
                required
                minLength={4}
                value={pinForm.currentPin}
                onChange={(e) =>
                  setPinForm({ ...pinForm, currentPin: e.target.value })
                }
              />
            </label>
            <label>
              New PIN
              <input
                type="password"
                inputMode="numeric"
                required
                minLength={4}
                value={pinForm.newPin}
                onChange={(e) =>
                  setPinForm({ ...pinForm, newPin: e.target.value })
                }
              />
            </label>
            <label>
              Confirm new PIN
              <input
                type="password"
                inputMode="numeric"
                required
                minLength={4}
                value={pinForm.confirmPin}
                onChange={(e) =>
                  setPinForm({ ...pinForm, confirmPin: e.target.value })
                }
              />
            </label>
            <div className="actions">
              <button type="button" onClick={() => setPinModal(false)}>
                Cancel
              </button>
              <button className="primary">Update PIN</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
