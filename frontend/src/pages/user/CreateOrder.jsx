import React, { useEffect } from 'react';
import Swal from 'sweetalert2';
import { useOrderLogic } from '../../JS/OrderNoAccount'; 
import '../../assets/styles/OrderForm.css';

const fieldMap = {
  sender_name: 'Tên Người Gửi (*)',
  sender_phone: 'Số Điện Thoại Gửi (*)',
  receiver_name: 'Tên Người Nhận (*)',
  receiver_phone: 'Số Điện Thoại Nhận (*)',
  receiver_email: 'Email Để Nhận Mã Vận Đơn (*)',
  weight: 'Khối Lượng (gram) (*)',
  length: 'Chiều Dài (cm) (*)',
  width: 'Chiều Rộng (cm) (*)',
  height: 'Chiều Cao (cm) (*)',
  cod_amount: 'Tiền Thu Hộ (COD) - VNĐ',
};

export default function CreateOrderForm() {
  const {
    formData, districtList, wardListFrom, wardListTo,
    categories, paymentMethods, serviceTypes,
    fees_detail, total_shipping_fee, total_amount_with_cod, cod_amount,
    filePreviews, loading, message,
    handleChange, handleDistrictChange, handleWardChange, handleFileChange,
    handleSubmit, isLoggedIn
  } = useOrderLogic();

  useEffect(() => {
    if (!message) return;

    if (message.status === 'success') {
      Swal.fire({
        icon: 'success',
        title: 'Đặt hàng thành công, cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!',
        text: message.text,
        timer: 10000,
        timerProgressBar: true,
        showConfirmButton: false,
        willClose: () => {
          window.location.href = '/';
        }
      });
    } else if (message.status === 'error') {
      Swal.fire({
        icon: 'error',
        title: 'Có lỗi xảy ra!',
        text: message.text,
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    } else if (message.status === 'warning') {
      Swal.fire({
        icon: 'warning',
        title: 'Thông báo!',
        text: message.text,
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
  }, [message]);

  const renderInput = (field) => {
    const isNumeric = ['weight', 'length', 'width', 'height', 'cod_amount'].includes(field);
    const type = field.includes('email') ? 'email' : 'text';

    const onChange = (e) => {
      let val = e.target.value;
      if (isNumeric) val = val.replace(/[^0-9]/g, '');
      handleChange({ target: { name: field, value: val } });
    };

    return (
      <div key={field} className="input-group">
        <label htmlFor={field}>{fieldMap[field]}</label>
        <input
          id={field}
          name={field}
          type={type}
          value={formData[field]}
          onChange={onChange}
        />
      </div>
    );
  };

  return (
    <div className="logistics-order-container">
      <form onSubmit={handleSubmit} className="order-form-wrapper">
        
        {/* COLUMN 1: Address */}
        <div className="form-section">
          <h3>Thông Tin Người Gửi / Nhận</h3>

          <p style={{ fontSize:'0.7rem', fontWeight:'800', color:'var(--brand-orange)' }}>NGƯỜI GỬI</p>
          {renderInput('sender_name')}
          {renderInput('sender_phone')}
          <div className="input-group">
            <label>Địa Chỉ Lấy Hàng</label>
            <input
              value={formData.fromStreet}
              onChange={(e) => handleChange({ target: { name: 'fromStreet', value: e.target.value } })}
              placeholder="Số nhà, tên đường"
            />
            <div className="flex-row" style={{ marginTop:'10px' }}>
              <select value={formData.fromDistrict} onChange={(e)=>handleDistrictChange(e,'from')}>
                <option value="">Quận/Huyện</option>
                {districtList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={formData.fromWard} onChange={(e)=>handleWardChange(e,'from')} disabled={!formData.fromDistrict}>
                <option value="">Phường/Xã</option>
                {wardListFrom.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <hr style={{borderTop:'1px solid #eee', margin:'20px 0'}} />

          <p style={{ fontSize:'0.7rem', fontWeight:'800', color:'var(--brand-orange)' }}>NGƯỜI NHẬN</p>
          {renderInput('receiver_name')}
          {renderInput('receiver_phone')}
          <div className="input-group">
            <label>Địa Chỉ Giao Đến</label>
            <input
              value={formData.toStreet}
              onChange={(e)=>handleChange({target:{name:'toStreet', value:e.target.value}})}
              placeholder="Số nhà, tên đường"
            />
            <div className="flex-row" style={{ marginTop:'10px' }}>
              <select value={formData.toDistrict} onChange={(e)=>handleDistrictChange(e,'to')}>
                <option value="">Quận/Huyện</option>
                {districtList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={formData.toWard} onChange={(e)=>handleWardChange(e,'to')} disabled={!formData.toDistrict}>
                <option value="">Phường/Xã</option>
                {wardListTo.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Package & Service */}
        <div className="form-section highlight">
          <h3>Kiện Hàng & Dịch Vụ</h3>
          {!isLoggedIn && renderInput('receiver_email')}
          <div className="input-group">
            <label>Loại Hàng Hóa</label>
            <select name="category_id" value={formData.category_id || ""} onChange={handleChange} required>
              <option value="">-- Chọn Loại Hàng --</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          {renderInput('weight')}
          <div className="input-group">
            <label>Kích Thước (cm)</label>
            <div className="flex-row">
              <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="Dài" />
              <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="Rộng" />
              <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="Cao" />
            </div>
          </div>

          <h3>Thanh Toán</h3>
          <div className="input-group">
            <label>Dịch Vụ Vận Chuyển</label>
            <select name="service_type" value={formData.service_type} onChange={handleChange} required>
              <option value="">-- Chọn Dịch Vụ --</option>
              {serviceTypes.map(s => <option key={s.id} value={s.id}>{s.name} ({s.fee.toLocaleString()} đ)</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Hình Thức Thanh Toán</label>
            <select name="payment_method_id" value={formData.payment_method_id} onChange={handleChange} required>
              <option value="">-- Chọn Phương Thức --</option>
              {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Người Trả Phí Vận Chuyển</label>
            <div className="payer-selector">
              <label><input type="radio" name="payer_type" value="1" checked={formData.payer_type===1} onChange={()=>handleChange({target:{name:'payer_type',value:1}})} /> Người gửi</label>
              <label><input type="radio" name="payer_type" value="2" checked={formData.payer_type===2} onChange={()=>handleChange({target:{name:'payer_type',value:2}})} /> Người nhận</label>
            </div>
          </div>
        </div>

        {/* COLUMN 3: Images & Summary */}
        <div className="form-section">
          <h3>Hình Ảnh & Ghi Chú</h3>
          <div className="input-group">
            <label htmlFor="file-input" className="custom-upload-area">
              <span style={{fontSize:'2rem'}}>☁️</span>
              <span>Hãy tải ảnh kiện hàng lên nhó</span>
            </label>
            <input id="file-input" type="file" onChange={handleFileChange} multiple accept="image/*" style={{display:'none'}} />
            {filePreviews.length>0 && (
              <div className="preview-grid">
                {filePreviews.map((url,i) => <img key={i} src={url} alt="preview" className="preview-img"/>)}
              </div>
            )}
          </div>

          <div className="input-group">
            <label>Ghi Chú Đơn Hàng</label>
            <textarea name="note" value={formData.note} onChange={handleChange} placeholder="Chỉ dẫn cho nhân viên lấy hàng..." rows={3}/>
          </div>

          <div className="summary-footer">
            {renderInput('cod_amount')}
            <div className="fee-summary">
              {fees_detail.map((fee,i) => (
                <div key={i} className="fee-item">
                  <span>{fee.name}</span>
                  <strong>{fee.amount.toLocaleString()} đ</strong>
                </div>
              ))}
              <div style={{borderTop:'1px solid #e2e8f0', marginTop:'8px', paddingTop:'8px', display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
                <span>Cước vận chuyển:</span>
                <span>{total_shipping_fee.toLocaleString()} đ</span>
              </div>
            </div>
            <div className="grand-total-box">
              <p style={{ fontSize:'0.7rem', margin:0, opacity:0.9 }}>TỔNG CỘNG (COD + PHÍ)</p>
              <p style={{ fontSize:'1.4rem', fontWeight:'800', margin:'5px 0' }}>{total_amount_with_cod.toLocaleString()} đ</p>
            </div>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Đang Xử Lý...' : 'Xác Nhận Tạo Đơn'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
