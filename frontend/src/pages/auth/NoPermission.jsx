import React from "react";

const NoPermission = () => {
    return (
        <div style={{ padding: "40px", textAlign: "center" }}>
            <h1 style={{ color: "red" }}>403 - Không có quyền truy cập</h1>
            <p>Bạn không có quyền xem trang này.</p>
        </div>
    );
};

export default NoPermission;
