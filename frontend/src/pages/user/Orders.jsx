import { useEffect, useState } from "react";
import axios from "axios";
import "./Orders.css";
import { useNavigate } from "react-router-dom";


export default function Orders() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user?.id;

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        if (!userId) return;

        axios.post("http://localhost:8888/get_orders.php", {
            user_id: userId
        })
        .then(res => {
            if (res.data.status === "success") {
                setOrders(res.data.orders);
            }
        })
        .catch(() => {
            console.log("Lỗi khi lấy dữ liệu!");
        })
        .finally(() => {
            setLoading(false);
        });
    }, [userId]);

    const getStatusColor = (status) => {
        const statusMap = {
            'pending': 'status-pending',
            'processing': 'status-processing',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        return statusMap[status] || 'status-default';
    };

    // Lọc theo tab
    const filteredOrders = orders.filter(order => {
        if (activeTab === "all") return true;
        return order.status === activeTab;
    }).filter(order =>
        order.order_code.toLowerCase().includes(search.toLowerCase())
    );

    if (!userId) {
        return (
            <div className="orders-container">
                <div className="empty-state">
                    <div className="empty-icon">🔒</div>
                    <h3>Vui lòng đăng nhập</h3>
                    <p>Bạn cần đăng nhập để xem lịch sử đơn hàng</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="orders-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Đang tải đơn hàng...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="orders-container">

            {/* Header */}
            <h1 className="page-title">Order History</h1>

            {/* Tabs */}
            <div className="order-tabs">
                <button 
                    className={activeTab === "all" ? "active" : ""} 
                    onClick={() => setActiveTab("all")}
                >
                    All Orders ({orders.length})
                </button>

                <button 
                    className={activeTab === "pending" ? "active" : ""} 
                    onClick={() => setActiveTab("pending")}
                >
                    Pending
                </button>

                <button 
                    className={activeTab === "completed" ? "active" : ""} 
                    onClick={() => setActiveTab("completed")}
                >
                    Completed
                </button>

                <button 
                    className={activeTab === "cancelled" ? "active" : ""} 
                    onClick={() => setActiveTab("cancelled")}
                >
                    Cancelled
                </button>
            </div>

            {/* Search + Filters */}
            <div className="order-filters">
                <input 
                    type="text" 
                    placeholder="Search order code..." 
                    className="search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="date-filters">
                    <input type="date" />
                    <span>To</span>
                    <input type="date" />
                </div>

                <select className="sort-select">
                    <option>Sort By</option>
                    <option>Mới nhất</option>
                    <option>Cũ nhất</option>
                    <option>Giá cao → thấp</option>
                    <option>Giá thấp → cao</option>
                </select>
            </div>

            {/* Table */}
            <div className="orders-table tab-content">
                <table>
                    <thead>
                        <tr>
                            <th>Id</th>
                            <th>Product</th>
                            <th>Payment</th>
                            <th>Service</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Detail</th> 
                        </tr>
                    </thead>

                    <tbody>
                        {filteredOrders.length === 0 && (
                            <tr>
                                <td colSpan="7" className="no-orders">
                                    Không có đơn hàng.
                                </td>
                            </tr>
                        )}

                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td className="order-code">{order.order_code}</td>

                                <td className="product-name">
                                    <span>{order.category_name}</span>
                                </td>

                                <td>
                                    <span className="payment-paid">
                                        {order.payment_method_name}
                                    </span>
                                </td>

                                <td className="invoice-icon">
                                    {order.service_type_name && (
                                        <div className="service-tooltip">
                                            <div className="tooltip-content">
                                                <strong>{order.service_type_name}</strong>
                                            </div>
                                        </div>
                                    )}
                                </td>

                                <td>${order.total_amount}</td>

                                <td>
                                    <span className={`status ${getStatusColor(order.status)}`}>
                                        {order.status_text}
                                    </span>
                                </td>

                                <td>
                                    <button
                                        className="btn-detail"
                                        onClick={() => navigate(`/user/orders/${order.order_code}`)}
                                    >
                                        <i className="fa-regular fa-eye"></i> Chi tiết
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
