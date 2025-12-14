<?php
// backend/services/FeeService.php

require_once __DIR__ . "/../core/BaseService.php";

class FeeService extends BaseService
{
    /**
     * =====================================================
     * TÍNH PHÍ VẬN CHUYỂN
     * Công thức:
     * distance * unit_price
     * + weight * unit_price
     * + volume * unit_price
     * =====================================================
     */
    public function calculate(array $input): array
    {
        $distanceKm = (float) ($input['distance_km'] ?? 0);
        $weightKg   = (float) ($input['weight'] ?? 0);
        $lengthCm   = (float) ($input['length'] ?? 0);
        $widthCm    = (float) ($input['width'] ?? 0);
        $heightCm   = (float) ($input['height'] ?? 0);
        $codAmount  = (float) ($input['cod_amount'] ?? 0);

        /* ==========================
         * LẤY ĐƠN GIÁ
         * ========================== */
        $distanceUnit = $this->getFeeByCode('distance_fee'); // VNĐ / km
        $weightUnit   = $this->getFeeByCode('weight_fee');   // VNĐ / kg
        $volumeUnit   = $this->getFeeByCode('volume_fee');   // VNĐ / m3 (optional)
        $codFee       = $this->getFeeByCode('cod_amount_value'); // COD fee (optional)

        if (!$distanceUnit || !$weightUnit) {
            throw new Exception("Thiếu cấu hình đơn giá vận chuyển (distance_fee hoặc weight_fee)");
        }

        /* ==========================
         * TÍNH VOLUME (cm → m3)
         * ========================== */
        $volumeM3 = ($lengthCm * $widthCm * $heightCm) / 1_000_000;

        /* ==========================
         * TÍNH PHÍ
         * ========================== */
        $distanceFee = $distanceKm * (float) $distanceUnit['amount'];
        $weightFee   = $weightKg   * (float) $weightUnit['amount'];
        $volumeFee   = $volumeUnit ? ($volumeM3 * (float) $volumeUnit['amount']) : 0; // Volume fee là optional

        $shippingFee = $distanceFee + $weightFee + $volumeFee;

        /* ==========================
         * DANH SÁCH PHÍ (order_fees)
         * ========================== */
        $fees = [
            [
                'id'     => $distanceUnit['id'],
                'code'   => 'distance_fee',
                'amount' => $distanceFee
            ],
            [
                'id'     => $weightUnit['id'],
                'code'   => 'weight_fee',
                'amount' => $weightFee
            ]
        ];
        
        // Chỉ thêm volume_fee nếu có cấu hình
        if ($volumeUnit && $volumeFee > 0) {
            $fees[] = [
                'id'     => $volumeUnit['id'],
                'code'   => 'volume_fee',
                'amount' => $volumeFee
            ];
        }

        /* ==========================
         * COD (không cộng vào shipper nhận)
         * ========================== */
        if ($codAmount > 0 && $codFee) {
            $fees[] = [
                'id'     => $codFee['id'],
                'code'   => 'cod_amount_value',
                'amount' => $codAmount
            ];
        }

        return [
            'fees'              => $fees,
            'shipping_fee'      => $shippingFee,
            'cod_amount'        => $codAmount,
            'total_with_cod'    => $shippingFee + $codAmount,
            'shipper_receive'   => $shippingFee // ⭐ QUAN TRỌNG
        ];
    }

    /**
     * =====================================================
     * LƯU PHÍ VÀO order_fees
     * =====================================================
     */
    public function saveOrderFees(int $orderId, array $fees): void
    {
        foreach ($fees as $fee) {
            if (empty($fee['id'])) continue;

            $stmt = $this->prepare(
                "INSERT INTO order_fees (order_id, fee_id, amount)
                 VALUES (?, ?, ?)"
            );
            $stmt->bind_param(
                "iid",
                $orderId,
                $fee['id'],
                $fee['amount']
            );
            $stmt->execute();
        }
    }

    /* =====================================================
     * HELPER: LẤY ĐƠN GIÁ
     * ===================================================== */
    private function getFeeByCode(string $code): ?array
    {
        $stmt = $this->prepare(
            "SELECT id, amount FROM fees WHERE code = ?"
        );
        $stmt->bind_param("s", $code);
        $stmt->execute();

        $result = $stmt->get_result();
        return $result->num_rows > 0
            ? $result->fetch_assoc()
            : null;
    }
}
