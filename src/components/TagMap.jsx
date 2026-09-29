import React, { useState, useEffect } from "react";
import LiveDateTime from './LiveDateTime';
import { supabase } from "../supabaseClient";

export default function TagMap({ onBack, onLogout }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter States
  const [filterDate, setFilterDate] = useState("");
  const [filterModel, setFilterModel] = useState("All");

  // Form input state
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [requestor, setRequestor] = useState("");
  const [tagVersion, setTagVersion] = useState(""); // Stores Model value
  const [itemChange, setItemChange] = useState("");

  // Helper function: Format YYYY-MM-DD to DD/MM/YYYY
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    const dateOnly = dateStr.split("T")[0].split(" ")[0];
    if (dateOnly.includes("-")) {
      const [year, month, day] = dateOnly.split("-");
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
    return dateStr;
  };

  // 1. Fetch data from Supabase (Sorted by date descending)
  const fetchTagMapUpdates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tagmap_updates")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUpdates(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTagMapUpdates();
  }, []);

  // Unique model list for dropdown filter
  const uniqueModels = Array.from(
    new Set(updates.map((item) => item.tag_version).filter(Boolean))
  );

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split("T")[0]);
    setRequestor("");
    setTagVersion("");
    setItemChange("");
  };

  // 2. Edit mode
  const handleEdit = (item) => {
    setEditingId(item.id);
    setDate(item.date);
    setRequestor(item.requestor);
    setTagVersion(item.tag_version);
    setItemChange(item.item_change);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 3. Save record (Insert or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!requestor.trim() || !tagVersion.trim() || !itemChange.trim()) {
      alert("Please complete all fields.");
      return;
    }

    setSubmitting(true);
    const payload = {
      date: date,
      requestor: requestor.trim(),
      tag_version: tagVersion.trim(),
      item_change: itemChange.trim(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("tagmap_updates")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("Failed to update: " + error.message);
      } else {
        resetForm();
        fetchTagMapUpdates();
      }
    } else {
      const { error } = await supabase
        .from("tagmap_updates")
        .insert([payload]);

      if (error) {
        alert("Failed to save: " + error.message);
      } else {
        resetForm();
        fetchTagMapUpdates();
      }
    }
    setSubmitting(false);
  };

  // 4. Delete record
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this record?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("tagmap_updates")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      if (editingId === id) resetForm();
      setUpdates(updates.filter((item) => item.id !== id));
    }
  };

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  // Filter Logic
  const filteredUpdates = updates.filter((item) => {
    const matchesDate = !filterDate || item.date === filterDate;
    const matchesModel =
      filterModel === "All" ||
      (item.tag_version && item.tag_version.toLowerCase() === filterModel.toLowerCase());

    return matchesDate && matchesModel;
  });

  return (
    <div style={{ padding: "16px 20px 40px", maxWidth: "1280px", margin: "0 auto", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>

      {/* Top Header Bar: Logout - LiveDateTime - Back to Dashboard */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "20px", 
          flexWrap: "wrap", 
          gap: "10px" 
        }}
      >
        <button
          type="button"
          onClick={handleLogout}
          style={{
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            border: "1px solid #fca5a5",
            borderRadius: "6px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: "bold",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          🚪 Logout
        </button>

        <LiveDateTime />

        <button
          type="button"
          onClick={onBack}
          style={{
            backgroundColor: "#0d3b66",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: "bold",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          ⬅️ Back to Dashboard
        </button>
      </div>

      {/* Title Banner */}
      <div
        style={{
          backgroundColor: "#0d3b66",
          color: "#ffffff",
          padding: "16px",
          borderRadius: "8px",
          textAlign: "center",
          fontSize: "20px",
          fontWeight: "bold",
          marginBottom: "20px",
          letterSpacing: "0.5px",
        }}
      >
        TagMap Updates
      </div>

      {/* Input / Edit Form */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "18px 16px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          marginBottom: "20px",
          border: editingId ? "2px solid #0284c7" : "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h4 style={{ margin: 0, color: "#0d3b66", display: "flex", alignItems: "center", gap: "6px", fontSize: "16px" }}>
            <span style={{ fontSize: "18px" }}>{editingId ? "✏️" : "➕"}</span>
            {editingId ? "Edit TagMap Update" : "Add TagMap Update"}
          </h4>
          {editingId && (
            <span style={{ fontSize: "12px", color: "#0284c7", fontWeight: "600", backgroundColor: "#e0f2fe", padding: "4px 8px", borderRadius: "4px" }}>
              Editing Mode
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#334155" }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#334155" }}>
                Requestor
              </label>
              <input
                type="text"
                placeholder="Enter Requestor"
                value={requestor}
                onChange={(e) => setRequestor(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#334155" }}>
                Model
              </label>
              <input
                type="text"
                placeholder="Enter Model"
                value={tagVersion}
                onChange={(e) => setTagVersion(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#334155" }}>
                Item Change
              </label>
              <input
                type="text"
                placeholder="Enter Item Change"
                value={itemChange}
                onChange={(e) => setItemChange(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  padding: "10px 18px",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: "#0d3b66",
                color: "#ffffff",
                border: "none",
                padding: "10px 24px",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              {submitting ? "Saving..." : editingId ? "Update Record" : "Submit Record"}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "14px 16px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          display: "flex",
          flexWrap: "wrap",
          gap: "14px",
          alignItems: "center",
          marginBottom: "16px",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Date Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>📅 Date:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              style={{ border: "none", backgroundColor: "#dc2626", color: "#fff", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Model Filter Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>🚗 Model:</span>
          <select
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            <option value="All">All Models</option>
            {uniqueModels.map((mdl) => (
              <option key={mdl} value={mdl}>
                {mdl}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table Responsive Wrapper */}
      <div
        style={{
          width: "100%",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
        }}
      >
        <table style={{ width: "100%", minWidth: "620px", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#0d3b66", color: "#ffffff", fontSize: "13px" }}>
              <th style={{ padding: "12px 14px", width: "45px", textAlign: "center" }}>No.</th>
              <th style={{ padding: "12px 14px", width: "110px", whiteSpace: "nowrap" }}>Date</th>
              <th style={{ padding: "12px 14px", width: "140px" }}>Requestor</th>
              <th style={{ padding: "12px 14px", width: "120px" }}>Model</th>
              <th style={{ padding: "12px 14px" }}>Item Change</th>
              <th style={{ padding: "12px 14px", width: "130px", textAlign: "center", whiteSpace: "nowrap" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  Loading updates...
                </td>
              </tr>
            ) : filteredUpdates.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  No TagMap updates available.
                </td>
              </tr>
            ) : (
              filteredUpdates.map((item, index) => (
                <tr
                  key={item.id || index}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    backgroundColor: editingId === item.id ? "#f0f9ff" : index % 2 === 0 ? "#ffffff" : "#f8fafc",
                    fontSize: "13px",
                  }}
                >
                  <td style={{ padding: "12px 14px", textAlign: "center", color: "#64748b" }}>{index + 1}</td>
                  <td style={{ padding: "12px 14px", color: "#334155", whiteSpace: "nowrap" }}>{formatDateDisplay(item.date)}</td>
                  <td style={{ padding: "12px 14px", color: "#0f172a", fontWeight: "600" }}>{item.requestor}</td>
                  <td style={{ padding: "12px 14px", color: "#0284c7", fontWeight: "bold" }}>{item.tag_version}</td>
                  <td style={{ padding: "12px 14px", color: "#334155", wordBreak: "break-word" }}>{item.item_change}</td>
                  <td style={{ padding: "12px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                      <button
                        onClick={() => handleEdit(item)}
                        style={{
                          backgroundColor: "#e0f2fe",
                          color: "#0369a1",
                          border: "1px solid #bae6fd",
                          padding: "5px 10px",
                          borderRadius: "5px",
                          fontWeight: "600",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                        title="Edit this record"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          padding: "5px 10px",
                          borderRadius: "5px",
                          fontWeight: "600",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                        title="Delete this record"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}