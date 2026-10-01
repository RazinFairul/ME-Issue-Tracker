import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart,
  BarChart
} from 'recharts';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

const CLASS_COLORS = {
  'Class A': '#ef4444',
  'Class B': '#f59e0b',
  'Class C': '#0284c7',
  'UNCLASSIFIED': '#94a3b8'
};

export default function DashboardAnalytics({ onBack, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [rawIssues, setRawIssues] = useState([]);
  
  // Navigation Tab inside Analytics: 'overview' vs 'resolution_list'
  const [activeSubTab, setActiveSubTab] = useState('overview');

  // Date Filters
  const [filterMode, setFilterMode] = useState('all'); 
  const [timeRange, setTimeRange] = useState('all'); 
  
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState('all');
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  // Global Header Group Filter
  const [selectedGroup, setSelectedGroup] = useState('all');

  // Classification Cross-Filter
  const [selectedClassification, setSelectedClassification] = useState(null);

  // In-Table Filters for Resolution Tracker
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState('all');
  const [listGroupFilter, setListGroupFilter] = useState('all');
  const [listReporterFilter, setListReporterFilter] = useState('all');

  // Display States
  const [stats, setStats] = useState({ total: 0, inProgress: 0, closed: 0 });
  const [statusComboData, setStatusComboData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [classificationData, setClassificationData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [agingData, setAgingData] = useState([]);
  const [showAllLocations, setShowAllLocations] = useState(false);

  // HOD Executive Metrics: Lead Time & Delay
  const [hodSummary, setHodSummary] = useState({
    avgActualDays: 0,
    avgTargetDays: 0,
    avgDelayDays: 0,
    onTimeCount: 0,
    delayedCount: 0,
    closedTotal: 0
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data, error } = await supabase.from('issues').select('*').order('date_time', { ascending: false });
      if (error) {
        console.error('Error fetching issues:', error.message);
      } else {
        setRawIssues(data || []);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const getWeekOfMonth = (dayNumber) => {
    return String(Math.min(5, Math.ceil(dayNumber / 7)));
  };

  const isClosedStatus = (statusStr) => {
    if (!statusStr) return false;
    const s = String(statusStr).trim().toLowerCase();
    return (
      s === 'closed' ||
      s === 'close' ||
      s.includes('4/4') ||
      s.includes('closed') ||
      s === 'completed' ||
      s === 'complete'
    );
  };

  const parseDateSafe = (dateStr) => {
    if (!dateStr) return null;
    try {
      if (dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split(' ')[0].split('-');
        if (parts[0].length === 4) {
          return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        const yearVal = parts[2].length === 2 ? Number('20' + parts[2]) : Number(parts[2]);
        return new Date(yearVal, Number(parts[1]) - 1, Number(parts[0]));
      }
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  };

  const formatDateOnlyDisplay = (dateStr) => {
    if (!dateStr) return '-';
    const clean = dateStr.split('T')[0].split(' ')[0];
    if (clean && clean.includes('-')) {
      const [year, month, day] = clean.split('-');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`;
    }
    return dateStr;
  };

  // Filtered dataset based on header filters
  const dateAndGroupFiltered = useMemo(() => {
    const now = new Date();
    return rawIssues.filter((item) => {
      if (selectedGroup !== 'all') {
        const itemGroup = (item.group_name || '').trim().toLowerCase();
        if (itemGroup !== selectedGroup.trim().toLowerCase()) return false;
      }

      if (filterMode === 'all') return true;

      const rawDateStr = item.date_time || item.created_at || item.created_date;
      if (!rawDateStr) return false;

      const dateOnlyStr = rawDateStr.split('T')[0].split(' ')[0];
      if (!dateOnlyStr || !dateOnlyStr.includes('-')) return false;

      const [year, month, day] = dateOnlyStr.split('-').map(Number);
      const issueDate = new Date(year, month - 1, day);

      if (filterMode === 'preset') {
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffInTime = todayDate.getTime() - issueDate.getTime();
        const diffInDays = Math.round(diffInTime / (1000 * 3600 * 24));

        if (timeRange === 'day') return diffInDays === 0;
        if (timeRange === 'week') return diffInDays >= 0 && diffInDays <= 7;
        if (timeRange === 'month') return diffInDays >= 0 && diffInDays <= 30;
        if (timeRange === 'year') return diffInDays >= 0 && diffInDays <= 365;
      }

      if (filterMode === 'custom') {
        const isYearMatch = year === Number(selectedYear);
        const isMonthMatch = selectedMonth === 'all' || month === Number(selectedMonth);
        
        let isWeekMatch = true;
        if (selectedWeek !== 'all') {
          const issueWeekNum = getWeekOfMonth(day);
          isWeekMatch = issueWeekNum === selectedWeek;
        }

        return isYearMatch && isMonthMatch && isWeekMatch;
      }

      return true;
    });
  }, [rawIssues, selectedGroup, filterMode, timeRange, selectedMonth, selectedWeek, selectedYear]);

  // Individual issue resolution calculation
  const individualIssueMetrics = useMemo(() => {
    const now = new Date();

    return dateAndGroupFiltered.map((issue) => {
      const isDone = isClosedStatus(issue.status);
      const openDate = parseDateSafe(issue.date_time || issue.created_at);
      const estCloseDate = parseDateSafe(issue.estimated_closing);
      const actualClosedDate = parseDateSafe(issue.updated_at || issue.date_time);

      let actualDays = 0;
      let targetDays = null;
      let delayDays = 0;
      let statusCategory = 'On Track (Open)';

      if (openDate) {
        if (estCloseDate && estCloseDate >= openDate) {
          targetDays = Math.max(1, Math.round((estCloseDate - openDate) / (1000 * 60 * 60 * 24)));
        }

        if (isDone && actualClosedDate) {
          actualDays = Math.max(0, Math.round((actualClosedDate - openDate) / (1000 * 60 * 60 * 24)));
          if (estCloseDate) {
            delayDays = Math.round((actualClosedDate - estCloseDate) / (1000 * 60 * 60 * 24));
          }
          statusCategory = delayDays > 0 ? 'Resolved (Delayed)' : 'Resolved (On-Time)';
        } else {
          actualDays = Math.max(0, Math.round((now - openDate) / (1000 * 60 * 60 * 24)));
          if (estCloseDate && now > estCloseDate) {
            delayDays = Math.round((now - estCloseDate) / (1000 * 60 * 60 * 24));
            statusCategory = 'Overdue (Active)';
          }
        }
      }

      return {
        ...issue,
        isDone,
        openDateRaw: issue.date_time || issue.created_at,
        closedDateRaw: isDone ? (issue.updated_at || issue.date_time) : null,
        estDateRaw: issue.estimated_closing,
        reporterName: issue.staff_name || issue.staff_id || '-',
        actualDays,
        targetDays,
        delayDays,
        statusCategory
      };
    });
  }, [dateAndGroupFiltered]);

  // Dynamic unique reporters & groups for table filter dropdowns
  const uniqueReporters = useMemo(() => {
    const names = individualIssueMetrics
      .map((i) => i.reporterName)
      .filter((n) => n && n !== '-');
    return Array.from(new Set(names)).sort();
  }, [individualIssueMetrics]);

  const uniqueGroups = useMemo(() => {
    const groups = individualIssueMetrics
      .map((i) => i.group_name)
      .filter((g) => g && g !== '-');
    return Array.from(new Set(groups)).sort();
  }, [individualIssueMetrics]);

  const processDashboard = useCallback(() => {
    if (!dateAndGroupFiltered.length) {
      setStats({ total: 0, inProgress: 0, closed: 0 });
      setStatusComboData([]);
      setLocationData([]);
      setClassificationData([]);
      setTrendData([]);
      setAgingData([]);
      setHodSummary({
        avgActualDays: 0,
        avgTargetDays: 0,
        avgDelayDays: 0,
        onTimeCount: 0,
        delayedCount: 0,
        closedTotal: 0
      });
      return;
    }

    const now = new Date();

    const classMap = {};
    dateAndGroupFiltered.forEach((item) => {
      const classKey = item.classification ? `Class ${item.classification.toUpperCase()}` : 'UNCLASSIFIED';
      classMap[classKey] = (classMap[classKey] || 0) + 1;
    });

    const fullyFiltered = selectedClassification
      ? dateAndGroupFiltered.filter((item) => {
          const c = item.classification ? `Class ${item.classification.toUpperCase()}` : 'UNCLASSIFIED';
          return c === selectedClassification;
        })
      : dateAndGroupFiltered;

    let inProgressCount = 0;
    let closedCount = 0;
    const locationMap = {};
    
    let agingHealthy = 0;
    let agingDueSoon = 0;
    let agingOverdue = 0;

    let totalTargetDaysSum = 0;
    let totalActualDaysSum = 0;
    let totalDelayDaysSum = 0;
    let onTimeClosed = 0;
    let delayedClosed = 0;

    fullyFiltered.forEach((item) => {
      const isDone = isClosedStatus(item.status);
      const openDate = parseDateSafe(item.date_time || item.created_at);
      const estCloseDate = parseDateSafe(item.estimated_closing);
      const actualClosedDate = parseDateSafe(item.updated_at || item.date_time);

      if (isDone) {
        closedCount++;

        if (openDate && actualClosedDate) {
          const actualDays = Math.max(0, Math.round((actualClosedDate - openDate) / (1000 * 60 * 60 * 24)));
          let targetDays = actualDays;
          if (estCloseDate && estCloseDate >= openDate) {
            targetDays = Math.max(1, Math.round((estCloseDate - openDate) / (1000 * 60 * 60 * 24)));
          }

          let delayDays = 0;
          if (estCloseDate) {
            delayDays = Math.round((actualClosedDate - estCloseDate) / (1000 * 60 * 60 * 24));
          }

          if (delayDays > 0) {
            delayedClosed++;
            totalDelayDaysSum += delayDays;
          } else {
            onTimeClosed++;
          }

          totalTargetDaysSum += targetDays;
          totalActualDaysSum += actualDays;
        }

      } else {
        inProgressCount++;

        if (estCloseDate) {
          const todayClean = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const targetClean = new Date(estCloseDate.getFullYear(), estCloseDate.getMonth(), estCloseDate.getDate());
          const diffDays = Math.ceil((targetClean.getTime() - todayClean.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            agingOverdue++;
          } else if (diffDays <= 3) {
            agingDueSoon++;
          } else {
            agingHealthy++;
          }
        } else {
          agingOverdue++;
        }
      }

      const loc = item.location ? item.location.toUpperCase() : 'UNKNOWN';
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    });

    setHodSummary({
      avgTargetDays: closedCount > 0 ? (totalTargetDaysSum / closedCount).toFixed(1) : 0,
      avgActualDays: closedCount > 0 ? (totalActualDaysSum / closedCount).toFixed(1) : 0,
      avgDelayDays: delayedClosed > 0 ? (totalDelayDaysSum / delayedClosed).toFixed(1) : 0,
      onTimeCount: onTimeClosed,
      delayedCount: delayedClosed,
      closedTotal: closedCount
    });

    const monthCounts = {};
    MONTHS.forEach((m) => { 
      monthCounts[m.label.substring(0, 3)] = { created: 0, closed: 0 }; 
    });

    fullyFiltered.forEach((item) => {
      const rawDateStr = item.date_time || item.created_at || item.created_date;
      if (rawDateStr) {
        const [, m] = rawDateStr.split('T')[0].split('-').map(Number);
        if (m >= 1 && m <= 12) {
          const monthKey = MONTHS[m - 1].label.substring(0, 3);
          monthCounts[monthKey].created++;
          if (isClosedStatus(item.status)) {
            monthCounts[monthKey].closed++;
          }
        }
      }
    });

    const totalCount = fullyFiltered.length;

    setStats({
      total: totalCount,
      inProgress: inProgressCount,
      closed: closedCount,
    });

    const closedPercent = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;
    const inProgressPercent = totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;

    setStatusComboData([
      { status: 'Total', count: totalCount, percentage: 100, fill: '#0d3b66' },
      { status: 'Closed', count: closedCount, percentage: closedPercent, fill: '#16a34a' },
      { status: 'Ongoing', count: inProgressCount, percentage: inProgressPercent, fill: '#ea580c' }
    ]);

    setClassificationData(
      Object.keys(classMap)
        .map((cls) => ({
          name: cls,
          value: classMap[cls],
          color: CLASS_COLORS[cls] || '#64748b'
        }))
        .sort((a, b) => b.value - a.value)
    );

    setLocationData(
      Object.keys(locationMap)
        .map((loc) => ({ location: loc, count: locationMap[loc] }))
        .sort((a, b) => b.count - a.count)
    );

    setAgingData([
      { name: 'On Track (Healthy)', count: agingHealthy, fill: '#16a34a' },
      { name: 'Due Soon (≤ 3 Days)', count: agingDueSoon, fill: '#eab308' },
      { name: 'Overdue (Critical)', count: agingOverdue, fill: '#dc3545' },
    ]);

    setTrendData(
      Object.keys(monthCounts).map((k) => ({
        month: k,
        Created: monthCounts[k].created,
        Closed: monthCounts[k].closed
      }))
    );

  }, [dateAndGroupFiltered, selectedClassification]);

  useEffect(() => {
    processDashboard();
  }, [processDashboard]);

  // Filtered issues specifically for the Resolution List Page
  const filteredIndividualIssues = useMemo(() => {
    return individualIssueMetrics.filter((item) => {
      // 1. Group Filter (In-table)
      if (listGroupFilter !== 'all') {
        const itemGrp = (item.group_name || '').trim().toLowerCase();
        if (itemGrp !== listGroupFilter.trim().toLowerCase()) return false;
      }

      // 2. Reporter Filter (In-table)
      if (listReporterFilter !== 'all') {
        if (item.reporterName !== listReporterFilter) return false;
      }

      // 3. Status Filter (In-table)
      if (listStatusFilter === 'closed_ontime' && item.statusCategory !== 'Resolved (On-Time)') return false;
      if (listStatusFilter === 'closed_delayed' && item.statusCategory !== 'Resolved (Delayed)') return false;
      if (listStatusFilter === 'active_overdue' && item.statusCategory !== 'Overdue (Active)') return false;
      if (listStatusFilter === 'active_ontrack' && item.statusCategory !== 'On Track (Open)') return false;
      if (listStatusFilter === 'all_closed' && !item.isDone) return false;
      if (listStatusFilter === 'all_active' && item.isDone) return false;

      // 4. Search Query
      const q = listSearchQuery.toLowerCase();
      if (!q) return true;

      return (
        (item.what_issue && item.what_issue.toLowerCase().includes(q)) ||
        (item.group_name && item.group_name.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.reporterName && item.reporterName.toLowerCase().includes(q)) ||
        (item.pic_name && item.pic_name.toLowerCase().includes(q)) ||
        (item.pic && item.pic.toLowerCase().includes(q))
      );
    });
  }, [individualIssueMetrics, listSearchQuery, listStatusFilter, listGroupFilter, listReporterFilter]);

  const renderCustomPercentageLabel = ({ cx, cy, midAngle, outerRadius, percent, value }) => {
    if (!value || percent === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#333"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '11px', fontWeight: 'bold' }}
      >
        {`${(percent * 100).toFixed(0)}% (${value})`}
      </text>
    );
  };

  const renderAgingPercentageLabel = ({ cx, cy, midAngle, outerRadius, percent, value }) => {
    if (!value || percent === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 14;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#1e293b"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '11px', fontWeight: 'bold' }}
      >
        {`${(percent * 100).toFixed(0)}% (${value})`}
      </text>
    );
  };

  const renderInsideBarLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value || height < 14) return null;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: '13px', fontWeight: 'bold' }}
      >
        {value}
      </text>
    );
  };

  const displayedLocationData = showAllLocations ? locationData : locationData.slice(0, 20);
  const chartWidth = showAllLocations ? Math.max(1000, locationData.length * 45) : '100%';
  const closeRate = stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : 0;
  const maxAxisValue = Math.max(stats.total, 1);
  const totalActiveBacklog = stats.inProgress;

  return (
    <div style={{ padding: '20px', maxWidth: '1320px', margin: '0 auto', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      
      {/* Analytics Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#0d3b66', padding: '15px 20px', borderRadius: '8px', color: '#fff', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px' }}>Dashboard Analytics</h2>
          <small style={{ opacity: 0.85, fontSize: '12px' }}>Manufacturing Engineering Executive Performance & Issue Tracking</small>
        </div>
        
        {/* Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="notranslate"
            translate="no"
            style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
          >
            <option value="all">All Groups</option>
            <option value="Assembly Line">Assembly Line</option>
            <option value="Cold Test">Cold Test</option>
            <option value="Hot Test">Hot Test</option>
            <option value="Dyno Test">Dyno Test</option>
            <option value="7DCT">7DCT</option>
            <option value="EDU & DHT">EDU & DHT</option>
            <option value="IT">IT</option>
          </select>

          <select
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value);
              if (e.target.value !== 'custom') setSelectedWeek('all');
            }}
            style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
          >
            <option value="all">All Time</option>
            <option value="preset">Quick Range</option>
            <option value="custom">Specific Week, Month & Year</option>
          </select>

          {filterMode === 'preset' && (
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
            >
              <option value="day">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
              <option value="year">Past 365 Days</option>
            </select>
          )}

          {filterMode === 'custom' && (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
              >
                <option value="all">All Months</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
              >
                <option value="all">All Weeks</option>
                <option value="1">Week 1 (1-7)</option>
                <option value="2">Week 2 (8-14)</option>
                <option value="3">Week 3 (15-21)</option>
                <option value="4">Week 4 (22-28)</option>
                <option value="5">Week 5 (29+)</option>
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveSubTab('overview')}
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'overview' ? '#0d3b66' : '#ffffff',
            color: activeSubTab === 'overview' ? '#ffffff' : '#334155',
            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>📊</span> Overview & Charts
        </button>

        <button
          onClick={() => setActiveSubTab('resolution_list')}
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'resolution_list' ? '#0d3b66' : '#ffffff',
            color: activeSubTab === 'resolution_list' ? '#ffffff' : '#334155',
            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>⏱️</span> Issue Lead Time & Delay Breakdown ({individualIssueMetrics.length})
        </button>
      </div>

      {/* Slicer Indicator */}
      {selectedClassification && (
        <div style={{ backgroundColor: '#e2e8f0', padding: '10px 15px', borderRadius: '6px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Filtered by: <strong>{selectedClassification}</strong></span>
          <button 
            onClick={() => setSelectedClassification(null)}
            style={{ border: 'none', background: '#0d3b66', color: '#fff', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Clear Filter ✕
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px' }}>Loading analytics data...</p>
      ) : (
        <>
          {/* Executive KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '22px' }}>
            <div style={{ backgroundColor: '#fff', borderLeft: '6px solid #0d3b66', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>TOTAL ISSUES</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '26px', color: '#0d3b66' }}>{stats.total}</h2>
            </div>
            
            <div style={{ backgroundColor: '#fff', borderLeft: '6px solid #1d4ed8', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 'bold' }}>AVG RESOLUTION TIME</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '26px', color: '#1d4ed8' }}>
                {hodSummary.avgActualDays} <span style={{ fontSize: '13px', fontWeight: 'normal' }}>Days</span>
              </h2>
            </div>
            
            <div style={{ backgroundColor: '#fff', borderLeft: '6px solid #16a34a', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold' }}>ON-TIME RESOLUTION RATE</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '26px', color: '#16a34a' }}>
                {hodSummary.closedTotal > 0 ? Math.round((hodSummary.onTimeCount / hodSummary.closedTotal) * 100) : 0}%
              </h2>
            </div>

            <div style={{ backgroundColor: '#fff', borderLeft: '6px solid #dc2626', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '11px', color: '#991b1b', fontWeight: 'bold' }}>AVG DELAY VARIANCE</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '26px', color: '#dc2626' }}>
                +{hodSummary.avgDelayDays} <span style={{ fontSize: '13px', fontWeight: 'normal' }}>Days</span>
              </h2>
            </div>
          </div>

          {/* =========================================================
             VIEW 1: OVERVIEW & CHARTS
             ========================================================= */}
          {activeSubTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* Row 1: Status ComposedChart & Classification PieChart */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ marginTop: 0, color: '#0d3b66', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    📊 Issue Status & Progress Rate {selectedGroup !== 'all' && `(${selectedGroup})`}
                  </h3>
                  <div style={{ width: '100%', height: '280px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={statusComboData} margin={{ top: 35, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="status" tick={{ fontWeight: 'bold', fontSize: 12 }} />
                        <YAxis yAxisId="left" allowDecimals={false} domain={[0, maxAxisValue]} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" />
                        
                        <Tooltip 
                          formatter={(val, name, item) => [
                            name === 'Count' ? `${val} issues` : `${item.payload.percentage}%`, 
                            name
                          ]} 
                        />

                        <Bar 
                          yAxisId="left" 
                          dataKey="count" 
                          name="Count"
                          barSize={46}
                          radius={[4, 4, 0, 0]}
                          label={renderInsideBarLabel}
                        >
                          {statusComboData.map((entry, idx) => (
                            <Cell key={`bar-cell-${idx}`} fill={entry.fill} />
                          ))}
                        </Bar>

                        <Line 
                          yAxisId="left" 
                          type="linear" 
                          dataKey="count" 
                          name="Rate (%)"
                          stroke="#b91c1c" 
                          strokeWidth={3} 
                          dot={{ r: 5, fill: '#b91c1c' }}
                          label={(props) => {
                            const { x, y, index } = props;
                            const percent = statusComboData[index]?.percentage;
                            if (percent === undefined || percent === null) return null;
                            return (
                              <text
                                x={x}
                                y={y - 12}
                                fill="#b91c1c"
                                textAnchor="middle"
                                style={{ fontSize: '12px', fontWeight: 'bold' }}
                              >
                                {`${percent}%`}
                              </text>
                            );
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Classification Distribution */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#0d3b66', fontSize: '16px' }}>
                      🏷️ Classification (Click slice to cross-filter)
                    </h3>
                  </div>
                  <div style={{ width: '100%', height: '280px' }}>
                    {classificationData.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '100px 0', color: '#888' }}>No data available</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={classificationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            labelLine={true}
                            label={renderCustomPercentageLabel}
                            cursor="pointer"
                            onClick={(entry) => setSelectedClassification((prev) => prev === entry.name ? null : entry.name)}
                          >
                            {classificationData.map((entry, index) => (
                              <Cell 
                                key={`pie-cell-${index}`} 
                                fill={entry.color} 
                                stroke={selectedClassification === entry.name ? '#0d3b66' : '#fff'}
                                strokeWidth={selectedClassification === entry.name ? 3 : 1}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val, name) => [`${val} issues`, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>

              {/* Row 2: Monthly Trend & Unresolved Aging Donut Chart */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* Trend Chart */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ marginTop: 0, color: '#0d3b66', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    📈 Issues Created vs Closed Trend
                  </h3>
                  <div style={{ width: '100%', height: '290px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Created" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Closed" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut Chart */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ marginTop: 0, color: '#0d3b66', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    ⏱️ Pending Issues Aging Breakdown
                  </h3>

                  <div style={{ width: '100%', height: '290px', position: 'relative' }}>
                    {totalActiveBacklog === 0 ? (
                      <div style={{ textAlign: 'center', padding: '100px 0', color: '#16a34a', fontWeight: 'bold' }}>
                        🎉 Zero Unresolved Backlog (All Closed)
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            top: '46%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none',
                          }}
                        >
                          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0d3b66', display: 'block', lineHeight: 1 }}>
                            {totalActiveBacklog}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
                            Pending
                          </span>
                        </div>

                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 18, bottom: 10, left: 10, right: 10 }}>
                            <Pie
                              data={agingData}
                              cx="50%"
                              cy="46%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey="count"
                              labelLine={true}
                              label={renderAgingPercentageLabel}
                            >
                              {agingData.map((entry, idx) => (
                                <Cell key={`aging-donut-${idx}`} fill={entry.fill} stroke="#fff" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val, name) => [`${val} issues`, name]} />
                            <Legend 
                              verticalAlign="bottom" 
                              wrapperStyle={{ paddingTop: '8px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* Row 3: Issues Breakdown by Location */}
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#0d3b66', fontSize: '16px' }}>
                    📍 Issues Breakdown by Location/Station ({showAllLocations ? 'All' : 'Top 20'})
                  </h3>
                  <button
                    onClick={() => setShowAllLocations(!showAllLocations)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      border: '1px solid #0d3b66',
                      backgroundColor: '#fff',
                      color: '#0d3b66',
                      cursor: 'pointer'
                    }}
                  >
                    {showAllLocations ? 'Show Top 20' : 'Show All'}
                  </button>
                </div>

                <div style={{ width: '100%', height: '350px', overflowX: showAllLocations ? 'auto' : 'hidden' }}>
                  <div style={{ width: chartWidth, height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={displayedLocationData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="location" interval={0} angle={-30} textAnchor="end" height={50} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0d3b66" name="Total Issues" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================
             VIEW 2: ISSUE-BY-ISSUE LEAD TIME & DELAY TRACKER (HOD)
             Clean Table with In-Table Filter for Group, Reporter & Status
             ========================================================= */}
          {activeSubTab === 'resolution_list' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              
              {/* Header Title & Multi-Filter Control */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#0d3b66', fontSize: '18px' }}>
                    Individual Issue Resolution & Delay Tracker
                  </h3>
                  <small style={{ color: '#64748b' }}>
                    Filterable record tracker for exact baseline dates, resolution durations, and delay variance
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Search title, location, PIC..."
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      width: '200px',
                      outline: 'none'
                    }}
                  />

                  {/* 1. Group Filter (In-Table) */}
                  <select
                    value={listGroupFilter}
                    onChange={(e) => setListGroupFilter(e.target.value)}
                    className="notranslate"
                    translate="no"
                    style={{
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#0d3b66',
                      backgroundColor: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Groups</option>
                    {uniqueGroups.map((grp) => (
                      <option key={grp} value={grp}>{grp}</option>
                    ))}
                  </select>

                  {/* 2. Reporter Filter (In-Table) */}
                  <select
                    value={listReporterFilter}
                    onChange={(e) => setListReporterFilter(e.target.value)}
                    className="notranslate"
                    translate="no"
                    style={{
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#0d3b66',
                      backgroundColor: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Reporters</option>
                    {uniqueReporters.map((rep) => (
                      <option key={rep} value={rep}>{rep}</option>
                    ))}
                  </select>

                  {/* 3. Status Filter */}
                  <select
                    value={listStatusFilter}
                    onChange={(e) => setListStatusFilter(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#0d3b66',
                      backgroundColor: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Records ({filteredIndividualIssues.length})</option>
                    <option value="closed_ontime">Resolved (On-Time)</option>
                    <option value="closed_delayed">Resolved (Delayed)</option>
                    <option value="active_overdue">Active Overdue</option>
                    <option value="active_ontrack">Active On Track</option>
                    <option value="all_closed">All Closed</option>
                    <option value="all_active">All Active</option>
                  </select>
                </div>
              </div>

              {/* Resolution Table */}
              {filteredIndividualIssues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  No issues found matching the selected filter criteria.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0d3b66', color: '#ffffff', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '12px 10px', borderBottom: '1px solid #cbd5e1' }}>NO.</th>
                        <th style={{ padding: '12px 10px', borderBottom: '1px solid #cbd5e1' }}>ISSUE DETAILS</th>
                        <th style={{ padding: '12px 10px', borderBottom: '1px solid #cbd5e1' }}>REPORTED BY</th>
                        <th style={{ padding: '12px 10px', borderBottom: '1px solid #cbd5e1' }}>GROUP / PIC</th>
                        <th style={{ padding: '12px 10px', borderBottom: '1px solid #cbd5e1' }}>DATE OPEN</th>
                        <th style={{ padding: '12px 10px', borderBottom: '1px solid #cbd5e1' }}>TARGET EST. CLOSING</th>
                        <th style={{ padding: '12px 10px', borderBottom: '1px solid #cbd5e1' }}>DATE CLOSED</th>
                        <th style={{ padding: '12px 10px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>LEAD TIME</th>
                        <th style={{ padding: '12px 10px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>DELAY VARIANCE</th>
                        <th style={{ padding: '12px 10px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIndividualIssues.map((item, index) => {
                        const isDelayed = item.delayDays > 0;
                        const isResolved = item.isDone;

                        return (
                          <tr
                            key={item.id}
                            style={{
                              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                              borderBottom: '1px solid #e2e8f0'
                            }}
                          >
                            {/* 1. Number */}
                            <td style={{ padding: '12px 10px', color: '#64748b', fontWeight: 'bold' }}>
                              {index + 1}
                            </td>
                            
                            {/* 2. Issue Details with Loc and Class on separate lines */}
                            <td style={{ padding: '12px 10px', maxWidth: '240px' }}>
                              <div style={{ fontWeight: 'bold', color: '#0d3b66', marginBottom: '2px' }}>
                                {item.what_issue || 'Untitled Issue'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                                {item.location && (
                                  <div>
                                    Loc: <span className="notranslate" translate="no">{item.location}</span>
                                  </div>
                                )}
                                {item.classification && (
                                  <div>
                                    Class {item.classification}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 3. Reported By */}
                            <td style={{ padding: '12px 10px' }} className="notranslate" translate="no">
                              <div style={{ fontWeight: '600', color: '#0d3b66' }}>
                                {item.reporterName}
                              </div>
                            </td>

                            {/* 4. Group / PIC */}
                            <td style={{ padding: '12px 10px' }} className="notranslate" translate="no">
                              <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                                {item.group_name || '-'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                PIC: {item.pic_name || item.pic || '-'}
                              </div>
                            </td>

                            {/* 5. Date Open */}
                            <td style={{ padding: '12px 10px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                              {formatDateOnlyDisplay(item.openDateRaw)}
                            </td>

                            {/* 6. Target Est. Closing */}
                            <td style={{ padding: '12px 10px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                              {item.estDateRaw ? formatDateOnlyDisplay(item.estDateRaw) : <span style={{ color: '#94a3b8' }}>Not specified</span>}
                              {item.targetDays !== null && (
                                <div style={{ fontSize: '10px', color: '#64748b' }}>
                                  ({item.targetDays} days plan)
                                </div>
                              )}
                            </td>

                            {/* 7. Date Closed */}
                            <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                              {isResolved ? (
                                <span style={{ color: '#15803d', fontWeight: '600' }}>
                                  {formatDateOnlyDisplay(item.closedDateRaw)}
                                </span>
                              ) : (
                                <span style={{ color: '#ea580c', fontStyle: 'italic', fontSize: '11px' }}>
                                  Still Open / In Progress
                                </span>
                              )}
                            </td>

                            {/* 8. Lead Time */}
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <div style={{ fontWeight: 'bold', color: isResolved ? '#15803d' : '#0369a1', fontSize: '13px' }}>
                                {item.actualDays} <span style={{ fontSize: '11px' }}>Days</span>
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                {isResolved ? 'Total Duration' : 'Open Running'}
                              </div>
                            </td>

                            {/* 9. Delay Variance */}
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              {isDelayed ? (
                                <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-block' }}>
                                  +{item.delayDays} Days Delay
                                </div>
                              ) : (
                                <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-block' }}>
                                  {isResolved ? 'On-Time' : 'On Track'}
                                </div>
                              )}
                            </td>

                            {/* 10. Status */}
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  backgroundColor: 
                                    item.statusCategory === 'Resolved (On-Time)' ? '#dcfce7' :
                                    item.statusCategory === 'Resolved (Delayed)' ? '#fee2e2' :
                                    item.statusCategory === 'Overdue (Active)' ? '#fef3c7' : '#e0f2fe',
                                  color:
                                    item.statusCategory === 'Resolved (On-Time)' ? '#15803d' :
                                    item.statusCategory === 'Resolved (Delayed)' ? '#b91c1c' :
                                    item.statusCategory === 'Overdue (Active)' ? '#b45309' : '#0369a1',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {item.statusCategory}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}
        </>
      )}

    </div>
  );
}