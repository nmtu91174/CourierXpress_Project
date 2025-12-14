import React from 'react';
import { useOrderLogic } from '../../JS/OrderNoAccount'; 

const fieldMap = {
    sender_name: 'Tên Người Gửi (*)',
    sender_phone: 'Số Điện Thoại Gửi (*)',
    receiver_name: 'Tên Người Nhận (*)',
    receiver_phone: 'Số Điện Thoại Nhận (*)',
    receiver_email: 'Email Để Nhận Mã Vận Đơn (*)',
    weight: 'Khối Lượng (kg) (*)',
    length: 'Chiều Dài (cm) (*)',
    width: 'Chiều Rộng (cm) (*)',
    height: 'Chiều Cao (cm) (*)',
    cod_amount: 'Tiền Thu Hộ (COD) - VNĐ',
};


export default function CreateOrderForm() {
        const {
        formData, districtList, wardListFrom, wardListTo,
        categories, paymentMethods, serviceTypes,
        distanceKm, fees_detail, total_shipping_fee, total_amount_with_cod, cod_amount,
        selectedFiles, filePreviews, loading, message,
        handleChange, handleDistrictChange, handleWardChange, handleFileChange,
        handleCalculateDistance, handleSubmit,
        isLoggedIn
    } = useOrderLogic();

    // --- CÁC HÀM HỖ TRỢ HIỂN THỊ (CSS) ---
    const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' };
    const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold' };
    
    // Hàm render input đã đơn giản hóa
    const renderInput = (field) => {
        const isNumericField = ['weight', 'length', 'width', 'height', 'cod_amount'].includes(field);
        const type = field.includes('email') ? 'email' : 'text';
        
        // HÀM handleChange TỪ HOOK
        const handleNumericInput = (e) => {
            let val = e.target.value;
            if (isNumericField) {
                 val = val.replace(/[^0-9.]/g, '');
                 const parts = val.split('.');
                 if (parts.length > 2) {
                     val = parts[0] + '.' + parts[1];
                 }
            }
            // Gọi handleChange từ Hook
            handleChange({ target: { name: field, value: val } });
        };
        
        return (
            <div key={field} style={{ marginBottom: '15px' }}>
                <label htmlFor={field} style={labelStyle}>{fieldMap[field]}</label>
                <input 
                    id={field}
                    type={type}
                    name={field}
                    value={formData[field]}
                    onChange={handleNumericInput} 
                    // placeholder={fieldMap[field]}
                    style={inputStyle}
                />
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', border: '1px solid #007bff', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            
            {/* Message Bar */}
            {message && (
                <div style={{ 
                    padding: '12px', marginBottom: '15px', borderRadius: '4px', fontWeight: 'bold',
                    backgroundColor: message.status === 'success' ? '#d4edda' : (message.status === 'warning' ? '#fff3cd' : '#f8d7da'),
                    color: message.status === 'success' ? '#155724' : (message.status === 'warning' ? '#856404' : '#721c24')
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    
                    {/* --- CỘT TRÁI: THÔNG TIN GỬI/NHẬN/HÀNG HÓA --- */}
                    <div style={{ flex: '2' }}>
                        
                        {/* 1. THÔNG TIN NGƯỜI GỬI & ĐỊA CHỈ ĐI */}
                        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px' }}>1. Thông Tin Người Gửi📤</h3>
                        {renderInput('sender_name')}
                        {renderInput('sender_phone')}
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Địa Chỉ Đi Chi Tiết (*)</label>
                            <input 
                                value={formData.fromStreet} 
                                onChange={(e) => handleChange({ target: { name: 'fromStreet', value: e.target.value }})}
                                placeholder="Số nhà, Tên đường" 
                                style={{ ...inputStyle, marginBottom: '10px' }}
                            />
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select value={formData.fromDistrict} onChange={(e) => handleDistrictChange(e, 'from')} style={{ ...inputStyle, width: '50%' }}>
                                    <option value="">-- Chọn Quận/Huyện --</option>
                                    {districtList.map((d) => (<option key={d} value={d}>{d}</option>))}
                                </select>
                                <select value={formData.fromWard} onChange={(e) => handleWardChange(e, 'from')} disabled={!formData.fromDistrict} style={{ ...inputStyle, width: '50%' }}>
                                    <option value="">-- Chọn Phường/Xã --</option>
                                    {wardListFrom.map((w) => (<option key={w} value={w}>{w}</option>))}
                                </select>
                            </div>
                        </div>

                        {/* 2. THÔNG TIN NGƯỜI NHẬN & ĐỊA CHỈ ĐẾN */}
                        <h3 style={{ marginTop: '20px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>2. Thông Tin Người Nhận📥</h3>
                        {renderInput('receiver_name')}
                        {renderInput('receiver_phone')}
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Địa Chỉ Đến Chi Tiết (*)</label>
                            <input 
                                value={formData.toStreet} 
                                onChange={(e) => handleChange({ target: { name: 'toStreet', value: e.target.value }})}
                                placeholder="Số nhà, Tên đường" 
                                style={{ ...inputStyle, marginBottom: '10px' }}
                            />
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select value={formData.toDistrict} onChange={(e) => handleDistrictChange(e, 'to')} style={{ ...inputStyle, width: '50%' }}>
                                    <option value="">-- Chọn Quận/Huyện --</option>
                                    {districtList.map((d) => (<option key={d} value={d}>{d}</option>))}
                                </select>
                                <select value={formData.toWard} onChange={(e) => handleWardChange(e, 'to')} disabled={!formData.toDistrict} style={{ ...inputStyle, width: '50%' }}>
                                    <option value="">-- Chọn Phường/Xã --</option>
                                    {wardListTo.map((w) => (<option key={w} value={w}>{w}</option>))}
                                </select>
                            </div>
                        </div>

                        {/* 3. THÔNG TIN HÀNG HÓA */}
                        <h3 style={{ marginTop: '20px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>3. Chi Tiết Hàng Hóa 📦</h3>
                        {!isLoggedIn && renderInput('receiver_email')}
                        <div style={{ marginBottom: '15px' }}>
                            <label htmlFor="category_id" style={labelStyle}>Loại Hàng Hóa (*)</label>
                            <select id="category_id" name="category_id" value={formData.category_id || ""} onChange={handleChange} required style={inputStyle}>
                                <option value="">-- Chọn Loại Hàng Hóa --</option>
                                {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                            </select>
                        </div>
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
                            <input id="images_file" type="file" name="images[]" onChange={handleFileChange} multiple accept="image/*" style={inputStyle} />
                            {selectedFiles.length > 0 && (<p style={{ marginTop: '5px', fontSize: '0.9em', color: '#007bff' }}>Đã chọn **{selectedFiles.length}** file.</p>)}
                            
                            {filePreviews.length > 0 && (
                                <div style={{ 
                                    marginTop: '15px', padding: '10px', border: '1px dashed #007bff', borderRadius: '4px',
                                    display: 'flex', flexWrap: 'wrap', gap: '10px'
                                }}>
                                    {filePreviews.map((previewUrl, index) => (
                                        <div key={index} style={{ width: 'calc(33.33% - 7px)', overflow: 'hidden', borderRadius: '4px' }}>
                                            <img src={previewUrl} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- CỘT PHẢI: CHI TIẾT PHÍ & HÀNH ĐỘNG --- */}
                    <div style={{ flex: '1', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '6px', border: '1px solid #dee2e6' }}>

                        {/* 4. THANH TOÁN VÀ DỊCH VỤ */}
                        <h3 style={{ marginBottom: '15px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>4. Thanh Toán & Dịch Vụ 💳</h3>
                        
                        {/* Loại Dịch Vụ */}
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ display: 'block', marginBottom: '5px' }}>Loại Dịch Vụ (*):</strong>
                            <select id="service_type" name="service_type" value={formData.service_type} onChange={handleChange} required style={inputStyle}>
                                <option value="">-- Chọn Loại Dịch Vụ --</option>
                                {serviceTypes.map(service => (<option key={service.id} value={service.id}>{service.name} ({service.fee.toLocaleString()} VNĐ)</option>))}
                            </select>
                        </div>

                        {/* Phương thức Thanh toán */}
                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="payment_method_id" style={labelStyle}>Phương Thức Thanh Toán (*)</label>
                            <select id="payment_method_id" name="payment_method_id" value={formData.payment_method_id} onChange={handleChange} required style={inputStyle}>
                                <option value="">-- Chọn phương thức thanh toán --</option>
                                {paymentMethods.map(method => (<option key={method.id} value={method.id}>{method.name}</option>))}
                            </select>
                        </div>

                        {/* COD AMOUNT */}
                        {renderInput('cod_amount')}

                        <div style={{ marginBottom: '15px' }}>
                            <label htmlFor="notes" style={labelStyle}>Ghi Chú (Notes)</label>
                            <textarea id="notes" name="note" value={formData.note} onChange={handleChange} placeholder="Nhập ghi chú cho đơn hàng..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                        </div>


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
                                width: '100%', padding: '12px', 
                                backgroundColor: loading ? '#6c757d' : '#007bff', 
                                color: 'white', border: 'none', borderRadius: '4px', 
                                fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.3s', marginTop: '30px'
                            }}
                        >
                            {loading ? 'Đang Xử Lý Transaction...' : 'Tạo Đơn Hàng & Chờ Agent Duyệt'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}