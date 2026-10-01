import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { supabase } from '../supabaseClient';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart,
  BarChart,
  LabelList
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

const DEFAULT_GROUPS = [
  'Assembly Line',
  'Cold Test',
  'Hot Test',
  'Dyno Test',
  '7DCT',
  'EDU & DHT',
  'IT'
];

function DashboardAnalyticsComponent({ onBack, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [rawIssues, setRawIssues] = useState([]);
  const [dbMasterGroups, setDbMasterGroups] = useState([]);
  const [dbMasterStations, setDbMasterStations] = useState([]);
  
  const [activeSubTab, setActiveSubTab] = useState('overview');

  // Smooth progressive filling animation for Health Bar
  const [animateHealthBar, setAnimateHealthBar] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'resolution_list') {
      setAnimateHealthBar(false);
      const timer = setTimeout(() => setAnimateHealthBar(true), 80);
      return () => clearTimeout(timer);
    }
  }, [activeSubTab]);

  // Global Header Filters
  const [filterMode, setFilterMode] = useState('all'); 
  const [timeRange, setTimeRange] = useState('all'); 
  
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState('all');
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedClassification, setSelectedClassification] = useState(null);

  // In-Table Filters
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState('all');
  const [listGroupFilter, setListGroupFilter] = useState('all');
  const [listReporterFilter, setListReporterFilter] = useState('all');
  const [listStationFilter, setListStationFilter] = useState('all');

  // Display States
  const [stats, setStats] = useState({ total: 0, inProgress: 0, closed: 0 });
  const [statusComboData, setStatusComboData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [classificationData, setClassificationData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [agingData, setAgingData] = useState([]);
  const [showAllLocations, setShowAllLocations] = useState(false);

  const [hodSummary, setHodSummary] = useState({
    avgActualDays: 0,
    avgTargetDays: 0,
    avgDelayDays: 0,
    onTimeCount: 0,
    delayedCount: 0,
    closedTotal: 0
  });

  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      try {
        const [issuesRes, stationsRes] = await Promise.all([
          supabase.from('issues').select('*').order('date_time', { ascending: false }),
          supabase.from('stations').select('station_code, group_name').order('station_code', { ascending: true })
        ]);

        if (issuesRes.data) {
          setRawIssues(issuesRes.data);
        }

        if (stationsRes.data) {
          const stnList = stationsRes.data.map((s) => s.station_code).filter(Boolean);
          const grpList = stationsRes.data.map((s) => s.group_name).filter(Boolean);
          setDbMasterStations(Array.from(new Set(stnList)));
          setDbMasterGroups(Array.from(new Set(grpList)));
        }
      } catch (err) {
        console.error('Error loading analytics dataset:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
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

  const availableGroupsList = useMemo(() => {
    const fromIssues = rawIssues.map((i) => i.group_name).filter(Boolean);
    const combined = [...DEFAULT_GROUPS, ...dbMasterGroups, ...fromIssues];
    return Array.from(new Set(combined)).sort();
  }, [rawIssues, dbMasterGroups]);

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

  const individualIssueMetrics = useMemo(() => {
    const now = new Date();

    return dateAndGroupFiltered.map((issue) => {
      const isDone = isClosedStatus(issue.status);
      const openDate = parseDateSafe(issue.date_time || issue.created_at);
      const estCloseDate = parseDateSafe(issue.estimated_closing);
      const actualClosedDate = parseDateSafe(issue.closed_date || issue.updated_at || issue.date_time);

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
        closedDateRaw: isDone ? (issue.closed_date || issue.updated_at || issue.date_time) : null,
        estDateRaw: issue.estimated_closing,
        reporterName: issue.staff_name || issue.staff_id || '-',
        stationName: issue.location ? issue.location.toUpperCase() : '-',
        actualDays,
        targetDays,
        delayDays,
        statusCategory
      };
    });
  }, [dateAndGroupFiltered]);

  const uniqueReporters = useMemo(() => {
    const names = individualIssueMetrics
      .map((i) => i.reporterName)
      .filter((n) => n && n !== '-');
    return Array.from(new Set(names)).sort();
  }, [individualIssueMetrics]);

  const uniqueStations = useMemo(() => {
    const fromIssues = individualIssueMetrics.map((i) => i.stationName).filter((s) => s && s !== '-');
    const combined = [...dbMasterStations, ...fromIssues];
    return Array.from(new Set(combined.map((s) => s.toUpperCase()))).sort();
  }, [individualIssueMetrics, dbMasterStations]);

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
      const actualClosedDate = parseDateSafe(item.closed_date || item.updated_at || item.date_time);

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
      { status: 'Total', count: totalCount, percentage: 100, displayPercent: '100%', fill: '#0d3b66' },
      { status: 'Closed', count: closedCount, percentage: closedPercent, displayPercent: `${closedPercent}%`, fill: '#16a34a' },
      { status: 'Ongoing', count: inProgressCount, percentage: inProgressPercent, displayPercent: `${inProgressPercent}%`, fill: '#ea580c' }
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

  const filteredIndividualIssues = useMemo(() => {
    return individualIssueMetrics.filter((item) => {
      if (listGroupFilter !== 'all') {
        const itemGrp = (item.group_name || '').trim().toLowerCase();
        if (itemGrp !== listGroupFilter.trim().toLowerCase()) return false;
      }

      if (listReporterFilter !== 'all') {
        if (item.reporterName !== listReporterFilter) return false;
      }

      if (listStationFilter !== 'all') {
        if (item.stationName !== listStationFilter) return false;
      }

      if (listStatusFilter === 'closed_ontime' && item.statusCategory !== 'Resolved (On-Time)') return false;
      if (listStatusFilter === 'closed_delayed' && item.statusCategory !== 'Resolved (Delayed)') return false;
      if (listStatusFilter === 'active_overdue' && item.statusCategory !== 'Overdue (Active)') return false;
      if (listStatusFilter === 'active_ontrack' && item.statusCategory !== 'On Track (Open)') return false;
      if (listStatusFilter === 'all_closed' && !item.isDone) return false;
      if (listStatusFilter === 'all_active' && item.isDone) return false;

      const q = listSearchQuery.toLowerCase().trim();
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
  }, [individualIssueMetrics, listSearchQuery, listStatusFilter, listGroupFilter, listReporterFilter, listStationFilter]);

  const healthRatioData = useMemo(() => {
    let onTimeCount = 0;
    let delayedClosedCount = 0;
    let activeOverdueCount = 0;
    let activeOnTrackCount = 0;

    filteredIndividualIssues.forEach((item) => {
      if (item.statusCategory === 'Resolved (On-Time)') onTimeCount++;
      else if (item.statusCategory === 'Resolved (Delayed)') delayedClosedCount++;
      else if (item.statusCategory === 'Overdue (Active)') activeOverdueCount++;
      else activeOnTrackCount++;
    });

    const total = filteredIndividualIssues.length || 1;

    return [
      { name: 'Resolved On-Time', count: onTimeCount, percent: Math.round((onTimeCount / total) * 100), color: '#16a34a' },
      { name: 'Active On-Track', count: activeOnTrackCount, percent: Math.round((activeOnTrackCount / total) * 100), color: '#0284c7' },
      { name: 'Resolved Delayed', count: delayedClosedCount, percent: Math.round((delayedClosedCount / total) * 100), color: '#f59e0b' },
      { name: 'Critical Overdue', count: activeOverdueCount, percent: Math.round((activeOverdueCount / total) * 100), color: '#dc3545' },
    ];
  }, [filteredIndividualIssues]);

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

  const displayedLocationData = showAllLocations ? locationData : locationData.slice(0, 20);
  const chartWidth = showAllLocations ? Math.max(1000, locationData.length * 45) : '100%';
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="notranslate"
            translate="no"
            style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
          >
            <option value="all">All Groups</option>
            {availableGroupsList.map((grp) => (
              <option key={grp} value={grp}>{grp}</option>
            ))}
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
          <span>⏱️</span> Issue Resolution & Delay Tracker
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

          {/* VIEW 1: OVERVIEW & CHARTS */}
          {activeSubTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* Row 1: Issue Status Chart with Smooth Animation & Static Numbers */}
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

                        {/* Smooth active rising animation with stable static centered labels */}
                        <Bar 
                          yAxisId="left" 
                          dataKey="count" 
                          name="Count"
                          barSize={46}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={900}
                          animationEasing="ease-out"
                        >
                          {statusComboData.map((entry, idx) => (
                            <Cell key={`bar-cell-${idx}`} fill={entry.fill} />
                          ))}
                          <LabelList 
                            dataKey="count" 
                            position="center" 
                            fill="#ffffff" 
                            style={{ fontSize: '13px', fontWeight: 'bold', pointerEvents: 'none', userSelect: 'none' }} 
                          />
                        </Bar>

                        {/* Smooth active drawing line animation with stable static top labels */}
                        <Line 
                          yAxisId="left" 
                          type="linear" 
                          dataKey="count" 
                          name="Rate (%)"
                          stroke="#b91c1c" 
                          strokeWidth={3} 
                          dot={{ r: 5, fill: '#b91c1c' }}
                          isAnimationActive={true}
                          animationDuration={900}
                          animationEasing="ease-out"
                        >
                          <LabelList 
                            dataKey="displayPercent" 
                            position="top" 
                            offset={12}
                            fill="#b91c1c" 
                            style={{ fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none', userSelect: 'none' }} 
                          />
                        </Line>
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
                            isAnimationActive={true}
                            animationDuration={800}
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
                        <Line type="monotone" dataKey="Created" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={true} animationDuration={800} />
                        <Line type="monotone" dataKey="Closed" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={true} animationDuration={800} />
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
                              isAnimationActive={true}
                              animationDuration={800}
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
                        <Bar dataKey="count" fill="#0d3b66" name="Total Issues" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* VIEW 2: ISSUE RESOLUTION & DELAY TRACKER (ANIMATED HEALTH BAR) */}
          {activeSubTab === 'resolution_list' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#0d3b66', fontSize: '18px' }}>
                    Issue Resolution & Delay Tracker
                  </h3>
                  <small style={{ color: '#64748b' }}>
                    Filterable record tracker for exact baseline dates, resolution durations, and delay variance
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      width: '160px',
                      outline: 'none'
                    }}
                  />

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
                    {availableGroupsList.map((grp) => (
                      <option key={grp} value={grp}>{grp}</option>
                    ))}
                  </select>

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

                  <select
                    value={listStationFilter}
                    onChange={(e) => setListStationFilter(e.target.value)}
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
                    <option value="all">All Stations ({uniqueStations.length})</option>
                    {uniqueStations.map((stn) => (
                      <option key={stn} value={stn}>{stn}</option>
                    ))}
                  </select>

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
                    <option value="all">All Records ({individualIssueMetrics.length})</option>
                    <option value="closed_ontime">Resolved (On-Time)</option>
                    <option value="closed_delayed">Resolved (Delayed)</option>
                    <option value="active_overdue">Active Overdue</option>
                    <option value="active_ontrack">Active On Track</option>
                    <option value="all_closed">All Closed</option>
                    <option value="all_active">All Active</option>
                  </select>
                </div>
              </div>

              {/* Smooth Animated Horizontal Health Ratio Progress Bar */}
              <div style={{ backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0d3b66' }}>
                    📊 Overall Issue Resolution Health Breakdown
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {filteredIndividualIssues.length} issues in active filter
                  </span>
                </div>

                <div style={{ display: 'flex', width: '100%', height: '14px', borderRadius: '7px', overflow: 'hidden', backgroundColor: '#e2e8f0', marginBottom: '14px' }}>
                  {healthRatioData.map((item, idx) => {
                    if (item.percent === 0) return null;
                    return (
                      <div
                        key={`ratio-bar-${idx}`}
                        style={{
                          width: animateHealthBar ? `${item.percent}%` : '0%',
                          backgroundColor: item.color,
                          transition: `width 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.12}s`,
                          willChange: 'width'
                        }}
                        title={`${item.name}: ${item.percent}% (${item.count} issues)`}
                      />
                    );
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  {healthRatioData.map((item, idx) => (
                    <div
                      key={`health-card-${idx}`}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        opacity: animateHealthBar ? 1 : 0,
                        transform: animateHealthBar ? 'translateY(0)' : 'translateY(8px)',
                        transition: `all 0.5s ease-out ${idx * 0.1}s`
                      }}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: item.color, lineHeight: 1.1, marginTop: '2px' }}>
                          {item.percent}% <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>({item.count})</span>
                        </div>
                      </div>
                    </div>
                  ))}
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
                            <td style={{ padding: '12px 10px', color: '#64748b', fontWeight: 'bold' }}>
                              {index + 1}
                            </td>
                            
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

                            <td style={{ padding: '12px 10px' }} className="notranslate" translate="no">
                              <div style={{ fontWeight: '600', color: '#0d3b66' }}>
                                {item.reporterName}
                              </div>
                            </td>

                            <td style={{ padding: '12px 10px' }} className="notranslate" translate="no">
                              <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                                {item.group_name || '-'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                PIC: {item.pic_name || item.pic || '-'}
                              </div>
                            </td>

                            <td style={{ padding: '12px 10px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                              {formatDateOnlyDisplay(item.openDateRaw)}
                            </td>

                            <td style={{ padding: '12px 10px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                              {item.estDateRaw ? formatDateOnlyDisplay(item.estDateRaw) : <span style={{ color: '#94a3b8' }}>Not specified</span>}
                              {item.targetDays !== null && (
                                <div style={{ fontSize: '10px', color: '#64748b' }}>
                                  ({item.targetDays} days plan)
                                </div>
                              )}
                            </td>

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

                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <div style={{ fontWeight: 'bold', color: isResolved ? '#15803d' : '#0369a1', fontSize: '13px' }}>
                                {item.actualDays} <span style={{ fontSize: '11px' }}>Days</span>
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                {isResolved ? 'Total Duration' : 'Open Running'}
                              </div>
                            </td>

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

export default memo(DashboardAnalyticsComponent);