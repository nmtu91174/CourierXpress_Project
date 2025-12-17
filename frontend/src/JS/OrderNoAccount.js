import { useState, useEffect, useMemo, useCallback } from 'react';
import emailjs from "emailjs-com";
import hanoiData from "../data/hanoi.json"; 

const API_KEY = "9aed6a93b4d540e6b3b740a688d9921e";
const API_URL = 'http://localhost:8888/createorder.php'; 
const DISTANCE_THRESHOLD = 0.0;

const fieldMap = {
    sender_name: 'Tên Người Gửi (*)',
    sender_phone: 'Số Điện Thoại Gửi (*)',
    receiver_name: 'Tên Người Nhận (*)',
    receiver_phone: 'Số Điện Thoại Nhận (*)',
    receiver_email: 'Email Người Nhận (*)',
    weight: 'Khối Lượng (gram) (*)',
    length: 'Chiều Dài (cm) (*)',
    width: 'Chiều Rộng (cm) (*)',
    height: 'Chiều Cao (cm) (*)',
    cod_amount: 'Tiền Thu Hộ (COD) - VNĐ',
};

// =======================================================
// CUSTOM HOOK CHỨA LOGIC
// =======================================================
export const useOrderLogic = () => {
    
    // --- State Dữ liệu nền (1-4) ---
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [fees, setFees] = useState([]); 

    // --- State Form và Kết quả (5-10) ---
    const [distanceKm, setDistanceKm] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null); 
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);

    const [formData, setFormData] = useState({
        fromStreet: '', fromWard: '', fromDistrict: '',
        toStreet: '', toWard: '', toDistrict: '',
        sender_name: '', sender_phone: '',
        receiver_name: '', receiver_phone: '', receiver_email: '', 
        category_id: '',
        weight: 500, length: 10, width: 10, height: 10, 
        service_type: 1,
        payer_type: 1,
        cod_amount: 0,
        payment_method_id: 1, 
        note: "",
    });


    // =======================================================
    // --- Geocoding & Routing Logic (useCallback 1-3) ---
    // =======================================================

    // useCallback 1: Fetch Lat/Lng
    const fetchLatLng = useCallback(async (street, ward, district) => {
        const parts = [];
        if (street.trim()) parts.push(street.trim());
        if (ward.trim()) parts.push(ward.trim());
        if (district.trim()) parts.push(district.trim());
        parts.push("Hà Nội", "Vietnam");
        const full = parts.join(", ");
        
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(full)}&filter=countrycode:vn&format=json&apiKey=${API_KEY}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Geoapify geocode lỗi: " + res.status);
        const data = await res.json();
        
        if (!data.results || data.results.length === 0) {
            throw new Error("Không tìm thấy địa chỉ: " + full);
        }

        let selected = data.results.find((r) => {
             const txt = ((r.formatted || "") + " " + (r.city || "") + " " + (r.state || "") + " " + (r.county || ""));
             return txt.toLowerCase().includes("hà nội") || txt.toLowerCase().includes("ha noi");
        });
        if (!selected) selected = data.results[0];

        const lat = Number(selected.lat);
        const lon = Number(selected.lon);
        if (!lat || !lon) throw new Error("Không lấy được toạ độ từ: " + full);
        
        return { lat, lon };
    }, []);

    const getRouteDistance = async (start, end) => {
        const url = `https://api.geoapify.com/v1/routing?waypoints=${start.lat},${start.lon}|${end.lat},${end.lon}&mode=drive&apiKey=${API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Geoapify routing lỗi: " + res.status);
        const data = await await res.json();
        if (!data.features || data.features.length === 0) throw new Error("Không tìm được lộ trình.");
        
        const props = data.features[0].properties;
        if (!props || typeof props.distance !== "number") throw new Error("Kết quả routing không hợp lệ.");
        
        return props.distance / 1000; // mét → km
    };

    // useCallback 2: Tính Khoảng cách
    const handleCalculateDistance = useCallback(async () => {
        const { fromStreet, fromWard, fromDistrict, toStreet, toWard, toDistrict } = formData;
        
        if (!fromStreet || !fromWard || !fromDistrict || !toStreet || !toWard || !toDistrict) {
             setMessage({ status: 'warning', text: 'Vui lòng điền đầy đủ thông tin địa chỉ để tính khoảng cách.' });
             return null;
        }

        setDistanceKm("Đang tính...");

        try {
            const fromCoord = await fetchLatLng(fromStreet, fromWard, fromDistrict);
            const toCoord = await fetchLatLng(toStreet, toWard, toDistrict);

            const km = await getRouteDistance(fromCoord, toCoord);
            setDistanceKm(km.toFixed(2));
            return km.toFixed(2);
        } catch (err) {
            console.error(err);
            setDistanceKm(null);
            setMessage({ status: 'error', text: "Lỗi tính khoảng cách: " + err.message });
            return null;
        }
    }, [formData, fetchLatLng]);
    
    // useCallback 3: Tính Phí
    const calculateFees = useCallback((data, distanceKm, fees, serviceTypes) => {
        let total_shipping_fee = 0;
        const fees_detail = [];
        const weight = data.weight || 0;
        const cod_amount = data.cod_amount || 0;
        const service_type = data.service_type;

        // 1. Lấy các loại phí từ DB
        const baseFee = fees.find(f => f.type === 'base');
        const distanceFee = fees.find(f => f.code === 'distance_fee'); 
        const weightFee = fees.find(f => f.type === 'weight');
        const insuranceFee = fees.find(f => f.type === 'insurance'); 
        
        const SERVICE_SURCHARGE_FEE_ID = 6; 
        
        const FEE_PER_EXTRA_KM = distanceFee ? parseFloat(distanceFee.amount) : 0;
        const WEIGHT_FEE_PER_KG = weightFee ? parseFloat(weightFee.amount) : 0;
        const INSURANCE_FEE_AMOUNT = insuranceFee ? parseFloat(insuranceFee.amount) : 0;

        
        // --- Bắt đầu tính toán ---
        
        // 2. Phí Cơ Bản (ID 1) - Luôn có
        if (baseFee) {
            let currentBaseFee = parseFloat(baseFee.amount);
            total_shipping_fee += currentBaseFee;
            fees_detail.push({ 
                id: baseFee.id, 
                code: baseFee.code, 
                name: baseFee.name, 
                amount: currentBaseFee 
            });
        }

        // 3. Phụ Phí Cân Nặng (GRAM)
        // Quy tắc:
        // 0–500g: miễn phí
        // >500g: mỗi 500g tính thêm 1 lần phí

        const weightGram = Number(weight) || 0;
        const FREE_WEIGHT = 500;   // 500g miễn phí
        const BLOCK_WEIGHT = 500;  // mỗi block 500g

        if (weightFee && weightGram > FREE_WEIGHT) {
            const extraGram = weightGram - FREE_WEIGHT;
            const blocks = Math.ceil(extraGram / BLOCK_WEIGHT);
            const extraWeightFee = blocks * WEIGHT_FEE_PER_KG;

            total_shipping_fee += extraWeightFee;

            fees_detail.push({
                id: weightFee.id,
                code: weightFee.code,
                name: `Phụ phí trọng lượng (${blocks} x 500g)`,
                amount: extraWeightFee
            });
        }
        
        // 4. Phụ Phí Bảo Hiểm (ID 3) - Giả định nếu COD > 500k
        if (insuranceFee && cod_amount > 500000) {
            const currentInsuranceFee = INSURANCE_FEE_AMOUNT;
            if (currentInsuranceFee > 0) {
                total_shipping_fee += currentInsuranceFee;
                fees_detail.push({ 
                    id: insuranceFee.id, 
                    code: insuranceFee.code, 
                    name: insuranceFee.name, 
                    amount: currentInsuranceFee 
                });
            }
        }


        // 5. Phụ Phí Khoảng Cách (ID 5)
        if (distanceKm && distanceFee) {
            const km = parseFloat(distanceKm);
            
            if (km > DISTANCE_THRESHOLD) {
                // Chỉ tính phí cho KM phụ trội
                const extraKm = Math.ceil(km - DISTANCE_THRESHOLD); 
                const extraDistanceFee = extraKm * FEE_PER_EXTRA_KM;
                
                // Chỉ thêm vào fees_detail nếu có phí phát sinh
                if (extraDistanceFee > 0) {
                    total_shipping_fee += extraDistanceFee;
                    fees_detail.push({ 
                        id: distanceFee.id, 
                        code: distanceFee.code,
                        name: `Phụ phí Khoảng cách (${extraKm}km phụ trội)`, 
                        amount: extraDistanceFee 
                    });
                }
            }
        }
        
        // 6. Phí Dịch Vụ (Sử dụng ID 6 - Phụ phí Loại Dịch vụ)
        const selectedService = serviceTypes.find(s => s.id === service_type);
        if (selectedService) {
            const serviceFee = parseFloat(selectedService.fee) || 0;
            
            if (serviceFee > 0) {
                total_shipping_fee += serviceFee;
                fees_detail.push({ 
                    id: SERVICE_SURCHARGE_FEE_ID, 
                    code: 'service_surcharge',
                    name: `Phụ phí Dịch vụ (${selectedService.name})`, 
                    amount: serviceFee,
                });
            }
        }

        // TỔNG TIỀN CẦN THU = Phí Ship + Tiền COD
        const total_amount_with_cod = total_shipping_fee + cod_amount;

        // Phí COD (ID 4) - Không tính vào total_shipping_fee
        const codFee = fees.find(f => f.type === 'cod');
        if (codFee && cod_amount > 0) {
            fees_detail.push({
                id: codFee.id,
                code: codFee.code,
                name: codFee.name,
                amount: cod_amount
            });
        }

        return { fees_detail, total_shipping_fee, total_amount_with_cod, cod_amount };
    }, [fees, serviceTypes]); 


    // =======================================================
    // --- Effects & Memos (useMemo 1, useEffect 1-3) ---
    // =======================================================
    
    // useMemo 1: Tính Phí Real-time
    const feeCalculation = useMemo(() => calculateFees(formData, distanceKm, fees, serviceTypes), [formData, distanceKm, fees, serviceTypes, calculateFees]);
    const { fees_detail, total_shipping_fee, total_amount_with_cod, cod_amount } = feeCalculation;

    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user) {
            setIsLoggedIn(true);
            setFormData(prev => ({
                ...prev,
                sender_name: user.name,
                sender_phone: user.phone,
                fromStreet: user.address || "",
                receiver_email: user.email
            }));
        }
    }, []);




    // useEffect 1: Load Data nền
    useEffect(() => {
        const loadData = async (url, setState, errorMsg) => {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                setState(data);
            } catch (err) {
                console.error(errorMsg, err);
                setMessage({ status: 'error', text: `${errorMsg}: ${err.message}` });
            }
        };

        loadData("http://localhost:8888/get_item_categories.php", setCategories, "Lỗi load categories");
        loadData("http://localhost:8888/get_payment_methods.php", setPaymentMethods, "Lỗi load payment methods");
        loadData("http://localhost:8888/get_fees.php", setFees, "Lỗi load fees");
        loadData("http://localhost:8888/get_service_types.php", setServiceTypes, "Lỗi load service types");
    }, []);

    // useEffect 2: Cleanup Object URLs cho Image Preview
    useEffect(() => {
        return () => {
            filePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [filePreviews]);

    // useEffect 3: Tự động tính khoảng cách khi địa chỉ thay đổi (Hook mới)
    useEffect(() => { 
        const { fromStreet, fromWard, fromDistrict, toStreet, toWard, toDistrict } = formData;

        // Chỉ tự động tính khi tất cả 6 trường địa chỉ đã được điền
        if (fromStreet && fromWard && fromDistrict && toStreet && toWard && toDistrict) {
            // Chỉ tính nếu chưa có khoảng cách hoặc khoảng cách là trạng thái pending
            if (!distanceKm || distanceKm === "Đang tính...") {
                console.log("Địa chỉ đã đủ. Tự động tính khoảng cách...");
                handleCalculateDistance(); 
            }
        } else {
            // Nếu thiếu trường, reset khoảng cách về null (trạng thái 'Chưa tính')
            if (distanceKm !== null) {
                 setDistanceKm(null);
            }
        }
    }, [
        formData.fromStreet, 
        formData.fromWard, 
        formData.fromDistrict, 
        formData.toStreet, 
        formData.toWard, 
        formData.toDistrict,
        handleCalculateDistance,
        distanceKm
    ]);


    // =======================================================
    // --- Handlers (Không phải Hooks) ---
    // =======================================================
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: (['weight', 'length', 'width', 'height', 'cod_amount'].includes(name))
                ? parseFloat(value) || 0 : value
        }));
    };
    
    const handleDistrictChange = (e, type) => {
        const { value } = e.target;
        setDistanceKm(null); // Reset km khi thay đổi Quận/Huyện
        if (type === 'from') {
            setFormData(prev => ({ ...prev, fromDistrict: value, fromWard: '' }));
        } else {
            setFormData(prev => ({ ...prev, toDistrict: value, toWard: '' }));
        }
    };
    
    const handleWardChange = (e, type) => {
        const { value } = e.target;
        setDistanceKm(null); // Reset km khi thay đổi Phường/Xã
        if (type === 'from') {
            setFormData(prev => ({ ...prev, fromWard: value }));
        } else {
            setFormData(prev => ({ ...prev, toWard: value }));
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setFilePreviews(newPreviews);
    };

    // --- Submission Logic ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        
        // 1. Validation 
        const requiredFields = ['sender_name', 'sender_phone', 'receiver_name', 'receiver_phone', 
                                 'receiver_email', 'category_id', 'weight', 'length', 'width', 'height', 
                                 'fromStreet', 'fromDistrict', 'toStreet', 'toDistrict'];
        
        for (const field of requiredFields) {
             if (!formData[field] || (typeof formData[field] === 'number' && formData[field] <= 0)) {
                 setMessage({ status: 'error', text: `Vui lòng điền đầy đủ trường bắt buộc: ${fieldMap[field] || field}.` });
                 setLoading(false);
                 return;
             }
        }
        
        // 2. Tính lại khoảng cách (hoặc tính lần đầu)
        let finalDistance = distanceKm;
        if (!finalDistance || finalDistance === "Đang tính...") {
            finalDistance = await handleCalculateDistance();
            if (!finalDistance) {
                setLoading(false);
                return; 
            }
        }

        // 3. Tính toán phí lần cuối
        const currentFeeCalculation = calculateFees(formData, finalDistance, fees, serviceTypes); 
        
        const loggedUser = JSON.parse(localStorage.getItem("user"));

        // 4. Chuẩn bị FormData 
        const dataToSend = new FormData();

        dataToSend.append("customer_id", loggedUser ? loggedUser.id : 6);

        const fieldsToExclude = ['fromStreet', 'fromWard', 'fromDistrict', 'toStreet', 'toWard', 'toDistrict', 'service_type'];

        Object.keys(formData).forEach(key => {
            if (!fieldsToExclude.includes(key)) {
                const finalValue = typeof formData[key] === 'number' ? formData[key].toString() : formData[key];
                dataToSend.append(key, finalValue);
            }
        });

        // Ghép địa chỉ:
        dataToSend.append('sender_address', `${formData.fromStreet}, ${formData.fromWard}, ${formData.fromDistrict}, Hà Nội`);
        dataToSend.append('receiver_address', `${formData.toStreet}, ${formData.toWard}, ${formData.toDistrict}, Hà Nội`);
        
        // Phí và khoảng cách:
        dataToSend.append('shipping_distance_km', finalDistance.toString()); 
        dataToSend.append('service_type_id', formData.service_type.toString()); 
        dataToSend.append('total_shipping_fee', currentFeeCalculation.total_shipping_fee.toString());
        dataToSend.append('total_amount_with_cod', currentFeeCalculation.total_amount_with_cod.toString());

        // Thêm chi tiết phí (loại trừ phí COD vì nó đã là trường cod_amount)
        currentFeeCalculation.fees_detail.forEach(f => {
            if (f.id !== null && f.amount > 0 && f.code !== 'cod') { 
                dataToSend.append('fee_ids[]', f.id.toString());
                dataToSend.append('fee_amounts[]', f.amount.toString());
            }
        });
        
        // Thêm file
        selectedFiles.forEach(file => { dataToSend.append('images[]', file); });

        // 5. Gửi đơn hàng
        try {
            const response = await fetch(API_URL, { method: 'POST', body: dataToSend });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned status ${response.status}: ${errorText.substring(0, 150)}...`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                if (!loggedUser) {
                    emailjs.send(
                        "service_z6xn9og",
                        "template_d7keh2g",
                        {
                            to_email: data.receiver_email,
                            tracking_code: data.order_code,
                        },
                        "5EwRopnOusFLIkA2N"
                    );
                }

                setMessage({
                    status: 'success',
                    text: loggedUser
                        ? "Đã tạo đơn hàng thành công!"
                        : `Tạo đơn hàng thành công! Mã vận đơn: ${data.order_code}. Bạn đừng lo vì chúng tôi sẽ gửi Email cho bạn!`
                });

                setFormData({
                    fromStreet: '', fromWard: '', fromDistrict: '',
                    toStreet: '', toWard: '', toDistrict: '',
                    sender_name: '', sender_phone: '',
                    receiver_name: '', receiver_phone: '', receiver_email: '', 
                    category_id: '',
                    weight: 500, length: 10, width: 10, height: 10,
                    service_type: 1,
                    payer_type: 1,
                    cod_amount: 0,
                    payment_method_id: 1,
                    note: "",
                });

                setSelectedFiles([]); setFilePreviews([]); setDistanceKm(null);
            } else {
                setMessage({ status: 'error', text: data.message || 'Lỗi không xác định khi tạo đơn.' });
            }
        } catch (error) {
            setMessage({ status: 'error', text: `Lỗi kết nối đến máy chủ: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };


    return {
        // Dữ liệu hiển thị
        formData,
        districtList: Object.keys(hanoiData),
        wardListFrom: formData.fromDistrict ? hanoiData[formData.fromDistrict] : [],
        wardListTo: formData.toDistrict ? hanoiData[formData.toDistrict] : [],
        categories,
        paymentMethods,
        serviceTypes,
        distanceKm,
        fees_detail,
        total_shipping_fee,
        total_amount_with_cod,
        cod_amount,
        selectedFiles,
        filePreviews,
        loading,
        message,
        // Handlers
        handleChange,
        handleDistrictChange,
        handleWardChange,
        handleFileChange,
        handleCalculateDistance,
        handleSubmit,
        isLoggedIn   
    };
};