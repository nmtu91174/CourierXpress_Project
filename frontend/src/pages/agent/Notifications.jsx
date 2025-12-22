// frontend/src/pages/agent/Notifications.jsx
// Agent Notifications - Operational notifications only

import React from "react";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
    const navigate = useNavigate();

    return (
        <div className="admin-page">
            <div className="mb-4">
                <h2>Notifications</h2>
                <p className="text-muted mb-0">Operational notifications and alerts</p>
            </div>

            <div className="card-lux">
                <div className="card-body">
                    <p>Agent notifications will be displayed here</p>
                    <p className="text-muted">This will show order assignments, shipper confirmations, and operational alerts</p>
                </div>
            </div>
        </div>
    );
}

