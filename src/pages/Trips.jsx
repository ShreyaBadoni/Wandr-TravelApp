import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import UserAvatar from "../components/UserAvatar";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";
import "../styles/trips.css";

const CATEGORY_EMOJI = { Food:"🍽️", Transport:"🚗", Stay:"🏨", Activities:"🎯", Shopping:"🛍️", General:"📋", Other:"💡" };

function Trips({ toggleTheme }) {
  const [trips, setTrips]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripDetail, setTripDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const token = localStorage.getItem("token");

  const currentUserId = (() => {
    try { return JSON.parse(atob(token.split(".")[1])).id; } catch { return null; }
  })();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get("https://wandr-travelapp.onrender.com/trips", { headers: { Authorization: token } });
        setTrips(res.data.trips);
      } catch { toast.error("Failed to load trips"); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const openTrip = async (trip) => {
    setSelectedTrip(trip);
    setDetailLoading(true);
    setTripDetail(null);
    try {
      const res = await axios.get(`https://wandr-travelapp.onrender.com/trips/${trip.tripId}`, { headers: { Authorization: token } });
      setTripDetail(res.data);
    } catch { toast.error("Failed to load trip details"); }
    finally { setDetailLoading(false); }
  };

  const fmt = (n, cur = "INR") => {
    const sym = { INR:"₹", USD:"$", EUR:"€", GBP:"£", JPY:"¥", AED:"د.إ" };
    return `${sym[cur]||cur}${parseFloat(n||0).toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  };

  const duration = (start, end) => {
    const s = new Date(start), e = end ? new Date(end) : new Date();
    const days = Math.max(1, Math.round((e - s) / (1000*60*60*24)));
    return `${days} day${days !== 1 ? "s" : ""}`;
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "Ongoing";

  // Back to list
  if (selectedTrip) {
    return (
      <div className="wandr-page">
        <div className="wandr-page-bg">
          <div className="wandr-bg-orb wandr-bg-orb-1" />
          <div className="wandr-bg-orb wandr-bg-orb-2" />
        </div>
        <Navbar toggleTheme={toggleTheme} />
        <div className="wandr-page-content">

          {/* Back button */}
          <button className="trips-back-btn" onClick={() => { setSelectedTrip(null); setTripDetail(null); }}>
            ← All Trips
          </button>

          {detailLoading ? (
            <div className="wandr-loading"><div className="wandr-spinner" /><span>Loading trip...</span></div>
          ) : tripDetail ? (
            <>
              {/* Trip hero */}
              <div className="trip-detail-hero">
                <div className="trip-detail-top">
                  {selectedTrip.active && <span className="team-live-badge" style={{ marginBottom: 8, display:"inline-block" }}>● LIVE</span>}
                  <div className="trip-detail-team">{tripDetail.trip.teamName}</div>
                  <h1 className="trip-detail-dest">✈️ {tripDetail.trip.destination}</h1>
                  <div className="trip-detail-dates">
                    {fmtDate(tripDetail.trip.startedAt)} — {fmtDate(tripDetail.trip.endedAt)}
                    <span className="trip-duration-pill">{duration(tripDetail.trip.startedAt, tripDetail.trip.endedAt)}</span>
                  </div>
                </div>

                {/* Summary stats */}
                <div className="trip-detail-stats">
                  {[
                    { icon:"💸", value: fmt(tripDetail.totalSpent), label:"Total Spent" },
                    { icon:"🧾", value: tripDetail.bills.length,    label:"Bills"       },
                    { icon:"👥", value: tripDetail.trip.members?.length || 0, label:"Members" },
                    { icon:"⏱️", value: duration(tripDetail.trip.startedAt, tripDetail.trip.endedAt), label:"Duration" },
                  ].map((s,i) => (
                    <div className="trip-stat" key={i}>
                      <div className="ts-icon">{s.icon}</div>
                      <div className="ts-value">{s.value}</div>
                      <div className="ts-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="trip-detail-grid">
                {/* Members */}
                <div className="wandr-card">
                  <div className="wandr-card-title">👥 Team Members</div>
                  <div className="members-list" style={{ marginTop: 16 }}>
                    {tripDetail.trip.members?.map(m => (
                      <div className="member-row" key={m._id}>
                        <UserAvatar user={m} size={36} />
                        <div className="member-info">
                          <div className="member-name">{m._id === currentUserId ? `${m.name} (You)` : m.name}</div>
                          <div className="member-email">{m.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bills */}
                <div className="wandr-card">
                  <div className="wandr-card-title">🧾 Trip Bills</div>
                  {tripDetail.bills.length === 0 ? (
                    <div className="bills-empty" style={{ padding:"30px 0" }}>
                      <div>💸</div><p>No bills for this trip.</p>
                    </div>
                  ) : (
                    <div className="trip-bills-list">
                      {tripDetail.bills.map(bill => {
                        const iPaid    = bill.paidBy._id?.toString() === currentUserId;
                        const iSettled = bill.settledBy.some(s => s._id?.toString() === currentUserId);
                        const settled  = bill.settledBy.length;
                        const total    = bill.members.length;
                        return (
                          <div className="trip-bill-row" key={bill._id}>
                            <div className="trip-bill-left">
                              <span className="trip-bill-emoji">{CATEGORY_EMOJI[bill.category]||"📋"}</span>
                              <div>
                                <div className="trip-bill-title">{bill.title}</div>
                                <div className="trip-bill-meta">
                                  Paid by <strong>{iPaid ? "You" : bill.paidBy.name}</strong>
                                  · {new Date(bill.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                                </div>
                                <div className="bill-progress-wrap" style={{ marginTop:4 }}>
                                  <div className="bill-progress-bar">
                                    <div className="bill-progress-fill" style={{ width:`${(settled/total)*100}%` }} />
                                  </div>
                                  <span className="bill-progress-label">{settled}/{total} settled</span>
                                </div>
                              </div>
                            </div>
                            <div className="trip-bill-right">
                              <div className="bill-amount">{fmt(bill.amount, bill.currency)}</div>
                              <div className="bill-split">÷{total} = {fmt(bill.splitAmount, bill.currency)}</div>
                              {!iPaid && (iSettled
                                ? <span className="bill-settled-badge">✓ Settled</span>
                                : <span className="bill-pending-badge">Pending</span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Category breakdown */}
                      <div className="trip-category-breakdown">
                        <div className="wandr-field-label" style={{ marginBottom:12 }}>Spending by Category</div>
                        {Object.entries(
                          tripDetail.bills.reduce((acc, b) => {
                            acc[b.category] = (acc[b.category]||0) + b.amount;
                            return acc;
                          }, {})
                        ).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => (
                          <div className="cat-breakdown-row" key={cat}>
                            <span>{CATEGORY_EMOJI[cat]||"📋"} {cat}</span>
                            <span className="cat-breakdown-amt">{fmt(amt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // Trips list view
  return (
    <div className="wandr-page">
      <div className="wandr-page-bg">
        <div className="wandr-bg-orb wandr-bg-orb-1" />
        <div className="wandr-bg-orb wandr-bg-orb-2" />
      </div>
      <Navbar toggleTheme={toggleTheme} />
      <div className="wandr-page-content">
        <div className="wandr-page-header">
          <span className="wandr-page-tag">◈ History</span>
          <h1 className="wandr-page-title">Your <em>Trips</em></h1>
          <p className="wandr-page-sub">All your past and active adventures</p>
        </div>

        {loading ? (
          <div className="wandr-loading"><div className="wandr-spinner" /><span>Loading trips...</span></div>
        ) : trips.length === 0 ? (
          <div className="teams-empty">
            <div className="teams-empty-icon">🗺️</div>
            <h3>No trips yet</h3>
            <p>Start a vacation from the Teams page and your trips will appear here.</p>
          </div>
        ) : (
          <div className="trips-grid">
            {trips.map((trip, i) => (
              <div className="trip-card" key={trip.tripId} style={{ "--i": i }} onClick={() => openTrip(trip)}>
                {trip.active && <div className="trip-card-live-bar">● LIVE NOW</div>}
                <div className="trip-card-dest">✈️ {trip.destination}</div>
                <div className="trip-card-team">{trip.teamName}</div>
                <div className="trip-card-dates">
                  {fmtDate(trip.startedAt)} — {fmtDate(trip.endedAt)}
                </div>
                <div className="trip-card-footer">
                  <span className="trip-duration-pill">{duration(trip.startedAt, trip.endedAt)}</span>
                  <span className="team-member-count">👥 {trip.memberCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Trips;
