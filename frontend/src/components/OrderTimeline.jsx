// src/components/OrderTimeline.jsx
import React from 'react';
import { FaCheckCircle, FaTruck, FaBox, FaMapMarkerAlt, FaHome, FaTimesCircle } from 'react-icons/fa';

// Các trạng thái đơn hàng (Dựa trên bảng 'statuses' của bạn)
const STATUS_STEPS = [
    { id: 1, code: 'booked', label: 'Đặt hàng' },
    { id: 2, code: 'approved', label: 'Đã duyệt' },
    { id: 3, code: 'assigned', label: 'Đã nhận đơn' },
    { id: 4, code: 'picked_up', label: 'Đã lấy hàng' },
    { id: 5, code: 'delivered', label: 'Đã giao' },
];

const getStatusIcon = (code) => {
    switch (code) {
        case 'booked': return FaBox;
        case 'approved': return FaCheckCircle;
        case 'assigned': return FaTruck;
        case 'picked_up': return FaMapMarkerAlt;
        case 'delivered': return FaHome;
        default: return FaTimesCircle;
    }
}

// Màu chủ đạo
const COLOR_PRIMARY = '#004792'; // Xanh đậm
const COLOR_ACCENT = '#E9522F'; // Cam/Đỏ

const OrderTimeline = ({ currentStatus }) => {
    // Tìm ID của trạng thái hiện tại
    const currentStatusStep = STATUS_STEPS.find(s => s.code === currentStatus);
    const currentStatusId = currentStatusStep ? currentStatusStep.id : 0;
    
    // Xử lý trường hợp Giao thất bại (Failed) - Sử dụng ID 6 trong DB
    const isFailed = currentStatus === 'failed';

    return (
        <div className="order-timeline">
            <div className="d-flex justify-content-between position-relative">
                {/* Thanh ngang chính - nền xám */}
                <div 
                    className="position-absolute top-50 start-0 end-0" 
                    style={{ height: '3px', backgroundColor: '#e0e0e0', zIndex: 0 }}
                ></div>
                
                {/* Thanh tiến trình (highlighted bar) */}
                <div 
                    className="position-absolute top-50 start-0" 
                    style={{ 
                        height: '3px', 
                        backgroundColor: isFailed ? '#dc3545' : COLOR_PRIMARY, // Màu đỏ nếu thất bại
                        width: `${((currentStatusId - 1) / (STATUS_STEPS.length - 1)) * 100}%`,
                        transition: 'width 0.5s ease',
                        zIndex: 1
                    }}
                ></div>

                {STATUS_STEPS.map((step, index) => {
                    const isActive = step.id === currentStatusId;
                    const isCompleted = step.id < currentStatusId;
                    const IconComponent = getStatusIcon(step.code);

                    let iconStyle = { 
                        backgroundColor: '#fff', 
                        color: '#bbb', // Màu xám mặc định
                        border: `3px solid ${isFailed ? '#dc3545' : '#bbb'}`
                    };

                    if (isCompleted) {
                        iconStyle = { 
                            backgroundColor: COLOR_PRIMARY, 
                            color: '#fff', 
                            border: `3px solid ${COLOR_PRIMARY}`
                        };
                    } else if (isActive) {
                        iconStyle = { 
                            backgroundColor: COLOR_ACCENT, // Màu cam/đỏ cho bước hiện tại
                            color: '#fff', 
                            border: `3px solid ${COLOR_ACCENT}`,
                            boxShadow: `0 0 0 5px rgba(233, 82, 47, 0.3)` // Hiệu ứng tỏa sáng
                        };
                    }

                    return (
                        <div key={step.id} className="text-center timeline-step" style={{ flex: 1, minWidth: 0, zIndex: 2 }}>
                            
                            {/* Icon */}
                            <div 
                                className="d-flex align-items-center justify-content-center mx-auto mb-2"
                                style={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: '50%', 
                                    transition: 'all 0.3s ease',
                                    ...iconStyle
                                }}
                            >
                                <IconComponent size={18} />
                            </div>

                            {/* Label */}
                            <small 
                                className={`fw-bold text-wrap ${isActive ? 'text-dark' : 'text-muted'}`}
                                style={{ fontSize: '0.75rem', display: 'block' }}
                            >
                                {step.label}
                            </small>
                            
                            {/* Thời gian cập nhật (Nếu có logic cập nhật thời gian ở đây) */}
                            {/* <small style={{ fontSize: '0.65rem' }}>{step.time}</small> */}

                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrderTimeline;