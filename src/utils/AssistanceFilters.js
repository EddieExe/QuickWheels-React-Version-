// AssistanceFilters.js
const AssistanceFilters = ({ 
  filterType, 
  filterStatus, 
  onFilterTypeChange, 
  onFilterStatusChange, 
  onClearFilters 
}) => {
  const typeOptions = [
    { value: "breakdown", label: "Breakdown" },
    { value: "accident", label: "Accident" },
    { value: "sos", label: "SOS" },
    { value: "assistance", label: "Assistance" },
  ];

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "dispatched", label: "Dispatched" },
    { value: "resolved", label: "Resolved" },
    { value: "critical", label: "Critical" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px", color: "rgba(255,255,255,0.3)", paddingLeft: "4px" }}>
        TYPE
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {typeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterTypeChange(filterType === option.value ? null : option.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "none",
              fontFamily: "inherit",
              background: filterType === option.value
                ? "rgba(239,68,68,0.15)"
                : "transparent",
              color: filterType === option.value
                ? "#fca5a5"
                : "rgba(255,255,255,0.5)",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              if (filterType !== option.value) {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "rgba(255,255,255,0.8)";
              }
            }}
            onMouseLeave={(e) => {
              if (filterType !== option.value) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(255,255,255,0.5)";
              }
            }}
          >
            <span style={{ 
              width: "6px", 
              height: "6px", 
              borderRadius: "50%", 
              background: filterType === option.value 
                ? "#ef4444" 
                : "rgba(255,255,255,0.2)",
              transition: "background 0.3s ease"
            }} />
            {option.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px", color: "rgba(255,255,255,0.3)", paddingLeft: "4px", marginTop: "8px" }}>
        STATUS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterStatusChange(filterStatus === option.value ? null : option.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "none",
              fontFamily: "inherit",
              background: filterStatus === option.value
                ? "rgba(239,68,68,0.15)"
                : "transparent",
              color: filterStatus === option.value
                ? "#fca5a5"
                : "rgba(255,255,255,0.5)",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              if (filterStatus !== option.value) {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "rgba(255,255,255,0.8)";
              }
            }}
            onMouseLeave={(e) => {
              if (filterStatus !== option.value) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(255,255,255,0.5)";
              }
            }}
          >
            <span style={{ 
              width: "6px", 
              height: "6px", 
              borderRadius: "50%", 
              background: filterStatus === option.value 
                ? "#ef4444" 
                : "rgba(255,255,255,0.2)",
              transition: "background 0.3s ease"
            }} />
            {option.label}
          </button>
        ))}
      </div>
      
      <button
        onClick={onClearFilters}
        style={{
          marginTop: "8px",
          padding: "10px",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "transparent",
          color: "rgba(255,255,255,0.3)",
          fontSize: "11px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.3s ease",
          fontFamily: "Quicksand,sans-serif",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
          e.currentTarget.style.color = "#fca5a5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "rgba(255,255,255,0.3)";
        }}
      >
        Clear All Filters
      </button>
    </div>
  );
};