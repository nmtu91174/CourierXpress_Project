// frontend/src/pages/admin/ServiceTypesManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiUrl } from "../../config/api";

/**
 * Service Types - Master Data
 * Expected DB table: service_types(id, name, fee, description)
 * Endpoint: /get_service_types.php
 * This page reads REAL DB data (no fake API).
 * CRUD actions are disabled until real admin APIs exist.
 */
export default function ServiceTypesManagement() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastSource, setLastSource] = useState(apiUrl("/get_service_types.php"));

  const parseList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.service_types)) return payload.service_types;
    return [];
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");

    const endpoint = apiUrl("/get_service_types.php");
    setLastSource(endpoint);

    try {
      const res = await fetch(endpoint, { method: "GET" });
      const raw = await res.text();

      if (!res.ok) {
        throw new Error(`Request failed (${res.status}). Raw: ${raw.slice(0, 200)}`);
      }

      let json;
      try {
        json = JSON.parse(raw);
      } catch {
        throw new Error(`Response is not valid JSON. Raw: ${raw.slice(0, 200)}`);
      }

      const list = parseList(json).map((x) => ({
        id: x?.id ?? null,
        name: x?.name ?? "",
        fee: x?.fee ?? 0,
        description: x?.description ?? "",
      }));

      // sort by id asc
      list.sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

      setItems(list);
    } catch (err) {
      console.error(err);
      setItems([]);
      setErrorMsg(
        err?.message ||
          "Unable to load service types. Please verify backend URL, CORS, and that the endpoint exists."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((x) => {
      const name = String(x?.name || "").toLowerCase();
      const desc = String(x?.description || "").toLowerCase();
      const fee = String(x?.fee ?? "").toLowerCase();
      return name.includes(keyword) || desc.includes(keyword) || fee.includes(keyword);
    });
  }, [items, q]);

  const showNotImplemented = () => {
    Swal.fire({
      icon: "info",
      title: "CRUD not enabled yet",
      text: "This page uses REAL DB data. Create/Update/Delete requires real backend admin APIs (no fake endpoints).",
      confirmButtonText: "OK",
    });
  };

  const formatVND = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    try {
      return n.toLocaleString();
    } catch {
      return String(value);
    }
  };

  return (
    <div style={{ padding: 18 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 26 }}>Service Types</h2>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Manage service types used for pricing and order creation.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, description, or fee..."
            style={{
              width: 360,
              maxWidth: "70vw",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e7e7e7",
              outline: "none",
              background: "white",
              boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            }}
          />

          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #e7e7e7",
              background: "white",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              fontWeight: 600,
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={showNotImplemented}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "#fff3f3",
            border: "1px solid #ffd0d0",
            color: "#b42318",
            marginBottom: 12,
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Card */}
      <div
        style={{
          background: "white",
          border: "1px solid #eee",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #f1f1f1",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            Total: <span style={{ fontWeight: 800 }}>{filtered.length}</span>
          </div>

          <div
            style={{
              fontSize: 12,
              opacity: 0.8,
              background: "#f6f7f9",
              border: "1px solid #eef0f3",
              padding: "6px 10px",
              borderRadius: 999,
            }}
            title={lastSource}
          >
            Data source: <code>{lastSource}</code>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 18 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 18, opacity: 0.75 }}>No service types found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "#fafafa" }}>
                  <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>ID</th>
                  <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Name</th>
                  <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Fee</th>
                  <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Description</th>
                  <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((x) => (
                  <tr key={x.id ?? `${x.name}-${x.fee}`}>
                    <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3" }}>
                      {x.id ?? "-"}
                    </td>

                    <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3" }}>
                      {x.name || "-"}
                    </td>

                    <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "5px 10px",
                          borderRadius: 999,
                          background: "#f6f7f9",
                          border: "1px solid #eef0f3",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          fontSize: 12,
                        }}
                      >
                        {formatVND(x.fee)}
                      </span>
                    </td>

                    <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3" }}>
                      {x.description || "-"}
                    </td>

                    <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3" }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={showNotImplemented}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 12,
                            border: "1px solid #e7e7e7",
                            background: "white",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={showNotImplemented}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 12,
                            border: "1px solid #ffd0d0",
                            background: "#fff3f3",
                            cursor: "pointer",
                            fontWeight: 700,
                            color: "#b42318",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
        Note: This page reads real data from DB. CRUD actions will be enabled after real admin APIs are added.
      </div>
    </div>
  );
}
