import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import UserAvatar from "../components/UserAvatar";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";
import "../styles/hotels.css";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AED"];
const STATUS_CONFIG = {
  planned:   { label: "Planned",   color: "#d4a853", bg: "rgba(212,168,83,0.12)",   border: "rgba(212,168,83,0.3)"   },
  confirmed: { label: "Confirmed", color: "#7a9e7e", bg: "rgba(122,158,126,0.12)", border: "rgba(122,158,126,0.3)" },
  cancelled: { label: "Cancelled", color: "#e05c5c", bg: "rgba(224,92,92,0.12)",   border: "rgba(224,92,92,0.3)"   },
};

function Hotels({ toggleTheme }) {
  const [teams, setTeams]               = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [hotels, setHotels]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [modal, setModal]               = useState(null); // "add" | "detail"
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [submitting, setSubmitting]     = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "", address: "", checkIn: "", checkOut: "",
    pricePerNight: "", currency: "INR", rooms: 1, notes: ""
  });
  const [bookedMembers, setBookedMembers] = useState([]);

  const token = localStorage.getItem("token");
  const currentUserId = (() => {
    try { return JSON.parse(atob(token.split(".")[1])).id; } catch { return null; }
  })();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get("https://wandr-travelapp.onrender.com/teams", { headers: { Authorization: token } });
        const activeTeams = res.data.teams.filter(t => t.vacation?.active);
        setTeams(activeTeams);
        if (activeTeams.length > 0) setSelectedTeam(activeTeams[0]);
      } catch { toast.error("Failed to load teams"); }
      finally { setLoading(false); }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) fetchHotels(selectedTeam._id);
  }, [selectedTeam]);

  const fetchHotels = async (teamId) => {
    setHotelsLoading(true);
    try {
      const res = await axios.get(`https://wandr-travelapp.onrender.com/teams/${teamId}/hotels`, { headers: { Authorization: token } });
      setHotels(res.data.hotels);
    } catch { toast.error("Failed to load hotels"); }
    finally { setHotelsLoading(false); }
  };

  const openAddModal = () => {
    setForm({ name: "", address: "", checkIn: "", checkOut: "", pricePerNight: "", currency: "INR", rooms: 1, notes: "" });
    setBookedMembers(selectedTeam.members.map(m => m.user._id));
    setModal("add");
  };

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleMember = (uid) => setBookedMembers(prev =>
    prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
  );

  const nights = () => {
    if (!form.checkIn || !form.checkOut) return 0;
    return Math.max(0, Math.round((new Date(form.checkOut) - new Date(form.checkIn)) / (1000*60*60*24)));
  };

  const totalPrice = () => {
    const n = nights();
    return n > 0 && form.pricePerNight ? parseFloat((form.pricePerNight * form.rooms * n).toFixed(2)) : 0;
  };

  const addHotel = async () => {
    if (!form.name.trim())       { toast.error("Enter hotel name"); return; }
    if (!form.checkIn)           { toast.error("Select check-in date"); return; }
    if (!form.checkOut)          { toast.error("Select check-out date"); return; }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) { toast.error("Check-out must be after check-in"); return; }
    if (!form.pricePerNight || +form.pricePerNight <= 0) { toast.error("Enter a valid price per night"); return; }
    if (bookedMembers.length === 0) { toast.error("Select at least one member"); return; }

    try {
      setSubmitting(true);
      await axios.post(`https://wandr-travelapp.onrender.com/teams/${selectedTeam._id}/hotels`,
        { ...form, pricePerNight: +form.pricePerNight, rooms: +form.rooms, bookedMembers },
        { headers: { Authorization: token } }
      );
      toast.success("Hotel booking added!");
      setModal(null);
      fetchHotels(selectedTeam._id);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to add hotel"); }
    finally { setSubmitting(false); }
  };

  const updateStatus = async (hotelId, status) => {
    try {
      await axios.patch(`https://wandr-travelapp.onrender.com/hotels/${hotelId}/status`, { status }, { headers: { Authorization: token } });
      toast.success(`Marked as ${status}`);
      fetchHotels(selectedTeam._id);
      if (selectedHotel?._id === hotelId) setSelectedHotel(h => ({ ...h, status }));
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const deleteHotel = async (hotelId) => {
    if (!window.confirm("Delete this hotel booking?")) return;
    try {
      await axios.delete(`https://wandr-travelapp.onrender.com/hotels/${hotelId}`, { headers: { Authorization: token } });
      toast.success("Booking deleted");
      setModal(null);
      fetchHotels(selectedTeam._id);
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const fmt = (n, cur = "INR") => {
    const sym = { INR:"₹", USD:"$", EUR:"€", GBP:"£", JPY:"¥", AED:"د.إ" };
    return `${sym[cur]||cur}${parseFloat(n||0).toLocaleString("en-IN", { minimumFractionDigits:0, maximumFractionDigits:0 })}`;
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";

  return (
    <div className="wandr-page">
      <div className="wandr-page-bg">
        <div className="wandr-bg-orb wandr-bg-orb-1" />
        <div className="wandr-bg-orb wandr-bg-orb-2" />
      </div>
      <Navbar toggleTheme={toggleTheme} />

      <div className="wandr-page-content">
        <div className="wandr-page-header hotels-header">
          <div>
            <span className="wandr-page-tag">◈ Accommodation</span>
            <h1 className="wandr-page-title">Hotel <em>Bookings</em></h1>
            <p className="wandr-page-sub">Manage your team's stay</p>
          </div>
          {selectedTeam && (
            <button className="wandr-btn wandr-btn-primary" onClick={openAddModal}>+ Add Hotel</button>
          )}
        </div>

        {loading ? (
          <div className="wandr-loading"><div className="wandr-spinner" /><span>Loading...</span></div>
        ) : teams.length === 0 ? (
          <div className="teams-empty">
            <div className="teams-empty-icon">🏨</div>
            <h3>No active vacations</h3>
            <p>Start a vacation from the Teams page to add hotel bookings.</p>
            <button className="wandr-btn wandr-btn-primary" onClick={() => navigate("/teams")}>Go to Teams</button>
          </div>
        ) : (
          <>
            {/* Team tabs */}
            <div className="bills-team-selector">
              {teams.map(t => (
                <button key={t._id}
                  className={`bills-team-tab ${selectedTeam?._id === t._id ? "active" : ""}`}
                  onClick={() => setSelectedTeam(t)}>
                  <span className="bills-live-dot">●</span>
                  {t.name} — {t.vacation.destination}
                </button>
              ))}
            </div>

            {/* Summary */}
            {selectedTeam && (
              <div className="hotel-summary">
                {[
                  { icon:"🏨", value: hotels.length,                                                   label:"Hotels"    },
                  { icon:"✅", value: hotels.filter(h=>h.status==="confirmed").length,                  label:"Confirmed" },
                  { icon:"💸", value: fmt(hotels.reduce((s,h)=>s+h.totalPrice,0), hotels[0]?.currency), label:"Total Cost" },
                  { icon:"🌙", value: hotels.reduce((s,h)=>s+Math.round((new Date(h.checkOut)-new Date(h.checkIn))/(1000*60*60*24)),0), label:"Nights" },
                ].map((s,i) => (
                  <div className="bills-summary-card" key={i} style={{ animationDelay:`${i*0.08}s` }}>
                    <div className="bsc-label">{s.icon} {s.label}</div>
                    <div className="bsc-value">{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Hotels list */}
            {hotelsLoading ? (
              <div className="wandr-loading"><div className="wandr-spinner" /></div>
            ) : hotels.length === 0 ? (
              <div className="bills-empty">
                <div>🏨</div>
                <p>No hotel bookings yet. Add your first one!</p>
              </div>
            ) : (
              <div className="hotels-list">
                {hotels.map((hotel, i) => {
                  const cfg   = STATUS_CONFIG[hotel.status];
                  const n     = Math.round((new Date(hotel.checkOut) - new Date(hotel.checkIn)) / (1000*60*60*24));
                  const isMe  = hotel.addedBy._id?.toString() === currentUserId || hotel.addedBy._id === currentUserId;
                  return (
                    <div className="hotel-card" key={hotel._id} style={{ "--i": i }}
                      onClick={() => { setSelectedHotel(hotel); setModal("detail"); }}>
                      <div className="hotel-card-left">
                        <div className="hotel-icon">🏨</div>
                        <div className="hotel-info">
                          <div className="hotel-name">{hotel.name}</div>
                          {hotel.address && <div className="hotel-address">📍 {hotel.address}</div>}
                          <div className="hotel-dates">
                            {fmtDate(hotel.checkIn)} → {fmtDate(hotel.checkOut)}
                            <span className="hotel-nights-pill">{n} night{n!==1?"s":""}</span>
                          </div>
                          <div className="hotel-members-row">
                            {hotel.bookedMembers.slice(0,5).map(m => (
                              <div key={m._id} title={m.name} style={{ marginRight:-6 }}>
                                <UserAvatar user={m} size={24} fontSize={8} />
                              </div>
                            ))}
                            {hotel.bookedMembers.length > 5 && (
                              <span style={{ fontSize:11, color:"rgba(245,240,232,0.4)", marginLeft:10 }}>
                                +{hotel.bookedMembers.length-5}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="hotel-card-right">
                        <div className="hotel-total">{fmt(hotel.totalPrice, hotel.currency)}</div>
                        <div className="hotel-per-night">{fmt(hotel.pricePerNight, hotel.currency)}/night · {hotel.rooms} room{hotel.rooms!==1?"s":""}</div>
                        <span className="hotel-status-badge" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <div className="teams-modal-backdrop" onClick={() => setModal(null)}>
          <div className="teams-modal hotels-modal" onClick={e => e.stopPropagation()}>

            {/* ADD HOTEL */}
            {modal === "add" && (
              <>
                <div className="modal-header">
                  <div className="modal-icon">🏨</div>
                  <h2>Add Hotel Booking</h2>
                  <p>{selectedTeam?.vacation?.destination}</p>
                </div>

                <div className="wandr-field">
                  <label className="wandr-field-label">Hotel Name *</label>
                  <input className="wandr-input" placeholder="e.g. The Grand Hyatt"
                    value={form.name} onChange={e => setField("name", e.target.value)} autoFocus />
                </div>

                <div className="wandr-field">
                  <label className="wandr-field-label">Address</label>
                  <input className="wandr-input" placeholder="Street, Area, City"
                    value={form.address} onChange={e => setField("address", e.target.value)} />
                </div>

                <div className="hotel-date-row">
                  <div className="wandr-field flex-1">
                    <label className="wandr-field-label">Check-in *</label>
                    <input className="wandr-input" type="date"
                      value={form.checkIn} onChange={e => setField("checkIn", e.target.value)} />
                  </div>
                  <div className="wandr-field flex-1">
                    <label className="wandr-field-label">Check-out *</label>
                    <input className="wandr-input" type="date"
                      value={form.checkOut} onChange={e => setField("checkOut", e.target.value)} />
                  </div>
                </div>

                <div className="hotel-price-row">
                  <div className="wandr-field flex-1">
                    <label className="wandr-field-label">Price / Night *</label>
                    <input className="wandr-input" type="number" placeholder="0"
                      value={form.pricePerNight} onChange={e => setField("pricePerNight", e.target.value)} />
                  </div>
                  <div className="wandr-field">
                    <label className="wandr-field-label">Currency</label>
                    <select className="wandr-input wandr-select" value={form.currency}
                      onChange={e => setField("currency", e.target.value)}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="wandr-field" style={{ width: 80 }}>
                    <label className="wandr-field-label">Rooms</label>
                    <input className="wandr-input" type="number" min="1" value={form.rooms}
                      onChange={e => setField("rooms", e.target.value)} />
                  </div>
                </div>

                {/* Live price preview */}
                {nights() > 0 && form.pricePerNight > 0 && (
                  <div className="hotel-price-preview">
                    <span>{nights()} nights × {form.rooms} room{form.rooms>1?"s":""} × {fmt(form.pricePerNight, form.currency)}</span>
                    <strong>= {fmt(totalPrice(), form.currency)}</strong>
                  </div>
                )}

                <div className="wandr-field">
                  <label className="wandr-field-label">Who's staying</label>
                  <div className="split-members">
                    {selectedTeam?.members.map(m => {
                      const uid     = m.user._id;
                      const checked = bookedMembers.includes(uid);
                      return (
                        <div key={uid} className={`split-member-chip ${checked?"checked":""}`}
                          onClick={() => toggleMember(uid)}>
                          <UserAvatar user={m.user} size={26} fontSize={9} />
                          <span>{uid === currentUserId ? "You" : m.user.name}</span>
                          {checked && <span className="smc-check">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="wandr-field">
                  <label className="wandr-field-label">Notes</label>
                  <input className="wandr-input" placeholder="Booking ref, special requests..."
                    value={form.notes} onChange={e => setField("notes", e.target.value)} />
                </div>

                <div className="wandr-btn-row">
                  <button className="wandr-btn wandr-btn-primary" onClick={addHotel} disabled={submitting}>
                    {submitting ? "Adding..." : "Add Booking →"}
                  </button>
                  <button className="wandr-btn wandr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                </div>
              </>
            )}

            {/* HOTEL DETAIL */}
            {modal === "detail" && selectedHotel && (() => {
              const cfg    = STATUS_CONFIG[selectedHotel.status];
              const n      = Math.round((new Date(selectedHotel.checkOut) - new Date(selectedHotel.checkIn)) / (1000*60*60*24));
              const isAdder = selectedHotel.addedBy._id?.toString() === currentUserId;
              const isOwner = selectedTeam?.owner._id?.toString() === currentUserId;
              return (
                <>
                  <div className="modal-header">
                    <div className="modal-icon">🏨</div>
                    <h2>{selectedHotel.name}</h2>
                    {selectedHotel.address && <p>📍 {selectedHotel.address}</p>}
                  </div>

                  <div className="hotel-detail-summary">
                    <div className="hds-block">
                      <div className="hds-label">Check-in</div>
                      <div className="hds-value">{fmtDate(selectedHotel.checkIn)}</div>
                    </div>
                    <div className="hds-divider">→</div>
                    <div className="hds-block">
                      <div className="hds-label">Check-out</div>
                      <div className="hds-value">{fmtDate(selectedHotel.checkOut)}</div>
                    </div>
                    <div className="hds-block hds-nights">
                      <div className="hds-label">Duration</div>
                      <div className="hds-value">{n} night{n!==1?"s":""}</div>
                    </div>
                  </div>

                  <div className="hotel-detail-price">
                    <div>
                      <div className="hds-label">Total Cost</div>
                      <div className="hotel-detail-total">{fmt(selectedHotel.totalPrice, selectedHotel.currency)}</div>
                      <div style={{ fontSize:12, color:"rgba(245,240,232,0.4)", marginTop:2 }}>
                        {fmt(selectedHotel.pricePerNight, selectedHotel.currency)}/night · {selectedHotel.rooms} room{selectedHotel.rooms!==1?"s":""}
                      </div>
                    </div>
                    <span className="hotel-status-badge large"
                      style={{ color: cfg.color, background: cfg.bg, border:`1px solid ${cfg.border}` }}>
                      {cfg.label}
                    </span>
                  </div>

                  {selectedHotel.notes && (
                    <div className="wandr-field">
                      <span className="wandr-field-label">Notes</span>
                      <div className="bill-note">{selectedHotel.notes}</div>
                    </div>
                  )}

                  <div className="wandr-field">
                    <span className="wandr-field-label">Staying ({selectedHotel.bookedMembers.length})</span>
                    <div className="members-list" style={{ marginTop:8 }}>
                      {selectedHotel.bookedMembers.map(m => (
                        <div className="member-row" key={m._id}>
                          <UserAvatar user={m} size={36} />
                          <div className="member-info">
                            <div className="member-name">{m._id?.toString() === currentUserId ? `${m.name} (You)` : m.name}</div>
                            <div className="member-email">{m.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status controls */}
                  <div className="wandr-field">
                    <span className="wandr-field-label">Update Status</span>
                    <div className="hotel-status-row">
                      {Object.entries(STATUS_CONFIG).map(([key, c]) => (
                        <button key={key}
                          className={`hotel-status-btn ${selectedHotel.status === key ? "active" : ""}`}
                          style={selectedHotel.status === key ? { color: c.color, background: c.bg, borderColor: c.border } : {}}
                          onClick={() => updateStatus(selectedHotel._id, key)}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="modal-danger-row">
                    {(isAdder || isOwner) && (
                      <button className="danger-btn" onClick={() => deleteHotel(selectedHotel._id)}>
                        🗑 Delete Booking
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

export default Hotels;
