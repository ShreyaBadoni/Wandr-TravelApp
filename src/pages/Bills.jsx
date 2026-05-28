import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";
import "../styles/bills.css";

const CATEGORIES = ["General", "Food", "Transport", "Stay", "Activities", "Shopping", "Other"];
const CURRENCIES  = ["INR", "USD", "EUR", "GBP", "JPY", "AED"];

function Bills({ toggleTheme }) {
  const [teams, setTeams]               = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [bills, setBills]               = useState([]);
  const [settlements, setSettlements]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [billsLoading, setBillsLoading] = useState(false);
  const [modal, setModal]               = useState(null); // "add" | "detail"
  const [selectedBill, setSelectedBill] = useState(null);
  const [tab, setTab]                   = useState("bills"); // "bills" | "settle"

  // Form
  const [title, setTitle]         = useState("");
  const [amount, setAmount]       = useState("");
  const [currency, setCurrency]   = useState("INR");
  const [paidBy, setPaidBy]       = useState("");
  const [splitWith, setSplitWith] = useState([]);
  const [category, setCategory]   = useState("General");
  const [note, setNote]           = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("token");
  const currentUserId = (() => {
    try { return JSON.parse(atob(token.split(".")[1])).id; }
    catch { return null; }
  })();

  const navigate = useNavigate();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get("https://wandr-travelapp.onrender.com/teams", { headers: { Authorization: token } });
        setTeams(res.data.teams);
        if (res.data.teams.length > 0) {
          const active = res.data.teams.find(t => t.vacation?.active) || res.data.teams[0];
          setSelectedTeam(active);
        }
      } catch { toast.error("Failed to load teams"); }
      finally { setLoading(false); }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) fetchBills(selectedTeam._id);
  }, [selectedTeam]);

  const fetchBills = async (teamId) => {
    setBillsLoading(true);
    try {
      const res = await axios.get(`https://wandr-travelapp.onrender.com/teams/${teamId}/bills`, { headers: { Authorization: token } });
      setBills(res.data.bills);
      setSettlements(res.data.settlements);
    } catch { toast.error("Failed to load bills"); }
    finally { setBillsLoading(false); }
  };

  const openAddModal = () => {
    if (!selectedTeam) { toast.error("Select a team first"); return; }
    setTitle(""); setAmount(""); setCurrency("INR");
    setPaidBy(currentUserId); setNote(""); setCategory("General");
    // default: split with everyone
    setSplitWith(selectedTeam.members.map(m => m.user._id));
    setModal("add");
  };

  const toggleSplitMember = (uid) => {
    setSplitWith(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const addBill = async () => {
    if (!title.trim())       { toast.error("Enter a title"); return; }
    if (!amount || isNaN(amount) || +amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (!paidBy)             { toast.error("Select who paid"); return; }
    if (splitWith.length === 0) { toast.error("Select at least one person to split with"); return; }

    try {
      setSubmitting(true);
      await axios.post(`https://wandr-travelapp.onrender.com/teams/${selectedTeam._id}/bills`,
        { title, amount: +amount, currency, paidBy, members: splitWith, category, note },
        { headers: { Authorization: token } }
      );
      toast.success("Bill added!");
      setModal(null);
      fetchBills(selectedTeam._id);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to add bill"); }
    finally { setSubmitting(false); }
  };

  const settleBill = async (billId) => {
    try {
      await axios.post(`https://wandr-travelapp.onrender.com/bills/${billId}/settle`, {}, { headers: { Authorization: token } });
      toast.success("Marked as settled!");
      fetchBills(selectedTeam._id);
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const deleteBill = async (billId) => {
    if (!window.confirm("Delete this bill?")) return;
    try {
      await axios.delete(`https://wandr-travelapp.onrender.com/bills/${billId}`, { headers: { Authorization: token } });
      toast.success("Bill deleted");
      setModal(null);
      fetchBills(selectedTeam._id);
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  // Totals
  const totalSpent   = bills.reduce((s, b) => s + b.amount, 0);
  const myBills      = bills.filter(b => b.paidBy._id === currentUserId || b.paidBy._id?.toString() === currentUserId);
  const iOwe         = settlements.filter(s => s.from === currentUserId);
  const owedToMe     = settlements.filter(s => s.to === currentUserId);
  const totalIOwe    = iOwe.reduce((s, x) => s + x.amount, 0);
  const totalOwedMe  = owedToMe.reduce((s, x) => s + x.amount, 0);

  const formatAmt = (n, cur = "INR") => {
    const symbols = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ" };
    return `${symbols[cur] || cur}${parseFloat(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCategoryEmoji = (cat) => {
    const map = { Food: "🍽️", Transport: "🚗", Stay: "🏨", Activities: "🎯", Shopping: "🛍️", General: "📋", Other: "💡" };
    return map[cat] || "📋";
  };

  return (
    <div className="wandr-page">
      <div className="wandr-page-bg">
        <div className="wandr-bg-orb wandr-bg-orb-1" />
        <div className="wandr-bg-orb wandr-bg-orb-2" />
      </div>
      <Navbar toggleTheme={toggleTheme} />

      <div className="wandr-page-content">
        {/* Header */}
        <div className="wandr-page-header bills-header">
          <div>
            <span className="wandr-page-tag">◈ Expenses</span>
            <h1 className="wandr-page-title">Bill <em>Splitter</em></h1>
            <p className="wandr-page-sub">Track and split expenses with your team</p>
          </div>
          {selectedTeam && (
            <button className="wandr-btn wandr-btn-primary" onClick={openAddModal}>
              + Add Bill
            </button>
          )}
        </div>

        {loading ? (
          <div className="wandr-loading"><div className="wandr-spinner" /><span>Loading...</span></div>
        ) : teams.length === 0 ? (
          <div className="teams-empty">
            <div className="teams-empty-icon">💸</div>
            <h3>No teams yet</h3>
            <p>Create or join a team to start splitting bills.</p>
            <button className="wandr-btn wandr-btn-primary" onClick={() => navigate("/teams")}>Go to Teams</button>
          </div>
        ) : (
          <>
            {/* Team selector */}
            <div className="bills-team-selector">
              {teams.map(t => (
                <button
                  key={t._id}
                  className={`bills-team-tab ${selectedTeam?._id === t._id ? "active" : ""}`}
                  onClick={() => setSelectedTeam(t)}
                >
                  {t.vacation?.active && <span className="bills-live-dot">●</span>}
                  {t.name}
                  <span className="bills-team-members">{t.members.length}</span>
                </button>
              ))}
            </div>

            {/* Summary cards */}
            {selectedTeam && (
              <>
                <div className="bills-summary">
                  <div className="bills-summary-card total">
                    <div className="bsc-label">Total Spent</div>
                    <div className="bsc-value">{formatAmt(totalSpent, bills[0]?.currency || "INR")}</div>
                    <div className="bsc-sub">{bills.length} bill{bills.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="bills-summary-card owe">
                    <div className="bsc-label">You Owe</div>
                    <div className="bsc-value red">{formatAmt(totalIOwe, "INR")}</div>
                    <div className="bsc-sub">to {iOwe.length} person{iOwe.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="bills-summary-card owed">
                    <div className="bsc-label">Owed to You</div>
                    <div className="bsc-value green">{formatAmt(totalOwedMe, "INR")}</div>
                    <div className="bsc-sub">from {owedToMe.length} person{owedToMe.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="bills-summary-card mine">
                    <div className="bsc-label">You Paid</div>
                    <div className="bsc-value gold">{formatAmt(myBills.reduce((s,b) => s+b.amount,0), "INR")}</div>
                    <div className="bsc-sub">{myBills.length} bill{myBills.length !== 1 ? "s" : ""}</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bills-tabs">
                  <button className={`bills-tab ${tab === "bills" ? "active" : ""}`} onClick={() => setTab("bills")}>
                    All Bills <span className="bills-tab-count">{bills.length}</span>
                  </button>
                  <button className={`bills-tab ${tab === "settle" ? "active" : ""}`} onClick={() => setTab("settle")}>
                    Settlements <span className="bills-tab-count">{settlements.length}</span>
                  </button>
                </div>

                {billsLoading ? (
                  <div className="wandr-loading"><div className="wandr-spinner" /></div>
                ) : tab === "bills" ? (
                  bills.length === 0 ? (
                    <div className="bills-empty">
                      <div>💸</div>
                      <p>No bills yet. Add the first expense!</p>
                    </div>
                  ) : (
                    <div className="bills-list">
                      {bills.map((bill, i) => {
                        const myShare    = bill.members.some(m => (m._id || m) === currentUserId || m._id?.toString() === currentUserId);
                        const iSettled   = bill.settledBy.some(s => s._id?.toString() === currentUserId || s._id === currentUserId);
                        const iPaid      = bill.paidBy._id?.toString() === currentUserId || bill.paidBy._id === currentUserId;
                        const settledCnt = bill.settledBy.length;
                        const totalCnt   = bill.members.length;

                        return (
                          <div className="bill-row" key={bill._id} style={{ "--i": i }}
                            onClick={() => { setSelectedBill(bill); setModal("detail"); }}>
                            <div className="bill-cat-icon">{getCategoryEmoji(bill.category)}</div>
                            <div className="bill-info">
                              <div className="bill-title">{bill.title}</div>
                              <div className="bill-meta">
                                Paid by <strong>{iPaid ? "You" : bill.paidBy.name}</strong>
                                · {new Date(bill.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                · {bill.category}
                              </div>
                              <div className="bill-progress-wrap">
                                <div className="bill-progress-bar">
                                  <div className="bill-progress-fill" style={{ width: `${(settledCnt/totalCnt)*100}%` }} />
                                </div>
                                <span className="bill-progress-label">{settledCnt}/{totalCnt} settled</span>
                              </div>
                            </div>
                            <div className="bill-right">
                              <div className="bill-amount">{formatAmt(bill.amount, bill.currency)}</div>
                              <div className="bill-split">÷{bill.members.length} = {formatAmt(bill.splitAmount, bill.currency)}</div>
                              {myShare && !iPaid && (
                                iSettled
                                  ? <span className="bill-settled-badge">✓ Settled</span>
                                  : <button className="bill-settle-btn"
                                      onClick={e => { e.stopPropagation(); settleBill(bill._id); }}>
                                      Mark Settled
                                    </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* Settlements tab */
                  settlements.length === 0 ? (
                    <div className="bills-empty">
                      <div>🎉</div>
                      <p>All settled up! No pending payments.</p>
                    </div>
                  ) : (
                    <div className="settlements-list">
                      {settlements.map((s, i) => (
                        <div className="settlement-row" key={i}
                          style={{ "--i": i, "--highlight": s.from === currentUserId ? "1" : "0" }}>
                          <div className="settlement-avatars">
                            <div className="s-avatar from">{s.fromName?.slice(0,2).toUpperCase()}</div>
                            <div className="settlement-arrow">→</div>
                            <div className="s-avatar to">{s.toName?.slice(0,2).toUpperCase()}</div>
                          </div>
                          <div className="settlement-info">
                            <div className="settlement-text">
                              <strong>{s.from === currentUserId ? "You" : s.fromName}</strong>
                              {" owes "}
                              <strong>{s.to === currentUserId ? "You" : s.toName}</strong>
                            </div>
                            <div className="settlement-amount">{formatAmt(s.amount, "INR")}</div>
                          </div>
                          {s.from === currentUserId && (
                            <span className="you-owe-badge">You owe</span>
                          )}
                          {s.to === currentUserId && (
                            <span className="owed-badge">Owed to you</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <div className="teams-modal-backdrop" onClick={() => setModal(null)}>
          <div className="teams-modal bills-modal" onClick={e => e.stopPropagation()}>

            {/* ADD BILL */}
            {modal === "add" && (
              <>
                <div className="modal-header">
                  <div className="modal-icon">💸</div>
                  <h2>Add a Bill</h2>
                  <p>Split it equally among your team</p>
                </div>

                <div className="bill-form-grid">
                  <div className="wandr-field">
                    <label className="wandr-field-label">Title *</label>
                    <input className="wandr-input" placeholder="e.g. Hotel dinner, Taxi to airport"
                      value={title} onChange={e => setTitle(e.target.value)} autoFocus />
                  </div>

                  <div className="bill-amount-row">
                    <div className="wandr-field flex-1">
                      <label className="wandr-field-label">Amount *</label>
                      <input className="wandr-input" type="number" placeholder="0.00"
                        value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                    <div className="wandr-field">
                      <label className="wandr-field-label">Currency</label>
                      <select className="wandr-input wandr-select" value={currency}
                        onChange={e => setCurrency(e.target.value)}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="wandr-field">
                    <label className="wandr-field-label">Category</label>
                    <div className="category-pills">
                      {CATEGORIES.map(cat => (
                        <button key={cat}
                          className={`cat-pill ${category === cat ? "active" : ""}`}
                          onClick={() => setCategory(cat)}>
                          {getCategoryEmoji(cat)} {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="wandr-field">
                    <label className="wandr-field-label">Paid by *</label>
                    <select className="wandr-input wandr-select" value={paidBy}
                      onChange={e => setPaidBy(e.target.value)}>
                      {selectedTeam.members.map(m => (
                        <option key={m.user._id} value={m.user._id}>
                          {m.user._id === currentUserId ? `${m.user.name} (You)` : m.user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="wandr-field">
                    <label className="wandr-field-label">Split with</label>
                    <div className="split-members">
                      {selectedTeam.members.map(m => {
                        const uid      = m.user._id;
                        const checked  = splitWith.includes(uid);
                        return (
                          <div key={uid}
                            className={`split-member-chip ${checked ? "checked" : ""}`}
                            onClick={() => toggleSplitMember(uid)}>
                            <div className="smc-avatar">{m.user.name.slice(0,2).toUpperCase()}</div>
                            <span>{uid === currentUserId ? "You" : m.user.name}</span>
                            {checked && <span className="smc-check">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                    {amount && splitWith.length > 0 && (
                      <div className="split-preview">
                        Each pays: <strong>{formatAmt(amount / splitWith.length, currency)}</strong>
                        {" "}({splitWith.length} people)
                      </div>
                    )}
                  </div>

                  <div className="wandr-field">
                    <label className="wandr-field-label">Note (optional)</label>
                    <input className="wandr-input" placeholder="Any additional info..."
                      value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </div>

                <div className="wandr-btn-row">
                  <button className="wandr-btn wandr-btn-primary" onClick={addBill} disabled={submitting}>
                    {submitting ? "Adding..." : "Add Bill →"}
                  </button>
                  <button className="wandr-btn wandr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                </div>
              </>
            )}

            {/* BILL DETAIL */}
            {modal === "detail" && selectedBill && (() => {
              const iPaid    = selectedBill.paidBy._id?.toString() === currentUserId || selectedBill.paidBy._id === currentUserId;
              const isOwner  = selectedTeam?.owner._id?.toString() === currentUserId;
              return (
                <>
                  <div className="modal-header">
                    <div className="modal-icon">{getCategoryEmoji(selectedBill.category)}</div>
                    <h2>{selectedBill.title}</h2>
                    <p>{selectedBill.category} · {new Date(selectedBill.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                  </div>

                  <div className="bill-detail-amount">
                    <div className="bda-total">{formatAmt(selectedBill.amount, selectedBill.currency)}</div>
                    <div className="bda-split">÷ {selectedBill.members.length} members = <strong>{formatAmt(selectedBill.splitAmount, selectedBill.currency)}</strong> each</div>
                  </div>

                  <div className="wandr-field">
                    <span className="wandr-field-label">Paid by</span>
                    <div className="bill-paidby-row">
                      <div className="member-avatar">{selectedBill.paidBy.name.slice(0,2).toUpperCase()}</div>
                      <span>{iPaid ? "You" : selectedBill.paidBy.name}</span>
                    </div>
                  </div>

                  {selectedBill.note && (
                    <div className="wandr-field">
                      <span className="wandr-field-label">Note</span>
                      <div className="bill-note">{selectedBill.note}</div>
                    </div>
                  )}

                  <div className="wandr-field">
                    <span className="wandr-field-label">Settlement Status</span>
                    <div className="members-list">
                      {selectedBill.members.map(m => {
                        const settled = selectedBill.settledBy.some(s => s._id?.toString() === m._id?.toString());
                        const isMe    = m._id?.toString() === currentUserId;
                        return (
                          <div className="member-row" key={m._id}>
                            <UserAvatar user={m} size={36} />
                            <div className="member-info">
                              <div className="member-name">{isMe ? "You" : m.name}</div>
                              <div className="member-email">{formatAmt(selectedBill.splitAmount, selectedBill.currency)}</div>
                            </div>
                            {settled
                              ? <span className="bill-settled-badge">✓ Settled</span>
                              : <span className="bill-pending-badge">Pending</span>
                            }
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="modal-danger-row">
                    {(iPaid || isOwner) && (
                      <button className="danger-btn" onClick={() => deleteBill(selectedBill._id)}>
                        🗑 Delete Bill
                      </button>
                    )}
                    <button className="wandr-btn wandr-btn-ghost" onClick={() => setModal(null)}>Close</button>
                  </div>
                </>
              );
            })()}

          </div>
        </div>
      )}
    </div>
  );
}

export default Bills;
