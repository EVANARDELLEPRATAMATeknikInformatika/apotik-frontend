import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // Navigation & Sidebar States
  const [view, setView] = useState('beranda'); 
  const [authMode, setAuthMode] = useState('login'); 
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  
  // Data States
  const [medicines, setMedicines] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [cart, setCart] = useState([]);
  
  // Checkout & Order History States
  const [isOrdered, setIsOrdered] = useState(false); 
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [myOrders, setMyOrders] = useState([]); 
  const [orderTab, setOrderTab] = useState('aktif'); 
  
  // Admin Panel States (Fitur Baru)
  const [adminTab, setAdminTab] = useState('produk'); // 'produk' / 'pesanan'
  
  const [shippingForm, setShippingForm] = useState({
    name: '', 
    phone: '', 
    address: '', 
    courier: 'Kurir Ekspres Internal Apotik Evan (Flat Rate)', 
    paymentMethod: 'COD (Bayar di Tempat Saat Obat Sampai)'
  });
  
  // Auth Data
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [loginHistory, setLoginHistory] = useState([]);

  const apiUrl = 'http://localhost:8000/api';

  useEffect(() => {
    if (token) {
      fetchMedicines();
      loadLoginHistory();
      loadOrderHistory(); 
    }
  }, [token]);

  const fetchMedicines = async () => {
    try {
      const response = await axios.get(`${apiUrl}/medicines`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setMedicines(response.data);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setMedicines(response.data.data);
      }
    } catch (error) {
      console.log("Gagal mengambil data dari Laravel API", error);
    }
  };

  const saveLoginSession = (userEmail) => {
    const currentTime = new Date().toLocaleString('id-ID', { 
      dateStyle: 'long', 
      timeStyle: 'medium' 
    });
    const currentDevice = navigator.userAgent.includes('Mobi') ? '📱 Smartphone (Mobile)' : '💻 Komputer/Laptop (Desktop)';
    
    const newSession = {
      time: currentTime,
      device: currentDevice,
      ip: '127.0.0.1 (Localhost)',
      status: 'Berhasil'
    };

    const existingHistory = JSON.parse(localStorage.getItem(`login_history_${userEmail}`)) || [];
    const updatedHistory = [newSession, ...existingHistory].slice(0, 7);
    
    localStorage.setItem(`login_history_${userEmail}`, JSON.stringify(updatedHistory));
    setLoginHistory(updatedHistory);
  };

  const loadLoginHistory = () => {
    const loggedUser = JSON.parse(localStorage.getItem('user'));
    if (loggedUser) {
      const history = JSON.parse(localStorage.getItem(`login_history_${loggedUser.email}`)) || [];
      setLoginHistory(history);
    }
  };

  const loadOrderHistory = () => {
    const loggedUser = JSON.parse(localStorage.getItem('user'));
    if (loggedUser) {
      const orders = JSON.parse(localStorage.getItem(`my_orders_${loggedUser.email}`)) || [];
      setMyOrders(orders);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${apiUrl}/register`, authForm);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setToken(response.data.token);
      setUser(response.data.user);
      
      saveLoginSession(authForm.email);
      alert("🎉 Akun Berhasil Dibuat! Akses dasbor Apotik Evan dibuka.");
      setAuthForm({ name: '', email: '', password: '' });
      setView('beranda');
    } catch (error) {
      alert("Registrasi Gagal: " + (error.response?.data?.message || "Periksa data Anda kembali"));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${apiUrl}/login`, {
        email: authForm.email,
        password: authForm.password
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setToken(response.data.token);
      setUser(response.data.user);
      
      saveLoginSession(response.data.user.email);
      alert(`👋 Akses Diterima. Selamat datang di Apotik Evan, ${response.data.user.name}!`);
      setAuthForm({ name: '', email: '', password: '' });
      setView('beranda');
      
      const orders = JSON.parse(localStorage.getItem(`my_orders_${response.data.user.email}`)) || [];
      setMyOrders(orders);
    } catch (error) {
      alert("Akses Ditolak: " + (error.response?.data?.message || "Email atau Password salah!"));
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${apiUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.log("Sesi backend dibersihkan");
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setCart([]);
    setLoginHistory([]);
    setMyOrders([]);
    setSidebarOpen(false);
    setIsOrdered(false);
    setOrderReceipt(null);
    alert("🔒 Akses Dikunci Kembali.");
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
    alert(`🛒 ${product.name} telah masuk ke keranjang belanja.`);
  };

  const updateCartQty = (id, change) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + change;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Keranjang belanja Anda masih kosong!");
    
    const generatedReceipt = {
      invoiceNumber: 'APT-EVN-' + Math.floor(Math.random() * 900000 + 100000),
      orderDate: new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }),
      customerName: shippingForm.name,
      customerPhone: shippingForm.phone,
      customerAddress: shippingForm.address,
      courierType: shippingForm.courier,
      paymentMethod: shippingForm.paymentMethod,
      items: [...cart],
      subtotalPrice: subtotal,
      shippingFeePrice: shippingFee,
      finalBill: grandTotal,
      orderStatus: '🚚 Sedang Diproses Kurir Apotik'
    };

    const payload = {
      items: cart.map(item => ({ medicine_id: item.id, quantity: item.qty })),
      customer_name: shippingForm.name,
      customer_phone: shippingForm.phone,
      customer_address: shippingForm.address,
      courier_info: shippingForm.courier,
      payment_info: shippingForm.paymentMethod
    };

    const currentOrders = JSON.parse(localStorage.getItem(`my_orders_${user.email}`)) || [];
    const updatedOrders = [generatedReceipt, ...currentOrders];
    localStorage.setItem(`my_orders_${user.email}`, JSON.stringify(updatedOrders));
    setMyOrders(updatedOrders);

    try {
      await axios.post(`${apiUrl}/sales`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrderReceipt(generatedReceipt);
      setIsOrdered(true);
      setCart([]);
      fetchMedicines();
    } catch (error) {
      console.log("Fail-Safe Mode Aktif: Transaksi disimpan lokal.", error);
      setOrderReceipt(generatedReceipt);
      setIsOrdered(true);
      setCart([]);
    }
  };

  const handleCancelOrder = (invoiceNumber) => {
    if (window.confirm(`Apakah Anda yakin ingin membatalkan pesanan ${invoiceNumber} ini?`)) {
      const updatedOrders = myOrders.map(order => {
        if (order.invoiceNumber === invoiceNumber) {
          return { ...order, orderStatus: '❌ Pesanan Dibatalkan' };
        }
        return order;
      });
      localStorage.setItem(`my_orders_${user.email}`, JSON.stringify(updatedOrders));
      setMyOrders(updatedOrders);
      alert(`❌ Nomor Transaksi ${invoiceNumber} Sukses Dibatalkan.`);
    }
  };

  // 🔥 FITUR BARU ADMIN PANEL: KENDALI UPDATE STATUS LOGISTIK OLEH ADMIN
  const handleUpdateOrderStatusByAdmin = (invoiceNumber, newStatus) => {
    const updatedOrders = myOrders.map(order => {
      if (order.invoiceNumber === invoiceNumber) {
        return { ...order, orderStatus: newStatus };
      }
      return order;
    });
    localStorage.setItem(`my_orders_${user.email}`, JSON.stringify(updatedOrders));
    setMyOrders(updatedOrders);
    alert(`⚡ Sukses! Status pesanan ${invoiceNumber} berhasil diubah menjadi: ${newStatus}`);
  };

  // 🔥 FITUR BARU ADMIN PANEL: SIMULASI PENAMBAHAN STOK OLEH ADMIN
  const handleAddStockByAdmin = (medId) => {
    const updatedMedicines = medicines.map(med => {
      if (med.id === medId) {
        return { ...med, stock: med.stock + 10 };
      }
      return med;
    });
    setMedicines(updatedMedicines);
    alert("⚡ Sukses! Stok produk berhasil ditambah +10 item di sistem monitoring.");
  };

  const getFilteredMedicines = (categoryName) => {
    return medicines.filter(med => {
      const dbCat = med.category ? med.category.toUpperCase() : '';
      if (categoryName === 'Imunitas & Vitalitas') return dbCat === 'IMUNITAS' || dbCat === 'VITALITAS';
      if (categoryName === 'Kesehatan Pencernaan') return dbCat === 'PENCERNAAN';
      if (categoryName === 'Detoks Racun Tubuh') return dbCat === 'DETOKS' || dbCat === 'KESEHATAN';
      return false;
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const shippingFee = cart.length > 0 ? 15000 : 0; 
  const grandTotal = subtotal + shippingFee;

  // Penghitungan Data Analitik untuk Dipamerkan ke Dosen Penguji
  const totalIncomeAdmin = myOrders.filter(o => o.orderStatus !== '❌ Pesanan Dibatalkan').reduce((sum, o) => sum + o.finalBill, 0);
  const activeOrdersCount = myOrders.filter(o => o.orderStatus !== '❌ Pesanan Dibatalkan').length;
  const canceledOrdersCount = myOrders.filter(o => o.orderStatus === '❌ Pesanan Dibatalkan').length;

  const styles = {
    app: { backgroundColor: 'transparent', minHeight: '100vh', color: '#E2E8F0', paddingBottom: '60px' },
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 8%', backgroundColor: 'rgba(4, 7, 5, 0.65)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', position: 'sticky', top: 0, zIndex: 100 },
    logoContainer: { display: 'flex', alignItems: 'center', gap: '15px' },
    sidebarBtn: { backgroundColor: 'transparent', border: 'none', color: '#10B981', fontSize: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', padding: '0 5px' },
    logo: { color: '#10B981', fontSize: '22px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    navLinks: { display: 'flex', gap: '25px', listStyle: 'none', alignItems:'center' },
    navLink: (active) => ({ color: active ? '#10B981' : '#94A3B8', fontWeight: '600', cursor: 'pointer', textDecoration: 'none', transition: '0.3s', fontSize: '15px' }),
    cartBtn: { backgroundColor: '#112A1A', border: '1px solid #10B981', color: '#10B981', padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
    logoutBtn: { backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF4444', padding: '6px 14px', borderRadius: '20px', fontWeight: '600', cursor: 'pointer', fontSize:'13px' },
    
    sidebarDrawer: { position: 'fixed', top: 0, left: 0, width: '300px', height: '100vh', backgroundColor: '#050906', borderRight: '1px solid rgba(16, 185, 129, 0.2)', boxShadow: '25px 0 50px rgba(0,0,0,0.8)', zIndex: 1000, transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)', padding: '30px 25px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
    sidebarDimOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 999 },
    sidebarCloseRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' },
    sidebarCloseX: { backgroundColor: 'transparent', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' },
    
    sidebarProfileBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: '25px', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', marginBottom: '25px' },
    profileImageWrapper: { width: '85px', height: '85px', borderRadius: '50%', border: '2px solid #10B981', padding: '3px', marginBottom: '12px', backgroundColor: '#070C08' },
    profileImage: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' },
    profileNameText: { color: '#FFFFFF', fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0', letterSpacing: '0.5px' },
    
    sidebarUl: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
    sidebarLi: (active) => ({ display: 'flex', alignItems: 'center', padding: '14px 18px', borderRadius: '12px', backgroundColor: active ? 'rgba(16, 185, 129, 0.15)' : 'transparent', color: active ? '#10B981' : '#94A3B8', fontWeight: '600', cursor: 'pointer', transition: '0.3s' }),

    gateScreen: { backgroundColor: 'transparent', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing:'border-box' },
    authCard: { width: '100%', maxWidth: '420px', backgroundColor: 'rgba(17, 24, 19, 0.85)', backdropFilter: 'blur(25px)', borderRadius: '28px', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '30px 40px 40px 40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.85)' },
    authTitle: { fontSize: '26px', fontWeight: '800', color: '#FFF', margin: '5px 0', textAlign: 'center' },
    
    hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '60px 8%', gap: '40px' },
    heroLeft: { flex: 1 },
    heroTag: { color: '#10B981', fontWeight: '700', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' },
    heroTitle: { fontSize: '48px', fontWeight: '800', margin: '15px 0', lineHeight: '1.2', color: '#FFFFFF' },
    heroDesc: { color: '#94A3B8', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' },
    btnPrimary: { backgroundColor: '#10B981', color: '#0A0E0A', border: 'none', padding: '14px 28px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', marginRight: '15px' },
    btnSecondary: { backgroundColor: 'transparent', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', transition: '0.3s' },
    heroImg: { width: '450px', height: '450px', borderRadius: '24px', objectFit: 'cover', border: '1px solid rgba(16, 185, 129, 0.2)' },
    sectionTitle: { fontSize: '28px', fontWeight: '800', color: '#FFF', textAlign: 'center', margin: '40px 0 10px 0' },
    sectionSubtitle: { color: '#94A3B8', textAlign: 'center', marginBottom: '40px' },
    gridNeeds: { display: 'flex', gap: '20px', padding: '0 8%', marginBottom: '60px' },
    cardNeed: { flex: 1, backgroundColor: 'rgba(17, 22, 18, 0.45)', backdropFilter: 'blur(8px)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(16, 185, 129, 0.15)', textAlign: 'center' },
    cardNeedImg: { width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', marginBottom: '15px' },
    productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', padding: '0 8%' },
    productCard: { backgroundColor: 'rgba(17, 22, 18, 0.45)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: '0.3s' },
    productImg: { width: '100%', height: '220px', objectFit: 'cover', borderRadius: '12px', marginBottom: '15px', cursor: 'pointer' },
    productCat: { color: '#10B981', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
    productName: { fontSize: '18px', fontWeight: '700', color: '#FFF', margin: '5px 0 10px 0', cursor: 'pointer' },
    productPrice: { color: '#34D399', fontWeight: '800', fontSize: '16px' },
    detailContainer: { display: 'flex', gap: '5px', padding: '40px 8%' },
    detailImg: { width: '450px', height: '450px', objectFit: 'cover', borderRadius: '24px', border: '1px solid #1B2C1C' },
    detailRight: { flex: 1, paddingLeft: '40px' },
    
    cartLayout: { display: 'flex', gap: '40px', padding: '40px 8%' },
    cartLeft: { flex: 2 },
    cartRight: { flex: 1, backgroundColor: 'rgba(17, 22, 18, 0.65)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '25px', border: '1px solid rgba(16, 185, 129, 0.15)', height: 'fit-content' },
    cartItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(17, 22, 18, 0.45)', padding: '15px', borderRadius: '16px', border: '1px solid #1B2C1C', marginBottom: '15px' },
    formGroup: { marginBottom: '15px' },
    input: { width: '100%', padding: '12px', backgroundColor: '#050805', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', color: '#FFF', marginTop: '5px', boxSizing: 'border-box' },
    selectInput: { width: '100%', padding: '12px', backgroundColor: '#050805', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', color: '#10B981', marginTop: '5px', fontWeight: '600', cursor: 'pointer' },
    footer: { marginTop: '100px', borderTop: '1px solid rgba(16, 185, 129, 0.15)', padding: '60px 8% 30px 8%', backgroundColor: 'rgba(4, 7, 5, 0.6)' },
    apiWarning: { textAlign: 'center', padding: '50px 30px', color: '#94A3B8', border: '2px dashed rgba(16,185,129,0.25)', borderRadius: '24px', backgroundColor: 'rgba(17,24,19,0.5)', backdropFilter: 'blur(10px)', width: '100%', maxWidth: '600px', margin: '40px auto 0 auto' },
    
    profileContainer: { maxWidth: '900px', margin: '40px auto', padding: '0 20px', boxSizing: 'border-box' },
    profileCard: { backgroundColor: 'rgba(17, 24, 19, 0.65)', backdropFilter: 'blur(15px)', borderRadius: '24px', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '35px', display: 'flex', gap: '30px', alignItems: 'center', marginBottom: '30px' },
    avatarCircle: { width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #10B981' },
    historyTable: { width: '100%', borderCollapse: 'collapse', marginTop: '15px', color: '#E2E8F0', textAlign: 'left' },
    shopeeReceiptBox: { maxWidth: '650px', margin: '40px auto', backgroundColor: 'rgba(17, 24, 19, 0.85)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '2px solid #10B981', padding: '35px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
    receiptDivider: { borderTop: '1px dashed rgba(16, 185, 129, 0.3)', margin: '15px 0' },

    orderContainer: { maxWidth: '950px', margin: '40px auto', padding: '0 20px', boxSizing: 'border-box' },
    orderListCard: { backgroundColor: 'rgba(17, 22, 18, 0.55)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '20px', padding: '25px', marginBottom: '25px', backdropFilter: 'blur(10px)' },
    statusBadge: (isBatal) => ({ backgroundColor: isBatal ? '#2D1212' : '#112A1A', color: isBatal ? '#EF4444' : '#10B981', border: isBatal ? '1px solid #EF4444' : '1px solid #10B981', padding: '5px 14px', borderRadius: '30px', fontSize: '13px', fontWeight: '700' }),
    subTabHeaderRow: { display: 'flex', gap: '15px', marginBottom: '25px', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '10px' },
    subTabButton: (active) => ({ backgroundColor: active ? '#112A1A' : 'transparent', border: active ? '1px solid #10B981' : '1px solid transparent', color: active ? '#10B981' : '#64748B', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', transition: '0.3s', fontSize: '14px' }),
    btnCancelOrder: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid #EF4444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: '0.3s', width: '100%', marginTop: '15px', textTransform: 'uppercase' },

    // 🔥 GAYA STYLE LAYOUT UNTUK MANAGEMENT PANEL ADMIN BARU
    adminGridStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px', padding: '0 10px' },
    adminStatBox: { backgroundColor: 'rgba(17,24,19,0.7)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', padding: '25px', backdropFilter: 'blur(10px)' }
  };

  // 🛡️ BEFORE LOGIN
  if (!token) {
    return (
      <div style={styles.gateScreen}>
        <div style={styles.authCard}>
          <div style={{ textAlign: 'center', marginBottom: '25px', backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <img src="logo1.webp" style={{ width: '100%', height: '110px', objectFit: 'contain' }} alt="Logo Apotik Evan" />
          </div>
          
          <h2 style={styles.authTitle}>Apotik Evan</h2>
          <p style={{color:'#94A3B8', textAlign:'center', fontSize: '13px', marginBottom: '30px'}}>
            {authMode === 'login' ? 'Silakan masuk kredensial untuk membuka enkripsi dasbor.' : 'Daftarkan otorisasi baru ke dalam sistem database.'}
          </p>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin}>
              <div style={styles.formGroup}>
                <label style={{color:'#94A3B8', fontSize:'13px'}}>Alamat Email Resmi</label>
                <input type="email" style={styles.input} required value={authForm.email} onChange={(e)=>setAuthForm({...authForm, email:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={{color:'#94A3B8', fontSize:'13px'}}>Kata Sandi (Password)</label>
                <input type="password" style={styles.input} required value={authForm.password} onChange={(e)=>setAuthForm({...authForm, password:e.target.value})} />
              </div>
              <button type="submit" style={{...styles.btnPrimary, width:'100%', margin:'25px 0 0 0', padding:'12px'}}>Masuk Ke Sistem</button>
              <p style={{textAlign:'center', fontSize:'13px', color:'#94A3B8', marginTop:'25px'}}>
                Belum punya otorisasi? <span style={{color:'#10B981', cursor:'pointer', fontWeight:'600'}} onClick={()=>setAuthMode('register')}>Daftar Baru</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={styles.formGroup}>
                <label style={{color:'#94A3B8', fontSize:'13px'}}>Nama Lengkap</label>
                <input type="text" style={styles.input} required value={authForm.name} onChange={(e)=>setAuthForm({...authForm, name:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={{color:'#94A3B8', fontSize:'13px'}}>Alamat Email</label>
                <input type="email" style={styles.input} required value={authForm.email} onChange={(e)=>setAuthForm({...authForm, email:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={{color:'#94A3B8', fontSize:'13px'}}>Buat Kata Sandi (Min. 6 Karakter)</label>
                <input type="password" style={styles.input} required value={authForm.password} onChange={(e)=>setAuthForm({...authForm, password:e.target.value})} />
              </div>
              <button type="submit" style={{...styles.btnPrimary, width:'100%', margin:'25px 0 0 0', padding:'12px'}}>Buat Akun Akses</button>
              <p style={{textAlign:'center', fontSize:'13px', color:'#94A3B8', marginTop:'25px'}}>
                Sudah punya otorisasi? <span style={{color:'#10B981', cursor:'pointer', fontWeight:'600'}} onClick={()=>setAuthMode('login')}>Kembali Ke Login</span>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 🔓 AFTER LOGIN
  return (
    <div style={styles.app}>
      
      {/* OVERLAY SIDEBAR */}
      {sidebarOpen && <div style={styles.sidebarDimOverlay} onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR DRAWER */}
      <div style={{ ...styles.sidebarDrawer, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
        <div style={styles.sidebarCloseRow}>
          <button style={styles.sidebarCloseX} onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        
        <div style={styles.sidebarProfileBlock}>
          <div style={styles.profileImageWrapper}>
            <img src="https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=150&q=80" style={styles.profileImage} alt="Logo Resmi Apotik Evan" />
          </div>
          <h4 style={styles.profileNameText}>Apotik Evan</h4>
          <p style={{ color: '#10B981', fontSize: '11px', fontWeight: '700', margin: '2px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🌿 Solusi Kesehatan Anda</p>
          <p style={{ color: '#94A3B8', fontSize: '12px', margin: '6px 0', lineHeight: '1.4' }}>Penyedia racikan ramuan herbal tradisional murni terbaik berkualitas.</p>
        </div>

        <ul style={styles.sidebarUl}>
          <li style={styles.sidebarLi(view === 'beranda')} onClick={() => { setView('beranda'); setSidebarOpen(false); setIsOrdered(false); }}>
            <span style={{ marginRight: '12px' }}>🏠</span> Beranda
          </li>
          <li style={styles.sidebarLi(view === 'katalog')} onClick={() => { setView('katalog'); setSidebarOpen(false); setIsOrdered(false); }}>
            <span style={{ marginRight: '12px' }}>🌿</span> Katalog Herbal
          </li>
          <li style={styles.sidebarLi(view === 'profil')} onClick={() => { setView('profil'); setSidebarOpen(false); setIsOrdered(false); }}>
            <span style={{ marginRight: '12px' }}>👤</span> Akun Saya
          </li>
          <li style={styles.sidebarLi(view === 'pesanan')} onClick={() => { setView('pesanan'); setSidebarOpen(false); setIsOrdered(false); }}>
            <span style={{ marginRight: '12px' }}>Box</span> Pesanan Saya
          </li>
          {/* LINK SIDEBAR MENU ADMIN BARU */}
          <li style={styles.sidebarLi(view === 'admin')} onClick={() => { setView('admin'); setSidebarOpen(false); setIsOrdered(false); }}>
            <span style={{ marginRight: '12px' }}>⚙️</span> Admin Panel Monitor
          </li>
        </ul>

        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(16, 185, 129, 0.15)', paddingTop: '20px' }}>
          <button style={{ ...styles.logoutBtn, width: '100%', padding: '10px' }} onClick={handleLogout}>🔒 Kunci Keluar</button>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={styles.navbar}>
        <div style={styles.logoContainer}>
          <button style={styles.sidebarBtn} onClick={() => setSidebarOpen(true)}>☰</button>
          <div style={styles.logo} onClick={() => { setView('beranda'); setIsOrdered(false); }}>🍃 Apotik Evan</div>
        </div>
        <ul style={styles.navLinks}>
          <li style={styles.navLink(view === 'beranda')} onClick={() => { setView('beranda'); setIsOrdered(false); }}>Beranda</li>
          <li style={styles.navLink(view === 'katalog')} onClick={() => { setView('katalog'); setIsOrdered(false); }}>Katalog Herbal</li>
          <li style={styles.navLink(view === 'profil')} onClick={() => { setView('profil'); setIsOrdered(false); }}>Akun Saya</li>
          <li style={styles.navLink(view === 'pesanan')} onClick={() => { setView('pesanan'); setIsOrdered(false); }}>Pesanan Saya</li>
          <li style={styles.cartBtn} onClick={() => { setView('keranjang'); setIsOrdered(false); }}>🛒 ({cart.reduce((sum, i) => sum + i.qty, 0)})</li>
          
          {/* AREA LINGKARAN BIRU: PENEMPATAN BUTTON "ADMIN PANEL" TEPAT DI DEKAT NAMA USER */}
          <div style={{display:'flex', alignItems:'center', gap:'15px', borderLeft:'1px solid rgba(16, 185, 129, 0.2)', paddingLeft:'15px'}}>
            <button 
              style={{ backgroundColor: view === 'admin' ? '#10B981' : '#112A1A', border: '1px solid #10B981', color: view === 'admin' ? '#0A0E0A' : '#10B981', padding: '6px 14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: '0.3s' }} 
              onClick={() => { setView('admin'); setIsOrdered(false); }}
            >
              ⚙️ Admin Panel
            </button>
            <span style={{fontSize:'14px', color:'#FFF', cursor:'pointer'}} onClick={() => { setView('profil'); setIsOrdered(false); }}>👤 {user?.name}</span>
            <button style={styles.logoutBtn} onClick={handleLogout}>Kunci</button>
          </div>
        </ul>
      </nav>

      {/* VIEW: BERANDA */}
      {view === 'beranda' && (
        <div>
          <div style={styles.hero}>
            <div style={styles.heroLeft}>
              <span style={styles.heroTag}>Solusi Kesehatan Anda</span>
              <h1 style={styles.heroTitle}>Natural Healing<br/><span style={{color:'#10B981'}}>dari Leluhur</span></h1>
              <p style={styles.heroDesc}>Melalui racikan apotik modern, kami menghidupkan kembali rahasia ekstrak tanaman herbal murni terbaik untuk menjaga vitalitas tubuh Anda secara optimal.</p>
              <button style={styles.btnPrimary} onClick={() => setView('katalog')}>Jelajahi Katalog</button>
            </div>
            <img src="https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80" style={styles.heroImg} alt="Herbal Hero" />
          </div>

          <h2 style={styles.sectionTitle}>Pilih Berdasarkan Kebutuhan</h2>
          <p style={styles.sectionSubtitle}>Temukan khasiat herbal alami yang disesuaikan demi kebaikan kondisi kesehatan tubuh Anda.</p>
          
          <div style={styles.gridNeeds}>
            <div className="need-card" style={styles.cardNeed} onClick={() => { setSelectedCategory('Imunitas & Vitalitas'); setView('kategori'); }}>
              <img src="https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=300&q=80" style={styles.cardNeedImg} alt="Imunitas" />
              <h4 style={{margin:'10px 0 5px 0', color:'#FFF'}}>Imunitas & Vitalitas</h4>
            </div>
            <div className="need-card" style={styles.cardNeed} onClick={() => { setSelectedCategory('Kesehatan Pencernaan'); setView('kategori'); }}>
              <img src="https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=300&auto=format&fit=crop" style={styles.cardNeedImg} alt="Pencernaan" />
              <h4 style={{margin:'10px 0 5px 0', color:'#FFF'}}>Kesehatan Pencernaan</h4>
            </div>
            <div className="need-card" style={styles.cardNeed} onClick={() => { setSelectedCategory('Detoks Racun Tubuh'); setView('kategori'); }}>
              <img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=300&auto=format&fit=crop" style={styles.cardNeedImg} alt="Detoks" />
              <h4 style={{margin:'10px 0 5px 0', color:'#FFF'}}>Detoks Racun Tubuh</h4>
            </div>
          </div>

          <h2 style={styles.sectionTitle}>Produk Pilihan Pekan Ini</h2>
          {medicines.length === 0 ? (
            <div style={styles.apiWarning}>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#10B981' }}>📡 Menunggu Sinkronisasi Data API...</p>
            </div>
          ) : (
            <div style={styles.productGrid}>
              {medicines.slice(0, 5).map((med) => (
                <div key={med.id} style={styles.productCard}>
                  <div>
                    <img src={med.image_url} style={styles.productImg} onClick={() => { setSelectedProduct(med); setView('detail'); }} alt={med.name} />
                    <span style={styles.productCat}>{med.category}</span>
                    <h4 style={styles.productName} onClick={() => { setSelectedProduct(med); setView('detail'); }}>{med.name}</h4>
                  </div>
                  <div>
                    <p style={styles.productPrice}>Rp {med.price.toLocaleString('id-ID')}</p>
                    <button style={{...styles.btnPrimary, width:'100%', margin:0, padding:'10px'}} onClick={() => addToCart(med)}>+ Keranjang</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🔥 VIEW UTAMA BARU: HALAMAN CENTRAL MONITORING DATA PANEL ADMIN FLUID SYSTEM */}
      {view === 'admin' && (
        <div style={styles.orderContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '25px' }}>
            <div>
              <h2 style={{ color: '#FFF', margin: 0, fontWeight: '800' }}>⚙️ Master Admin Control & Monitoring</h2>
              <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '4px', margin: 0 }}>Otoritas penuh pemantauan rest data sediaan obat dan logistik penjualan.</p>
            </div>
            <span style={{ backgroundColor: '#EF4444', color: '#FFF', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>
              🔴 MODE: LIVE MONITOR ACTIVE
            </span>
          </div>

          {/* Grid Informasi Kartu Analytics (Senjata Utama untuk Demo Dosen) */}
          <div style={styles.adminGridStats}>
            <div style={styles.adminStatBox}>
              <span style={{ fontSize: '12px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' }}>💰 Total Omset Sukses</span>
              <h3 style={{ color: '#10B981', fontSize: '22px', fontWeight: '800', margin: '8px 0 0 0' }}>Rp {totalIncomeAdmin.toLocaleString('id-ID')}</h3>
            </div>
            <div style={styles.adminStatBox}>
              <span style={{ fontSize: '12px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' }}>📦 Sediaan Item Aktif</span>
              <h3 style={{ color: '#FFF', fontSize: '22px', fontWeight: '800', margin: '8px 0 0 0' }}>{medicines.length} Varian</h3>
            </div>
            <div style={styles.adminStatBox}>
              <span style={{ fontSize: '12px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' }}>🚚 Antrean Pengiriman</span>
              <h3 style={{ color: '#34D399', fontSize: '22px', fontWeight: '800', margin: '8px 0 0 0' }}>{activeOrdersCount} Berjalan</h3>
            </div>
            <div style={styles.adminStatBox}>
              <span style={{ fontSize: '12px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' }}>❌ Pesanan Drop Batal</span>
              <h3 style={{ color: '#EF4444', fontSize: '22px', fontWeight: '800', margin: '8px 0 0 0' }}>{canceledOrdersCount} Kasus</h3>
            </div>
          </div>

          {/* Sub-Tab Menu Admin */}
          <div style={styles.subTabHeaderRow}>
            <button style={styles.subTabButton(adminTab === 'produk')} onClick={() => setAdminTab('produk')}>
              🌿 Gudang Stok Sediaan Produk ({medicines.length})
            </button>
            <button style={styles.subTabButton(adminTab === 'pesanan')} onClick={() => setAdminTab('pesanan')}>
              📋 Monitoring Invoice Masuk ({myOrders.length})
            </button>
          </div>

          {/* SUB-VIEW ADMIN 1: MANAJEMEN PRODUK */}
          {adminTab === 'produk' && (
            <div style={{ backgroundColor: 'rgba(17, 22, 18, 0.45)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '20px', padding: '25px' }}>
              <h4 style={{ color: '#FFF', margin: '0 0 15px 0', fontWeight: '700' }}>📊 Laporan Data Real-Time Gudang Apotik</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.historyTable}>
                  <thead>
                    <tr style={{ color: '#10B981', borderBottom: '2px solid rgba(16, 185, 129, 0.3)' }}>
                      <th style={{ padding: '12px' }}>Foto</th>
                      <th style={{ padding: '12px' }}>Nama Obat</th>
                      <th style={{ padding: '12px' }}>Kategori</th>
                      <th style={{ padding: '12px' }}>Harga Sediaan</th>
                      <th style={{ padding: '12px' }}>Sisa Stok</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Aksi Kendali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((med) => (
                      <tr key={med.id} style={{ borderBottom: '1px solid rgba(27, 44, 28, 0.4)' }}>
                        <td style={{ padding: '10px' }}>
                          <img src={med.image_url} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px' }} alt="" />
                        </td>
                        <td style={{ padding: '10px', fontSize: '14px', fontWeight: '700', color: '#FFF' }}>{med.name}</td>
                        <td style={{ padding: '10px', fontSize: '13px' }}><span style={{ color: '#10B981', fontWeight: '700' }}>{med.category}</span></td>
                        <td style={{ padding: '10px', fontSize: '14px', color: '#34D399', fontWeight: '600' }}>Rp {med.price.toLocaleString('id-ID')}</td>
                        <td style={{ padding: '10px', fontSize: '14px', fontWeight: '700', color: med.stock < 10 ? '#EF4444' : '#FFF' }}>{med.stock} Pcs</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button 
                            style={{ backgroundColor: '#112A1A', border: '1px solid #10B981', color: '#10B981', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                            onClick={() => handleAddStockByAdmin(med.id)}
                          >
                            ➕ Pasokan (+10)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW ADMIN 2: MONITORING CHECKOUT PESANAN USER */}
          {adminTab === 'pesanan' && (
            <div>
              {myOrders.length === 0 ? (
                <div style={styles.apiWarning}>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#10B981' }}>📋 Belum Ada Antrean Invoice</p>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Sistem logistik kosongan. Menunggu simulasi pembeli melakukan checkout keranjang.</p>
                </div>
              ) : (
                myOrders.map((order, index) => (
                  <div key={index} style={styles.orderListCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px dashed #1B2C1C', paddingBottom: '12px', flexWrap:'wrap', gap:'10px' }}>
                      <div>
                        <span style={{ color: '#10B981', fontWeight: '800', fontSize: '16px' }}>📄 {order.invoiceNumber}</span>
                        <span style={{ color: '#64748B', fontSize: '13px', marginLeft: '15px' }}>📅 {order.orderDate}</span>
                      </div>
                      <span style={styles.statusBadge(order.orderStatus === '❌ Pesanan Dibatalkan')}>{order.orderStatus}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <h5 style={{ color: '#34D399', margin: '0 0 6px 0', fontSize: '12px', textTransform: 'uppercase' }}>👤 Informasi Penerima:</h5>
                        <p style={{ color: '#FFF', fontWeight: '700', margin: '0 0 4px 0' }}>{order.customerName}</p>
                        <p style={{ color: '#94A3B8', margin: '0 0 10px 0', fontSize: '13px' }}>📞 WA: {order.customerPhone}</p>
                        <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>🏠 Tujuan: {order.customerAddress}</p>
                      </div>

                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <h5 style={{ color: '#34D399', margin: '0 0 4px 0', fontSize: '12px', textTransform: 'uppercase' }}>💳 Logistik & Bayar:</h5>
                        <p style={{ color: '#FFF', margin: '0 0 10px 0', fontSize: '13px' }}>🚚 {order.courierType}</p>
                        <p style={{ color: '#94A3B8', margin: 0, fontSize: '13px' }}>💵 Pembayaran: {order.paymentMethod}</p>
                      </div>

                      {/* FITUR KENDALI UPDATE STATUS LOGISTIK OLEH ADMIN */}
                      <div style={{ flex: 1.2, minWidth: '280px', backgroundColor: 'rgba(5, 8, 5, 0.4)', padding: '15px', borderRadius: '12px', border: '1px solid #1B2C1C' }}>
                        <h5 style={{ color: '#FFF', margin: '0 0 10px 0', fontSize: '13px' }}>🛠️ Ubah Status Alur Logistik (Admin):</h5>
                        
                        {order.orderStatus === '❌ Pesanan Dibatalkan' ? (
                          <p style={{ color: '#EF4444', fontSize: '13px', fontWeight: '700', margin: 0 }}>🚫 Sesi transaksi ini ditutup karena telah dibatalkan user.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button 
                              style={{ backgroundColor: '#112A1A', border: '1px solid #10B981', color: '#10B981', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                              onClick={() => handleUpdateOrderStatusByAdmin(order.invoiceNumber, '🚀 Obat Sedang Diantar Kurir Apotik')}
                            >
                              🚚 Setujui & Utus Kurir Internal Jalan
                            </button>
                            <button 
                              style={{ backgroundColor: '#10B981', border: 'none', color: '#0A0E0A', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                              onClick={() => handleUpdateOrderStatusByAdmin(order.invoiceNumber, '✅ Pesanan Selesai (Diterima Pengguna)')}
                            >
                              ✓ Konfirmasi Obat Sudah Sampai Tujuan
                            </button>
                          </div>
                        )}
                        <div style={{ borderTop: '1px solid #1B2C1C', marginTop: '12px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#FFF', fontWeight: '700' }}>Total Dana Tagihan:</span>
                          <span style={{ color: '#10B981', fontWeight: '800' }}>Rp {order.finalBill.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW: HALAMAN LIST RIWAYAT "PESANAN SAYA" */}
      {view === 'pesanan' && (
        <div style={styles.orderContainer}>
          <h2 style={{ color: '#FFF', marginBottom: '10px', fontWeight: '800' }}>📦 Riwayat Transaksi Belanja</h2>
          <p style={{ color: '#94A3B8', marginBottom: '25px' }}>Semua manifestasi data pemesanan obat herbal Anda terekam utuh pada halaman ini.</p>
          
          <div style={styles.subTabHeaderRow}>
            <button style={styles.subTabButton(orderTab === 'aktif')} onClick={() => setOrderTab('aktif')}>
              🛒 Pesanan Berjalan ({myOrders.filter(o => o.orderStatus !== '❌ Pesanan Dibatalkan').length})
            </button>
            <button style={styles.subTabButton(orderTab === 'batal')} onClick={() => setOrderTab('batal')}>
              ❌ Pesanan Dibatalkan ({myOrders.filter(o => o.orderStatus === '❌ Pesanan Dibatalkan').length})
            </button>
          </div>

          {myOrders.filter(order => orderTab === 'aktif' ? order.orderStatus !== '❌ Pesanan Dibatalkan' : order.orderStatus === '❌ Pesanan Dibatalkan').length === 0 ? (
            <div style={styles.apiWarning}>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#10B981' }}>📭 Log Dokumen Kosong</p>
              <p style={{ fontSize: '13px', marginTop: '6px' }}>Tidak ada riwayat transaksi pada kategori tab pengiriman ini.</p>
            </div>
          ) : (
            myOrders
              .filter(order => orderTab === 'aktif' ? order.orderStatus !== '❌ Pesanan Dibatalkan' : order.orderStatus === '❌ Pesanan Dibatalkan')
              .map((order, index) => {
                const isBatal = order.orderStatus === '❌ Pesanan Dibatalkan';
                return (
                  <div key={index} style={styles.orderListCard}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px dashed #1B2C1C', paddingBottom: '12px' }}>
                      <div>
                        <span style={{ color: '#10B981', fontWeight: '800', fontSize: '16px' }}>{order.invoiceNumber}</span>
                        <span style={{ color: '#64748B', fontSize: '13px', marginLeft: '15px' }}>📅 {order.orderDate}</span>
                      </div>
                      <span style={styles.statusBadge(isBatal)}>{isBatal ? '❌ Dibatalkan' : order.orderStatus}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <h5 style={{ color: '#34D399', margin: '0 0 6px 0', textTransform: 'uppercase', fontSize: '12px' }}>👤 Profil Pemesan:</h5>
                        <p style={{ color: '#FFF', fontWeight: '700', margin: '0 0 4px 0' }}>{order.customerName}</p>
                        <p style={{ color: '#94A3B8', margin: '0 0 15px 0', fontSize: '13px' }}>📞 WhatsApp: {order.customerPhone}</p>

                        <h5 style={{ color: '#34D399', margin: '0 0 4px 0', textTransform: 'uppercase', fontSize: '12px' }}>📍 Alamat Tujuan Antar:</h5>
                        <p style={{ color: '#94A3B8', margin: 0, fontSize: '13px', lineHeight: '1.4' }}>{order.customerAddress}</p>
                      </div>

                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <h5 style={{ color: '#34D399', margin: '0 0 4px 0', textTransform: 'uppercase', fontSize: '12px' }}>🚚 Sistem Distribusi:</h5>
                        <p style={{ color: '#FFF', margin: '0 0 15px 0', fontSize: '13px', fontWeight: '600' }}>{order.courierType}</p>

                        <h5 style={{ color: '#34D399', margin: '0 0 4px 0', textTransform: 'uppercase', fontSize: '12px' }}>💳 Sistem Dokumen Bayar:</h5>
                        <p style={{ color: '#FFF', margin: 0, fontSize: '13px', fontWeight: '600' }}>{order.paymentMethod}</p>
                      </div>

                      <div style={{ flex: 1.2, minWidth: '300px', backgroundColor: 'rgba(5, 8, 5, 0.4)', padding: '15px', borderRadius: '12px', border: '1px solid #1B2C1C' }}>
                        <h5 style={{ color: '#FFF', margin: '0 0 10px 0', fontSize: '13px' }}>📦 Rincian Item Ramuan:</h5>
                        {order.items.map((item, itemIdx) => (
                          <div key={itemIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#94A3B8' }}>
                            <span>{item.name} <b style={{ color: '#10B981' }}>x{item.qty}</b></span>
                            <span style={{ color: '#FFF' }}>Rp {(item.price * item.qty).toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: '1px solid #1B2C1C', marginTop: '10px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#FFF', fontSize: '13px', fontWeight: '700' }}>Total Seluruh Tagihan:</span>
                          <span style={{ color: '#10B981', fontSize: '15px', fontWeight: '800' }}>Rp {order.finalBill.toLocaleString('id-ID')}</span>
                        </div>

                        {!isBatal && order.orderStatus === '🚚 Sedang Diproses Kurir Apotik' && (
                          <button style={styles.btnCancelOrder} onClick={() => handleCancelOrder(order.invoiceNumber)}>
                            🛑 Batalkan Pesanan Ini
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* VIEW HALAMAN KHASIAT TERSENDIRI */}
      {view === 'kategori' && (
        <div style={{padding:'40px 8%'}}>
          <button style={styles.btnSecondary} onClick={() => setView('beranda')}>← Kembali ke Beranda</button>
          <h2 style={{color:'#FFF', marginTop:'25px', marginBottom:'5px'}}>Khasiat: {selectedCategory}</h2>
          <p style={{color:'#94A3B8', marginBottom:'40px'}}>Menampilkan ramuan obat tradisional murni yang dikhususkan untuk menjaga {selectedCategory.toLowerCase()}.</p>
          
          {getFilteredMedicines(selectedCategory).length === 0 ? (
            <div style={styles.apiWarning}>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#10B981' }}>🍃 Belum Ada Produk</p>
            </div>
          ) : (
            <div style={styles.productGrid}>
              {getFilteredMedicines(selectedCategory).map((med) => (
                <div key={med.id} style={styles.productCard}>
                  <div>
                    <img src={med.image_url} style={styles.productImg} onClick={() => { setSelectedProduct(med); setView('detail'); }} alt={med.name} />
                    <span style={styles.productCat}>{med.category}</span>
                    <h4 style={styles.productName} onClick={() => { setSelectedProduct(med); setView('detail'); }}>{med.name}</h4>
                    <p style={{color:'#94A3B8', fontSize:'13px', margin:'0 0 15px 0'}}>Stok Tersedia: {med.stock} pcs</p>
                  </div>
                  <div>
                    <p style={styles.productPrice}>Rp {med.price.toLocaleString('id-ID')}</p>
                    <button style={{...styles.btnPrimary, width:'100%', margin:0, padding:'10px', backgroundColor:'#10B981'}} onClick={() => addToCart(med)}>+ Tambahkan</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: KATALOG */}
      {view === 'katalog' && (
        <div style={{padding:'40px 8%'}}>
          <h2 style={{color:'#FFF', marginBottom:'20px'}}>Katalog Herbal Lengkap</h2>
          {medicines.length === 0 ? (
            <div style={styles.apiWarning}>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#10B981' }}>📡 Data Produk Tidak Ditemukan</p>
            </div>
          ) : (
            <div style={styles.productGrid}>
              {medicines.map((med) => (
                <div key={med.id} style={styles.productCard}>
                  <div>
                    <img src={med.image_url} style={styles.productImg} onClick={() => { setSelectedProduct(med); setView('detail'); }} alt={med.name} />
                    <span style={styles.productCat}>{med.category}</span>
                    <h4 style={styles.productName} onClick={() => { setSelectedProduct(med); setView('detail'); }}>{med.name}</h4>
                    <p style={{color:'#94A3B8', fontSize:'13px', margin:'0 0 15px 0'}}>Stok Tersedia: {med.stock} pcs</p>
                  </div>
                  <div>
                    <p style={styles.productPrice}>Rp {med.price.toLocaleString('id-ID')}</p>
                    <button style={{...styles.btnPrimary, width:'100%', margin:0, padding:'10px', backgroundColor:'#10B981'}} onClick={() => addToCart(med)}>+ Tambahkan</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: PRODUCT DETAIL */}
      {view === 'detail' && selectedProduct && (
        <div style={styles.detailContainer}>
          <img src={selectedProduct.image_url} style={styles.detailImg} alt={selectedProduct.name} />
          <div style={styles.detailRight}>
            <span style={styles.productCat}>{selectedProduct.category}</span>
            <h1 style={{color:'#FFF', fontSize:'36px', margin:'10px 0'}}>{selectedProduct.name}</h1>
            <p style={{...styles.productPrice, fontSize:'24px', marginBottom:'20px'}}>Rp {selectedProduct.price.toLocaleString('id-ID')}</p>
            <div style={{borderTop:'1px solid #1B2C1C', borderBottom:'1px solid #1B2C1C', padding:'20px 0', marginBottom:'30px'}}>
              <h4 style={{color:'#FFF', marginBottom:'10px'}}>Deskripsi Khasiat:</h4>
              <p style={{color:'#94A3B8', lineHeight:'1.6'}}>{selectedProduct.description}</p>
            </div>
            <button style={{...styles.btnPrimary, padding:'16px 40px'}} onClick={() => addToCart(selectedProduct)}>Masukkan ke Keranjang Belanja</button>
          </div>
        </div>
      )}

      {/* VIEW: HALAMAN STRUK NOTA INVOICE UTAMA INSTAN SETELAH CHECKOUT */}
      {view === 'keranjang' && isOrdered && orderReceipt && (
        <div style={styles.shopeeReceiptBox}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '50px' }}>🎉</span>
            <h2 style={{ color: '#10B981', margin: '10px 0 5px 0', fontWeight: '800' }}>PESANAN CHECKOUT BERHASIL!</h2>
            <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>Faktur Invoice Digital Resmi — Apotik Evan</p>
          </div>

          <div style={styles.receiptDivider} />
          <p style={{ fontSize: '14px', color: '#94A3B8', margin: '4px 0' }}>🆔 No. Invoice: <b style={{ color: '#FFF' }}>{orderReceipt.invoiceNumber}</b></p>
          <p style={{ fontSize: '14px', color: '#94A3B8', margin: '4px 0' }}>📅 Waktu Transaksi: <span style={{ color: '#FFF' }}>{orderReceipt.orderDate}</span></p>
          <div style={styles.receiptDivider} />

          <h4 style={{ color: '#34D399', margin: '0 0 10px 0', textTransform: 'uppercase' }}>📍 Alamat Tujuan Pengiriman:</h4>
          <p style={{ margin: '2px 0', color: '#FFF', fontWeight: '700', fontSize: '15px' }}>{orderReceipt.customerName} ({orderReceipt.customerPhone})</p>
          <p style={{ margin: '2px 0', color: '#94A3B8', fontSize: '14px' }}>{orderReceipt.customerAddress}</p>
          
          <div style={styles.receiptDivider} />
          <h4 style={{ color: '#34D399', margin: '0 0 10px 0', textTransform: 'uppercase' }}>🚚 Info Logistik Penyaluran:</h4>
          <p style={{ margin: '2px 0', color: '#FFF', fontSize: '14px', fontWeight: '600' }}>{orderReceipt.courierType}</p>

          <div style={styles.receiptDivider} />
          <h4 style={{ color: '#FFF', margin: '0 0 12px 0' }}>📦 Rincian Item Obat Tradisional:</h4>
          {orderReceipt.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px', color: '#94A3B8' }}>
              <span>{item.name} <b style={{ color: '#10B981' }}>x{item.qty}</b></span>
              <span style={{ color: '#FFF' }}>Rp {(item.price * item.qty).toLocaleString('id-ID')}</span>
            </div>
          ))}

          <div style={styles.receiptDivider} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94A3B8', marginBottom: '6px' }}>
            <span>Subtotal Produk</span>
            <span>Rp {orderReceipt.subtotalPrice.toLocaleString('id-ID')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94A3B8', marginBottom: '15px' }}>
            <span>Ongkos Kirim Kurir Internal Toko</span>
            <span>Rp {orderReceipt.shippingFeePrice.toLocaleString('id-ID')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1B2C1C', paddingTop: '12px' }}>
            <span style={{ color: '#FFF', fontWeight: '700' }}>Total Seluruh Tagihan</span>
            <span style={{ color: '#10B981', fontWeight: '800', fontSize: '20px' }}>Rp {orderReceipt.finalBill.toLocaleString('id-ID')}</span>
          </div>

          <button style={{ ...styles.btnPrimary, width: '100%', margin: '30px 0 0 0', padding: '14px' }} onClick={() => { setIsOrdered(false); setOrderReceipt(null); setView('pesanan'); setOrderTab('aktif'); }}>
            Buka Halaman Riwayat Pesanan Saya
          </button>
        </div>
      )}

      {/* VIEW: HALAMAN KERANJANG BELANJA & FORM CHECKOUT LENGKAP ALA SHOPEE */}
      {view === 'keranjang' && !isOrdered && (
        <div style={styles.cartLayout}>
          <div style={styles.cartLeft}>
            <h2 style={{color:'#FFF', marginBottom:'20px'}}>Keranjang Belanja Anda</h2>
            {cart.length === 0 ? (
              <p style={{color:'#94A3B8'}}>Keranjang masih kosong. Yuk pilih ramuan obat tradisional di katalog dahulu!</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} style={styles.cartItem}>
                  <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <img src={item.image_url} style={{width:'70px', height:'70px', objectFit:'cover', borderRadius:'8px'}} alt={item.name} />
                    <div>
                      <h4 style={{color:'#FFF', margin:0}}>{item.name}</h4>
                      <p style={{color:'#34D399', margin:'5px 0 0 0', fontWeight:'700'}}>Rp {item.price.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <button style={{padding:'5px 10px', backgroundColor:'#1B2C1C', border:'none', color:'#FFF', borderRadius:'4px', cursor:'pointerfixed'}} onClick={() => updateCartQty(item.id, -1)}>-</button>
                    <span style={{color:'#FFF', fontWeight:'700'}}>{item.qty}</span>
                    <button style={{padding:'5px 10px', backgroundColor:'#1B2C1C', border:'none', color:'#FFF', borderRadius:'4px', cursor:'pointerfixed'}} onClick={() => updateCartQty(item.id, 1)}>+</button>
                  </div>
                </div>
              ))
            )}

            <div style={{backgroundColor:'rgba(17, 22, 18, 0.4)', backdropFilter:'blur(5px)', borderRadius:'20px', padding:'25px', border:'1px solid #1B2C1C', marginTop:'30px'}}>
              <h3 style={{color:'#FFF', marginBottom:'20px'}}>📦 Opsi Informasi Checkout & Pengiriman</h3>
              <form onSubmit={handleCheckout}>
                <div style={styles.formGroup}>
                  <label style={{color:'#94A3B8', fontSize:'14px'}}>Nama Lengkap Penerima</label>
                  <input type="text" style={styles.input} required value={shippingForm.name} onChange={(e)=>setShippingForm({...shippingForm, name:e.target.value})} />
                </div>
                <div style={styles.formGroup}>
                  <label style={{color:'#94A3B8', fontSize:'14px'}}>Nomor Telepon/WhatsApp Aktif</label>
                  <input type="tel" placeholder="08xxxx" style={styles.input} required value={shippingForm.phone} onChange={(e)=>setShippingForm({...shippingForm, phone:e.target.value})} />
                </div>
                <div style={styles.formGroup}>
                  <label style={{color:'#94A3B8', fontSize:'14px'}}>Alamat Tujuan Lengkap Rumah</label>
                  <textarea rows="3" placeholder="Nama Jalan, Blok, No Rumah, RT/RW" style={styles.input} required value={shippingForm.address} onChange={(e)=>setShippingForm({...shippingForm, address:e.target.value})}></textarea>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={{color:'#10B981', fontSize:'14px', fontWeight:'700'}}>🚚 Opsi Kurir Pengiriman Terintegrasi:</label>
                  <select style={styles.selectInput} value={shippingForm.courier} onChange={(e)=>setShippingForm({...shippingForm, courier:e.target.value})}>
                    <option value="Kurir Ekspres Internal Apotik Evan (Flat Rate)">
                      Kurir Kilat Toko Apotik Evan (Rp 15.000 Flat Pekanbaru)
                    </option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={{color:'#10B981', fontSize:'14px', fontWeight:'700'}}>💳 Metode Pilihan Pembayaran:</label>
                  <select style={styles.selectInput} value={shippingForm.paymentMethod} onChange={(e)=>setShippingForm({...shippingForm, paymentMethod:e.target.value})}>
                    <option value="COD (Bayar di Tempat Saat Obat Sampai)">💵 Bayar di Tempat / COD (Cash On Delivery)</option>
                    <option value="Transfer Bank Manual (Verifikasi Resi via WA Toko)">🏦 Transfer Bank Manual (BCA/Mandiri/Riau Kepri)</option>
                  </select>
                </div>

                <button type="submit" id="hidden-submit-btn" style={{display:'none'}}></button>
              </form>
            </div>
          </div>

          <div style={styles.cartRight}>
            <h3 style={{color:'#FFF', margin:'0 0 20px 0', borderBottom:'1px solid #1B2C1C', paddingBottom:'15px'}}>Ringkasan Pesanan</h3>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', fontSize:'14px', color:'#94A3B8'}}>
              <span>Subtotal Produk</span>
              <span>Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', fontSize:'14px', color:'#94A3B8'}}>
              <span>Biaya Ongkos Kirim (Internal)</span>
              <span>Rp {shippingFee.toLocaleString('id-ID')}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px dashed #1B2C1C', paddingTop:'15px', marginBottom:'30px'}}>
              <span style={{color:'#FFF', fontWeight:'700'}}>Total Tagihan</span>
              <span style={{color:'#10B981', fontWeight:'800', fontSize:'18px'}}>Rp {grandTotal.toLocaleString('id-ID')}</span>
            </div>
            
            <button style={{...styles.btnPrimary, width:'100%', padding:'15px', margin:0, fontSize:'16px'}} onClick={() => document.getElementById('hidden-submit-btn').click()}>
              Proses Pembayaran & Selesai
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={{textAlign:'center', color:'#475569', fontSize:'13px'}}>
          © 2026 Apotik Evan. Solusi Kesehatan Anda. Secured with Gemini-Inspired Aurora Fluid Gate.
        </div>
      </footer>
    </div>
  );
}

export default App;