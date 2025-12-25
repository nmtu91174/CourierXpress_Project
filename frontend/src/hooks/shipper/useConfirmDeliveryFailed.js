// frontend/src/hooks/shipper/useConfirmDeliveryFailed.js

import { useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8888/api/shipper";

export const useConfirmDeliveryFailed = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const submit = async ({
        orderId,
        reason,
        note,
        image,
        location
    }) => {
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("order_id", orderId);
            formData.append("reason", reason);
            formData.append("note", note || "");
            formData.append("image", image);

            if (location) {
                formData.append("latitude", location.latitude);
                formData.append("longitude", location.longitude);
                formData.append("accuracy", location.accuracy);
            }

            const res = await axios.post(
                `${API_BASE}/confirm_delivery_failed.php`,
                formData,
                { withCredentials: true }
            );

            if (res.data.status !== "success") {
                throw new Error(res.data.message);
            }

            return res.data;
        } catch (err) {
            setError(err.message || "Delivery failed submit error");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { submit, loading, error };
};
