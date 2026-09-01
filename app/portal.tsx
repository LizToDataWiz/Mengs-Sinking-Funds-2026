"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BadgePercent,
  Cat,
  CircleDollarSign,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n || 0);
async function api(body?: any) {
  const r = await fetch(
      "/api/app",
      body
        ? {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : undefined,
    ),
    j = await r.json();
  if (!r.ok) throw new Error(j.error || "Something went wrong");
  return j;
}
export default function App() {
  const [d, setD] = useState<any>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("overview"),
    [modal, setModal] = useState(false),
    [form, setForm] = useState<any>({
      date: new Date().toISOString().slice(0, 10),
      type: "contribution",
    });
  useEffect(() => {
    api()
      .then(setD)
      .catch((e) => setError(e.message));
  }, []);
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
  if (!d) return <main className="loading">Opening your fund…</main>;
  if (!d.user) return <Login onDone={setD} error={error} setError={setError} />;
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
    outstandingLoans = d.loans
      .filter((x: any) => x.type === "loan" && x.status !== "paid")
      .reduce(
        (s: number, x: any) => s + (x.principal || 0) + (x.interest || 0),
        0,
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
  return (
    <div className="shell">
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
                ? "Administrator"
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
            <h1>
              {tab === "overview"
                ? `Hi, ${d.user.name}`
                : tab[0].toUpperCase() + tab.slice(1)}
            </h1>
            <span>
              {tab === "overview"
                ? "Here’s where the fund stands today."
                : "All records are visible to registered members."}
            </span>
          </div>
          {finance && tab !== "members" && (
            <button
              className="primary"
              onClick={() => {
                setForm({
                  date: new Date().toISOString().slice(0, 10),
                  type: "contribution",
                });
                setModal(true);
              }}
            >
              <Plus size={18} /> Add transaction
            </button>
          )}
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
          <div className="panel">
            <Contributions
              rows={d.contributions}
              admin={admin}
              refresh={setD}
            />
          </div>
        )}
        {tab === "loans" && (
          <div className="panel">
            <Loans
              rows={d.loans}
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
        )}
        {tab === "members" && (
          <div className="panel">
            <Members rows={d.members} admin={admin} refresh={setD} />
          </div>
        )}
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
function Login({ onDone, error, setError }: any) {
  const [f, setF] = useState({ email: "", pin: "" }),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <section>
        <Brand />
        <div className="login-copy">
          <p>MEMBER PORTAL</p>
          <h1>
            Every peso,
            <br />
            clear and accounted for.
          </h1>
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
          try {
            onDone(await api({ action: "login", ...f }));
          } catch (x: any) {
            setError(x.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Welcome back</h2>
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
      </form>
    </main>
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
            <th>Note</th>
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
              <td>{r.note || "—"}</td>
              {admin && (
                <td>
                  <button
                    className="danger"
                    onClick={async () =>
                      refresh(
                        await api({
                          action: "delete",
                          kind: "contribution",
                          id: r.id,
                        }),
                      )
                    }
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
function Loans({ rows, admin, finance, refresh, edit }: any) {
  const [filter, setFilter] = useState("all");
  const visibleRows =
    filter === "all" ? rows : rows.filter((r: any) => r.type === filter);
  return (
    <>
      <div className="table-filters" aria-label="Filter loan records">
        {[
          ["all", "All"],
          ["loan", "Loans"],
          ["payment", "Payments"],
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
            <tr key={r.id}>
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
                      onClick={async () =>
                        refresh(
                          await api({
                            action: "delete",
                            kind: "loan",
                            id: r.id,
                          }),
                        )
                      }
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
                <small>{m.email || "Not registered yet"}</small>
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
