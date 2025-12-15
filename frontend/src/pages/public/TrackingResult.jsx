// src/pages/public/TrackingResult.jsx

// 1. Nhập khẩu công cụ
import React, { useEffect, useState } from "react";
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
// Import mấy cái icon đẹp đẹp (Mũi tên, Xe tải, Dấu tích)
import { FaArrowLeft, FaTruck, FaCheckCircle, FaBox } from 'react-icons/fa';

const TrackingResult = () => {
    // Lấy mã vận đơn từ trên đường dẫn xuống
    const { id } = useParams();

    // 2. TẠO DỮ LIỆU GIẢ (MOCK DATA)
    // Đây là một "Đối tượng" (Object) chứa toàn bộ thông tin của một đơn hàng
    const mockData = {
        trackingId: id,
        status: "Đang vận chuyển",
        sender: "Nguyễn Văn A - Hà Nội",
        receiver: "Trần Thị B - TP.HCM",
        shipper_id: 4, // 👈 ID shipper trong DB
        timeline: [
            { time: "08:00 05/10/2023", event: "Đã giao hàng thành công", completed: false },
            { time: "14:30 04/10/2023", event: "Đang vận chuyển đến kho Quận 1", completed: true },
            { time: "09:00 03/10/2023", event: "Đã lấy hàng từ người gửi", completed: true },
            { time: "08:00 03/10/2023", event: "Đơn hàng đã được tạo", completed: true },
        ]
    };

    const calcExperience = (createdAt) => {
        if (!createdAt) return "Chưa rõ";

        const start = new Date(createdAt);
        const now = new Date();

        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();

        if (months < 0) {
            years--;
            months += 12;
        }

        if (years <= 0) {
            return `${months} tháng kinh nghiệm`;
        }

        return `${years} năm ${months} tháng kinh nghiệm`;
    };
    const [shipper, setShipper] = useState(null);

        useEffect(() => {
        if (!mockData.shipper_id) return;

        fetch(`http://localhost:8889/api/shipper/get_shipper_info.php?id=${mockData.shipper_id}`)
            .then(res => res.json())
            .then(data => {
            if (data.status === "success") {
                setShipper(data.shipper);
            }
            })
            .catch(err => console.error("Load shipper error", err));
        }, [mockData.shipper_id]);


    return (
        <Container className="py-5">
            {/* Nút quay lại trang chủ cho đỡ lạc đường */}
            <Link to="/" className="text-decoration-none mb-4 d-inline-block">zzz
                <FaArrowLeft className="me-2" /> Quay lại trang chủ
            </Link>

            <h2 className="fw-bold mb-4">
                Mã vận đơn: <span className="text-primary">{id}</span>
            </h2>

            <Row>
                {/* CỘT TRÁI: THÔNG TIN CHUNG (Trên Mobile chiếm hết 12 cột, trên PC chiếm 4 cột) */}
                <Col xs={12} md={4} className="mb-4">
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-primary text-white fw-bold">
                            <FaBox className="me-2" /> Thông tin kiện hàng
                            {shipper && (
                                <Card className="shadow-sm border-0 mt-4">
                                    <Card.Header className="bg-success text-white fw-bold">
                                    🚚 Shipper phụ trách
                                    </Card.Header>

                                    <Card.Body>
                                    <div className="d-flex align-items-center mb-3">
                                        <img
                                        src={shipper.avatar || "https://via.placeholder.com/80"}
                                        className="rounded-circle me-3"
                                        width="70"
                                        height="70"
                                        alt="shipper"
                                        />
                                        <div>
                                        <h6 className="fw-bold mb-1">{shipper.name}</h6>
                                        <small className="text-muted">
                                            {calcExperience(shipper.created_at)}
                                        </small>
                                        </div>
                                    </div>

                                    <p className="mb-1">
                                        <strong>SĐT:</strong> {shipper.phone}
                                    </p>
                                    <p className="mb-0">
                                        <strong>Biển số xe:</strong> {shipper.vehicle_plate}
                                    </p>
                                    </Card.Body>
                                </Card>
                                )}

                        </Card.Header>
                        <Card.Body>
                            <p><strong>Người gửi:</strong><br /> {mockData.sender}</p>
                            <hr />
                            <p><strong>Người nhận:</strong><br /> {mockData.receiver}</p>
                            <hr />
                            {/* Cái nhãn (Badge) màu vàng để hiện trạng thái cho nổi bật */}
                            <p className="mb-0">
                                <strong>Trạng thái: </strong>
                                <Badge bg="warning" text="dark" className="ms-2">
                                    {mockData.status}
                                </Badge>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>

                {/* CỘT PHẢI: TIMELINE HÀNH TRÌNH (Phần khó nhất đây ạ) */}
                <Col xs={12} md={8}>
                    <Card className="shadow-sm border-0">
                        <Card.Body>
                            <h5 className="fw-bold mb-4">Hành trình chi tiết</h5>

                            {/* KỸ THUẬT VÒNG LẶP (MAP) 
                                Chú tưởng tượng mockData.timeline là một danh sách 4 dòng.
                                Hàm map() sẽ chạy qua từng dòng một (gọi là item) và biến nó thành giao diện HTML.
                            */}
                            <div className="timeline-container">
                                {mockData.timeline.map((item, index) => (
                                    <div key={index} className="d-flex mb-4">

                                        {/* 1. Cột Icon bên trái */}
                                        <div className="me-3 d-flex flex-column align-items-center">
                                            {/* Logic: Nếu completed=true (đã xong) thì màu xanh (bg-success), ngược lại màu xám (bg-light) */}
                                            <div className={`rounded-circle p-2 ${item.completed ? 'bg-success text-white' : 'bg-light text-muted'}`}>
                                                {/* Nếu là dòng đầu tiên (index 0) thì hiện dấu tích, còn lại hiện xe tải */}
                                                {index === 0 ? <FaCheckCircle /> : <FaTruck />}
                                            </div>
                                            {/* Đường kẻ nối (chỉ hiện nếu không phải dòng cuối cùng) */}
                                            {index !== mockData.timeline.length - 1 && (
                                                <div className="flex-grow-1 bg-light" style={{ width: '2px', minHeight: '30px' }}></div>
                                            )}
                                        </div>

                                        {/* 2. Cột Nội dung bên phải */}
                                        <div>
                                            <small className="text-muted">{item.time}</small>
                                            {/* Nếu đã xong thì chữ đậm (fw-bold), chưa xong thì chữ mờ */}
                                            <p className={`mb-0 ${item.completed ? 'fw-bold text-dark' : 'text-muted'}`}>
                                                {item.event}
                                            </p>
                                        </div>

                                    </div>
                                ))}
                            </div>

                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default TrackingResult;