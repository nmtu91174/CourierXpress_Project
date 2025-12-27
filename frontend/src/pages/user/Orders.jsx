import { useEffect, useState } from "react";
import axios from "axios";
import "../../assets/styles/Orders.css";
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

    const getStatusColor = (statusId) => {
        if (statusId === 1) return "status-pending";    
        if (statusId === 2) return "status-pending";    
        if (statusId === 3) return "status-processing";  
        if (statusId === 4) return "status-processing";  
        if (statusId === 5) return "status-completed";   
        if (statusId === 6) return "status-cancelled";  
        return "status-default";
    };

    const TAB_STATUS_MAP = {
        pending: [1, 2, 3, 4],   
        completed: [5],         
        cancelled: [6]        
    };


    // Lọc theo tab
    const filteredOrders = orders
    .filter(order => {
        if (activeTab === "all") return true;
        return TAB_STATUS_MAP[activeTab]?.includes(order.status);
    })
    .filter(order =>
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

    const formatVND = (amount) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND"
        }).format(amount);
    };

    return (
        <div className="orders-container">

            <h1 className="page-title">Order History</h1>

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
                            <th>Create At</th>
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
                                    {order.service_type_name || "—"}
                                </td>

                                <td className="created-at">
                                    {new Date(order.created_at).toLocaleString("vi-VN")}
                                </td>

                                <td>{formatVND(order.total_amount)}</td>

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
