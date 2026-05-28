// Reusable avatar component — shows photo if available, else initials
function UserAvatar({ user, size = 36, radius = "50%", fontSize = 12 }) {
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const style = {
    width: size, height: size,
    borderRadius: radius,
    flexShrink: 0,
    overflow: "hidden",
    background: "linear-gradient(135deg, #c4622d, #d4a853)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Playfair Display', serif",
    fontSize, fontWeight: 700, color: "white",
  };

  if (user?.avatar) {
    return (
      <div style={style}>
        <img src={user.avatar} alt={user.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );
  }

  return <div style={style}>{initials}</div>;
}

export default UserAvatar;
