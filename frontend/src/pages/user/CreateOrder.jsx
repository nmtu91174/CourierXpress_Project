import React, { useEffect } from 'react';
import Swal from 'sweetalert2';
import { useOrderLogic } from '../../JS/OrderNoAccount'; 
import '../../assets/styles/OrderForm.css';

const fieldMap = {
  sender_name: 'Sender Name (*)',
  sender_phone: 'Sender Phone (*)',
  receiver_name: 'Receiver Name (*)',
  receiver_phone: 'Receiver Phone (*)',
  receiver_email: 'Email to Receive Tracking Code (*)',
  weight: 'Weight (grams) (*)',
  length: 'Length (cm) (*)',
  width: 'Width (cm) (*)',
  height: 'Height (cm) (*)',
  cod_amount: 'COD Amount (Collected from Receiver) - VND',
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
        title: 'Order created successfully! Thank you for using our service!',
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
        title: 'Error occurred!',
        text: message.text,
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    } else if (message.status === 'warning') {
      Swal.fire({
        icon: 'warning',
        title: 'Notification!',
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
          <h3>Sender / Receiver Information</h3>

          <p style={{ fontSize:'0.7rem', fontWeight:'800', color:'var(--brand-orange)' }}>SENDER</p>
          {renderInput('sender_name')}
          {renderInput('sender_phone')}
          <div className="input-group">
            <label>Pickup Address</label>
            <input
              value={formData.fromStreet}
              onChange={(e) => handleChange({ target: { name: 'fromStreet', value: e.target.value } })}
              placeholder="Street number, street name"
            />
            <div className="flex-row" style={{ marginTop:'10px' }}>
              <select value={formData.fromDistrict} onChange={(e)=>handleDistrictChange(e,'from')}>
                <option value="">District</option>
                {districtList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={formData.fromWard} onChange={(e)=>handleWardChange(e,'from')} disabled={!formData.fromDistrict}>
                <option value="">Ward</option>
                {wardListFrom.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <hr style={{borderTop:'1px solid #eee', margin:'20px 0'}} />

          <p style={{ fontSize:'0.7rem', fontWeight:'800', color:'var(--brand-orange)' }}>RECEIVER</p>
          {renderInput('receiver_name')}
          {renderInput('receiver_phone')}
          <div className="input-group">
            <label>Delivery Address</label>
            <input
              value={formData.toStreet}
              onChange={(e)=>handleChange({target:{name:'toStreet', value:e.target.value}})}
              placeholder="Street number, street name"
            />
            <div className="flex-row" style={{ marginTop:'10px' }}>
              <select value={formData.toDistrict} onChange={(e)=>handleDistrictChange(e,'to')}>
                <option value="">District</option>
                {districtList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={formData.toWard} onChange={(e)=>handleWardChange(e,'to')} disabled={!formData.toDistrict}>
                <option value="">Ward</option>
                {wardListTo.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Package & Service */}
        <div className="form-section highlight">
          <h3>Package & Service</h3>
          {!isLoggedIn && renderInput('receiver_email')}
          <div className="input-group">
            <label>Product Category</label>
            <select name="category_id" value={formData.category_id || ""} onChange={handleChange} required>
              <option value="">-- Select Category --</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          {renderInput('weight')}
          <div className="input-group">
            <label>Dimensions (cm)</label>
            <div className="flex-row">
              <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="Length" />
              <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="Width" />
              <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="Height" />
            </div>
          </div>

          <h3>Payment</h3>
          <div className="input-group">
            <label>Who Pays Shipping Fee</label>
            <div className="payer-selector">
              <label><input type="radio" name="payer_type" value="1" checked={formData.payer_type===1} onChange={()=>{
                handleChange({target:{name:'payer_type',value:1}});
                // Reset payment method when switching payer
                if (formData.payment_method_id && formData.payment_method_id !== 1 && formData.payment_method_id !== 2 && formData.payment_method_id !== 3) {
                  handleChange({target:{name:'payment_method_id',value:1}});
                }
              }} /> Sender</label>
              <label><input type="radio" name="payer_type" value="2" checked={formData.payer_type===2} onChange={()=>{
                handleChange({target:{name:'payer_type',value:2}});
                // Reset to cash only when receiver pays
                handleChange({target:{name:'payment_method_id',value:1}});
                // Auto-enable COD when receiver pays (set minimum COD if not set)
                if (!formData.cod_amount || formData.cod_amount === 0) {
                  handleChange({target:{name:'cod_amount',value:0}}); // User will enter COD amount
                }
              }} /> Receiver</label>
            </div>
          </div>
          <div className="input-group">
            <label>Payment Method</label>
            {formData.payer_type === 1 ? (
              // Sender pays: can choose payment method
            <select name="payment_method_id" value={formData.payment_method_id} onChange={handleChange} required>
                <option value="">-- Select Payment Method --</option>
              {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            ) : (
              // Receiver pays: Cash on Delivery only (fixed, no selection)
              <div>
                <input 
                  type="text" 
                  value="Cash (Receiver Pay)" 
                  readOnly 
                  disabled
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed', marginBottom: '5px' }}
                />
                <small style={{ color: '#6c757d', fontStyle: 'italic', display: 'block' }}>
                  Receiver will pay in cash upon delivery. COD is automatically enabled.
                </small>
              </div>
            )}
          </div>
          <div className="input-group">
            <label htmlFor="cod_amount">
              {fieldMap.cod_amount}
              {formData.payer_type === 2 && <span style={{color: '#dc3545'}}> *</span>}
            </label>
            <input
              id="cod_amount"
              name="cod_amount"
              type="text"
              value={formData.cod_amount}
              onChange={(e) => {
                let val = e.target.value.replace(/[^0-9]/g, '');
                handleChange({ target: { name: 'cod_amount', value: val } });
              }}
              placeholder={formData.payer_type === 2 ? "Enter COD amount (required for Receiver Pay)" : "Enter COD amount (optional)"}
              required={formData.payer_type === 2}
              style={formData.payer_type === 2 ? { borderColor: '#ffc107', borderWidth: '2px' } : {}}
            />
            {formData.payer_type === 2 && (
              <small style={{ color: '#856404', display: 'block', marginTop: '5px', fontWeight: '500' }}>
                ⚠️ COD is required when Receiver Pays. Enter the amount receiver will pay in cash.
              </small>
            )}
            </div>
          <div className="input-group">
            <label>Shipping Service</label>
            <select name="service_type" value={formData.service_type} onChange={handleChange} required>
              <option value="">-- Select Service --</option>
              {serviceTypes.map(s => <option key={s.id} value={s.id}>{s.name} ({s.fee.toLocaleString()} đ)</option>)}
            </select>
          </div>
        </div>

        {/* COLUMN 3: Images & Summary */}
        <div className="form-section">
          <h3>Images & Notes</h3>
          <div className="input-group">
            <label htmlFor="file-input" className="custom-upload-area">
              <span style={{fontSize:'2rem'}}>☁️</span>
              <span>Upload package images</span>
            </label>
            <input id="file-input" type="file" onChange={handleFileChange} multiple accept="image/*" style={{display:'none'}} />
            {filePreviews.length>0 && (
              <div className="preview-grid">
                {filePreviews.map((url,i) => <img key={i} src={url} alt="preview" className="preview-img"/>)}
              </div>
            )}
          </div>

          <div className="input-group">
            <label>Order Notes</label>
            <textarea name="note" value={formData.note} onChange={handleChange} placeholder="Instructions for pickup staff..." rows={3}/>
          </div>

          <div className="summary-footer">
            <div className="fee-summary">
              {fees_detail.filter(f => f.code !== 'cod').map((fee,i) => (
                <div key={i} className="fee-item">
                  <span>{fee.name}</span>
                  <strong>{fee.amount.toLocaleString()} đ</strong>
                </div>
              ))}
              <div style={{borderTop:'1px solid #e2e8f0', marginTop:'8px', paddingTop:'8px', display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
                <span>Subtotal (Shipping Fee):</span>
                <span>{total_shipping_fee.toLocaleString()} đ</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
                <span>VAT (10%):</span>
                <span>{Math.round(total_shipping_fee * 0.1).toLocaleString()} đ</span>
              </div>
              <div style={{borderTop:'1px solid #e2e8f0', marginTop:'8px', paddingTop:'8px', display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
                <span>Total Shipping Fee (incl. VAT):</span>
                <span>{Math.round(total_shipping_fee * 1.1).toLocaleString()} đ</span>
              </div>
              <div style={{borderTop:'1px solid #e2e8f0', marginTop:'8px', paddingTop:'8px', display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
                <span>COD Amount (Collected from Receiver):</span>
                <span>{cod_amount > 0 ? cod_amount.toLocaleString() : '0'} đ</span>
              </div>
            </div>
            <div className="grand-total-box">
              <p style={{ fontSize:'0.7rem', margin:0, opacity:0.9 }}>
                {formData.payer_type === 2 ? 'AMOUNT TO COLLECT FROM RECEIVER' : 'FINAL TOTAL (SHIPPING + COD)'}
              </p>
              <p style={{ fontSize:'1.4rem', fontWeight:'800', margin:'5px 0' }}>{(Math.round(total_shipping_fee * 1.1) + cod_amount).toLocaleString()} đ</p>
            </div>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Processing...' : 'Confirm Create Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
