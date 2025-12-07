// frontend/src/pages/admin/Reports.jsx
  "use client";
  import React, { useEffect, useRef, useState } from "react";
  import {
    Card, Row, Col, Table, Button, Modal
  } from "react-bootstrap";

  import {
    FaChartBar, FaMapMarkerAlt, FaFilePdf,
    FaMoneyBillWave, FaTruck, FaCheck, FaExclamationTriangle
  } from "react-icons/fa";

  import { Bar, Line, Pie } from "react-chartjs-2";

  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    LineElement,
    PointElement,
    Tooltip,
    Legend
  } from "chart.js";

  import jsPDF from "jspdf";
  import html2canvas from "html2canvas";
  import gsap from "gsap";

  import "../../assets/styles/reports.css";

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    LineElement,
    PointElement,
    Tooltip,
    Legend
  );

  export default function Reports() {

    // ========================================
    // STATE
    // ========================================
    const [filter, setFilter] = useState("12m");
    const [modalData, setModalData] = useState(null);

    const pageRef  = useRef(null);
    const chartRef = useRef(null);

    // ========================================
    // PAGE LOAD ANIMATION
    // ========================================
    useEffect(() => {
      gsap.from(pageRef.current, {
        opacity: 0,
        y: 50,
        duration: 0.6,
        ease: "power2.out"
      });
    }, []);

    // ========================================
    // DATA
    // ========================================
    const branches = ["Hà Nội","HCM","Đà Nẵng","Cần Thơ"];
    const ordersByBranch = [32,21,18,9];

    const provinces = [
      "Hà Nội","HCM","Đà Nẵng","Cần Thơ",
      "Hải Phòng","Quảng Ninh","Nghệ An","Bình Dương"
    ];
    const revenueByProvince = [820,780,590,450,420,380,320,300];
    const cancelRate = [3,6,4,2,5,3,2,4];

    const agentStatusLabels = ["Hoạt động","Tạm dừng","Ngừng hoạt động"];
    const agentStatusData = [40,12,6];

    const customerLabels = ["VIP", "Thân thiết", "Mới"];
    const customerPieData = [25, 45, 30];

    const months = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];
    const delivered = [28,32,25,35,40,41,36,30,32,34,39,45];
    const inTransit = [10,12,9,13,15,17,20,18,16,14,12,11];
    const cancelled  = [2,1,3,2,2,4,6,5,4,3,3,2];
    const revenueMonthly = [120,135,140,150,170,180,160,190,210,205,240,260];
    const ordersMonthly  = [210,225,235,250,260,270,290,305,310,320,330,350];

    // ========================================
    // FILTER LOGIC
    // ========================================
    function monthRange(val) {
      switch(val) {
        case "3m": return { start:9, end:12 };
        case "6m": return { start:6, end:12 };
        case "12m": return { start:0, end:12 };

        case "Q1": return { start:0, end:3 };
        case "Q2": return { start:3, end:6 };
        case "Q3": return { start:6, end:9 };
        case "Q4": return { start:9, end:12 };

        case "2025": return { start:0, end:12 };
        case "2024": return { start:0, end:12 };
        case "2023": return { start:0, end:12 };

        default: return { start:0, end:12 };
      }
    }

    const {start, end} = monthRange(filter);

    const monthsFiltered      = months.slice(start, end);
    const deliveredFiltered   = delivered.slice(start, end);
    const inTransitFiltered   = inTransit.slice(start, end);
    const cancelledFiltered   = cancelled.slice(start, end);
    const revenueFiltered     = revenueMonthly.slice(start, end);
    const ordersFiltered      = ordersMonthly.slice(start, end);

    // ========================================
    // CHART DATA
    // ========================================
    const chartOrdersByBranch = {
      labels: branches,
      datasets: [{
        label: "Số đơn hàng",
        data: ordersByBranch,
        backgroundColor: ["#0d6efd","#4caf50","#ffeb3b","#f44336"],
        borderRadius: 8
      }]
    };

    const chartOrderStatusMonthly = {
      labels: monthsFiltered,
      datasets: [
        { label: "Đã giao", data: deliveredFiltered, backgroundColor: "#4caf50", stack: "stack1" },
        { label: "Đang vận chuyển", data: inTransitFiltered, backgroundColor: "#ff9800", stack: "stack1" },
        { label: "Huỷ / thất bại", data: cancelledFiltered, backgroundColor: "#f44336", stack: "stack1" }
      ]
    };

    const chartRevenueMonthly = {
      labels: monthsFiltered,
      datasets: [{
        label: "Doanh thu (triệu VND)",
        data: revenueFiltered,
        borderColor: "#4caf50",
        backgroundColor: "rgba(76,175,80,0.2)",
        tension: 0.4
      }]
    };

    const chartOrdersMonthly = {
      labels: monthsFiltered,
      datasets: [{
        label: "Số lượng đơn",
        data: ordersFiltered,
        borderColor: "#2196f3",
        backgroundColor: "rgba(33,150,243,0.2)",
        tension: 0.4
      }]
    };

    const chartRevenueByProvince = {
      labels: provinces,
      datasets: [{
        label: "Doanh thu (triệu VND)",
        data: revenueByProvince,
        backgroundColor: "#ff9800",
        borderRadius: 6
      }]
    };

    const chartCancelRate = {
      labels: provinces,
      datasets: [{
        label: "% đơn huỷ",
        data: cancelRate,
        backgroundColor: "#f44336",
        borderRadius: 6
      }]
    };

    const chartAgentStatus = {
      labels: agentStatusLabels,
      datasets: [{
        data: agentStatusData,
        backgroundColor: ["#4caf50","#ffc107","#f44336"],
      }]
    };

    const chartCustomerStatus = {
      labels: customerLabels,
      datasets: [{
        data: customerPieData,
        backgroundColor: ["#6a5acd","#03a9f4","#9c27b0"]
      }]
    };

    // ========================================
    // MODAL HANDLER
    // ========================================
    function handleBarClick(_, elements) {
      if (!elements.length) return;
      const idx = elements[0].index;

      setModalData({
        province: provinces[idx],
        revenue: revenueByProvince[idx],
        cancel: cancelRate[idx]
      });
    }

    // ========================================
    // EXPORT PDF (MULTI PAGE)
    // ========================================
    function exportPDF() {
      const input = document.getElementById("report-wrapper");

      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth  = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgWidth  = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position   = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save("logistics-report.pdf");
      });
    }

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="admin-page" ref={pageRef} id="report-wrapper">

      {/* HEADER + FILTER */}
      <div className="page-header d-flex flex-column">
        <h3 className="fw-bold d-flex align-items-center gap-3">
          <FaChartBar className="text-primary fs-3" />
          Báo cáo & Phân tích hiệu suất toàn quốc
        </h3>

        <div className="d-flex flex-wrap gap-2 mt-3">

{/* FILTER PANEL (POWER BI STYLE) */}
<div className="filter-panel d-flex gap-3 align-items-center mt-3">


  {/* YEAR */}
  <select
    className="form-select form-select-sm w-auto"
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
  >
    <option value="2025">2025</option>
    <option value="2024">2024</option>
    <option value="2023">2023</option>
  </select>

  {/* MONTH RANGE */}
  <select
    className="form-select form-select-sm w-auto"
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
  >
    <option value="3m">3 tháng</option>
    <option value="6m">6 tháng</option>
    <option value="12m">12 tháng</option>
  </select>

  {/* QUARTER */}
  <select
    className="form-select form-select-sm w-auto"
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
  >
    <option value="Q1">Quý 1</option>
    <option value="Q2">Quý 2</option>
    <option value="Q3">Quý 3</option>
    <option value="Q4">Quý 4</option>
  </select>


  {/* PDF EXPORT */}
  <Button size="sm" variant="dark" onClick={exportPDF}>
    <FaFilePdf className="me-2" /> Xuất PDF
  </Button>
</div>


        </div>
      </div>


      {/* KPI */}
      <Row className="g-4 mb-5">
        <Col md={3}><Card className="kpi-card kpi-green"><p><FaMoneyBillWave /> Tổng doanh thu</p><h2>₫ 12.8B</h2></Card></Col>
        <Col md={3}><Card className="kpi-card kpi-blue"><p><FaTruck /> Tổng đơn hàng</p><h2>3,650</h2></Card></Col>
        <Col md={3}><Card className="kpi-card kpi-yellow"><p><FaCheck /> Tỉ lệ giao</p><h2>94%</h2></Card></Col>
        <Col md={3}><Card className="kpi-card kpi-red"><p><FaExclamationTriangle /> Tỉ lệ huỷ</p><h2>4%</h2></Card></Col>
      </Row>


      {/* ALL CHARTS */}
      <div key={filter} ref={chartRef} style={{ marginTop: "-33px" }}>

        {/* ROW 1 */}
        <Row className="g-3 mb-3">
          <Col md={6}>
            <Card className="card-lux p-3">
              <h5 className="fw-bold mb-3">Đơn hàng theo chi nhánh</h5>
              <Bar data={chartOrdersByBranch} />
            </Card>
          </Col>

          <Col md={6}>
            <Card className="card-lux p-3">
              <h5 className="fw-bold mb-3">Trạng thái đơn hàng (stacked)</h5>
              <Bar
                data={chartOrderStatusMonthly}
                options={{
                  plugins:{ legend:{ position:"bottom" }},
                  scales:{ x:{ stacked:true }, y:{ stacked:true }}
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* ROW 2 */}
        <Row className="g-3 mb-3">
          <Col md={6}>
            <Card className="card-lux p-3">
              <h5 className="fw-bold mb-3">Doanh thu theo tỉnh</h5>
              <Bar data={chartRevenueByProvince} options={{ onClick: handleBarClick }} />
            </Card>
          </Col>

          <Col md={6}>
            <Card className="card-lux p-3">
              <h5 className="fw-bold mb-3">% đơn huỷ theo tỉnh</h5>
              <Bar data={chartCancelRate} options={{ onClick: handleBarClick }} />
            </Card>
          </Col>
        </Row>

        {/* ROW 3 */}
        <Row className="g-3 mb-3">
          <Col md={6}>
            <Card className="card-lux p-3">
              <h5 className="fw-bold mb-3">Xu hướng doanh thu</h5>
              <Line data={chartRevenueMonthly} />
            </Card>
          </Col>

          <Col md={6}>
            <Card className="card-lux p-3">
              <h5 className="fw-bold mb-3">Xu hướng đơn hàng</h5>
              <Line data={chartOrdersMonthly} />
            </Card>
          </Col>
        </Row>

        {/* ROW 4 */}
        <Row className="g-3 mb-3">
          <Col md={6}>
            <Card className="card-lux p-3">
              <h5 className="fw-bold mb-3">Tình trạng đại lý</h5>
              <div style={{ height: 320 }}>
                <Pie data={chartAgentStatus} />
              </div>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="card-lux p-3">
              <h5 className="fw-bold mb-3">Cơ cấu khách hàng</h5>
              <div style={{ height: 320 }}>
                <Pie data={chartCustomerStatus} />
              </div>
            </Card>
          </Col>
        </Row>


        {/* HIGHLIGHT TABLES */}
        <Row className="g-4 mb-5">

          <Col md={6}>
            <Card className="card-lux p-3">
              <h5 className="fw-bold mb-3">Đại lý nổi bật</h5>
              <Table borderless size="sm">
                <tbody>
                  <tr><td>Hà Nội</td><td className="text-success fw-bold">+18%</td></tr>
                  <tr><td>Đà Nẵng</td><td className="text-success fw-bold">+12%</td></tr>
                  <tr><td>HCM</td><td className="text-danger fw-bold">-6%</td></tr>
                </tbody>
              </Table>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="card-lux p-3">
              <h5 className="fw-bold mb-3">Khách hàng nổi bật</h5>
              <Table borderless size="sm">
                <tbody>
                  <tr><td>Shop ABC (Hà Nội)</td><td className="text-success fw-bold">+32%</td></tr>
                  <tr><td>Cty DK – Đà Nẵng</td><td className="text-success fw-bold">+21%</td></tr>
                  <tr><td>Shop Long – Hải Phòng</td><td className="text-danger fw-bold">-8%</td></tr>
                </tbody>
              </Table>
            </Card>
          </Col>

        </Row>
      </div>


      {/* AI INSIGHTS */}
      <Card className="card-lux p-4 mb-5">
        <h6 className="fw-bold mb-2">AI nhận xét & đề xuất</h6>
        <p className="text-muted small mb-0">
          Hà Nội và HCM chiếm hơn 40% tổng doanh thu toàn hệ thống → tập trung kho và shipper.
        </p>
        <p className="text-muted small mb-0">
          Quảng Ninh và HCM có tỉ lệ huỷ cao → triển khai gọi xác minh trước khi nhận hàng.
        </p>
        <p className="text-muted small mb-0">
          Đà Nẵng tăng đều → đề xuất mở mini-hub để giảm tải giờ cao điểm.
        </p>
      </Card>


      {/* MODAL */}
      {modalData && (
        <Modal show onHide={() => setModalData(null)}>
          <Modal.Header closeButton>
            <Modal.Title>
              <FaMapMarkerAlt className="me-2" />
              {modalData.province}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <p><strong>Doanh thu:</strong> {modalData.revenue} triệu VND</p>
            <p><strong>Tỷ lệ huỷ:</strong> {modalData.cancel}%</p>

            <h6 className="mt-4 fw-bold">Đề xuất</h6>
            <ul className="small">
              <li>Tăng shipper giờ cao điểm.</li>
              <li>Xác minh địa chỉ trước khi pick-up.</li>
              <li>Tối ưu tuyến phân phối.</li>
            </ul>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}
