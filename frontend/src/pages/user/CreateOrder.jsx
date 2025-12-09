import emailjs from "emailjs-com";
import React, { useState, useMemo, useEffect } from 'react';

const CreateOrder = () => {
    const API_URL = 'http://localhost:8888/createorder.php'; 
        const FEE_CONFIG = {
        BASE_FEE: 15000.00,
        WEIGHT_UNIT_FEE: 5000.00, // weight_fee (phí cho mỗi kg vượt quá 2kg)
        WEIGHT_THRESHOLD: 2.0, // Ngưỡng tính phí trọng lượng (2kg)
        RUSH_SERVICE_FEE: 10000.00, // Phí Hỏa tốc (service_type 2)
    };

    const PAYMENT_METHODS = [
        { id: 1, name: 'Tiền mặt (COD/Trả sau)' },
        { id: 2, name: 'Chuyển khoản (Trả trước)' },
        { id: 3, name: 'Ví MoMo (Trả trước)' },
    ];
    
    const SERVICE_TYPES = [
        { id: 1, name: 'Giao Bình Thường' },
        { id: 2, name: 'Hỏa Tốc (Phụ phí +10.000 VNĐ)' },
    ];
    
    const fieldMap = {
        sender_name: 'Tên Người Gửi (*)', sender_phone: 'Số Điện Thoại Gửi (*)', sender_address: 'Địa Chỉ Gửi (*)',
        receiver_name: 'Tên Người Nhận (*)', receiver_phone: 'Số Điện Thoại Nhận (*)', receiver_address: 'Địa Chỉ Nhận (*)',
        receiver_email: 'Email Người Nhận (*)', item_name: 'Tên Hàng Hóa (*)',
        weight: 'Khối Lượng (kg) (*)', length: 'Chiều Dài (cm) (*)', width: 'Chiều Rộng (cm) (*)', height: 'Chiều Cao (cm) (*)',
        cod_amount: 'Tiền Thu Hộ (COD) - VNĐ',
    };

    const [formData, setFormData] = useState({
        sender_name: '', sender_phone: '', sender_address: '',
        receiver_name: '', receiver_phone: '', receiver_address: '',
        receiver_email: '', item_name: '', 
        weight: 0.1, 
        length: 10, 
        width: 10, 
        height: 10, 
        service_type: 1, 
        cod_amount: 0, 
        payment_method_id: 1, 
    });
    
    // *** STATE CHỨA FILE ĐÃ CHỌN ***
    const [selectedFiles, setSelectedFiles] = useState([]);
    // *** STATE MỚI CHỨA URL TẠM THỜI ĐỂ HIỂN THỊ (PREVIEW) ***
    const [filePreviews, setFilePreviews] = useState([]);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null); 

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: (type === 'number' || name === 'weight' || name === 'length' || name === 'width' || name === 'height' || name === 'cod_amount')
                    ? parseFloat(value) || 0 : (type === 'radio' ? parseInt(value) : value)
        }));
    };
    
    // *** CẬP NHẬT HÀM XỬ LÝ FILE ĐỂ TẠO PREVIEW URL ***
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
        
        // 1. Tạo Object URL mới cho từng file
        const newPreviews = files.map(file => URL.createObjectURL(file));
        
        // 2. Cập nhật state chứa URL preview
        setFilePreviews(newPreviews);
    };

    // *** HÀM CLEANUP: GIẢI PHÓNG OBJECT URL SAU KHI COMPONENT UNMOUNT HOẶC PREVIEWS THAY ĐỔI ***
    useEffect(() => {
        // Hàm cleanup chạy khi component unmount hoặc trước khi effect chạy lại (khi filePreviews thay đổi)
        return () => {
            filePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [filePreviews]);

    // --- HÀM TÍNH PHÍ REAL-TIME (Giữ nguyên) ---
    const calculateFees = (data) => {
        let total_shipping_fee = 0;
        const fees_detail = [];
        const weight = data.weight || 0;
        const cod_amount = data.cod_amount || 0;
        const service_type = data.service_type;

        // 1. Phí Cơ Bản
        const baseFee = FEE_CONFIG.BASE_FEE;
        total_shipping_fee += baseFee;
        fees_detail.push({ name: 'Phí Cơ Bản', amount: baseFee });

        // 2. Phí Trọng Lượng Vượt Ngưỡng (Logic: $5000 * trần(weight - 2.0))
        let extraWeightFee = 0;
        if (weight > FEE_CONFIG.WEIGHT_THRESHOLD) {
            const extraKg = Math.ceil(weight - FEE_CONFIG.WEIGHT_THRESHOLD);
            extraWeightFee = extraKg * FEE_CONFIG.WEIGHT_UNIT_FEE;
            total_shipping_fee += extraWeightFee;
            fees_detail.push({ 
                name: `Phụ Phí Trọng Lượng Vượt Ngưỡng (> ${FEE_CONFIG.WEIGHT_THRESHOLD}kg)`, 
                amount: extraWeightFee 
            });
        }

        // 3. Phí Dịch Vụ Hỏa Tốc
        let rushFee = 0;
        if (service_type === 2) {
            rushFee = FEE_CONFIG.RUSH_SERVICE_FEE;
            total_shipping_fee += rushFee;
            fees_detail.push({ name: 'Phụ Phí Dịch Vụ Hỏa Tốc', amount: rushFee });
        }
        
        // 4. Tiền Thu Hộ (COD) - Không tính vào total_shipping_fee
        let total_amount_with_cod = total_shipping_fee + cod_amount;
        
        return {
            fees_detail,
            total_shipping_fee,
            total_amount_with_cod,
            cod_amount
        };
    };

    // Sử dụng useMemo để tính toán chỉ khi formData thay đổi
    const feeCalculation = useMemo(() => calculateFees(formData), [formData]);
    const { fees_detail, total_shipping_fee, total_amount_with_cod, cod_amount } = feeCalculation;


    // --- HÀM SUBMIT (Giữ nguyên logic FormData, chỉ thêm reset filePreviews) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        // ... (Giữ nguyên logic kiểm tra dữ liệu bắt buộc)
        const requiredFields = ['sender_name', 'sender_phone', 'sender_address', 
                                 'receiver_name', 'receiver_phone', 'receiver_address', 
                                 'receiver_email', 'item_name', 'weight', 'length', 'width', 'height'];
        
        for (const field of requiredFields) {
            if (!formData[field] || (typeof formData[field] === 'number' && formData[field] <= 0)) {
                if (field === 'weight' && formData.weight < 0.1) {
                    setMessage({ status: 'error', text: `Vui lòng điền Khối lượng (kg) lớn hơn 0.1.` });
                    setLoading(false);
                    return;
                }
                if ((field === 'length' || field === 'width' || field === 'height') && formData[field] < 1) {
                    setMessage({ status: 'error', text: `Vui lòng điền Kích thước (cm) lớn hơn 0.` });
                    setLoading(false);
                    return;
                }
                if (typeof formData[field] !== 'number' && (!formData[field] || formData[field].toString().trim() === '')) {
                     setMessage({ status: 'error', text: `Vui lòng điền đầy đủ trường bắt buộc: ${fieldMap[field] || field}.` });
                     setLoading(false);
                     return;
                }
            }
        }

        // *** TẠO ĐỐI TƯỢNG FORMDATA ĐỂ GỬI KÈM FILE ***
        const dataToSend = new FormData();
        
        // Thêm các trường dữ liệu text vào FormData
        Object.keys(formData).forEach(key => {
            // Chuyển đổi giá trị số thành chuỗi để FormData gửi đi
            const value = typeof formData[key] === 'number' ? formData[key].toString() : formData[key];
            dataToSend.append(key, value);
        });

        // Thêm các file đã chọn vào FormData. Lưu ý tên trường là 'images[]'
        selectedFiles.forEach(file => {
            dataToSend.append('images[]', file);
        });

        try {
            // GỬI FORMDATA: KHÔNG CẦN set header 'Content-Type': 'application/json'
            const response = await fetch(API_URL, {
                method: 'POST',
                body: dataToSend, 
            });

            if (!response.ok) {
                const errorText = await response.text();
                const limitedErrorText = errorText.substring(0, 150);
                throw new Error(`Server returned status ${response.status}: ${limitedErrorText}...`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                emailjs.send(
                    "service_z6xn9og",
                    "template_d7keh2g",
                    {
                        to_email: data.receiver_email,
                        tracking_code: data.order_code,
                    },
                    "5EwRopnOusFLIkA2N"
                ).then(() => {
                    console.log("Email đã gửi thành công!");
                }).catch(err => {
                    console.error("Gửi email thất bại:", err);
                });

                setMessage({ 
                    status: 'success', 
                    text: `Tạo đơn hàng thành công! Mã vận đơn: ${data.order_code}. Phí Ship: ${data.total_shipping_fee.toLocaleString()} VNĐ. Tổng thu (gồm COD): ${data.total_amount_with_cod.toLocaleString()} VNĐ. Đơn hàng đang chờ Agent duyệt.`
                });
                setFormData({
                    sender_name: '', sender_phone: '', sender_address: '',
                    receiver_name: '', receiver_phone: '', receiver_address: '',
                    receiver_email: '', item_name: '', weight: 0.1,
                    length: 10, width: 10, height: 10,
                    service_type: 1, cod_amount: 0, payment_method_id: 1, 
                });
                setSelectedFiles([]); 
                setFilePreviews([]); // *** RESET FILE PREVIEW ***
            } else {
                setMessage({ status: 'error', text: data.message || 'Lỗi không xác định khi tạo đơn.' });
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error.message);
            setMessage({ status: 'error', text: `Lỗi kết nối đến máy chủ: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    // --- CÁC HÀM HỖ TRỢ HIỂN THỊ (Giữ nguyên) ---
    const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' };
    const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold' };

    const renderInput = (field) => {
        const type = field.includes('phone') ? 'tel' : field.includes('email') ? 'email' : (fieldMap[field].includes('(kg)') || fieldMap[field].includes('(cm)') || field === 'cod_amount' ? 'number' : 'text');
        const min = (field === 'weight' ? '0.1' : (field === 'length' || field === 'width' || field === 'height' ? '1' : (field === 'cod_amount' ? '0' : undefined)));
        const step = (field === 'weight' ? '0.1' : (field === 'cod_amount' ? '1000' : '1'));
        
        return (
            <div key={field} style={{ marginBottom: '15px' }}>
                <label htmlFor={field} style={labelStyle}>{fieldMap[field]}</label>
                <input 
                    id={field}
                    type={type} 
                    name={field} 
                    value={formData[field]} 
                    onChange={handleChange} 
                    placeholder={fieldMap[field]} 
                    required={!field.includes('cod_amount')}
                    min={min}
                    step={step}
                    style={inputStyle} 
                />
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', border: '1px solid #007bff', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            {message && (
                <div style={{ 
                    padding: '12px', 
                    marginBottom: '15px', 
                    borderRadius: '4px', 
                    fontWeight: 'bold',
                    backgroundColor: message.status === 'success' ? '#d4edda' : '#f8d7da',
                    color: message.status === 'success' ? '#155724' : '#721c24'
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    
                    {/* --- CỘT TRÁI: THÔNG TIN GỬI/NHẬN/HÀNG HÓA --- */}
                    <div style={{ flex: '2' }}>
                        
                        {/* 1. THÔNG TIN NGƯỜI GỬI */}
                        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px' }}>1. Thông Tin Người Gửi 📤</h3>
                        {['sender_name', 'sender_phone', 'sender_address'].map(renderInput)}

                        {/* 2. THÔNG TIN NGƯỜI NHẬN */}
                        <h3 style={{ marginTop: '20px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>2. Thông Tin Người Nhận 📥</h3>
                        {['receiver_email', 'receiver_name', 'receiver_phone', 'receiver_address'].map(renderInput)}

                        {/* 3. THÔNG TIN HÀNG HÓA */}
                        <h3 style={{ marginTop: '20px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>3. Chi Tiết Hàng Hóa 📦</h3>
                        {renderInput('item_name')}
                        {renderInput('weight')}
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Kích Thước (Dài x Rộng x Cao cm) (*)</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="Dài (cm)" required min="1" step="1" style={{ width: '33%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }} />
                                <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="Rộng (cm)" required min="1" step="1" style={{ width: '33%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }} />
                                <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="Cao (cm)" required min="1" step="1" style={{ width: '34%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }} />
                            </div>
                        </div>

                        {/* 6. INPUT FILE ẢNH & PREVIEW */}
                        <h3 style={{ marginTop: '20px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>6. Ảnh Sản Phẩm 📸</h3>
                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="images_file" style={labelStyle}>Chọn (Các) Ảnh Lấy Hàng</label>
                            <input 
                                id="images_file"
                                type="file" 
                                name="images[]" 
                                onChange={handleFileChange} 
                                multiple 
                                accept="image/*"
                                style={inputStyle} 
                            />
                            {selectedFiles.length > 0 && (
                                <p style={{ marginTop: '5px', fontSize: '0.9em', color: '#007bff' }}>
                                    Đã chọn **{selectedFiles.length}** file.
                                </p>
                            )}
                            
                            {/* *** KHU VỰC HIỂN THỊ PREVIEW ẢNH MỚI *** */}
                            {filePreviews.length > 0 && (
                                <div style={{ 
                                    marginTop: '15px', 
                                    padding: '10px', 
                                    border: '1px dashed #007bff', 
                                    borderRadius: '4px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '10px'
                                }}>
                                    {filePreviews.map((previewUrl, index) => (
                                        <div key={index} style={{ width: 'calc(33.33% - 7px)', overflow: 'hidden', borderRadius: '4px' }}>
                                            <img 
                                                src={previewUrl} 
                                                alt={`Preview ${index + 1}`} 
                                                style={{ width: '100%', height: '100px', objectFit: 'cover' }} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* *** KẾT THÚC KHU VỰC PREVIEW *** */}

                        </div>
                    </div>

                    {/* --- CỘT PHẢI: CHI TIẾT PHÍ & HÀNH ĐỘNG --- */}
                    <div style={{ flex: '1', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                        
                        {/* 4. THANH TOÁN VÀ DỊCH VỤ */}
                        <h3 style={{ marginBottom: '15px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>4. Thanh Toán & Dịch Vụ 💳</h3>
                        
                        {/* Loại Dịch Vụ */}
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ display: 'block', marginBottom: '5px' }}>Loại Dịch Vụ (*):</strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                                {SERVICE_TYPES.map(service => (
                                    <label key={service.id} htmlFor={`service_${service.id}`} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                            id={`service_${service.id}`}
                                            type="radio"
                                            name="service_type"
                                            value={service.id}
                                            checked={formData.service_type === service.id}
                                            onChange={handleChange}
                                            required
                                            style={{ marginRight: '5px' }}
                                        />
                                        {service.name}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Phương thức Thanh toán */}
                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="payment_method_id" style={labelStyle}>Phương Thức Thanh Toán (*)</label>
                            <select 
                                id="payment_method_id"
                                name="payment_method_id" 
                                value={formData.payment_method_id} 
                                onChange={handleChange} 
                                required
                                style={inputStyle} 
                            >
                                {PAYMENT_METHODS.map(method => (
                                    <option key={method.id} value={method.id}>
                                        {method.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* COD AMOUNT */}
                        {renderInput('cod_amount')}

                        {/* CHI TIẾT TÍNH PHÍ */}
                        <h3 style={{ marginTop: '20px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>5. Tổng Kết Phí 🧾</h3>
                        
                        <div style={{ marginBottom: '10px' }}>
                            {fees_detail.map((fee, index) => (
                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#495057', padding: '3px 0' }}>
                                    <span>{fee.name}:</span>
                                    <strong>{fee.amount.toLocaleString()} VNĐ</strong>
                                </div>
                            ))}
                            <div style={{ height: '1px', backgroundColor: '#dee2e6', margin: '8px 0' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#007bff' }}>
                                <span>TỔNG PHÍ VẬN CHUYỂN:</span>
                                <strong>{total_shipping_fee.toLocaleString()} VNĐ</strong>
                            </div>
                        </div>

                        {/* TỔNG TIỀN PHẢI THU */}
                        <div style={{ marginTop: '15px', padding: '10px', border: '2px solid #28a745', borderRadius: '4px', backgroundColor: '#e2f0e7' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1em', color: '#155724' }}>
                                <span>TIỀN THU HỘ (COD):</span>
                                <strong>{cod_amount.toLocaleString()} VNĐ</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2em', color: '#28a745', marginTop: '10px' }}>
                                <span>TỔNG TIỀN CẦN THANH TOÁN:</span>
                                <strong>{total_amount_with_cod.toLocaleString()} VNĐ</strong>
                            </div>
                            <small style={{ display: 'block', textAlign: 'right', color: '#155724' }}>(Phí Vận Chuyển + COD)</small>
                        </div>
                        
                        {/* BUTTON SUBMIT */}
                        <button 
                            type="submit" 
                            disabled={loading} 
                            style={{ 
                                width: '100%', 
                                padding: '12px', 
                                backgroundColor: loading ? '#6c757d' : '#007bff', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '4px', 
                                fontSize: '16px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.3s',
                                marginTop: '30px'
                            }}
                        >
                            {loading ? 'Đang Xử Lý Transaction...' : 'Tạo Đơn Hàng & Chờ Agent Duyệt'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateOrder;