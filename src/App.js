import React, { useState, useEffect, useMemo } from 'react';
import { Truck, MapPin, RefreshCw, DollarSign, Navigation, AlertCircle, Search, CheckCircle2, Calendar, Database, XCircle, ListFilter, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const API_URL = "https://script.google.com/macros/s/AKfycbxQqlOy1VSgUY1X_NbWL8Wkn0KZ5if3uxy9oA_IEGUdwAMx4OhJ0bNHVmR-6aMcdNEPPw/exec";
const ITEMS_PER_PAGE = 10;
const REFRESH_INTERVAL = 50000;

const App = () => {
  const [rawData, setRawData] = useState([]);
  const [filters, setFilters] = useState({ cars: [], customers: [], statuses: [] });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCar, setSelectedCar] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // ฟังก์ชันแปลงวันที่ให้เป็นรูปแบบ d/mmm/yyyy (เช่น 13/ม.ค./2026)
  const formatOnlyDate = (dateStr) => {
    if (!dateStr) return "-";
    
    const monthNames = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr.split(' ')[0].split('T')[0];
      }
      const day = date.getDate();
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else {
        setRawData(result.items || []);
        setFilters(result.filters || { cars: [], customers: [], statuses: [] });
        setLastUpdated(new Date().toLocaleTimeString('th-TH'));
        setError(null);
      }
    } catch (err) {
      if (showLoading) setError("ไม่สามารถเชื่อมต่อข้อมูลได้");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(false);
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  const filteredData = useMemo(() => {
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const monthMap = { 'ก.พ.': 1, 'ม.ค.': 0, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11 };
        const month = monthMap[parts[1]] !== undefined ? monthMap[parts[1]] : parseInt(parts[1]) - 1;
        return new Date(parts[2], month, parts[0]);
      }
      return new Date(dateStr);
    };

    return rawData.filter(item => {
      const itemDate = parseDate(item['วันที่บันทึกข้อมูล']);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      const matchDate = (!start || (itemDate && itemDate >= start)) && 
                        (!end || (itemDate && itemDate <= end));
      const matchCar = selectedCar === 'all' || item['ทะเบียนรถ'] === selectedCar;
      const matchCustomer = selectedCustomer === 'all' || item['Customer'] === selectedCustomer;
      const matchStatus = selectedStatus === 'all' || item['สถานะการขนส่ง'] === selectedStatus;
      
      return matchDate && matchCar && matchCustomer && matchStatus;
    });
  }, [rawData, startDate, endDate, selectedCar, selectedCustomer, selectedStatus]);

  const displayedData = useMemo(() => {
    const sorted = [...filteredData].reverse();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const stats = useMemo(() => {
    return filteredData.reduce((acc, curr) => {
      const dist = parseFloat(curr['ระยะทางไปกลับ (km)']) || 0;
      const cost = parseFloat(curr['ค่าใช้จ่ายตาม Supplier']) || 0;
      const status = curr['สถานะการขนส่ง'];
      return {
        totalDist: acc.totalDist + dist,
        totalCost: acc.totalCost + cost,
        success: status === 'ส่งแล้ว' ? acc.success + 1 : acc.success,
        cancelled: status === 'ยกเลิก' ? acc.cancelled + 1 : acc.cancelled,
        count: acc.count + 1
      };
    }, { totalDist: 0, totalCost: 0, success: 0, cancelled: 0, count: 0 });
  }, [filteredData]);

  if (loading && rawData.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-bounce mb-4 text-blue-600"><Truck size={48} /></div>
        <p className="font-bold text-slate-500 animate-pulse uppercase tracking-widest text-xs">กำลังเชื่อมต่อข้อมูลล่าสุด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 italic tracking-tighter">
              <Truck className="text-blue-600" size={32} /> TMS MONITOR
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-500 text-[10px] font-bold flex items-center gap-1 uppercase tracking-widest">
                <Clock size={12} className={isRefreshing ? "animate-spin text-blue-500" : ""}/> 
                Auto-Refresh 50s
              </p>
              {lastUpdated && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                  ล่าสุด: {lastUpdated}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => fetchData()} className="bg-white border border-slate-200 px-5 py-2.5 rounded-2xl shadow-sm hover:shadow-md flex items-center gap-2 font-bold text-slate-700 transition-all active:scale-95 text-sm">
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> รีเฟรชข้อมูล
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <DateInput label="วันที่เริ่ม" value={startDate} onChange={setStartDate} />
            <DateInput label="วันที่สิ้นสุด" value={endDate} onChange={setEndDate} />
            <FilterSelect label="ทะเบียนรถ" value={selectedCar} onChange={setSelectedCar} options={filters.cars} />
            <FilterSelect label="ลูกค้า" value={selectedCustomer} onChange={setSelectedCustomer} options={filters.customers} />
            <FilterSelect label="สถานะ" value={selectedStatus} onChange={setSelectedStatus} options={filters.statuses} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="ระยะทางรวม" value={stats.totalDist.toLocaleString()} unit="กม." color="blue" icon={<Navigation />} />
          <StatCard label="ต้นทุนสะสม" value={stats.totalCost.toLocaleString()} unit="บาท" color="emerald" icon={<DollarSign />} />
          <StatCard label="สำเร็จ" value={stats.success} unit="เที่ยว" color="indigo" icon={<CheckCircle2 />} />
          <StatCard label="ยกเลิก" value={stats.cancelled} unit="เที่ยว" color="rose" icon={<XCircle />} />
          <StatCard label="รวมทั้งหมด" value={stats.count} unit="งาน" color="orange" icon={<Calendar />} />
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
          {isRefreshing && (
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 overflow-hidden">
              <div className="w-1/3 h-full bg-blue-600 animate-[loading_1.5s_infinite]"></div>
            </div>
          )}
          
          <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <ListFilter size={14}/> รายการขนส่ง
            </h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 italic">
              หน้า {currentPage} จาก {totalPages || 1}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">วันบันทึก / ทะเบียน</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">ลูกค้า / สถานที่</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">กำหนดส่ง / ช่วงเวลา</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 tracking-tight">{formatOnlyDate(item['วันที่บันทึกข้อมูล'])}</div>
                      <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-1 uppercase">{item['ทะเบียนรถ']}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold text-slate-700">{item['Customer']}</div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-medium truncate max-w-[180px] mx-auto">
                        <MapPin size={10}/>{item['Location']}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-xs font-bold text-slate-700">{formatOnlyDate(item['วันที่ต้องการส่งสินค้า'])}</div>
                      
                      {/* ส่วนที่เพิ่ม: แสดงช่วงเวลา */}
                      <div className="mt-1 flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          <Clock size={10} /> {item['ช่วงเวลา'] || 'ไม่ระบุเวลา'}
                        </div>
                        <div className="text-[10px] font-black text-slate-300 italic">
                          {item['ระยะทางไปกลับ (km)']} กม.
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StatusBadge status={item['สถานะการขนส่ง']} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <button 
                disabled={currentPage === 1}
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); }}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronLeft size={20} className="text-slate-600" />
              </button>
              
              <div className="hidden sm:flex gap-1.5">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentPage(i + 1); }}
                    className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all border ${
                      currentPage === i + 1 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200 shadow-lg' 
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>

              <button 
                disabled={currentPage === totalPages}
                onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronRight size={20} className="text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

// Sub-components
const DateInput = ({ label, value, onChange }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-wider">{label}</label>
    <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
    />
  </div>
);

const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-wider">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
    >
      <option value="all">ทั้งหมด</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const StatCard = ({ label, value, unit, color, icon }) => {
  const themes = {
    blue: "bg-blue-600 shadow-blue-100", 
    emerald: "bg-emerald-500 shadow-emerald-100", 
    indigo: "bg-indigo-600 shadow-indigo-100", 
    rose: "bg-rose-500 shadow-rose-100", 
    orange: "bg-orange-500 shadow-orange-100"
  };
  return (
    <div className={`${themes[color]} p-4 rounded-[1.8rem] text-white shadow-xl flex flex-col gap-1 transition-transform hover:scale-[1.02]`}>
      <div className="bg-white/20 w-8 h-8 rounded-xl flex items-center justify-center mb-1">{icon}</div>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80 italic">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black tracking-tight">{value}</span>
        <span className="text-[9px] font-bold opacity-70 uppercase tracking-tighter">{unit}</span>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    'ส่งแล้ว': 'bg-green-100 text-green-700 border-green-200',
    'ยกเลิก': 'bg-red-100 text-red-700 border-red-200',
    'ระหว่างส่ง': 'bg-blue-100 text-blue-700 border-blue-200',
    'รอดำเนินการ': 'bg-amber-100 text-amber-700 border-amber-200',
    'วางแผน': 'bg-slate-100 text-slate-600 border-slate-200'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${styles[status] || 'bg-slate-100 text-slate-500'}`}>
      {status || 'N/A'}
    </span>
  );
};

export default App;