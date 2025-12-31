// frontend/src/pages/admin/Reports.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Row, Col, Button, Form, Spinner, Badge, Table, ProgressBar } from "react-bootstrap";
import {
  FaChartBar,
  FaFilePdf,
  FaMoneyBillWave,
  FaTruck,
  FaCheck,
  FaExclamationTriangle,
  FaFileExcel,
  FaFileCsv,
} from "react-icons/fa";

import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { initPageAnimations } from "../../utils/gsapAnimations";
import "../../assets/styles/reports.css";
import "../../assets/styles/dashboard.css";

/**
 * ENTERPRISE REPORTS (ECharts + ExcelJS + jsPDF AutoTable)
 * - 4 KPI cards
 * - 8 meaningful reports (workflow aligned)
 * - Removed SLA report
 * - Revenue KPI shown as VND currency (e.g. 262.000 ₫)
 */

const API_URL = "http://localhost:8888/api/admin/get_reports_data.php"; // adjust if needed

const STATUS_META = [
  { id: 1, key: "BOOKED", label: "Booked" },
  { id: 2, key: "APPROVED", label: "Approved" },
  { id: 3, key: "ASSIGNED", label: "Assigned" },
  { id: 4, key: "PICKED_UP", label: "Picked Up" },
  { id: 5, key: "DELIVERED", label: "Delivered" },
  { id: 6, key: "FAILED", label: "Failed" },
];

const SERVICE_LABEL = { all: "All", standard: "Standard", express: "Express", sameday: "Same-day" };
const PAYMENT_LABEL = { all: "All", cash: "Cash", banking: "Bank Transfer", momo: "MoMo" };

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function formatVND(amount) {
  // Example: 262.000 ₫
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Math.round(safeNum(amount, 0)));
}

function formatInt(n) {
  return new Intl.NumberFormat("en-US").format(Math.round(safeNum(n, 0)));
}

function formatPct(n, digits = 1) {
  const x = safeNum(n, 0);
  return `${x.toFixed(digits)}%`;
}

function toDateLabel(bucket, period) {
  try {
    if (period === "12m") {
      const [yy, mm] = bucket.split("-").map((x) => parseInt(x, 10));
      const d = new Date(yy, (mm || 1) - 1, 1);
      return new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
    }
    const [y, m, d] = bucket.split("-").map((x) => parseInt(x, 10));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(dt);
  } catch {
    return bucket;
  }
}

function unwrapResponse(json) {
  // Supports Response::success formats (status/data/message) or simple {data:...}
  if (!json) return null;
  if (json.data) return json.data;
  return json;
}

function responseOk(res, json) {
  if (!res.ok) return false;
  if (!json) return false;
  if (json.status === "success") return true;
  if (json.success === true) return true;
  // allow when it contains "data" payload
  if (json.data) return true;
  return false;
}

export default function Reports() {
  const [filters, setFilters] = useState({
    period: "7d",
    service: "all",
    payment: "all",
    status: "all",
  });

  const [payload, setPayload] = useState({
    meta: {},
    kpi: { revenueRaw: 0, revenueFormatted: "0 ₫", orders: 0, deliveredRate: 0, failedRate: 0 },
    timeBuckets: [],
    revenueTimeData: [],
    statusTimeData: [],
    serviceMix: [],
    paymentMix: [],
    workflowFunnel: [],
    backlogAging: [],
    topAgents: [],
    topShippers: [],
  });

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Chart refs for PDF export
  const refRevenue = useRef(null);
  const refDelivery = useRef(null);
  const refService = useRef(null);
  const refPayment = useRef(null);
  const refFunnel = useRef(null);
  const refAging = useRef(null);
  const refAgents = useRef(null);
  const refShippers = useRef(null);

  const onFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  /* ==========================
   * THEME (more vivid / enterprise)
   * ========================== */
  const palette = useMemo(
    () => ({
      bg: "#ffffff",
      card: "#ffffff",
      ink: "#0b1220",
      muted: "rgba(15,23,42,0.62)",
      label: "rgba(15,23,42,0.78)",
      grid: "rgba(15,23,42,0.10)",
      border: "rgba(15,23,42,0.10)",
      // vivid palette
      colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#a855f7", "#84cc16"],
    }),
    []
  );

  const baseGrid = useMemo(() => ({ left: 46, right: 20, top: 52, bottom: 42 }), []);
  const axisLux = useMemo(
    () => ({
      axisLine: { lineStyle: { color: palette.border } },
      axisTick: { show: false },
      axisLabel: { color: palette.label, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" },
      splitLine: { lineStyle: { color: palette.grid } },
    }),
    [palette]
  );

  const dataZoomInside = useMemo(
    () => [
      {
        type: "inside",
        zoomOnMouseWheel: "shift", // hold Shift to zoom
        moveOnMouseWheel: true,
        moveOnMouseMove: true,
      },
    ],
    []
  );


  const withLux = useCallback(
    (opt) => ({
      backgroundColor: palette.bg,
      color: palette.colors,
      textStyle: { fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial", fontSize: 12 },
      tooltip: {
        trigger: "axis",
        borderWidth: 0,
        backgroundColor: "rgba(15,23,42,0.92)",
        textStyle: { color: "#fff" },
      },
      toolbox: {
        show: false,
      },
      ...opt,
    }),
    [palette]
  );

  /* ==========================
   * FETCH
   * ========================== */
  useEffect(() => {
    // Initial animation on mount
    try {
      initPageAnimations?.({ kpiSelector: ".kpi-item", chartSelector: ".chart-wrapper" });
    } catch {
      // ignore animation if not available
    }
  }, []);

  // Re-animate KPI cards when filters change (faster animation)
  useEffect(() => {
    if (!loading) {
      import("../../utils/gsapAnimations").then(({ animateKPICards }) => {
        animateKPICards(".kpi-item");
      }).catch(() => {
        // ignore if animation not available
      });
    }

    let mounted = true;

    async function run() {
      setLoading(true);
      setErr("");

      try {
        const params = new URLSearchParams({
          period: filters.period,
          service: filters.service,
          payment: filters.payment,
          status: filters.status,
          view: "overall",
        });

        const res = await fetch(`${API_URL}?${params.toString()}`, { credentials: "include" });

        const ct = res.headers.get("content-type") || "";
        let json = null;

        if (ct.includes("application/json")) {
          json = await res.json();
        } else {
          const text = await res.text();
          throw new Error(text?.slice?.(0, 300) || "Non-JSON response from server.");
        }

        if (!mounted) return;

        if (!responseOk(res, json)) {
          setErr(json?.message || "Unable to load reports data.");
          setLoading(false);
          return;
        }

        const data = unwrapResponse(json);
        setPayload({
          meta: data?.meta ?? {},
          kpi: data?.kpi ?? payload.kpi,
          timeBuckets: data?.timeBuckets ?? [],
          revenueTimeData: data?.revenueTimeData ?? [],
          statusTimeData: data?.statusTimeData ?? [],
          serviceMix: data?.serviceMix ?? [],
          paymentMix: data?.paymentMix ?? [],
          workflowFunnel: data?.workflowFunnel ?? [],
          backlogAging: data?.backlogAging ?? [],
          topAgents: data?.topAgents ?? [],
          topShippers: data?.topShippers ?? [],
        });

        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message ? `Network/Server response: ${e.message}` : "Network error while loading reports data.");
        setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  /* ==========================
   * DERIVED SERIES
   * ========================== */
  const timeBuckets = payload.timeBuckets ?? [];
  const timeLabels = useMemo(() => timeBuckets.map((b) => toDateLabel(b, filters.period)), [timeBuckets, filters.period]);

  const revenueMap = useMemo(() => {
    const m = new Map();
    for (const r of payload.revenueTimeData ?? []) m.set(r.bucket, r);
    return m;
  }, [payload.revenueTimeData]);

  const revenueSeries = useMemo(() => timeBuckets.map((b) => safeNum(revenueMap.get(b)?.revenue, 0)), [timeBuckets, revenueMap]);
  const ordersSeries = useMemo(() => timeBuckets.map((b) => safeNum(revenueMap.get(b)?.orders, 0)), [timeBuckets, revenueMap]);

  const statusMap = useMemo(() => {
    const m = new Map(); // key `${bucket}-${status}` => count
    for (const r of payload.statusTimeData ?? []) m.set(`${r.bucket}-${r.status}`, safeNum(r.count, 0));
    return m;
  }, [payload.statusTimeData]);

  const deliveredSeries = useMemo(() => timeBuckets.map((b) => safeNum(statusMap.get(`${b}-5`), 0)), [timeBuckets, statusMap]);
  const failedSeries = useMemo(() => timeBuckets.map((b) => safeNum(statusMap.get(`${b}-6`), 0)), [timeBuckets, statusMap]);

  const successRateSeries = useMemo(
    () =>
      timeBuckets.map((_, idx) => {
        const total = safeNum(ordersSeries[idx], 0);
        const delivered = safeNum(deliveredSeries[idx], 0);
        return total > 0 ? (delivered / total) * 100 : 0;
      }),
    [timeBuckets, ordersSeries, deliveredSeries]
  );

  /* ==========================
   * CHART OPTIONS (8 Reports)
   * ========================== */

  // 1) Revenue & Orders Trend (dual axis)
  const optRevenueOrders = useMemo(() => {
    const gradientRevenue = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: "rgba(59,130,246,0.35)" },
      { offset: 1, color: "rgba(59,130,246,0.02)" },
    ]);

    return withLux({
      title: { text: "Revenue & Orders Trend", left: 12, top: 16, textStyle: { fontSize: 14, fontWeight: 800, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif" } },
      grid: { ...baseGrid, bottom: 50, top: 70 },
      legend: { top: 18, right: 12, textStyle: { color: palette.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" } },
      dataZoom: dataZoomInside,
      xAxis: { type: "category", data: timeLabels, ...axisLux },
      yAxis: [
        {
          type: "value",
          name: "Revenue (VND)",
          axisLabel: { color: palette.label, fontSize: 11, formatter: (v) => formatVND(v) },
          ...axisLux,
        },
        { type: "value", name: "Orders", axisLabel: { color: palette.label, fontSize: 11 }, ...axisLux },
      ],
      series: [
        {
          name: "Revenue",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3 },
          areaStyle: { color: gradientRevenue },
          data: revenueSeries.map((x) => Math.round(x)),
        },
        {
          name: "Orders",
          type: "bar",
          yAxisIndex: 1,
          barWidth: 14,
          itemStyle: { borderRadius: [10, 10, 0, 0] },
          data: ordersSeries.map((x) => Math.round(x)),
        },
      ],
    });
  }, [withLux, palette, baseGrid, axisLux, dataZoomInside, timeLabels, revenueSeries, ordersSeries]);

  // 2) Delivery Performance
  const optDeliveryPerformance = useMemo(() => {
    return withLux({
      title: { text: "Delivery Performance", left: 12, top: 16, textStyle: { fontSize: 14, fontWeight: 800, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif" } },
      grid: { ...baseGrid, right: 60, bottom: 50, top: 70 },
      legend: { top: 18, right: 12, textStyle: { color: palette.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" } },
      dataZoom: dataZoomInside,
      xAxis: { type: "category", data: timeLabels, ...axisLux },
      yAxis: [
        { type: "value", name: "Orders", ...axisLux },
        {
          type: "value",
          name: "Success %",
          min: 0,
          max: 100,
          axisLabel: { formatter: (v) => `${v}%`, color: palette.label, fontSize: 11 },
          ...axisLux,
        },
      ],
      series: [
        { name: "Delivered", type: "bar", stack: "perf", barWidth: 14, itemStyle: { borderRadius: [10, 10, 0, 0] }, data: deliveredSeries },
        { name: "Failed", type: "bar", stack: "perf", barWidth: 14, itemStyle: { borderRadius: [10, 10, 0, 0] }, data: failedSeries },
        { name: "Success Rate", type: "line", yAxisIndex: 1, smooth: true, showSymbol: false, lineStyle: { width: 3 }, data: successRateSeries.map((x) => Number(x.toFixed(1))) },
      ],
    });
  }, [withLux, palette, baseGrid, axisLux, dataZoomInside, timeLabels, deliveredSeries, failedSeries, successRateSeries]);

  // 3) Service Mix (donut)
  const optServiceMix = useMemo(() => {
    const data = (payload.serviceMix ?? []).map((x) => ({ name: x.name, value: safeNum(x.count, 0) }));
    return withLux({
      title: { text: "Service Mix", left: 12, top: 16, textStyle: { fontSize: 14, fontWeight: 800, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif" } },
      legend: { bottom: 12, left: "center", textStyle: { color: palette.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" } },
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: ["55%", "80%"],
          center: ["50%", "45%"], // Kéo chart lên chút để chừa không gian cho legend
          itemStyle: { borderRadius: 10, borderColor: "rgba(255,255,255,0.9)", borderWidth: 2 },
          label: {
            show: true,
            position: "inside",
            formatter: "{d}%",
            fontSize: 13,
            fontWeight: 800,
            color: "#fff"
          },
          labelLine: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 900
            }
          },
          data,
        },
      ],
    });
  }, [withLux, palette, payload.serviceMix]);

  // 4) Payment Mix (donut)
  const optPaymentMix = useMemo(() => {
    const data = (payload.paymentMix ?? []).map((x) => ({ name: x.name, value: safeNum(x.count, 0) }));
    return withLux({
      title: { text: "Payment Mix", left: 12, top: 16, textStyle: { fontSize: 14, fontWeight: 800, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif" } },
      legend: { bottom: 12, left: "center", textStyle: { color: palette.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" } },
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: ["55%", "80%"],
          center: ["50%", "45%"], // Kéo chart lên chút để chừa không gian cho legend
          itemStyle: { borderRadius: 10, borderColor: "rgba(255,255,255,0.9)", borderWidth: 2 },
          label: {
            show: true,
            position: "inside",
            formatter: "{d}%",
            fontSize: 13,
            fontWeight: 800,
            color: "#fff"
          },
          labelLine: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 900
            }
          },
          data,
        },
      ],
    });
  }, [withLux, palette, payload.paymentMix]);

  // 5) Workflow Funnel
  const optWorkflowFunnel = useMemo(() => {
    const data = (payload.workflowFunnel ?? []).map((x) => ({ name: x.stage, value: safeNum(x.count, 0) }));
    return withLux({
      title: { text: "Workflow Funnel", left: 12, top: 16, textStyle: { fontSize: 14, fontWeight: 800, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif" } },
      tooltip: { trigger: "item", formatter: "{b}: {c}" },
      series: [
        {
          type: "funnel",
          left: "8%",
          top: 56,
          bottom: 20,
          width: "84%",
          minSize: "0%",
          maxSize: "100%",
          sort: "none",
          gap: 6,
          label: { color: "#0b1220", fontWeight: 900 },
          labelLine: { length: 10, lineStyle: { color: palette.border } },
          itemStyle: { borderColor: "rgba(255,255,255,0.9)", borderWidth: 2, borderRadius: 10 },
          data,
        },
      ],
    });
  }, [withLux, palette, payload.workflowFunnel]);

  // 6) Backlog Aging (stacked bar by status over aging bucket)
  const optBacklogAging = useMemo(() => {
    const buckets = ["<2h", "2-6h", "6-12h", "12-24h", "1-2d", ">2d"];
    const openStatuses = [
      { id: 1, label: "Booked" },
      { id: 2, label: "Approved" },
      { id: 3, label: "Assigned" },
      { id: 4, label: "Picked Up" },
    ];

    const map = new Map(); // `${status}-${bucket}` -> count
    for (const r of payload.backlogAging ?? []) {
      map.set(`${r.status_id}-${r.aging_bucket}`, safeNum(r.count, 0));
    }

    const series = openStatuses.map((s) => ({
      name: s.label,
      type: "bar",
      stack: "aging",
      barWidth: 14,
      itemStyle: { borderRadius: [10, 10, 0, 0] },
      data: buckets.map((b) => safeNum(map.get(`${s.id}-${b}`), 0)),
    }));

    return withLux({
      title: { text: "Backlog Aging (WIP)", left: 12, top: 16, textStyle: { fontSize: 14, fontWeight: 800, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif" } },
      grid: baseGrid,
      legend: { top: 10, right: 10, textStyle: { color: palette.muted, fontSize: 11 } },
      tooltip: { trigger: "axis" },
      xAxis: { type: "category", data: buckets, ...axisLux },
      yAxis: { type: "value", name: "Orders", ...axisLux },
      series,
    });
  }, [withLux, palette, baseGrid, axisLux, payload.backlogAging]);

  // 7) Top Agents (highlight) - horizontal stacked bars
  const optTopAgents = useMemo(() => {
    const top = (payload.topAgents ?? []).slice(0, 8);
    const names = top.map((x) => x.agent_name);

    return withLux({
      title: { text: "Top Agents (Highlight)", left: 12, top: 16, textStyle: { fontSize: 14, fontWeight: 800, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif" } },
      grid: { left: 110, right: 24, top: 70, bottom: 40 },
      legend: { top: 18, right: 12, textStyle: { color: palette.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "value", ...axisLux },
      yAxis: { type: "category", data: names, axisLabel: { color: palette.label, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: palette.border } } },
      series: [
        { name: "Delivered", type: "bar", stack: "agent", barWidth: 14, data: top.map((x) => safeNum(x.delivered, 0)), itemStyle: { borderRadius: [10, 0, 0, 10] } },
        { name: "WIP", type: "bar", stack: "agent", barWidth: 14, data: top.map((x) => safeNum(x.wip, 0)) },
        { name: "Failed", type: "bar", stack: "agent", barWidth: 14, data: top.map((x) => safeNum(x.failed, 0)), itemStyle: { borderRadius: [0, 10, 10, 0] } },
      ],
    });
  }, [withLux, palette, axisLux, payload.topAgents]);

  // 8) Top Shippers (highlight) - bar delivered + line lead time
  const optTopShippers = useMemo(() => {
    const top = (payload.topShippers ?? []).slice(0, 10);
    
    // If no data, show empty chart
    if (top.length === 0) {
      return withLux({
        title: { text: "Top Shippers (Highlight)", left: 12, top: 12, textStyle: { fontSize: 14, fontWeight: 800, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif" } },
        xAxis: { type: "category", data: [] },
        yAxis: [{ type: "value", name: "Delivered", ...axisLux }],
        series: [],
      });
    }
    
    const names = top.map((x) => x.shipper_name);
    const delivered = top.map((x) => safeNum(x.delivered, 0));
    const lead = top.map((x) => {
      const val = x.avg_lead_time_hours;
      return val != null && val !== "" ? safeNum(val, 0) : null;
    });

    return withLux({
      title: { text: "Top Shippers (Highlight)", left: 12, top: 16, textStyle: { fontSize: 14, fontWeight: 800, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif" } },
      grid: { left: 110, right: 60, top: 70, bottom: 30 },
      legend: { top: 18, right: 12, textStyle: { color: palette.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" } },
      tooltip: { trigger: "axis" },
      xAxis: { type: "category", data: names, axisLabel: { color: palette.label, fontSize: 11, interval: 0 }, axisTick: { show: false }, axisLine: { lineStyle: { color: palette.border } } },
      yAxis: [
        { type: "value", name: "Delivered", ...axisLux },
        {
          type: "value",
          name: "Avg Hours",
          ...axisLux,
          axisLabel: { color: palette.label, fontSize: 11, formatter: (v) => `${v}h` },
        },
      ],
      series: [
        { name: "Delivered", type: "bar", barWidth: 14, itemStyle: { borderRadius: [10, 10, 0, 0] }, data: delivered },
        { name: "Avg Lead Time", type: "line", yAxisIndex: 1, smooth: true, showSymbol: false, lineStyle: { width: 3 }, data: lead },
      ],
    });
  }, [withLux, palette, axisLux, payload.topShippers]);

  /* ==========================
   * EXPORTS (ExcelJS / CSV / PDF)
   * ========================== */
  const exportExcel = useCallback(async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = "CourierXpress";
    wb.created = new Date();

    // KPI
    const wsKpi = wb.addWorksheet("KPI");
    wsKpi.addRow(["Metric", "Value"]);
    wsKpi.addRow(["Revenue", payload.kpi?.revenueFormatted ?? formatVND(payload.kpi?.revenueRaw)]);
    wsKpi.addRow(["Total Orders", safeNum(payload.kpi?.orders, 0)]);
    wsKpi.addRow(["Delivered Rate (%)", safeNum(payload.kpi?.deliveredRate, 0)]);
    wsKpi.addRow(["Failed Rate (%)", safeNum(payload.kpi?.failedRate, 0)]);
    wsKpi.columns.forEach((c) => (c.width = 24));

    // Trend
    const wsTrend = wb.addWorksheet("Revenue_Orders_Trend");
    wsTrend.addRow(["Bucket", "Revenue", "Orders"]);
    for (const b of payload.timeBuckets ?? []) {
      const r = (payload.revenueTimeData ?? []).find((x) => x.bucket === b);
      wsTrend.addRow([b, safeNum(r?.revenue, 0), safeNum(r?.orders, 0)]);
    }
    wsTrend.columns.forEach((c) => (c.width = 18));

    // Delivery Performance
    const wsPerf = wb.addWorksheet("Delivery_Performance");
    wsPerf.addRow(["Bucket", "Delivered", "Failed", "SuccessRate(%)"]);
    for (let i = 0; i < (payload.timeBuckets ?? []).length; i++) {
      wsPerf.addRow([
        payload.timeBuckets[i],
        safeNum(deliveredSeries[i], 0),
        safeNum(failedSeries[i], 0),
        Number(safeNum(successRateSeries[i], 0).toFixed(1)),
      ]);
    }
    wsPerf.columns.forEach((c) => (c.width = 18));

    // Service Mix
    const wsService = wb.addWorksheet("Service_Mix");
    wsService.addRow(["Service", "Count"]);
    for (const x of payload.serviceMix ?? []) wsService.addRow([x.name, safeNum(x.count, 0)]);
    wsService.columns.forEach((c) => (c.width = 20));

    // Payment Mix
    const wsPayment = wb.addWorksheet("Payment_Mix");
    wsPayment.addRow(["Payment", "Count"]);
    for (const x of payload.paymentMix ?? []) wsPayment.addRow([x.name, safeNum(x.count, 0)]);
    wsPayment.columns.forEach((c) => (c.width = 22));

    // Workflow Funnel
    const wsFunnel = wb.addWorksheet("Workflow_Funnel");
    wsFunnel.addRow(["Stage", "Count"]);
    for (const x of payload.workflowFunnel ?? []) wsFunnel.addRow([x.stage, safeNum(x.count, 0)]);
    wsFunnel.columns.forEach((c) => (c.width = 22));

    // Backlog Aging
    const wsAging = wb.addWorksheet("Backlog_Aging");
    wsAging.addRow(["Status", "Aging Bucket", "Count"]);
    for (const x of payload.backlogAging ?? []) wsAging.addRow([x.status_name, x.aging_bucket, safeNum(x.count, 0)]);
    wsAging.columns.forEach((c) => (c.width = 22));

    // Top Agents
    const wsAgents = wb.addWorksheet("Top_Agents");
    wsAgents.addRow(["Agent", "Delivered", "WIP", "Failed", "Total", "SuccessRate(%)"]);
    for (const x of payload.topAgents ?? []) {
      wsAgents.addRow([x.agent_name, safeNum(x.delivered, 0), safeNum(x.wip, 0), safeNum(x.failed, 0), safeNum(x.total, 0), x.success_rate ?? ""]);
    }
    wsAgents.columns.forEach((c) => (c.width = 20));

    // Top Shippers
    const wsShippers = wb.addWorksheet("Top_Shippers");
    wsShippers.addRow(["Shipper", "Delivered", "AvgLeadTime(Hours)"]);
    for (const x of payload.topShippers ?? []) {
      wsShippers.addRow([x.shipper_name, safeNum(x.delivered, 0), x.avg_lead_time_hours ?? ""]);
    }
    wsShippers.columns.forEach((c) => (c.width = 24));

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `courierxpress_reports_${filters.period}.xlsx`);
  }, [payload, filters.period, deliveredSeries, failedSeries, successRateSeries]);

  const exportCsv = useCallback(() => {
    const lines = [];

    lines.push("Top Agents");
    lines.push("agent_name,delivered,wip,failed,total,success_rate");
    for (const a of payload.topAgents ?? []) {
      lines.push(
        `"${(a.agent_name ?? "").replaceAll('"', '""')}",${safeNum(a.delivered, 0)},${safeNum(a.wip, 0)},${safeNum(a.failed, 0)},${safeNum(a.total, 0)},${a.success_rate ?? ""}`
      );
    }

    lines.push("");
    lines.push("Top Shippers");
    lines.push("shipper_name,delivered,avg_lead_time_hours");
    for (const s of payload.topShippers ?? []) {
      lines.push(`"${(s.shipper_name ?? "").replaceAll('"', '""')}",${safeNum(s.delivered, 0)},${s.avg_lead_time_hours ?? ""}`);
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `courierxpress_reports_${filters.period}.csv`);
  }, [payload, filters.period]);

  const getChartDataUrl = (ref) => {
    const inst = ref.current?.getEchartsInstance?.();
    if (!inst) return null;
    return inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
  };

  const exportPdf = useCallback(() => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const title = "CourierXpress - Enterprise Reports";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Period: ${filters.period} | Service: ${filters.service} | Payment: ${filters.payment} | Status: ${filters.status}`, 14, 22);

    // KPI Table
    autoTable(doc, {
      startY: 28,
      head: [["Metric", "Value"]],
      body: [
        ["Revenue", payload.kpi?.revenueFormatted ?? formatVND(payload.kpi?.revenueRaw)],
        ["Total Orders", String(safeNum(payload.kpi?.orders, 0))],
        ["Delivered Rate", formatPct(payload.kpi?.deliveredRate, 1)],
        ["Failed Rate", formatPct(payload.kpi?.failedRate, 1)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    // Add charts (one per page for clarity)
    const charts = [
      { name: "Revenue & Orders Trend", ref: refRevenue },
      { name: "Delivery Performance", ref: refDelivery },
      { name: "Service Mix", ref: refService },
      { name: "Payment Mix", ref: refPayment },
      { name: "Workflow Funnel", ref: refFunnel },
      { name: "Backlog Aging (WIP)", ref: refAging },
      { name: "Top Agents (Highlight)", ref: refAgents },
      { name: "Top Shippers (Highlight)", ref: refShippers },
    ];

    for (const c of charts) {
      const url = getChartDataUrl(c.ref);
      if (!url) continue;

      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(c.name, 14, 16);

      const imgW = pageW - 28;
      const imgH = (imgW * 9) / 16; // 16:9
      const y = 22;

      doc.addImage(url, "PNG", 14, y, imgW, Math.min(imgH, pageH - 30));
    }

    // Tables (Top Agents / Top Shippers)
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Top Agents (Table)", 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["Agent", "Delivered", "WIP", "Failed", "Total", "Success %"]],
      body: (payload.topAgents ?? []).map((a) => [
        a.agent_name ?? "Unknown",
        String(safeNum(a.delivered, 0)),
        String(safeNum(a.wip, 0)),
        String(safeNum(a.failed, 0)),
        String(safeNum(a.total, 0)),
        a.success_rate == null ? "" : String(a.success_rate),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Top Shippers (Table)", 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["Shipper", "Delivered", "Avg Lead Time (h)"]],
      body: (payload.topShippers ?? []).map((s) => [
        s.shipper_name ?? "Unknown",
        String(safeNum(s.delivered, 0)),
        s.avg_lead_time_hours == null ? "" : String(s.avg_lead_time_hours),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`courierxpress_reports_${filters.period}.pdf`);
  }, [filters, payload]);

  /* ==========================
   * RENDER
   * ========================== */
  const kpi = payload.kpi ?? {};
  const topAgent = (payload.topAgents ?? [])[0];
  const topShipper = (payload.topShippers ?? [])[0];

  return (
    <div className="admin-page container-fluid p-0">
      {/* Header */}
      <div className="page-header d-flex justify-content-between mb-4">
        <h3 className="fw-bold m-0">Enterprise Reports</h3>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" className="d-flex align-items-center gap-2" onClick={exportExcel} disabled={loading || !!err}>
            <FaFileExcel /> Export Excel
          </Button>
          <Button variant="outline-secondary" className="d-flex align-items-center gap-2" onClick={exportCsv} disabled={loading || !!err}>
            <FaFileCsv /> Export CSV
          </Button>
          <Button variant="dark" className="d-flex align-items-center gap-2" onClick={exportPdf} disabled={loading || !!err}>
            <FaFilePdf /> Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Label className="small text-muted">Period</Form.Label>
              <Form.Select value={filters.period} onChange={(e) => onFilter("period", e.target.value)}>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="12m">Last 12 Months</option>
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label className="small text-muted">Service</Form.Label>
              <Form.Select value={filters.service} onChange={(e) => onFilter("service", e.target.value)}>
                {Object.keys(SERVICE_LABEL).map((k) => (
                  <option key={k} value={k}>
                    {SERVICE_LABEL[k]}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label className="small text-muted">Payment</Form.Label>
              <Form.Select value={filters.payment} onChange={(e) => onFilter("payment", e.target.value)}>
                {Object.keys(PAYMENT_LABEL).map((k) => (
                  <option key={k} value={k}>
                    {PAYMENT_LABEL[k]}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label className="small text-muted">Status</Form.Label>
              <Form.Select value={filters.status} onChange={(e) => onFilter("status", e.target.value)}>
                <option value="all">All</option>
                {STATUS_META.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={1} className="d-flex justify-content-end">
              {loading ? (
                <div className="d-flex align-items-center gap-2 text-muted">
                  <Spinner size="sm" />
                </div>
              ) : err ? (
                <Badge bg="danger">Error</Badge>
              ) : (
                <Badge bg="success">Live</Badge>
              )}
            </Col>
          </Row>

          {err && <div className="mt-3 text-danger small">{err}</div>}
        </Card.Body>
      </Card>

      {/* KPI */}
      <Row className="g-3 mb-3">
        <Col md={3}>
          <Card className="kpi-item border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Revenue</p>
                  <h2 className="fw-bold my-1">{loading ? "…" : (kpi.revenueFormatted ?? formatVND(kpi.revenueRaw))}</h2>
                </div>
                <FaMoneyBillWave className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="kpi-item border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Total Orders</p>
                  <h2 className="fw-bold my-1">{loading ? "…" : formatInt(kpi.orders)}</h2>
                </div>
                <FaTruck className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="kpi-item border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Delivered Rate</p>
                  <h2 className="fw-bold my-1">{loading ? "…" : formatPct(kpi.deliveredRate, 1)}</h2>
                </div>
                <FaCheck className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="kpi-item border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Failed Rate</p>
                  <h2 className="fw-bold my-1">{loading ? "…" : formatPct(kpi.failedRate, 1)}</h2>
                </div>
                <FaExclamationTriangle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Reports (8) */}
      <Row className="g-3">
        <Col lg={8}>
          <Card className="chart-wrapper border-0 shadow-sm">
            <Card.Body>
              <ReactECharts ref={refRevenue} option={optRevenueOrders} style={{ height: 400 }} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="chart-wrapper border-0 shadow-sm">
            <Card.Body>
              <ReactECharts ref={refService} option={optServiceMix} style={{ height: 400 }} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="chart-wrapper border-0 shadow-sm">
            <Card.Body>
              <ReactECharts ref={refDelivery} option={optDeliveryPerformance} style={{ height: 400 }} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="chart-wrapper border-0 shadow-sm">
            <Card.Body>
              <ReactECharts ref={refPayment} option={optPaymentMix} style={{ height: 400 }} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="chart-wrapper border-0 shadow-sm">
            <Card.Body>
              <ReactECharts ref={refFunnel} option={optWorkflowFunnel} style={{ height: 360 }} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="chart-wrapper border-0 shadow-sm">
            <Card.Body>
              <ReactECharts ref={refAging} option={optBacklogAging} style={{ height: 360 }} />
            </Card.Body>
          </Card>
        </Col>

        {/* Top Agents */}
        <Col lg={12}>
          <Card className="chart-wrapper border-0 shadow-sm">
            <Card.Body>
              <Row className="g-3" style={{ minHeight: 600, alignItems: "stretch" }}>
                <Col lg={8} style={{ display: "flex", flexDirection: "column" }}>
                  <ReactECharts ref={refAgents} option={optTopAgents} style={{ height: "100%", minHeight: 600, flex: 1 }} />
                </Col>
                <Col lg={4} style={{ display: "flex", flexDirection: "column" }}>
                  <Card className="border-0 spotlight-card" style={{ 
                    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
                    borderRadius: "16px",
                    border: "1px solid rgba(0, 123, 255, 0.1)"
                  }}>
                    <Card.Body style={{ padding: "24px" }}>
                      <div className="spotlight-header" style={{
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#64748b",
                        marginBottom: "20px",
                        paddingBottom: "12px",
                        borderBottom: "2px solid rgba(0, 123, 255, 0.15)"
                      }}>
                        ⭐ Agent Spotlight
                      </div>
                      {topAgent ? (
                        <>
                          <div className="spotlight-name" style={{
                            fontSize: "1.5rem",
                            fontWeight: 800,
                            color: "#1e293b",
                            marginBottom: "8px",
                            background: "linear-gradient(135deg, #007bff 0%, #3b82f6 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text"
                          }}>
                            {topAgent.agent_name}
                          </div>
                          <div className="spotlight-metric" style={{
                            fontSize: "0.9rem",
                            color: "#475569",
                            marginBottom: "20px",
                            padding: "10px 14px",
                            background: "rgba(0, 123, 255, 0.05)",
                            borderRadius: "10px",
                            border: "1px solid rgba(0, 123, 255, 0.1)"
                          }}>
                            <span style={{ fontWeight: 600, color: "#1e40af" }}>Success Rate:</span>{" "}
                            <span style={{ fontWeight: 700, color: "#007bff" }}>
                              {topAgent.success_rate == null ? "—" : `${topAgent.success_rate}%`}
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="small" style={{ 
                              color: "#64748b", 
                              fontWeight: 600,
                              marginBottom: "8px",
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                              fontSize: "0.75rem"
                            }}>
                              Delivered Progress
                            </div>
                            <ProgressBar 
                              now={safeNum(topAgent.delivered, 0)} 
                              max={Math.max(1, safeNum(topAgent.total, 0))}
                              style={{
                                height: "12px",
                                borderRadius: "10px",
                                backgroundColor: "rgba(0, 123, 255, 0.1)",
                                overflow: "hidden"
                              }}
                              className="spotlight-progress"
                            />
                            <div style={{
                              marginTop: "8px",
                              fontSize: "0.85rem",
                              color: "#64748b",
                              display: "flex",
                              justifyContent: "space-between"
                            }}>
                              <span>{formatInt(topAgent.delivered)} delivered</span>
                              <span style={{ fontWeight: 600, color: "#007bff" }}>
                                of {formatInt(topAgent.total)} total
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-muted small" style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "#94a3b8",
                          fontStyle: "italic"
                        }}>
                          No agent data in this period.
                        </div>
                      )}

                      <hr />
                      <div className="fw-bold mb-2">Top Agents (Table)</div>
                      <div style={{ maxHeight: 240, overflow: "auto" }}>
                        <Table size="sm" bordered hover responsive className="mb-0">
                          <thead>
                            <tr>
                              <th>Agent</th>
                              <th className="text-end">Delivered</th>
                              <th className="text-end">WIP</th>
                              <th className="text-end">Failed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(payload.topAgents ?? []).map((a) => (
                              <tr key={a.agent_id}>
                                <td>{a.agent_name}</td>
                                <td className="text-end">{formatInt(a.delivered)}</td>
                                <td className="text-end">{formatInt(a.wip)}</td>
                                <td className="text-end">{formatInt(a.failed)}</td>
                              </tr>
                            ))}
                            {(payload.topAgents ?? []).length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center text-muted">No data</td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Top Shippers */}
        <Col lg={12}>
          <Card className="chart-wrapper border-0 shadow-sm">
            <Card.Body>
              <Row className="g-3" style={{ minHeight: 655, alignItems: "stretch" }}>
                <Col lg={8} style={{ display: "flex", flexDirection: "column" }}>
                  <ReactECharts ref={refShippers} option={optTopShippers} style={{ height: "100%", minHeight: 655, flex: 1 }} />
                </Col>
                <Col lg={4} style={{ display: "flex", flexDirection: "column" }}>
                  <Card className="border-0 spotlight-card" style={{ 
                    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
                    borderRadius: "16px",
                    border: "1px solid rgba(34, 197, 94, 0.1)"
                  }}>
                    <Card.Body style={{ padding: "24px" }}>
                      <div className="spotlight-header" style={{
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#64748b",
                        marginBottom: "20px",
                        paddingBottom: "12px",
                        borderBottom: "2px solid rgba(34, 197, 94, 0.15)"
                      }}>
                        🚚 Shipper Spotlight
                      </div>
                      {topShipper ? (
                        <>
                          <div className="spotlight-name" style={{
                            fontSize: "1.5rem",
                            fontWeight: 800,
                            color: "#1e293b",
                            marginBottom: "8px",
                            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text"
                          }}>
                            {topShipper.shipper_name}
                          </div>
                          <div className="spotlight-metric" style={{
                            fontSize: "0.9rem",
                            color: "#475569",
                            marginBottom: "20px",
                            padding: "10px 14px",
                            background: "rgba(34, 197, 94, 0.05)",
                            borderRadius: "10px",
                            border: "1px solid rgba(34, 197, 94, 0.1)"
                          }}>
                            <span style={{ fontWeight: 600, color: "#15803d" }}>Avg Lead Time:</span>{" "}
                            <span style={{ fontWeight: 700, color: "#22c55e" }}>
                              {topShipper.avg_lead_time_hours == null ? "—" : `${topShipper.avg_lead_time_hours}h`}
                            </span>
                          </div>
                          <div className="mt-3" style={{
                            padding: "16px",
                            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)",
                            borderRadius: "12px",
                            border: "1px solid rgba(34, 197, 94, 0.15)"
                          }}>
                            <div className="small" style={{ 
                              color: "#64748b", 
                              fontWeight: 600,
                              marginBottom: "8px",
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                              fontSize: "0.75rem"
                            }}>
                              Total Delivered
                            </div>
                            <div className="fw-bold" style={{
                              fontSize: "2rem",
                              fontWeight: 800,
                              color: "#22c55e",
                              lineHeight: 1.2
                            }}>
                              {formatInt(topShipper.delivered)}
                            </div>
                            <div style={{
                              marginTop: "4px",
                              fontSize: "0.8rem",
                              color: "#64748b"
                            }}>
                              orders completed
                            </div>
                          </div>
                        </>
                      ) : null}

                      <hr />
                      <div className="fw-bold mb-2">Top Shippers (Table)</div>
                      <div style={{ maxHeight: 240, overflow: "auto" }}>
                        <Table size="sm" bordered hover responsive className="mb-0">
                          <thead>
                            <tr>
                              <th>Shipper</th>
                              <th className="text-end">Delivered</th>
                              <th className="text-end">Avg h</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(payload.topShippers ?? []).map((s) => (
                              <tr key={s.shipper_id}>
                                <td>{s.shipper_name}</td>
                                <td className="text-end">{formatInt(s.delivered)}</td>
                                <td className="text-end">{s.avg_lead_time_hours == null ? "—" : s.avg_lead_time_hours}</td>
                              </tr>
                            ))}
                            {(payload.topShippers ?? []).length === 0 && (
                              <tr>
                                <td colSpan={3} className="text-center text-muted">No data</td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
