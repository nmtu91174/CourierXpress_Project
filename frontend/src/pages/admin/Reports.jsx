// frontend/src/pages/admin/Reports.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Card, Row, Col, Button, Table } from "react-bootstrap";
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
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { initPageAnimations } from "../../utils/gsapAnimations";
import "../../assets/styles/reports.css";
import "../../assets/styles/dashboard.css";

/**
 * ENTERPRISE REPORTS (ECharts only)
 * - 4 KPI cards
 * - 4 reports (high-level)
 * - 6 operational analytics (enterprise workflow)
 */

export default function Reports() {
  /* ==========================
   * FILTERS - ENTERPRISE LOGIC
   * ========================== */
  const [filters, setFilters] = useState({
    period: "7d",
    view: "overall", // 👈 TRỤC PHỤ #1 - View Mode
    service: "all", // Contextual - chỉ hiện khi view = "service"
    payment: "all", // Contextual - chỉ hiện khi view = "payment"
    status: "all", // Contextual - chỉ hiện khi view = "workflow"
  });

  /* ==========================
   * ENTERPRISE THEME (clean / less flashy)
   * - Solid colors + low opacity
   * - No tooltip blur
   * - Less shadow
   * ========================== */
  const palette = useMemo(
    () => ({
      blue: "#2563EB",
      cyan: "#0891B2",
      green: "#10B981",
      amber: "#F59E0B",
      violet: "#7C3AED",
      red: "#EF4444",
      slate: "#64748B",
      ink: "#0F172A",
      grid: "rgba(2, 6, 23, 0.07)",
      axis: "rgba(2, 6, 23, 0.22)",
      label: "rgba(2, 6, 23, 0.70)",
      muted: "rgba(2, 6, 23, 0.55)",
    }),
    []
  );

  const luxColors = useMemo(
    () => [palette.blue, palette.green, palette.amber, palette.violet, palette.cyan, palette.red, palette.slate],
    [palette]
  );

  const tooltipLux = useMemo(
    () => ({
      backgroundColor: "rgba(15, 23, 42, 0.96)",
      borderColor: "rgba(148, 163, 184, 0.18)",
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: "#E2E8F0", fontSize: 12 },
      extraCssText: "border-radius: 12px;",
    }),
    []
  );

  const axisLux = useMemo(
    () => ({
      axisLine: { lineStyle: { color: palette.axis } },
      axisTick: { show: false },
      axisLabel: { color: palette.label, fontSize: 11 },
      splitLine: { lineStyle: { color: palette.grid } },
      nameTextStyle: { color: palette.muted, fontWeight: 600 },
    }),
    [palette]
  );

  const legendLux = useMemo(
    () => ({
      bottom: 0,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      textStyle: { color: palette.muted, fontSize: 11 },
      inactiveColor: "rgba(2,6,23,0.28)",
    }),
    [palette]
  );

  /* ==========================
   * GLOBAL HELPERS
   * ========================== */
  const gridAxis = useMemo(
    () => ({
      left: 16,
      right: 16,
      top: 18,
      bottom: 76,
      containLabel: true,
    }),
    []
  );

  const toolboxDefault = useMemo(
    () => ({
      show: true,
      right: 10,
      top: 6,
      iconStyle: {
        borderColor: "rgba(2, 6, 23, 0.38)",
      },
      feature: {
        restore: { show: true },
        saveAsImage: { show: true },
      },
    }),
    []
  );

  // Slider: neutral, không “rực”
  const dataZoomX = useMemo(
    () => [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      {
        type: "slider",
        xAxisIndex: 0,
        height: 14,
        bottom: 18,
        showDetail: false,
        brushSelect: false,
        fillerColor: "rgba(2, 6, 23, 0.08)",
        borderColor: "rgba(2, 6, 23, 0.10)",
        handleStyle: { color: "rgba(2, 6, 23, 0.22)" },
      },
    ],
    []
  );

  const dataZoomY = useMemo(
    () => [
      { type: "inside", yAxisIndex: 0, filterMode: "none" },
      {
        type: "slider",
        yAxisIndex: 0,
        width: 10,
        right: 8,
        top: 24,
        bottom: 24,
        showDetail: false,
        brushSelect: false,
        fillerColor: "rgba(2, 6, 23, 0.08)",
        borderColor: "rgba(2, 6, 23, 0.10)",
        handleStyle: { color: "rgba(2, 6, 23, 0.22)" },
      },
    ],
    []
  );

  const echartCommonProps = useMemo(
    () => ({
      notMerge: true,
      lazyUpdate: true,
      opts: { renderer: "canvas" },
      style: { width: "100%" },
    }),
    []
  );

  const withLux = (opt) => ({
    backgroundColor: "transparent",
    color: luxColors,
    animationDuration: 420,
    textStyle: {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      color: palette.label,
    },
    tooltip: { ...tooltipLux, ...(opt.tooltip || {}) },
    ...opt,
  });

  /* ==========================
   * MOCK DATA
   * ========================== */
  const labels7d = useMemo(() => ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Hôm nay"], []);
  const labels30d = useMemo(() => Array.from({ length: 30 }, (_, i) => `D-${29 - i}`), []);
  const labels12m = useMemo(
    () => ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
    []
  );

  const timeLabels = useMemo(() => {
    if (filters.period === "7d") return labels7d;
    if (filters.period === "30d") return labels30d;
    return labels12m;
  }, [filters.period, labels7d, labels30d, labels12m]);

  const STATUS = useMemo(
    () => [
      { key: "BOOKED", label: "Đã tạo đơn" },
      { key: "APPROVED", label: "Đã duyệt" },
      { key: "ASSIGNED", label: "Đã phân công" },
      { key: "IN_PROGRESS", label: "Đang giao" },
      { key: "DELIVERED", label: "Giao thành công" },
      { key: "FAILED", label: "Giao thất bại" },
    ],
    []
  );

  // ==========================
  // FETCH REAL DATA FROM API
  // ==========================
  const [kpi, setKpi] = useState({
    revenueB: 0,
    orders: 0,
    deliveredRate: 0,
    cancelRate: 0,
  });
  const [reportsData, setReportsData] = useState({
    statusTimeData: [],
    revenueTimeData: [],
    serviceDist: [],
    paymentDist: [],
    workflowData: [],
    agingData: [],
    agentData: [],
    shipperData: [],
    failedRiskData: [],
  });
  const [loading, setLoading] = useState(true);

  // GSAP Animation
  useEffect(() => {
    return initPageAnimations({ kpiSelector: ".kpi-item", chartSelector: ".chart-wrapper" });
  }, []);

  useEffect(() => {
    const fetchReportsData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          period: filters.period,
          view: filters.view,
          service: filters.service,
          payment: filters.payment,
          status: filters.status,
        });

        const res = await fetch(`http://localhost:8888/api/admin/get_reports_data.php?${params.toString()}`, {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status === "success") {
            setKpi(data.data.kpi);
            setReportsData({
              statusTimeData: data.data.statusTimeData || [],
              revenueTimeData: data.data.revenueTimeData || [],
              serviceDist: data.data.serviceDist || [],
              paymentDist: data.data.paymentDist || [],
              workflowData: data.data.workflowData || [],
              agingData: data.data.agingData || [],
              agentData: data.data.agentData || [],
              shipperData: data.data.shipperData || [],
              failedRiskData: data.data.failedRiskData || [],
            });
          }
        }
      } catch (error) {
        console.error("Error fetching reports data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [filters]);

  // Transform API data to chart format
  const serviceDist = useMemo(() => {
    if (reportsData.serviceDist.length === 0) {
      return [{ name: "Standard", value: 52 }, { name: "Express", value: 34 }, { name: "Same-day", value: 14 }];
    }
    const total = reportsData.serviceDist.reduce((sum, item) => sum + parseInt(item.count), 0);
    return reportsData.serviceDist.map((item) => ({
      name: item.service_name || "Unknown",
      value: total > 0 ? Math.round((parseInt(item.count) / total) * 100) : 0,
    }));
  }, [reportsData.serviceDist]);

  const paymentDist = useMemo(() => {
    if (reportsData.paymentDist.length === 0) {
      return [{ name: "Cash", value: 60 }, { name: "Banking", value: 25 }, { name: "Wallet", value: 15 }];
    }
    const total = reportsData.paymentDist.reduce((sum, item) => sum + parseInt(item.count), 0);
    return reportsData.paymentDist.map((item) => ({
      name: item.payment_name || "Unknown",
      value: total > 0 ? Math.round((parseInt(item.count) / total) * 100) : 0,
    }));
  }, [reportsData.paymentDist]);

  const slaBuckets = useMemo(() => ["<2h", "2-4h", "4-8h", "8-12h", ">12h"], []);
  const agingBuckets = useMemo(() => ["<2h", "2-6h", "6-12h", "12-24h", "1-2d", ">2d"], []);

  const topAgents = useMemo(
    () => [
      { name: "Agent #12", delivered: 480, failed: 18, wip: 22 },
      { name: "Agent #07", delivered: 430, failed: 16, wip: 28 },
      { name: "Agent #03", delivered: 390, failed: 14, wip: 26 },
      { name: "Agent #18", delivered: 350, failed: 21, wip: 19 },
      { name: "Agent #05", delivered: 330, failed: 11, wip: 16 },
      { name: "Agent #09", delivered: 305, failed: 9, wip: 20 },
      { name: "Agent #02", delivered: 290, failed: 13, wip: 15 },
    ],
    []
  );

  const topShippers = useMemo(
    () => ["Shipper #09", "Shipper #14", "Shipper #02", "Shipper #21", "Shipper #06", "Shipper #11", "Shipper #03"],
    []
  );

  // Transform API data for charts
  const seriesOrdersByStatus = useMemo(() => {
    if (reportsData.statusTimeData.length === 0) {
      const n = timeLabels.length;
      const mk = (base) => Array.from({ length: n }, (_, i) => Math.max(0, Math.round(base + (i - n / 2) * 1.2)));
      return {
        BOOKED: mk(120),
        APPROVED: mk(110),
        ASSIGNED: mk(95),
        IN_PROGRESS: mk(80),
        DELIVERED: mk(140),
        FAILED: mk(12),
      };
    }

    // Group by date and status
    const grouped = {};
    timeLabels.forEach((label) => {
      STATUS.forEach((s) => {
        if (!grouped[s.key]) grouped[s.key] = [];
        const data = reportsData.statusTimeData.find(
          (d) => d.date_bucket === label && parseInt(d.status) === parseInt(s.key === "BOOKED" ? 1 : s.key === "APPROVED" ? 2 : s.key === "ASSIGNED" ? 3 : s.key === "IN_PROGRESS" ? 4 : s.key === "DELIVERED" ? 5 : 6)
        );
        grouped[s.key].push(data ? parseInt(data.count) : 0);
      });
    });

    return grouped;
  }, [reportsData.statusTimeData, timeLabels, STATUS]);

  const revenueSeries = useMemo(() => {
    if (reportsData.revenueTimeData.length === 0) {
      const n = timeLabels.length;
      return Array.from({ length: n }, (_, i) => Number((1.2 + i * 0.05).toFixed(2)));
    }
    return timeLabels.map((label) => {
      const data = reportsData.revenueTimeData.find((d) => d.date_bucket === label);
      return data ? Number((parseFloat(data.revenue) / 1000000000).toFixed(2)) : 0;
    });
  }, [reportsData.revenueTimeData, timeLabels]);

  const ordersSeries = useMemo(() => {
    if (reportsData.revenueTimeData.length === 0) {
      const n = timeLabels.length;
      return Array.from({ length: n }, (_, i) => Math.round(210 + i * 6));
    }
    return timeLabels.map((label) => {
      const data = reportsData.revenueTimeData.find((d) => d.date_bucket === label);
      return data ? parseInt(data.orders_count) : 0;
    });
  }, [reportsData.revenueTimeData, timeLabels]);

  /* ==========================
   * EXPORT FUNCTIONS
   * ========================== */
  async function exportPDF() {
    const input = document.getElementById("report-wrapper");
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`bao-cao-${filters.period}.pdf`);
  }

  function exportCSV() {
    const data = [
      ["Báo cáo", "Giá trị"],
      ["Doanh thu (Tỷ)", kpi.revenueB],
      ["Tổng đơn", kpi.orders],
      ["Tỷ lệ giao thành công (%)", kpi.deliveredRate],
      ["Tỷ lệ thất bại (%)", kpi.cancelRate],
    ];

    let csv = data.map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bao-cao-${filters.period}.csv`;
    link.click();
  }

  function exportXLSX() {
    const wb = XLSX.utils.book_new();

    // KPI Sheet
    const kpiData = [
      ["Chỉ số", "Giá trị"],
      ["Doanh thu (Tỷ)", kpi.revenueB],
      ["Tổng đơn", kpi.orders],
      ["Tỷ lệ giao thành công (%)", kpi.deliveredRate],
      ["Tỷ lệ thất bại (%)", kpi.cancelRate],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, ws1, "KPI");

    // Service Distribution
    if (reportsData.serviceDist.length > 0) {
      const serviceData = [
        ["Dịch vụ", "Số lượng"],
        ...reportsData.serviceDist.map((item) => [item.service_name || "Unknown", item.count]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(serviceData);
      XLSX.utils.book_append_sheet(wb, ws2, "Phân bố Dịch vụ");
    }

    // Payment Distribution
    if (reportsData.paymentDist.length > 0) {
      const paymentData = [
        ["Phương thức thanh toán", "Số lượng"],
        ...reportsData.paymentDist.map((item) => [item.payment_name || "Unknown", item.count]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(paymentData);
      XLSX.utils.book_append_sheet(wb, ws3, "Phân bố Thanh toán");
    }

    // Workflow
    if (reportsData.workflowData.length > 0) {
      const workflowData = [
        ["Trạng thái", "Số lượng"],
        ...reportsData.workflowData.map((item) => [item.status_name || "Unknown", item.count]),
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(workflowData);
      XLSX.utils.book_append_sheet(wb, ws4, "Quy trình");
    }

    // Agent Quality
    if (reportsData.agentData.length > 0) {
      const agentData = [
        ["Đại lý", "Giao thành công", "Đang xử lý", "Thất bại"],
        ...reportsData.agentData.map((item) => [
          item.agent_name || "Unknown",
          item.delivered,
          item.wip,
          item.failed,
        ]),
      ];
      const ws5 = XLSX.utils.aoa_to_sheet(agentData);
      XLSX.utils.book_append_sheet(wb, ws5, "Chất lượng Đại lý");
    }

    XLSX.writeFile(wb, `bao-cao-${filters.period}.xlsx`);
  }

  /* =========================================================
   * 4 REPORT CHARTS (high-level) — clean style
   * ========================================================= */

  // (R1) Orders by Status (Stacked Area) — very light area (no gradient)
  const optR1_ordersStatusArea = useMemo(() => {
    const series = STATUS.map((s) => ({
      name: s.label,
      type: "line",
      stack: "total",
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.08 }, // ✅ giảm “mờ rực”
      emphasis: { focus: "series" },
      data: seriesOrdersByStatus[s.key],
    }));

    return withLux({
      tooltip: { trigger: "axis", axisPointer: { type: "cross", lineStyle: { color: "rgba(226,232,240,0.35)" } } },
      legend: legendLux,
      toolbox: toolboxDefault,
      grid: gridAxis,
      dataZoom: dataZoomX,
      xAxis: { type: "category", boundaryGap: false, data: timeLabels, ...axisLux },
      yAxis: { type: "value", name: "Đơn hàng", ...axisLux },
      series,
    });
  }, [STATUS, seriesOrdersByStatus, timeLabels, toolboxDefault, gridAxis, dataZoomX, axisLux, legendLux]);

  // (R2) Revenue & Orders (Dual Axis) — revenue line (blue), orders bar (slate)
  const optR2_revenueOrdersDual = useMemo(() => {
    return withLux({
      tooltip: { trigger: "axis", axisPointer: { type: "cross", lineStyle: { color: "rgba(226,232,240,0.35)" } } },
      legend: legendLux,
      toolbox: toolboxDefault,
      grid: gridAxis,
      dataZoom: dataZoomX,
      xAxis: { type: "category", data: timeLabels, ...axisLux },
      yAxis: [
        { type: "value", name: "Doanh thu (Tỷ)", ...axisLux },
        { type: "value", name: "Đơn hàng", ...axisLux },
      ],
      series: [
        {
          name: "Doanh thu (Tỷ)",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3, color: palette.blue },
          itemStyle: { color: palette.blue },
          areaStyle: { opacity: 0.06 },
          data: revenueSeries,
          yAxisIndex: 0,
        },
        {
          name: "Đơn hàng",
          type: "bar",
          barMaxWidth: 18,
          itemStyle: {
            color: "rgba(100, 116, 139, 0.48)",
            borderRadius: [8, 8, 0, 0],
          },
          emphasis: { itemStyle: { color: "rgba(100, 116, 139, 0.62)" } },
          data: ordersSeries,
          yAxisIndex: 1,
        },
      ],
    });
  }, [timeLabels, revenueSeries, ordersSeries, toolboxDefault, gridAxis, dataZoomX, axisLux, legendLux, palette]);

  // (R3) Service Mix (Donut) — remove heavy shadow
  const optR3_serviceMixDonut = useMemo(() => {
    return withLux({
      tooltip: { trigger: "item" },
      legend: legendLux,
      toolbox: toolboxDefault,
      series: [
        {
          name: "Phân bố Dịch vụ",
          type: "pie",
          radius: ["52%", "78%"],
          center: ["50%", "40%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "rgba(255,255,255,0.75)",
            borderWidth: 2,
            shadowBlur: 0, // ✅ bỏ shadow dày
          },
          label: { show: true, formatter: "{b}\n{d}%", color: palette.label, fontWeight: 600 },
          labelLine: { length: 10, length2: 10 },
          emphasis: { scale: true, scaleSize: 5 },
          data: serviceDist,
        },
      ],
    });
  }, [serviceDist, toolboxDefault, legendLux, palette]);

  // (R4) Payment Mix (Rose) — clean borders, no heavy glow
  const optR4_paymentRose = useMemo(() => {
    return withLux({
      tooltip: { trigger: "item" },
      legend: legendLux,
      toolbox: toolboxDefault,
      series: [
        {
          name: "Phân bố Thanh toán",
          type: "pie",
          roseType: "radius",
          radius: ["18%", "80%"],
          center: ["50%", "40%"],
          itemStyle: {
            borderColor: "rgba(255,255,255,0.75)",
            borderWidth: 2,
            shadowBlur: 0,
          },
          label: { show: true, formatter: "{b}\n{d}%", color: palette.label, fontWeight: 600 },
          labelLine: { length: 10, length2: 10 },
          emphasis: { scale: true, scaleSize: 5 },
          data: paymentDist,
        },
      ],
    });
  }, [paymentDist, toolboxDefault, legendLux, palette]);

  /* =========================================================
   * 6 OPERATIONAL ANALYTICS (NO heatmap) — clean style
   * ========================================================= */

  // (T1) SLA Compliance — 100% Stacked Bar (monochrome blue shades)
  const optT1_slaStacked100 = useMemo(() => {
    const services = ["Standard", "Express", "Same-day"];
    const pct = {
      Standard: [58, 22, 12, 5, 3],
      Express: [64, 18, 10, 5, 3],
      "Same-day": [71, 16, 8, 3, 2],
    };

    const shades = [
      "rgba(37, 99, 235, 0.82)",
      "rgba(37, 99, 235, 0.62)",
      "rgba(37, 99, 235, 0.44)",
      "rgba(37, 99, 235, 0.30)",
      "rgba(37, 99, 235, 0.18)",
    ];

    const series = slaBuckets.map((b, i) => ({
      name: b,
      type: "bar",
      stack: "pct",
      barWidth: 18,
      itemStyle: {
        color: shades[i],
        borderRadius: i === slaBuckets.length - 1 ? [0, 10, 10, 0] : 0,
      },
      label: {
        show: true,
        position: "inside",
        formatter: (p) => (p.value >= 9 ? `${p.value}%` : ""),
        color: "rgba(255,255,255,0.92)",
        fontWeight: 700,
        fontSize: 11,
      },
      data: services.map((s) => pct[s][i]),
    }));

    return withLux({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: legendLux,
      toolbox: toolboxDefault,
      grid: { left: 110, right: 16, top: 18, bottom: 76, containLabel: true },
      xAxis: { type: "value", max: 100, name: "Tỷ lệ SLA %", ...axisLux },
      yAxis: { type: "category", data: services, ...axisLux },
      series,
    });
  }, [slaBuckets, toolboxDefault, axisLux, legendLux]);

  // (T2) Workflow Conversion — bar slate + line blue (clean)
  const optT2_workflowConversion = useMemo(() => {
    const stages = ["Booked", "Approved", "Assigned", "In Progress", "Delivered", "Failed"];
    const counts = [3900, 3600, 3200, 3000, 2850, 150];

    const base = counts[0] || 1;
    const conv = counts.map((c) => Number(((c / base) * 100).toFixed(1)));

    return withLux({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: legendLux,
      toolbox: toolboxDefault,
      grid: gridAxis,
      dataZoom: dataZoomX,
      xAxis: { type: "category", data: stages, ...axisLux },
      yAxis: [
        { type: "value", name: "Orders", ...axisLux },
        { type: "value", name: "Conversion %", min: 0, max: 100, ...axisLux },
      ],
      series: [
        {
          name: "Đơn hàng",
          type: "bar",
          barMaxWidth: 30,
          itemStyle: { color: "rgba(100, 116, 139, 0.52)", borderRadius: [10, 10, 0, 0] },
          data: counts,
        },
        {
          name: "Tỷ lệ chuyển đổi %",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 7,
          lineStyle: { width: 3, color: palette.blue },
          itemStyle: { color: palette.blue },
          data: conv,
        },
      ],
    });
  }, [toolboxDefault, gridAxis, dataZoomX, axisLux, legendLux, palette]);

  // (T3) Aging Backlog — stacked bars with slate shades (less colorful) - DỮ LIỆU THẬT
  const optT3_agingBacklogStacked = useMemo(() => {
    let statuses = ["Đã tạo đơn", "Đã duyệt", "Đã phân công", "Đang giao"];
    let matrix = {
      "Đã tạo đơn": [120, 90, 52, 21, 8, 3],
      "Đã duyệt": [80, 76, 40, 18, 7, 2],
      "Đã phân công": [60, 55, 34, 16, 6, 2],
      "Đang giao": [50, 47, 30, 14, 6, 2],
    };

    if (reportsData.agingData.length > 0) {
      const statusMap = { 1: "Đã tạo đơn", 2: "Đã duyệt", 3: "Đã phân công", 4: "Đang giao" };
      const agingMap = { "<2h": 0, "2-6h": 1, "6-12h": 2, "12-24h": 3, "1-2d": 4, ">2d": 5 };
      statuses = [];
      matrix = {};

      reportsData.agingData.forEach((item) => {
        const statusName = statusMap[parseInt(item.status)] || item.status_name;
        if (!statuses.includes(statusName)) {
          statuses.push(statusName);
          matrix[statusName] = [0, 0, 0, 0, 0, 0];
        }
        const agingIdx = agingMap[item.aging_bucket];
        if (agingIdx !== undefined) {
          matrix[statusName][agingIdx] = parseInt(item.count) || 0;
        }
      });
    }

    const shades = [
      "rgba(100, 116, 139, 0.75)",
      "rgba(100, 116, 139, 0.58)",
      "rgba(100, 116, 139, 0.42)",
      "rgba(100, 116, 139, 0.30)",
      "rgba(100, 116, 139, 0.22)",
      "rgba(100, 116, 139, 0.14)",
    ];

    const series = agingBuckets.map((b, i) => ({
      name: b,
      type: "bar",
      stack: "age",
      barMaxWidth: 22,
      itemStyle: { color: shades[i], borderRadius: i === agingBuckets.length - 1 ? [8, 8, 0, 0] : 0 },
      data: statuses.map((s) => (matrix[s] ? matrix[s][i] : 0)),
    }));

    return withLux({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: legendLux,
      toolbox: toolboxDefault,
      grid: gridAxis,
      dataZoom: dataZoomX,
      xAxis: { type: "category", data: statuses, ...axisLux },
      yAxis: { type: "value", name: "Đơn hàng", ...axisLux },
      series,
    });
  }, [reportsData.agingData, agingBuckets, toolboxDefault, gridAxis, dataZoomX, axisLux, legendLux]);

  // (T4) Agent Productivity & Quality — solid colors, no gradient - DỮ LIỆU THẬT
  const optT4_agentQuality = useMemo(() => {
    let names = topAgents.map((a) => a.name);
    let delivered = topAgents.map((a) => a.delivered);
    let wip = topAgents.map((a) => a.wip);
    let failed = topAgents.map((a) => a.failed);

    if (reportsData.agentData.length > 0) {
      names = reportsData.agentData.map((a) => a.agent_name || "Unknown");
      delivered = reportsData.agentData.map((a) => parseInt(a.delivered) || 0);
      wip = reportsData.agentData.map((a) => parseInt(a.wip) || 0);
      failed = reportsData.agentData.map((a) => parseInt(a.failed) || 0);
    }

    const failedTarget = 20;

    return withLux({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: legendLux,
      toolbox: toolboxDefault,
      grid: { left: 110, right: 34, top: 18, bottom: 76, containLabel: true },
      dataZoom: dataZoomY,
      xAxis: { type: "value", name: "Đơn hàng", ...axisLux },
      yAxis: { type: "category", data: names, ...axisLux },
      series: [
        {
          name: "Giao thành công",
          type: "bar",
          stack: "total",
          barMaxWidth: 18,
          itemStyle: { color: "rgba(16, 185, 129, 0.60)", borderRadius: [10, 10, 10, 10] },
          data: delivered,
        },
        {
          name: "Đang xử lý",
          type: "bar",
          stack: "total",
          barMaxWidth: 18,
          itemStyle: { color: "rgba(245, 158, 11, 0.55)", borderRadius: [10, 10, 10, 10] },
          data: wip,
        },
        {
          name: "Thất bại",
          type: "bar",
          stack: "total",
          barMaxWidth: 18,
          itemStyle: { color: "rgba(239, 68, 68, 0.55)", borderRadius: [10, 10, 10, 10] },
          data: failed,
          markLine: {
            symbol: "none",
            label: { formatter: `Mục tiêu thất bại ≤ ${failedTarget}` },
            lineStyle: { color: "rgba(239, 68, 68, 0.55)" },
            data: [{ xAxis: failedTarget }],
          },
        },
      ],
    });
  }, [reportsData.agentData, topAgents, toolboxDefault, dataZoomY, axisLux, legendLux]);

  // (T5) Shipper Lead Time — Boxplot clean
  const optT5_shipperLeadTimeBox = useMemo(() => {
    const boxData = [
      [2.9, 3.6, 4.1, 4.8, 6.0],
      [3.1, 3.9, 4.6, 5.2, 6.4],
      [3.4, 4.2, 5.0, 5.6, 7.1],
      [3.8, 4.6, 5.3, 6.0, 7.8],
      [4.1, 4.9, 5.8, 6.4, 8.6],
      [3.0, 3.7, 4.4, 5.0, 6.3],
      [3.2, 3.9, 4.7, 5.3, 6.9],
    ];
    const outliers = [
      [0, 7.2],
      [1, 7.5],
      [3, 8.9],
      [4, 9.4],
    ];

    return withLux({
      tooltip: { trigger: "item" },
      legend: legendLux,
      toolbox: toolboxDefault,
      grid: { left: 16, right: 34, top: 18, bottom: 76, containLabel: true },
      dataZoom: dataZoomY,
      xAxis: { type: "value", name: "Thời gian giao hàng (giờ)", ...axisLux },
      yAxis: { type: "category", data: topShippers, ...axisLux },
      series: [
        {
          name: "Thời gian giao hàng (Box)",
          type: "boxplot",
          itemStyle: {
            borderWidth: 1,
            borderColor: "rgba(37, 99, 235, 0.45)",
            color: "rgba(37, 99, 235, 0.14)",
          },
          data: boxData,
        },
        {
          name: "Giá trị ngoại lai",
          type: "scatter",
          itemStyle: { color: "rgba(37, 99, 235, 0.85)" },
          data: outliers,
          symbolSize: 9,
        },
      ],
    });
  }, [topShippers, toolboxDefault, dataZoomY, axisLux, legendLux]);

  // (T6) Failed Risk Matrix — Bubble (clean, low shadow)
  const optT6_failedBubbleMatrix = useMemo(() => {
    const services = serviceDist.map((s) => s.name);
    const payments = paymentDist.map((p) => p.name);

    const data = [
      [0, 0, 3.2], [1, 0, 1.4], [2, 0, 0.9],
      [0, 1, 4.8], [1, 1, 2.1], [2, 1, 1.3],
      [0, 2, 6.4], [1, 2, 3.0], [2, 2, 1.8],
    ];

    return withLux({
      tooltip: {
        trigger: "item",
        formatter: (p) => {
          const pay = payments[p.data[0]];
          const srv = services[p.data[1]];
          return `<div style="font-weight:700;margin-bottom:6px;">${srv} • ${pay}</div>
                  Tỷ lệ thất bại: <b>${p.data[2]}%</b>`;
        },
      },
      toolbox: toolboxDefault,
      grid: { left: 110, right: 70, top: 18, bottom: 32, containLabel: true },
      xAxis: { type: "category", data: payments, ...axisLux },
      yAxis: { type: "category", data: services, ...axisLux },
      visualMap: {
        min: 0,
        max: 10,
        calculable: true,
        orient: "vertical",
        right: 10,
        top: "middle",
        inRange: {
          // ✅ giữ tông tốt nhưng dịu hơn
          color: ["rgba(16,185,129,0.55)", "rgba(245,158,11,0.62)", "rgba(239,68,68,0.68)"],
        },
      },
      series: [
        {
          name: "Failed Risk",
          type: "scatter",
          data,
          symbolSize: (val) => Math.max(10, Math.min(44, val[2] * 6.2)),
          itemStyle: {
            borderColor: "rgba(255,255,255,0.75)",
            borderWidth: 1.5,
            shadowBlur: 0, // ✅ bỏ glow
          },
          label: {
            show: true,
            formatter: (p) => `${p.data[2]}%`,
            color: "rgba(2,6,23,0.78)",
            fontWeight: 800,
            backgroundColor: "rgba(255,255,255,0.65)",
            padding: [2, 6],
            borderRadius: 6,
          },
        },
      ],
    });
  }, [serviceDist, paymentDist, toolboxDefault, axisLux]);

  /* ==========================
   * RENDER
   * ========================== */
  return (
    <div className="admin-page" id="report-wrapper">
      {/* HEADER */}
      <div className="page-header">
        <h3 className="fw-bold d-flex align-items-center gap-2">
          <FaChartBar className="text-primary fs-4" />
          Báo Cáo Doanh Nghiệp
        </h3>
      </div>

      {/* KPI - GIỐNG DASHBOARD */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Doanh thu</p>
                  <h2 className="fw-bold my-1">{loading ? "..." : `${kpi.revenueB}B`}</h2>
                </div>
                <FaMoneyBillWave className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Tổng đơn</p>
                  <h2 className="fw-bold my-1">{loading ? "..." : kpi.orders.toLocaleString("vi-VN")}</h2>
                </div>
                <FaTruck className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#ff9800,#ffc107)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Tỷ lệ giao thành công</p>
                  <h2 className="fw-bold my-1">{loading ? "..." : `${kpi.deliveredRate}%`}</h2>
                </div>
                <FaCheck className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Tỷ lệ thất bại</p>
                  <h2 className="fw-bold my-1">{loading ? "..." : `${kpi.cancelRate}%`}</h2>
                </div>
                <FaExclamationTriangle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* FILTERS - DƯỚI KPI */}
      <div className="filter-panel d-flex gap-2 mb-4 flex-wrap align-items-center">
          {/* TRỤC CHÍNH: Time Period */}
          <select
            className="form-select form-select-sm"
            value={filters.period}
            onChange={(e) => setFilters((p) => ({ ...p, period: e.target.value }))}
          >
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
            <option value="12m">12 tháng</option>
          </select>

          {/* TRỤC PHỤ #1: View Mode */}
          <select
            className="form-select form-select-sm"
            value={filters.view}
            onChange={(e) => {
              const newView = e.target.value;
              setFilters((p) => ({
                ...p,
                view: newView,
                // Reset contextual filters when changing view
                service: newView === "service" ? p.service : "all",
                payment: newView === "payment" ? p.payment : "all",
                status: newView === "workflow" ? p.status : "all",
              }));
            }}
          >
            <option value="overall">Tổng quan</option>
            <option value="service">Theo Dịch vụ</option>
            <option value="payment">Theo Thanh toán</option>
            <option value="workflow">Theo Quy trình</option>
          </select>

          {/* CONTEXTUAL FILTERS - Chỉ hiện khi cần */}
          {filters.view === "service" && (
            <select
              className="form-select form-select-sm"
              value={filters.service}
              onChange={(e) => setFilters((p) => ({ ...p, service: e.target.value }))}
            >
              <option value="all">Tất cả dịch vụ</option>
              <option value="standard">Tiêu chuẩn</option>
              <option value="express">Hỏa tốc</option>
              <option value="sameday">Siêu tốc</option>
            </select>
          )}

          {filters.view === "payment" && (
            <select
              className="form-select form-select-sm"
              value={filters.payment}
              onChange={(e) => setFilters((p) => ({ ...p, payment: e.target.value }))}
            >
              <option value="all">Tất cả phương thức</option>
              <option value="cash">Tiền mặt</option>
              <option value="banking">Chuyển khoản</option>
              <option value="wallet">Ví điện tử</option>
            </select>
          )}

          {filters.view === "workflow" && (
            <select
              className="form-select form-select-sm"
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="all">Tất cả trạng thái</option>
              {STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          )}

          <Button size="sm" variant="dark" onClick={exportPDF} className="ms-auto">
            <FaFilePdf className="me-2" /> Xuất PDF
          </Button>
          <Button size="sm" variant="success" onClick={exportCSV}>
            <FaFileCsv className="me-2" /> Xuất CSV
          </Button>
          <Button size="sm" variant="primary" onClick={exportXLSX}>
            <FaFileExcel className="me-2" /> Xuất Excel
          </Button>
        </div>

      {/* 4 BÁO CÁO CHIẾN LƯỢC */}
      <Row className="g-3 mb-3">
        <Col md={8}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-2">Báo cáo 1 — Đơn hàng theo Trạng thái (Stacked Area)</h6>
            <ReactECharts option={optR1_ordersStatusArea} {...echartCommonProps} style={{ height: 360, width: "100%" }} />
          </Card>
        </Col>
        <Col md={4}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-2">Báo cáo 3 — Phân bố Dịch vụ (Donut)</h6>
            <ReactECharts option={optR3_serviceMixDonut} {...echartCommonProps} style={{ height: 360, width: "100%" }} />
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={8}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-2">Báo cáo 2 — Doanh thu & Đơn hàng (Dual Axis)</h6>
            <ReactECharts option={optR2_revenueOrdersDual} {...echartCommonProps} style={{ height: 360, width: "100%" }} />
          </Card>
        </Col>
        <Col md={4}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-2">Báo cáo 4 — Phân bố Thanh toán (Rose)</h6>
            <ReactECharts option={optR4_paymentRose} {...echartCommonProps} style={{ height: 360, width: "100%" }} />
          </Card>
        </Col>
      </Row>

      {/* 6 BẢNG PHÂN TÍCH VẬN HÀNH */}
      <Row className="g-3 mb-3">
        <Col md={7}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-2">Bảng 1 — Tuân thủ SLA (100% Stacked Bar)</h6>
            <ReactECharts option={optT1_slaStacked100} {...echartCommonProps} style={{ height: 340, width: "100%" }} />
          </Card>
        </Col>
        <Col md={5}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-2">Bảng 2 — Chuyển đổi Quy trình & Rò rỉ</h6>
            <ReactECharts option={optT2_workflowConversion} {...echartCommonProps} style={{ height: 340, width: "100%" }} />
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col md={6}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-2">Bảng 3 — Tồn đọng theo Thời gian (Stacked Distribution)</h6>
            <ReactECharts option={optT3_agingBacklogStacked} {...echartCommonProps} style={{ height: 340, width: "100%" }} />
          </Card>
        </Col>
        <Col md={6}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-2">Bảng 4 — Năng suất & Chất lượng Đại lý</h6>
            <ReactECharts option={optT4_agentQuality} {...echartCommonProps} style={{ height: 340, width: "100%" }} />
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col md={7}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-2">Bảng 5 — Thời gian giao hàng Shipper (Boxplot)</h6>
            <ReactECharts option={optT5_shipperLeadTimeBox} {...echartCommonProps} style={{ height: 340, width: "100%" }} />
          </Card>
        </Col>
        <Col md={5}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-2">Bảng 6 — Ma trận Rủi ro Thất bại (Bubble)</h6>
            <ReactECharts option={optT6_failedBubbleMatrix} {...echartCommonProps} style={{ height: 340, width: "100%" }} />
          </Card>
        </Col>
      </Row>

      
    </div>
  );
}
