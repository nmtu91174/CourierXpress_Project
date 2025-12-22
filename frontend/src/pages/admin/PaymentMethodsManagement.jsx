// frontend/src/pages/admin/PaymentMethodsManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import AdminLayout from "../../components/Layouts/AdminLayout";


// IMPORTANT: keep fallback so page still works even when .env is missing
const BACKEND_BASE =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "http://localhost:8890/CourierXpress_Project/backend";

// Data source (DB real) - existing endpoint in your backend

const ADMIN_BASE = `${BACKEND_BASE}/api/admin`;

const LIST_ENDPOINT   = `${BACKEND_BASE}/get_payment_methods.php`;
const CREATE_ENDPOINT = `${ADMIN_BASE}/payment_methods_create.php`;
const UPDATE_ENDPOINT = `${ADMIN_BASE}/payment_methods_update.php`;
const DELETE_ENDPOINT = `${ADMIN_BASE}/payment_methods_delete.php`;

/**
 * Expected DB table: payment_methods(id, code, name)
 * Existing backend: get_payment_methods.php (returns JSON array or wrapped object)
 * This page DOES NOT fake CRUD. Buttons are disabled until real APIs exist.
 */
export default function PaymentMethodsManagement() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastSource, setLastSource] = useState(LIST_ENDPOINT);

  const parseList = (payload) => {
    // Accept common shapes:
    // 1) array
    // 2) { data: [] }
    // 3) { payment_methods: [] }
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.payment_methods)) return payload.payment_methods;
    return [];
  };

  const fetchPaymentMethods = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      setLastSource(LIST_ENDPOINT);

      const res = await fetch(LIST_ENDPOINT, {
        method: "GET",
        // For get_* endpoints that do not require session:
        // avoid credentials to prevent CORS credential mismatches.
      });

      const raw = await res.text();

      if (!res.ok) {
        throw new Error(`Request failed (${res.status}). Raw: ${raw.slice(0, 200)}`);
      }

      let json;
      try {
        json = JSON.parse(raw);
      } catch (e) {
        throw new Error(`Response is not valid JSON. Raw: ${raw.slice(0, 200)}`);
      }

      const list = parseList(json);

      // Normalize
      const normalized = list.map((x) => ({
        id: x?.id ?? null,
        code: x?.code ?? "",
        name: x?.name ?? "",
      }));

      setItems(normalized);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.message ||
          "Unable to load payment methods. Please verify backend URL and that the endpoint exists."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((x) => {
      const code = String(x.code || "").toLowerCase();
      const name = String(x.name || "").toLowerCase();
      return code.includes(keyword) || name.includes(keyword);
    });
  }, [items, q]);

  const handleAdd = async () => {
  const result = await Swal.fire({
    title: "Add Payment Method",
    html:
      `<input id="pm_code" class="swal2-input" placeholder="Code (e.g. cash)">` +
      `<input id="pm_name" class="swal2-input" placeholder="Name (e.g. Cash)">`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Create",
    preConfirm: () => {
      const code = document.getElementById("pm_code")?.value.trim();
      const name = document.getElementById("pm_name")?.value.trim();

      if (!code || !name) {
        Swal.showValidationMessage("Code and Name are required.");
        return;
      }
      return { code, name };
    },
  });

  if (!result.isConfirmed || !result.value) return;

  try {
    const res = await fetch(CREATE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // vì API admin yêu cầu login
      body: JSON.stringify(result.value),
    });

    const raw = await res.text();
    let json = null;
    try { json = JSON.parse(raw); } catch {}

    if (!res.ok) {
      // Response::error(...) thường có message
      throw new Error(json?.message || raw || `Create failed (${res.status})`);
    }

    await Swal.fire({
      icon: "success",
      title: "Created",
      timer: 1200,
      showConfirmButton: false,
    });

    fetchPaymentMethods(); // refresh list
  } catch (e) {
    Swal.fire({ icon: "error", title: "Create failed", text: e.message });
  }
};
const escapeHtml = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const handleEdit = async (row) => {
  const result = await Swal.fire({
    title: "Edit Payment Method",
    html:
      `<input id="pm_code" class="swal2-input" placeholder="Code" value="${escapeHtml(row?.code)}">` +
      `<input id="pm_name" class="swal2-input" placeholder="Name" value="${escapeHtml(row?.name)}">`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Save",
    preConfirm: () => {
      const code = document.getElementById("pm_code")?.value.trim();
      const name = document.getElementById("pm_name")?.value.trim();

      if (!code || !name) {
        Swal.showValidationMessage("Code and Name are required.");
        return;
      }
      return { id: row.id, code, name };
    },
  });

  if (!result.isConfirmed || !result.value) return;

  try {
    const res = await fetch(UPDATE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(result.value),
    });

    const raw = await res.text();
    let json = null;
    try { json = JSON.parse(raw); } catch {}

    if (!res.ok) {
      throw new Error(json?.message || raw || `Update failed (${res.status})`);
    }

    await Swal.fire({
      icon: "success",
      title: "Updated",
      timer: 1200,
      showConfirmButton: false,
    });

    fetchPaymentMethods();
  } catch (e) {
    Swal.fire({ icon: "error", title: "Update failed", text: e.message });
  }
};
const handleDelete = async (row) => {
  const confirm = await Swal.fire({
    icon: "warning",
    title: "Delete Payment Method?",
    text: `Delete "${row?.name}" (${row?.code})?`,
    showCancelButton: true,
    confirmButtonText: "Delete",
  });

  if (!confirm.isConfirmed) return;

  try {
    const res = await fetch(DELETE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: row.id }),
    });

    const raw = await res.text();
    let json = null;
    try { json = JSON.parse(raw); } catch {}

    if (!res.ok) {
      // 409 = used by orders
      throw new Error(json?.message || raw || `Delete failed (${res.status})`);
    }

    await Swal.fire({
      icon: "success",
      title: "Deleted",
      timer: 1200,
      showConfirmButton: false,
    });

    fetchPaymentMethods();
  } catch (e) {
    Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
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
            <h2 style={{ margin: 0, fontSize: 26 }}>Payment Methods</h2>
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              Master data for payment options used in orders and invoices.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by code or name..."
              style={{
                width: 320,
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
              onClick={fetchPaymentMethods}
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
              onClick={handleAdd}
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
            >
              Data source: <code>{lastSource}</code>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 18 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 18, opacity: 0.75 }}>
              No payment methods found.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#fafafa" }}>
                    <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>ID</th>
                    <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Code</th>
                    <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Name</th>
                    <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((x) => (
                    <tr key={x.id ?? `${x.code}-${x.name}`}>
                      <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3" }}>
                        {x.id ?? "-"}
                      </td>
                      <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "5px 10px",
                            borderRadius: 999,
                            background: "#f6f7f9",
                            border: "1px solid #eef0f3",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            fontSize: 12,
                          }}
                        >
                          {x.code || "-"}
                        </span>
                      </td>
                      <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3" }}>
                        {x.name || "-"}
                      </td>
                      <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3" }}>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button
                            onClick={handleEdit}
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
                            onClick={handleDelete}
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
