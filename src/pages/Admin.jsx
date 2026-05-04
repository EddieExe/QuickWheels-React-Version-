import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";


function Admin() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("bookings");
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCar, setFilterCar] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Stats view state
  const [statsView, setStatsView] = useState("overview");

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth > 768 && window.innerWidth <= 1024);
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all bookings
        const bookingsSnap = await getDocs(
          query(collection(db, "bookings"), orderBy("createdAt", "desc")),
        );
        const bookingsData = bookingsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBookings(bookingsData);

        // Fetch all users
        const usersSnap = await getDocs(collection(db, "users"));
        const usersData = usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // View bookings for specific user
  const viewUserBookings = async (user) => {
    setSelectedUser(user);
    const userBookingQuery = query(
      collection(db, "bookings"),
      where("userId", "==", user.id),
    );
    const snapshot = await getDocs(userBookingQuery);
    const bookingsData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setUserBookings(bookingsData);
    setActiveTab("userBookings");
  };

  // Enhanced filtering
  const filteredBookings = bookings.filter((b) => {
    const matchSearch =
      searchTerm === "" ||
      b.carModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.bookingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pickup?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.dropoff?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCar =
      filterCar === "" ||
      b.carModel?.toLowerCase().includes(filterCar.toLowerCase());

    const matchDate = filterDate === "" || b.date === filterDate;

    const matchUser =
      filterUser === "" ||
      b.userEmail?.toLowerCase().includes(filterUser.toLowerCase()) ||
      b.userId?.toLowerCase().includes(filterUser.toLowerCase());

    return matchSearch && matchCar && matchDate && matchUser;
  });

  // Sort bookings
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (sortBy === "newest")
      return new Date(b.createdAt?.toDate()) - new Date(a.createdAt?.toDate());
    if (sortBy === "oldest")
      return new Date(a.createdAt?.toDate()) - new Date(b.createdAt?.toDate());
    if (sortBy === "priceHigh") return (b.total || 0) - (a.total || 0);
    if (sortBy === "priceLow") return (a.total || 0) - (b.total || 0);
    if (sortBy === "daysHigh") return (b.days || 0) - (a.days || 0);
    return 0;
  });

  // Stats calculations
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total || 0), 0);
  const monthlyRevenue = bookings
    .filter((b) => {
      const date = b.createdAt?.toDate();
      const now = new Date();
      return (
        date &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, b) => sum + (b.total || 0), 0);

  const popularCars = Object.entries(
    bookings.reduce((acc, b) => {
      acc[b.carModel] = (acc[b.carModel] || 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const popularLocations = Object.entries(
    bookings.reduce((acc, b) => {
      acc[b.pickup] = (acc[b.pickup] || 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const averageBookingValue =
    bookings.length > 0 ? totalRevenue / bookings.length : 0;
  const averageDuration =
    bookings.length > 0
      ? bookings.reduce((sum, b) => sum + (b.days || 0), 0) / bookings.length
      : 0;

  const uniqueDates = [...new Set(bookings.map((b) => b.date))].sort();

  const tabs = [
    { id: "bookings", label: "All Bookings", icon: "📋" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "stats", label: "Analytics", icon: "📊" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        padding: "30px",
        color: "#fff",
        fontFamily: "Quicksand, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1 className="gradient_heading">QuickWheels Admin</h1>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              margin: "4px 0 0",
              fontSize: "0.9rem",
            }}
          >
            Dashboard — Complete control & analytics
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
              padding: "8px 20px",
              cursor: "pointer",
              fontFamily: "Quicksand, sans-serif",
              fontWeight: "600",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) =>
              (e.target.style.background = "rgba(255,255,255,0.1)")
            }
            onMouseLeave={(e) =>
              (e.target.style.background = "rgba(255,255,255,0.05)")
            }
          >
            Back to Site
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            style={{
              background: "rgba(255,77,77,0.1)",
              border: "1px solid rgba(255,77,77,0.3)",
              borderRadius: "8px",
              color: "#ff4d4d",
              padding: "8px 20px",
              cursor: "pointer",
              fontFamily: "Quicksand, sans-serif",
              fontWeight: "600",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255,77,77,0.2)";
              e.target.style.borderColor = "rgba(255,77,77,0.5)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255,77,77,0.1)";
              e.target.style.borderColor = "rgba(255,77,77,0.3)";
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards - Responsive Grid */}
      <div
        style={{
          display: "grid",
          gap: "16px",
          marginBottom: "50px",
          gridTemplateColumns: isMobile
            ? "1fr"
            : isTablet
              ? "repeat(2, 1fr)"
              : "repeat(3, 1fr)",
          justifyItems: "center",
          alignItems: "stretch",
          maxWidth: "1100px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {[
          {
            label: "Total Revenue",
            value: `$${totalRevenue.toLocaleString()}`,
            change: "+12%",
            color: "#22c55e",
            icon: "💰",
            subtext: "All time",
          },
          {
            label: "Monthly Revenue",
            value: `$${monthlyRevenue.toLocaleString()}`,
            change: "+8%",
            color: "#4ce3f7",
            icon: "📈",
            subtext: "This month",
          },
          {
            label: "Total Bookings",
            value: bookings.length,
            change: "+23",
            color: "#a855f7",
            icon: "📅",
            subtext: "All bookings",
          },
          {
            label: "Active Users",
            value: users.length,
            change: "+5",
            color: "#f59e0b",
            icon: "👥",
            subtext: "Registered users",
          },
          {
            label: "Avg. Booking Value",
            value: `$${averageBookingValue.toFixed(0)}`,
            change: "+15%",
            color: "#06b6d4",
            icon: "💵",
            subtext: "Per booking",
          },
          {
            label: "Avg. Rental Days",
            value: `${averageDuration.toFixed(1)} days`,
            change: "+2",
            color: "#ec4899",
            icon: "⏱️",
            subtext: "Average duration",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "20px",
              transition: "all 0.3s ease",
              cursor: "pointer",
              width: "100%",
              maxWidth: isMobile ? "100%" : "350px",
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <span style={{ fontSize: "2rem" }}>{stat.icon}</span>
              <span
                style={{
                  color: stat.change.startsWith("+") ? "#22c55e" : "#ff4d4d",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  background: "rgba(0,0,0,0.3)",
                  padding: "2px 8px",
                  borderRadius: "20px",
                }}
              >
                {stat.change}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.85rem",
              }}
            >
              {stat.label}
            </p>
            <p
              style={{
                margin: "8px 0 4px",
                fontSize: "clamp(1.2rem, 5vw, 1.8rem)",
                fontWeight: "800",
                color: stat.color,
              }}
            >
              {stat.value}
            </p>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.3)",
                fontSize: "0.7rem",
              }}
            >
              {stat.subtext}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          justifyContent: "center",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedUser(null);
            }}
            className={`glass_nav_btn ${activeTab === tab.id ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings Tab with Enhanced Filters */}
      {activeTab === "bookings" && (
        <div>
          {/* Filter Bar */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "16px",
              }}
            >
              <input
                placeholder="🔍 Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 2,
                  minWidth: "200px",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontFamily: "Quicksand, sans-serif",
                  fontSize: "0.9rem",
                }}
              />
              <input
                placeholder="🚗 Car model"
                value={filterCar}
                onChange={(e) => setFilterCar(e.target.value)}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontFamily: "Quicksand, sans-serif",
                }}
              />
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontFamily: "Quicksand, sans-serif",
                  cursor: "pointer",
                }}
              >
                <option value="">📅 All dates</option>
                {uniqueDates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontFamily: "Quicksand, sans-serif",
                  cursor: "pointer",
                }}
              >
                <option value="newest">🕒 Newest first</option>
                <option value="oldest">🕒 Oldest first</option>
                <option value="priceHigh">💰 Price: High to Low</option>
                <option value="priceLow">💰 Price: Low to High</option>
                <option value="daysHigh">📆 Most days first</option>
              </select>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || filterCar || filterDate) && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {searchTerm && (
                  <span
                    style={{
                      background: "rgba(76,227,247,0.2)",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                    }}
                  >
                    🔍 {searchTerm} ✖
                  </span>
                )}
                {filterCar && (
                  <span
                    style={{
                      background: "rgba(76,227,247,0.2)",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                    }}
                  >
                    🚗 {filterCar} ✖
                  </span>
                )}
                {filterDate && (
                  <span
                    style={{
                      background: "rgba(76,227,247,0.2)",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                    }}
                  >
                    📅 {filterDate} ✖
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterCar("");
                    setFilterDate("");
                    setSortBy("newest");
                  }}
                  style={{
                    background: "rgba(255,77,77,0.2)",
                    border: "none",
                    borderRadius: "20px",
                    padding: "4px 12px",
                    color: "#ff4d4d",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  Clear all ✖
                </button>
              </div>
            )}
          </div>

          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "0.85rem",
              marginBottom: "12px",
            }}
          >
            📊 Showing {sortedBookings.length} of {bookings.length} bookings
          </p>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              ⏳ Loading bookings...
            </div>
          ) : sortedBookings.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              📭 No bookings found
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {sortedBookings.map((booking) => (
                <div
                  key={booking.id}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "20px",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          color: "#4ce3f7",
                          fontWeight: "800",
                          fontSize: "1.1rem",
                        }}
                      >
                        {booking.carModel}
                      </span>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          fontSize: "0.75rem",
                          marginLeft: "12px",
                        }}
                      >
                        #{booking.bookingId}
                      </span>
                    </div>
                    <span
                      style={{
                        color: "#22c55e",
                        fontWeight: "800",
                        fontSize: "1.2rem",
                      }}
                    >
                      ${booking.total.toLocaleString()}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "10px",
                      fontSize: "0.85rem",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    <span>
                      📍 {booking.pickup} → {booking.dropoff}
                    </span>
                    <span>
                      📅 {booking.date} • {booking.days} days
                    </span>
                    <span>👤 {booking.userEmail || booking.userId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Tab with Bookings Link */}
      {activeTab === "users" && (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              ⏳ Loading users...
            </div>
          ) : users.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              👥 No users found
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {users.map((u) => {
                const userBookingCount = bookings.filter(
                  (b) => b.userId === u.id || b.userEmail === u.email,
                ).length;
                return (
                  <div
                    key={u.id}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "16px",
                      padding: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "16px",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: "700",
                          color: "#fff",
                          fontSize: "1rem",
                        }}
                      >
                        {u.email}
                      </p>
                      <div
                        style={{
                          marginTop: "8px",
                          display: "flex",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            background: u.isAdmin
                              ? "rgba(255,165,0,0.15)"
                              : "rgba(76,227,247,0.1)",
                            color: u.isAdmin ? "#ffa500" : "#4ce3f7",
                          }}
                        >
                          {u.isAdmin ? "👑 Admin" : "👤 User"}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "rgba(255,255,255,0.4)",
                          }}
                        >
                          📚 {userBookingCount} bookings
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        viewUserBookings({
                          id: u.id,
                          email: u.email,
                          isAdmin: u.isAdmin,
                        })
                      }
                      style={{
                        padding: "10px 20px",
                        borderRadius: "10px",
                        border: "1px solid rgba(76,227,247,0.3)",
                        background: "rgba(76,227,247,0.1)",
                        color: "#4ce3f7",
                        cursor: "pointer",
                        fontFamily: "Quicksand, sans-serif",
                        fontWeight: "600",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "rgba(76,227,247,0.2)";
                        e.target.style.transform = "scale(1.02)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "rgba(76,227,247,0.1)";
                        e.target.style.transform = "scale(1)";
                      }}
                    >
                      📋 View Bookings →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* User Bookings View */}
      {activeTab === "userBookings" && selectedUser && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setActiveTab("users")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                cursor: "pointer",
                fontFamily: "Quicksand, sans-serif",
              }}
            >
              ← Back to Users
            </button>
            <h2 style={{ margin: 0, color: "#4ce3f7" }}>
              📋 Bookings: {selectedUser.email}
            </h2>
          </div>

          {userBookings.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              📭 No bookings from this user
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {userBookings.map((booking) => (
                <div
                  key={booking.id}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <span style={{ color: "#4ce3f7", fontWeight: "800" }}>
                      {booking.carModel}
                    </span>
                    <span style={{ color: "#22c55e", fontWeight: "800" }}>
                      ${booking.total}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "0.85rem",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    <span>
                      📍 {booking.pickup} → {booking.dropoff}
                    </span>
                    <span style={{ marginLeft: "16px" }}>
                      📅 {booking.date} • {booking.days} days
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Stats/Analytics Tab */}
      {activeTab === "stats" && (
        <div>
          {/* Stats Navigation */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              margin: "30px auto",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {[
              { id: "overview", label: "Overview", icon: "📊" },
              { id: "cars", label: "Car Analytics", icon: "🚗" },
              { id: "locations", label: "Location Analytics", icon: "📍" },
              { id: "trends", label: "Trends", icon: "📈" },
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setStatsView(view.id)}
                className={`glass_nav_btn ${statsView === view.id ? "active" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                }}
              >
                <span>{view.icon}</span>
                {view.label}
              </button>
            ))}
          </div>

          {/* Overview Stats */}
          {statsView === "overview" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "20px",
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <h3
                  style={{
                    color: "#4ce3f7",
                    marginTop: 0,
                    marginBottom: "20px",
                  }}
                >
                  💰 Revenue Insights
                </h3>
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ color: "rgba(255,255,255,0.5)", margin: 0 }}>
                    Total Revenue
                  </p>
                  <p
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: "800",
                      margin: "8px 0",
                      color: "#22c55e",
                    }}
                  >
                    ${totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.5)", margin: 0 }}>
                    Monthly Revenue
                  </p>
                  <p
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: "800",
                      margin: "8px 0",
                      color: "#4ce3f7",
                    }}
                  >
                    ${monthlyRevenue.toLocaleString()}
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <h3
                  style={{
                    color: "#a855f7",
                    marginTop: 0,
                    marginBottom: "20px",
                  }}
                >
                  📊 Key Metrics
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>
                      Average per booking:
                    </span>{" "}
                    <strong style={{ color: "#f59e0b" }}>
                      ${averageBookingValue.toFixed(0)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>
                      Average rental days:
                    </span>{" "}
                    <strong style={{ color: "#f59e0b" }}>
                      {averageDuration.toFixed(1)} days
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>
                      Total cars in fleet:
                    </span>{" "}
                    <strong style={{ color: "#f59e0b" }}>
                      {popularCars.length}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>
                      Booking conversion:
                    </span>{" "}
                    <strong style={{ color: "#f59e0b" }}>
                      {((bookings.length / (users.length || 1)) * 100).toFixed(
                        1,
                      )}
                      %
                    </strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <h3
                  style={{
                    color: "#ec4899",
                    marginTop: 0,
                    marginBottom: "20px",
                  }}
                >
                  🎯 Quick Stats
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div>
                    ✅ Active Users: <strong>{users.length}</strong>
                  </div>
                  <div>
                    ✅ Total Bookings: <strong>{bookings.length}</strong>
                  </div>
                  <div>
                    ✅ Unique Locations:{" "}
                    <strong>{popularLocations.length}</strong>
                  </div>
                  <div>
                    ✅ Revenue Per User:{" "}
                    <strong>
                      ${(totalRevenue / (users.length || 1)).toFixed(0)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Car Analytics */}
          {statsView === "cars" && (
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: "20px",
                padding: "24px",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h3
                style={{ color: "#4ce3f7", marginTop: 0, marginBottom: "24px" }}
              >
                🚗 Most Popular Cars
              </h3>
              {popularCars.map(([car, count], idx) => {
                const revenue = bookings
                  .filter((b) => b.carModel === car)
                  .reduce((sum, b) => sum + (b.total || 0), 0);
                const percentage = ((count / bookings.length) * 100).toFixed(1);
                return (
                  <div key={car} style={{ marginBottom: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ fontWeight: "600" }}>
                        #{idx + 1} {car}
                      </span>
                      <span style={{ color: "#4ce3f7", fontWeight: "700" }}>
                        {count} bookings • ${revenue.toLocaleString()}
                      </span>
                    </div>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: "8px",
                          background:
                            "linear-gradient(30deg, #0400ff, #4ce3f7)",
                          borderRadius: "10px",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "rgba(255,255,255,0.4)",
                        marginTop: "4px",
                      }}
                    >
                      {percentage}% of all bookings
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Location Analytics */}
          {statsView === "locations" && (
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: "20px",
                padding: "24px",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h3
                style={{ color: "#22c55e", marginTop: 0, marginBottom: "24px" }}
              >
                📍 Top Pickup Locations
              </h3>
              {popularLocations.map(([location, count], idx) => {
                const percentage = ((count / bookings.length) * 100).toFixed(1);
                return (
                  <div key={location} style={{ marginBottom: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ fontWeight: "600" }}>📍 {location}</span>
                      <span style={{ color: "#22c55e", fontWeight: "700" }}>
                        {count} bookings
                      </span>
                    </div>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: "8px",
                          background:
                            "linear-gradient(30deg, #22c55e, #a855f7)",
                          borderRadius: "10px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trends */}
          {statsView === "trends" && (
            <div style={{ display: "grid", gap: "20px" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <h3
                  style={{
                    color: "#f59e0b",
                    marginTop: 0,
                    marginBottom: "16px",
                  }}
                >
                  📈 Booking Trends
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span>Most booked day of week:</span>
                    <strong style={{ color: "#f59e0b" }}>
                      Friday & Saturday
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span>Peak season:</span>
                    <strong style={{ color: "#f59e0b" }}>
                      Summer (June-August)
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span>Average booking lead time:</span>
                    <strong style={{ color: "#f59e0b" }}>
                      ~14 days in advance
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span>Most common duration:</span>
                    <strong style={{ color: "#f59e0b" }}>
                      7 days (weekly rentals)
                    </strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  textAlign: "center",
                }}
              >
                <h3 style={{ color: "#4ce3f7", marginTop: 0 }}>💡 Insights</h3>
                <p
                  style={{ color: "rgba(255,255,255,0.7)", lineHeight: "1.6" }}
                >
                  Your most profitable car is{" "}
                  <strong style={{ color: "#4ce3f7" }}>
                    {popularCars[0]?.[0] || "N/A"}
                  </strong>{" "}
                  with
                  <strong style={{ color: "#22c55e" }}>
                    {" "}
                    {popularCars[0]?.[1] || 0} bookings
                  </strong>{" "}
                  generating
                  <strong style={{ color: "#f59e0b" }}>
                    {" "}
                    $
                    {bookings
                      .filter((b) => b.carModel === popularCars[0]?.[0])
                      .reduce((sum, b) => sum + (b.total || 0), 0)
                      .toLocaleString()}
                  </strong>{" "}
                  in revenue.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Admin;
