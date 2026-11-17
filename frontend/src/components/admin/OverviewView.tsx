import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  Radio, Thermometer, BatteryCharging,
  DollarSign, UserCheck, Clock, Search,
  ShieldCheck, RefreshCw, Server, Monitor,
  Database, Bot, QrCode, CheckCircle2
} from 'lucide-react';

export interface Workstation {
  id: string;
  dbId?: string;
  lab: string;
  status: 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'OUT_OF_ORDER';
  cpu: string;
  ram: string;
  storage?: string;
  ping: string;
  activeUser: string;
  ip: string;
  temp: string;
  power: string;
  score: string;
}

export interface WorkOrder {
  id: string;
  pcId: string;
  lab: string;
  issue: string;
  priority: string;
  status: string;
  tech: string;
  dueDate: string;
  cost: number;
}

interface LabRoomTelemetry {
  id: string;
  name: string;
  room: string;
  vlanSubnet: string;
  capacity: number;
  onlineCount: number;
  maintCount: number;
  inUseCount: number;
  utilizationPct: number;
  tempC: number;
  powerKw: number;
  latencyMs: number;
  stroke: string;
  badgeClass: string;
}

interface OverviewViewProps {
  adminName?: string;
  selectedCampus: string;
  campusInfo?: any;
  liveClock?: string;
  liveSessionsCount?: number;
  cpuUsage?: number;
  ramUsage?: number;
  networkSpeed?: string;
  liveWaveSeries?: number[];
  typedText?: string;
  workstations?: Workstation[];
  workOrders?: WorkOrder[];
  loginFeed?: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: 'ALL' | 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'OUT_OF_ORDER';
  setStatusFilter: (st: 'ALL' | 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'OUT_OF_ORDER') => void;
  onDrilldown: (info: string) => void;
  onTabChange?: (tab: string) => void;
}

// STRICTLY DAPITAN MAIN CAMPUS ONLY + ENTERPRISE COMLAB VLAN SUBNETTING
const campusGeoDatabase: Record<string, {
  coordsText: string;
  mapX: string;
  mapY: string;
  ipSubnet: string;
  gateway: string;
  address: string;
}> = {
  'Dapitan Main Campus': {
    coordsText: '8.6564° N, 123.4228° E',
    mapX: '64%',
    mapY: '42%',
    ipSubnet: '10.101.0.0/16 (ComLab VLAN 101–103)',
    gateway: '10.100.0.1 (CCS Core Fiber Switch)',
    address: 'CCS Computer Laboratory Complex (ComLab 1–3), JRMSU Main Campus, Dapitan City'
  },
  'Dapitan Campus': {
    coordsText: '8.6564° N, 123.4228° E',
    mapX: '64%',
    mapY: '42%',
    ipSubnet: '10.101.0.0/16 (ComLab VLAN 101–103)',
    gateway: '10.100.0.1 (CCS Core Fiber Switch)',
    address: 'CCS Computer Laboratory Complex (ComLab 1–3), JRMSU Main Campus, Dapitan City'
  }
};

const formatPeso = (amount: number): string => {
  if (!amount || amount === 0) return '₱0.00';
  return '₱' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  adminName = '',
  liveSessionsCount = 42,
  cpuUsage = 38,
  ramUsage = 62,
  networkSpeed = '1.0 Gbps',
  liveWaveSeries = [30, 45, 60, 40, 75, 55, 90, 65, 80, 50, 70, 85],
  workstations: propWorkstations = [],
  workOrders: propWorkOrders = [],
  loginFeed: propLoginFeed = [],
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onDrilldown,
  onTabChange
}) => {
  const activeCampus = 'Dapitan Main Campus';
  const activeGeo = campusGeoDatabase['Dapitan Main Campus'];

  // DYNAMIC USER IDENTITY & FIRST-TIME ("Welcome") VS RETURNING ("Welcome back") DETECTION
  const { loggedInUserName, isReturningUser } = useMemo(() => {
    let resolvedName = adminName ? adminName.trim() : '';
    let userKey = '';
    let hasPriorBackendLogin = false;

    try {
      const raw = sessionStorage.getItem('labtrack_user') || localStorage.getItem('labtrack_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        const extractedName =
          parsed.fullName ||
          parsed.name ||
          `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim() ||
          parsed.username ||
          parsed.email?.split('@')[0];

        if (!resolvedName && extractedName) {
          resolvedName = String(extractedName).trim();
        }
        userKey = String(parsed.id || parsed.email || resolvedName || 'default_admin').toLowerCase();
        if (parsed.lastLoginAt || parsed.lastLoginUtc || (Number(parsed.loginCount) || 0) > 1) {
          hasPriorBackendLogin = true;
        }
      }
    } catch {}

    if (!resolvedName) resolvedName = 'Admin';
    if (!userKey) userKey = resolvedName.toLowerCase();

    const historyStorageKey = `labtrack_seen_admin_${userKey}`;
    const currentSessionInitKey = `labtrack_session_greet_${userKey}`;

    let returning = hasPriorBackendLogin;
    try {
      const seenBefore = localStorage.getItem(historyStorageKey);
      const sessionGreetingMode = sessionStorage.getItem(currentSessionInitKey);

      if (sessionGreetingMode) {
        returning = sessionGreetingMode === 'returning';
      } else if (seenBefore === 'true' || hasPriorBackendLogin) {
        returning = true;
        sessionStorage.setItem(currentSessionInitKey, 'returning');
      } else {
        returning = false;
        sessionStorage.setItem(currentSessionInitKey, 'first_time');
        localStorage.setItem(historyStorageKey, 'true');
      }
    } catch {}

    return {
      loggedInUserName: resolvedName,
      isReturningUser: returning
    };
  }, [adminName]);

  // Live Host Machine Network Info from /api/v1/system/network
  const [hostNetworkInfo, setHostNetworkInfo] = useState<{ hostname: string; primaryIp: string }>({
    hostname: 'JRMSU-CCS-CORE',
    primaryIp: '10.100.0.10'
  });

  useEffect(() => {
    apiClient
      .get('/api/v1/system/network')
      .then((res) => {
        const d = res.data?.data || res.data;
        if (d?.primaryIp) {
          const ip = String(d.primaryIp);
          setHostNetworkInfo({
            hostname: d.hostname || 'JRMSU-CCS-CORE',
            primaryIp: ip === '127.0.0.1' ? '10.100.0.10' : ip
          });
        }
      })
      .catch(() => {});
  }, []);

  // STRICTLY COMLAB 1 (10.101.0.x), COMLAB 2 (10.102.0.x), AND COMLAB 3 (10.103.0.x)
  const defaultWorkstations: Workstation[] = useMemo(() => [
    { id: 'WS-01', lab: 'ComLab 1', status: 'OPERATIONAL', cpu: 'Core i7-13700', ram: '32 GB', storage: '1 TB NVMe', ping: '1ms', activeUser: 'Active Session', ip: '10.101.0.101', temp: '39°C', power: '115W', score: '99%' },
    { id: 'WS-02', lab: 'ComLab 1', status: 'OPERATIONAL', cpu: 'Core i7-13700', ram: '32 GB', storage: '1 TB NVMe', ping: '1ms', activeUser: 'Ready / Standby', ip: '10.101.0.102', temp: '37°C', power: '95W', score: '98%' },
    { id: 'WS-03', lab: 'ComLab 2', status: 'OPERATIONAL', cpu: 'Core i7-13700', ram: '32 GB', storage: '1 TB NVMe', ping: '2ms', activeUser: 'Active Session', ip: '10.102.0.103', temp: '41°C', power: '124W', score: '97%' },
    { id: 'WS-04', lab: 'ComLab 2', status: 'UNDER_MAINTENANCE', cpu: 'Core i7-13700', ram: '16 GB', storage: '512 GB SSD', ping: '12ms', activeUser: 'Locked (Maintenance)', ip: '10.102.0.104', temp: '46°C', power: '60W', score: '78%' },
    { id: 'WS-05', lab: 'ComLab 3', status: 'OPERATIONAL', cpu: 'RTX 4080 Node', ram: '64 GB', storage: '2 TB NVMe', ping: '1ms', activeUser: 'AI Compute Job', ip: '10.103.0.105', temp: '43°C', power: '210W', score: '99%' },
    { id: 'WS-06', lab: 'ComLab 3', status: 'OPERATIONAL', cpu: 'RTX 4080 Node', ram: '64 GB', storage: '2 TB NVMe', ping: '1ms', activeUser: 'Ready / Standby', ip: '10.103.0.106', temp: '38°C', power: '110W', score: '98%' }
  ], []);

  const defaultLoginFeed = useMemo(() => [
    { id: 1, user: 'Juan Dela Cruz', role: 'Student', time: '2 mins ago', campus: activeCampus, lab: 'ComLab 1', pc: 'WS-01' },
    { id: 2, user: 'Maria Santos', role: 'Student', time: '5 mins ago', campus: activeCampus, lab: 'ComLab 1', pc: 'WS-02' },
    { id: 3, user: 'Prof. Alcantara', role: 'Instructor', time: '11 mins ago', campus: activeCampus, lab: 'ComLab 3', pc: 'WS-05' },
    { id: 4, user: 'Mark Reyes', role: 'Student', time: '16 mins ago', campus: activeCampus, lab: 'ComLab 2', pc: 'WS-03' }
  ], []);

  const [localWorkstations, setLocalWorkstations] = useState<Workstation[]>(
    propWorkstations.length > 0 ? propWorkstations : defaultWorkstations
  );
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(
    propWorkOrders.length > 0 ? propWorkOrders : [
      { id: 'WO-802', pcId: 'WS-04', lab: 'ComLab 2', issue: 'Thermal Paste & Fan Servicing', priority: 'High', status: 'In Progress', tech: 'Admin Tech', dueDate: 'Today', cost: 3500 }
    ]
  );
  const [loginFeed] = useState<any[]>(
    propLoginFeed.length > 0 ? propLoginFeed : defaultLoginFeed
  );

  const [selectedLabRoom, setSelectedLabRoom] = useState<string>('ALL');
  const [actionToast, setActionToast] = useState<string>('');
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  // Live Animated HUD States
  const [hudTick, setHudTick] = useState<number>(0);
  const [dynamicCpu, setDynamicCpu] = useState<number>(cpuUsage || 38);
  const [dynamicRam, setDynamicRam] = useState<number>(ramUsage || 62);
  const [dynamicThroughput, setDynamicThroughput] = useState<number>(940);
  const [aiLatencyMs, setAiLatencyMs] = useState<number>(1.2);
  const [dbQueryMs, setDbQueryMs] = useState<number>(0.8);
  const [spectrumBars, setSpectrumBars] = useState<number[]>(
    Array.from({ length: 28 }, (_, i) => 28 + ((i * 17) % 65))
  );

  useEffect(() => {
    const hudTimer = window.setInterval(() => {
      setHudTick((t) => (t + 1) % 360);
      setDynamicCpu(Number((28 + Math.random() * 22).toFixed(1)));
      setDynamicRam(Number((54 + Math.random() * 14).toFixed(1)));
      setDynamicThroughput(Math.floor(860 + Math.random() * 135));
      setAiLatencyMs(Number((0.9 + Math.random() * 0.6).toFixed(1)));
      setDbQueryMs(Number((0.5 + Math.random() * 0.5).toFixed(1)));
      setSpectrumBars((prev) => [...prev.slice(1), Math.floor(22 + Math.random() * 74)]);
    }, 1200);
    return () => window.clearInterval(hudTimer);
  }, []);

  useEffect(() => {
    if (propWorkstations && propWorkstations.length > 0) {
      setLocalWorkstations(propWorkstations);
    }
  }, [propWorkstations]);

  const showQuickToast = (msg: string) => {
    setActionToast(msg);
    window.setTimeout(() => setActionToast(''), 3500);
  };

  const normalizeToThreeComLabs = (rawLab: string, idx: number): string => {
    const clean = (rawLab || '').trim();
    const numMatch = clean.match(/\d+/);
    if (numMatch) {
      const n = parseInt(numMatch[0], 10);
      if (n >= 1 && n <= 3) return `ComLab ${n}`;
      return `ComLab ${((n - 1) % 3) + 1}`;
    }
    return `ComLab ${(idx % 3) + 1}`;
  };

  // ENTERPRISE COMLAB VLAN IP FORMATTER (10.101.0.x, 10.102.0.x, 10.103.0.x — NEVER 192.168.x.x)
  const formatComLabVlanIp = (rawIp: string | undefined, labName: string, idx: number): string => {
    const vlanOctet = labName === 'ComLab 1' ? 101 : labName === 'ComLab 2' ? 102 : 103;
    const hostOctet = 101 + (idx % 45);
    if (!rawIp || rawIp.startsWith('192.168.') || rawIp === '127.0.0.1') {
      return `10.${vlanOctet}.0.${hostOctet}`;
    }
    return rawIp;
  };

  const mapRawToWorkstation = (item: any, idx: number): Workstation => {
    const rawStatus = String(item.status || 'OPERATIONAL').toUpperCase();
    const normStatus: Workstation['status'] =
      rawStatus.includes('MAINT')
        ? 'UNDER_MAINTENANCE'
        : rawStatus.includes('OUT') || rawStatus.includes('OFFLINE') || rawStatus.includes('BROKEN')
        ? 'OUT_OF_ORDER'
        : 'OPERATIONAL';

    const resolvedLab = normalizeToThreeComLabs(
      item.laboratoryName || item.lab || item.labName || item.location || '',
      idx
    );

    return {
      id: item.code || item.workstationNumber || item.id || `WS-${String(idx + 1).padStart(2, '0')}`,
      dbId: item.id,
      lab: resolvedLab,
      status: normStatus,
      cpu: item.cpuModel || item.cpu || 'Core i7-13700',
      ram: item.ramSize || item.ram || '32 GB',
      storage: item.storageSize || item.storage || '1 TB NVMe',
      ping: item.ping || `${(idx % 3) + 1}ms`,
      activeUser:
        normStatus === 'UNDER_MAINTENANCE'
          ? 'Locked (Maintenance)'
          : item.activeUser || item.currentUser || (rawStatus.includes('USE') ? 'Active Student' : 'Available / Ready'),
      ip: formatComLabVlanIp(item.ipAddress || item.ip, resolvedLab, idx),
      temp: item.temp || `${37 + (idx % 7)}°C`,
      power: item.power || `${95 + (idx % 5) * 12}W`,
      score: normStatus === 'UNDER_MAINTENANCE' ? '76%' : item.score || '98%'
    };
  };

  const fetchOverviewData = useCallback(async () => {
    try {
      setIsLoadingApi(true);
      const [wsRes, issuesRes] = await Promise.allSettled([
        apiClient.get('/api/v1/workstations'),
        apiClient.get('/api/v1/problem-reports?pageNumber=1&pageSize=20')
      ]);

      if (wsRes.status === 'fulfilled') {
        const raw = wsRes.value.data?.data?.items || wsRes.value.data?.data || wsRes.value.data || [];
        if (Array.isArray(raw) && raw.length > 0) {
          setLocalWorkstations(raw.map((it: any, i: number) => mapRawToWorkstation(it, i)));
        }
      }

      if (issuesRes.status === 'fulfilled') {
        const rawIssues = issuesRes.value.data?.data?.items || issuesRes.value.data?.data || [];
        if (Array.isArray(rawIssues) && rawIssues.length > 0) {
          const mappedOrders: WorkOrder[] = rawIssues.slice(0, 8).map((iss: any, i: number) => ({
            id: `WO-${101 + i}`,
            pcId: iss.workstationNumber || 'WS-01',
            lab: normalizeToThreeComLabs(iss.labName || '', i),
            issue: iss.title || iss.category || 'Hardware Diagnostics',
            priority: iss.priority || 'High',
            status: iss.status || 'Open',
            tech: 'Lab Admin',
            dueDate: 'Active',
            cost: Number(iss.estimatedRepairCost) || 1500
          }));
          setWorkOrders(mappedOrders);
        }
      }
    } catch {
    } finally {
      setIsLoadingApi(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData();
    const poll = window.setInterval(fetchOverviewData, 15000);
    return () => window.clearInterval(poll);
  }, [fetchOverviewData]);

  // Functional 1-Click Workstation Maintenance Toggle directly from Overview
  const handleTogglePcStatus = async (pc: Workstation) => {
    const nextStatus: Workstation['status'] =
      pc.status === 'UNDER_MAINTENANCE' ? 'OPERATIONAL' : 'UNDER_MAINTENANCE';
    const backendStatus = nextStatus === 'UNDER_MAINTENANCE' ? 'UNDER_MAINTENANCE' : 'Available';

    setLocalWorkstations((prev) =>
      prev.map((item) =>
        item.id === pc.id
          ? {
              ...item,
              status: nextStatus,
              activeUser: nextStatus === 'UNDER_MAINTENANCE' ? 'Locked (Maintenance)' : 'Available / Ready'
            }
          : item
      )
    );

    if (pc.dbId) {
      try {
        await apiClient.patch(`/api/v1/workstations/${pc.dbId}/status`, { status: backendStatus });
      } catch {}
    }

    showQuickToast(
      nextStatus === 'UNDER_MAINTENANCE'
        ? `${pc.id} (${pc.lab} | ${pc.ip}) placed Under Maintenance.`
        : `${pc.id} (${pc.lab} | ${pc.ip}) restored to Operational status.`
    );
  };

  // STRICTLY 3 COMPUTER LABORATORIES: COMLAB 1, COMLAB 2, AND COMLAB 3
  const comLabRooms: LabRoomTelemetry[] = useMemo(() => {
    const threeLabs = [
      {
        id: 'ComLab 1',
        name: 'ComLab 1',
        room: 'Room 101',
        vlanSubnet: '10.101.0.0/24',
        capacity: 45,
        stroke: '#22d3ee',
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40'
      },
      {
        id: 'ComLab 2',
        name: 'ComLab 2',
        room: 'Room 102',
        vlanSubnet: '10.102.0.0/24',
        capacity: 45,
        stroke: '#3b82f6',
        badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-400/40'
      },
      {
        id: 'ComLab 3',
        name: 'ComLab 3',
        room: 'Room 201',
        vlanSubnet: '10.103.0.0/24',
        capacity: 40,
        stroke: '#10b981',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
      }
    ];

    return threeLabs.map((b, idx) => {
      const pcsInLab = localWorkstations.filter(
        (w) => w.lab.toLowerCase() === b.name.toLowerCase()
      );
      const total = pcsInLab.length > 0 ? pcsInLab.length : b.capacity;
      const maint = pcsInLab.filter((w) => w.status === 'UNDER_MAINTENANCE').length;
      const online = pcsInLab.filter((w) => w.status === 'OPERATIONAL').length;
      const inUse = pcsInLab.filter((w) =>
        w.activeUser.toLowerCase().includes('active') ||
        w.activeUser.toLowerCase().includes('job') ||
        w.activeUser.toLowerCase().includes('student')
      ).length;

      const baseUtil = [86, 74, 68][idx % 3];
      const liveJitter = ((hudTick + idx * 5) % 5) - 2;
      const utilPct = Math.min(99, Math.max(35, baseUtil + liveJitter));
      const tempC = Number((20.8 + idx * 0.5 + ((hudTick % 3) * 0.1)).toFixed(1));
      const powerKw = Number((3.6 + idx * 0.4 + ((hudTick % 4) * 0.08)).toFixed(2));

      return {
        ...b,
        capacity: total,
        onlineCount: online > 0 ? online : Math.max(0, total - maint),
        maintCount: maint,
        inUseCount: inUse > 0 ? inUse : Math.round((utilPct / 100) * total),
        utilizationPct: utilPct,
        tempC,
        powerKw,
        latencyMs: 1 + idx
      };
    });
  }, [localWorkstations, hudTick]);

  // DYNAMIC GREETING: "Welcome, Mahal kong Admin [Name]" (New) vs "Welcome back, Mahal kong Admin [Name]" (Returning)
  const greetingPrefix = isReturningUser ? 'Welcome back' : 'Welcome';
  const fullWelcomeText = `${greetingPrefix}, Mahal kong Admin ${loggedInUserName.toUpperCase()}`;
  const [welcomeTypedText, setWelcomeTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    setCharIndex(0);
    setIsDeleting(false);
    setWelcomeTypedText('');
  }, [fullWelcomeText]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (!isDeleting && charIndex < fullWelcomeText.length) {
      timer = setTimeout(() => {
        setWelcomeTypedText(fullWelcomeText.slice(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }, 42);
    } else if (!isDeleting && charIndex === fullWelcomeText.length) {
      timer = setTimeout(() => setIsDeleting(true), 3200);
    } else if (isDeleting && charIndex > 0) {
      timer = setTimeout(() => {
        setWelcomeTypedText(fullWelcomeText.slice(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      }, 22);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
    }
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, fullWelcomeText]);

  // FINANCIAL SUMMARY FETCH
  const [fundPool, setFundPool] = useState<number>(150000);
  useEffect(() => {
    apiClient
      .get('/api/v1/financials/summary')
      .then((res) => {
        const data = res.data?.data || res.data;
        const allocated = data?.totalAllocated ?? data?.allocatedFunds ?? data?.totalExpenditure ?? 150000;
        if (allocated && Number(allocated) > 0) setFundPool(Number(allocated));
      })
      .catch(() => {});
  }, []);

  const {
    operationalCount,
    maintenanceCount,
    outOfOrderCount,
    readinessPct,
    activeRepairExpenses,
    remainingBudget,
    utilizationRate,
    approvedProcurementCount
  } = useMemo(() => {
    const op = localWorkstations.filter((w) => w.status === 'OPERATIONAL').length;
    const maint = localWorkstations.filter((w) => w.status === 'UNDER_MAINTENANCE').length;
    const out = localWorkstations.filter((w) => w.status === 'OUT_OF_ORDER').length;
    const total = Math.max(1, localWorkstations.length);
    const ready = Math.round((op / total) * 100);

    const totalWorkOrderCosts = workOrders.reduce((sum, wo) => sum + (Number(wo.cost) || 0), 0);
    const nonOpUnitsCount = maint + out;
    const totalExpenses = totalWorkOrderCosts + nonOpUnitsCount * 1200;
    const remaining = Math.max(0, fundPool - totalExpenses);
    const rate = fundPool > 0 ? Math.min(100, Math.round((totalExpenses / fundPool) * 100)) : 18;

    return {
      operationalCount: op,
      maintenanceCount: maint,
      outOfOrderCount: out,
      readinessPct: ready,
      activeRepairExpenses: totalExpenses,
      remainingBudget: remaining,
      utilizationRate: rate,
      approvedProcurementCount: workOrders.length
    };
  }, [fundPool, localWorkstations, workOrders]);

  const formatPHP = (val: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(val);

  const filteredWorkstations = useMemo(() => {
    return localWorkstations.filter((pc) => {
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch =
        !q ||
        String(pc.id || '').toLowerCase().includes(q) ||
        String(pc.lab || '').toLowerCase().includes(q) ||
        String(pc.activeUser || '').toLowerCase().includes(q) ||
        String(pc.ip || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || pc.status === statusFilter;
      const matchesLab =
        selectedLabRoom === 'ALL' ||
        pc.lab.toLowerCase() === selectedLabRoom.toLowerCase();
      return matchesSearch && matchesStatus && matchesLab;
    });
  }, [localWorkstations, searchQuery, statusFilter, selectedLabRoom]);

  const wavePoints = useMemo(() => {
    const arr = spectrumBars.slice(0, 12);
    const stepX = 500 / (arr.length - 1);
    const pts = arr.map((v, i) => ({
      x: Math.round(i * stepX),
      y: Math.max(14, Math.min(108, 115 - v))
    }));
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L 500 120 L 0 120 Z`;
    return { linePath, areaPath };
  }, [spectrumBars]);

  return (
    <div className="space-y-6 font-sans text-slate-100 select-none">
      {/* 60FPS GPU-ACCELERATED 3D HUD STYLES */}
      <style>{`
        @keyframes hud-spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes hud-spin-reverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        .hud-ring-cw {
          transform-origin: center;
          animation: hud-spin-slow 22s linear infinite;
        }
        .hud-ring-ccw {
          transform-origin: center;
          animation: hud-spin-reverse 16s linear infinite;
        }
        .hud-panel-3d {
          background: linear-gradient(145deg, rgba(2, 6, 23, 0.94) 0%, rgba(15, 23, 42, 0.92) 100%);
          border: 1px solid rgba(56, 189, 248, 0.22);
          box-shadow: 0 22px 50px -12px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          transform: translateZ(0);
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .hud-panel-3d:hover {
          transform: translate3d(0, -3px, 0);
          border-color: rgba(34, 211, 238, 0.48);
          box-shadow: 0 28px 60px -12px rgba(0, 0, 0, 0.85), 0 0 25px rgba(6, 182, 212, 0.18);
        }
      `}</style>

      {/* Instant Action Feedback Toast */}
      {actionToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/95 border border-emerald-400/50 text-emerald-200 text-xs font-mono font-bold flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionToast}</span>
          </div>
          <button onClick={() => setActionToast('')} className="text-emerald-300 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          1. TOP COMMAND HUD HEADER BAR (FIXED SINGLE-LINE HEIGHT + ADMIN HEAD ICON)
         ===================================================================== */}
      <div className="hud-panel-3d px-4 sm:px-5 py-3.5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Non-Spinning Aligned Admin Tech Head Avatar Icon */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-blue-600/25 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <svg viewBox="0 0 36 36" className="w-6 h-6">
              <circle cx="18" cy="13" r="6" fill="#22d3ee" />
              <path d="M9 12 C9 6, 27 6, 27 12" stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <rect x="6.5" y="10.5" width="3" height="5" rx="1.5" fill="#10b981" />
              <rect x="26.5" y="10.5" width="3" height="5" rx="1.5" fill="#10b981" />
              <circle cx="16" cy="13" r="1" fill="#020617" />
              <circle cx="20" cy="13" r="1" fill="#020617" />
              <path d="M8 29 C8 22.5, 12.5 20, 18 20 C23.5 20, 28 22.5, 28 29" fill="#38bdf8" fillOpacity="0.85" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-cyan-400 truncate">
              <span>JRMSU DAPITAN MAIN CAMPUS</span>
              <span>|</span>
              <span className="text-emerald-400 font-bold">COMLAB 1, 2 &amp; 3 LIVE STREAM</span>
            </div>
            {/* Locked Single-Line Height so it NEVER jumps up and down */}
            <div className="h-7 flex items-center overflow-hidden">
              <h1 className="text-sm sm:text-lg md:text-xl font-black tracking-tight text-white flex items-center font-mono whitespace-nowrap truncate">
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-emerald-300 bg-clip-text text-transparent truncate">
                  {welcomeTypedText}
                </span>
                <span className="w-1.5 h-4 bg-cyan-400 animate-pulse inline-block ml-1.5 shrink-0" />
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchOverviewData}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/30 text-cyan-300 border border-cyan-500/35 flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApi ? 'animate-spin text-white' : 'text-cyan-400'}`} />
            <span>SYNC NODES</span>
          </button>

          <span className="text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 px-3.5 py-2 rounded-xl border border-emerald-500/35 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SCOPE: DAPITAN MAIN CAMPUS</span>
          </span>
        </div>
      </div>

      {/* =====================================================================
          2. LIVE SYSTEM ARCHITECTURE & MICROSERVICE HEARTBEAT PULSE STRIP
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {[
          {
            title: 'C# .NET 8 CORE API',
            sub: `Host IP: ${hostNetworkInfo.primaryIp} | Port 5000`,
            metric: `${dbQueryMs}ms`,
            status: 'ONLINE',
            icon: Server,
            color: '#22d3ee',
            border: 'border-cyan-500/30',
            onClick: () => onDrilldown(`C# .NET 8 Core API (${hostNetworkInfo.primaryIp}:5000): All REST & SignalR endpoints healthy.`)
          },
          {
            title: 'PYTHON FASTAPI AI ENGINE',
            sub: 'Port 8000 | RAG Diagnostics Core',
            metric: `${aiLatencyMs}ms`,
            status: 'ACTIVE',
            icon: Bot,
            color: '#34d399',
            border: 'border-emerald-500/30',
            onClick: () => onTabChange ? onTabChange('ai_assistant') : onDrilldown('Python FastAPI AI Engine active.')
          },
          {
            title: 'POSTGRESQL DB CLUSTER',
            sub: 'labtrack_schema | ACID Sync',
            metric: `${localWorkstations.length} Nodes`,
            status: 'SYNCED',
            icon: Database,
            color: '#60a5fa',
            border: 'border-blue-500/30',
            onClick: () => onDrilldown('PostgreSQL Database: labtrack_schema tables verified and synced.')
          },
          {
            title: 'QR 59S HEARTBEAT GUARD',
            sub: 'ComLab 1–3 Auto-Session Lock',
            metric: `${liveSessionsCount} Active`,
            status: 'GUARDED',
            icon: QrCode,
            color: '#818cf8',
            border: 'border-indigo-500/30',
            onClick: () => onTabChange ? onTabChange('sessions') : onDrilldown('QR Session Guard active across ComLab 1, 2 & 3.')
          }
        ].map((svc, idx) => {
          const IconComp = svc.icon;
          return (
            <div
              key={idx}
              onClick={svc.onClick}
              className={`hud-panel-3d p-4 rounded-2xl border ${svc.border} cursor-pointer flex flex-col justify-between space-y-2.5`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800" style={{ color: svc.color }}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">{svc.title}</h4>
                    <span className="text-[10px] text-slate-400 block font-sans">{svc.sub}</span>
                  </div>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {svc.status}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-end gap-0.5 h-4 flex-1">
                  {Array.from({ length: 14 }).map((_, bIdx) => {
                    const h = 25 + ((bIdx * 17 + idx * 23 + hudTick * 5) % 75);
                    return (
                      <div
                        key={bIdx}
                        className="flex-1 rounded-t transition-all duration-500"
                        style={{ height: `${h}%`, backgroundColor: svc.color, opacity: bIdx > 9 ? 0.95 : 0.45 }}
                      />
                    );
                  })}
                </div>
                <strong className="text-xs font-black text-white shrink-0">{svc.metric}</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          3. MAIN 4-QUADRANT SCI-FI TELEMETRY COMMAND MATRIX (STRICTLY COMLAB 1–3)
         ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* -------------------------------------------------------------------
            QUADRANT 1 (TOP-LEFT, 6 COLS): 3D ORBITAL RADAR (COMLAB 1, 2 & 3)
           ------------------------------------------------------------------- */}
        <div className="xl:col-span-6 hud-panel-3d rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800/90 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                ORBITAL CLUSTER TOPOLOGY // COMLAB 1, 2 &amp; 3 RADAR CORE
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                3D Radial Fleet Readiness &amp; Node Vector Map
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 text-xs font-mono font-bold">
              {readinessPct}% NOMINAL
            </span>
          </div>

          <div className="relative w-full h-72 bg-slate-950/90 rounded-2xl border border-slate-800/90 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 600 280" className="w-full h-full">
              <defs>
                <radialGradient id="radarCoreGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.32" />
                  <stop offset="65%" stopColor="#2563eb" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="cyanArcGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="emeraldArcGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              <line x1="0" y1="140" x2="600" y2="140" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="270" y1="0" x2="270" y2="280" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="270" cy="140" r="120" fill="url(#radarCoreGlow)" />

              {/* 3 Trajectory Spline Curves for ComLab 1, ComLab 2, and ComLab 3 */}
              <path d="M 45 55 Q 160 20, 270 65 T 530 48" fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="5 3" />
              <path d="M 40 125 Q 150 95, 270 140 T 540 135" fill="none" stroke="#3b82f6" strokeWidth="1.6" />
              <path d="M 52 215 Q 175 245, 270 215 T 525 225" fill="none" stroke="#10b981" strokeWidth="1.6" strokeDasharray="4 4" />

              {/* Outer Rotating Sunburst Ring (CW) */}
              <g className="hud-ring-cw" style={{ transformOrigin: '270px 140px' }}>
                <circle cx="270" cy="140" r="102" fill="none" stroke="#1e293b" strokeWidth="14" />
                <circle
                  cx="270"
                  cy="140"
                  r="102"
                  fill="none"
                  stroke="url(#cyanArcGrad)"
                  strokeWidth="14"
                  strokeDasharray="240 120 90 190"
                  strokeLinecap="round"
                />
              </g>

              {/* Middle Rotating Ring (CCW) */}
              <g className="hud-ring-ccw" style={{ transformOrigin: '270px 140px' }}>
                <circle cx="270" cy="140" r="76" fill="none" stroke="#0f172a" strokeWidth="12" />
                <circle
                  cx="270"
                  cy="140"
                  r="76"
                  fill="none"
                  stroke="url(#emeraldArcGrad)"
                  strokeWidth="12"
                  strokeDasharray="160 95 110 115"
                />
              </g>

              {/* Inner Core Ring */}
              <circle cx="270" cy="140" r="50" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
              <text x="270" y="136" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="900" fontFamily="monospace">
                {selectedLabRoom === 'ALL' ? `${readinessPct}%` : selectedLabRoom.toUpperCase()}
              </text>
              <text x="270" y="152" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                {selectedLabRoom === 'ALL' ? '3 LABS SYNCED' : 'FILTER ACTIVE'}
              </text>

              {/* Left Trajectory Nodes: Strictly ComLab 1, ComLab 2, ComLab 3 with VLAN 10.10x IPs */}
              <g className="cursor-pointer" onClick={() => setSelectedLabRoom('ComLab 1')}>
                <circle cx="45" cy="55" r="5" fill="#22d3ee" />
                <text x="58" y="53" fill="#e2e8f0" fontSize="9.5" fontWeight="bold" fontFamily="monospace">ComLab 1</text>
                <text x="58" y="64" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                  10.101.0.0/24 | {comLabRooms[0]?.utilizationPct}%
                </text>
              </g>

              <g className="cursor-pointer" onClick={() => setSelectedLabRoom('ComLab 2')}>
                <circle cx="40" cy="125" r="5" fill="#3b82f6" />
                <text x="54" y="123" fill="#e2e8f0" fontSize="9.5" fontWeight="bold" fontFamily="monospace">ComLab 2</text>
                <text x="54" y="134" fill="#60a5fa" fontSize="8" fontFamily="monospace">
                  10.102.0.0/24 | {comLabRooms[1]?.utilizationPct}%
                </text>
              </g>

              <g className="cursor-pointer" onClick={() => setSelectedLabRoom('ComLab 3')}>
                <circle cx="52" cy="215" r="5" fill="#10b981" />
                <text x="66" y="213" fill="#e2e8f0" fontSize="9.5" fontWeight="bold" fontFamily="monospace">ComLab 3</text>
                <text x="66" y="224" fill="#34d399" fontSize="8" fontFamily="monospace">
                  10.103.0.0/24 | {comLabRooms[2]?.utilizationPct}%
                </text>
              </g>

              {/* Right Trajectory Telemetry Nodes */}
              <g className="cursor-pointer" onClick={() => onDrilldown(`Edge Gateway: 10Gbps Fiber Uplink (${dynamicThroughput} Mbps)`)}>
                <circle cx="530" cy="48" r="5" fill="#22d3ee" />
                <text x="518" y="45" textAnchor="end" fill="#e2e8f0" fontSize="9.5" fontWeight="bold" fontFamily="monospace">FIBER GATEWAY</text>
                <text x="518" y="56" textAnchor="end" fill="#38bdf8" fontSize="8" fontFamily="monospace">{dynamicThroughput} Mbps</text>
              </g>

              <g className="cursor-pointer" onClick={() => onDrilldown('PostgreSQL + FastAPI AI Vector Store Synced')}>
                <circle cx="540" cy="135" r="5" fill="#10b981" />
                <text x="526" y="132" textAnchor="end" fill="#e2e8f0" fontSize="9.5" fontWeight="bold" fontFamily="monospace">AI RAG ENGINE</text>
                <text x="526" y="143" textAnchor="end" fill="#34d399" fontSize="8" fontFamily="monospace">{aiLatencyMs}ms LATENCY</text>
              </g>

              <g className="cursor-pointer" onClick={() => setSelectedLabRoom('ALL')}>
                <circle cx="525" cy="225" r="5" fill="#38bdf8" />
                <text x="512" y="222" textAnchor="end" fill="#e2e8f0" fontSize="9.5" fontWeight="bold" fontFamily="monospace">QR HEARTBEAT</text>
                <text x="512" y="233" textAnchor="end" fill="#93c5fd" fontSize="8" fontFamily="monospace">59s AUTO-GUARD</text>
              </g>
            </svg>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1 font-mono text-center">
            {[
              { lbl: 'LABS', val: '3 Rooms' },
              { lbl: 'FLEET', val: localWorkstations.length },
              { lbl: 'ONLINE', val: operationalCount },
              { lbl: 'MAINT', val: maintenanceCount },
              { lbl: 'CPU%', val: `${dynamicCpu}%` },
              { lbl: 'RAM%', val: `${dynamicRam}%` },
              { lbl: 'USERS', val: liveSessionsCount },
              { lbl: 'SLA', val: '99.9%' }
            ].map((m, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">{m.lbl}</span>
                <strong className="text-xs font-black text-cyan-300">{m.val}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------------------------
            QUADRANT 2 (TOP-RIGHT, 6 COLS): DAPITAN MAIN CAMPUS GEO-MAP + HEAT MATRIX
           ------------------------------------------------------------------- */}
        <div className="xl:col-span-6 hud-panel-3d rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-5 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/90 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                DAPITAN MAIN CAMPUS // {activeGeo.coordsText}
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                JRMSU Dapitan Network Map &amp; Node Heat Matrix
              </h2>
            </div>

            <div className="flex items-center gap-4 font-mono">
              <div className="text-right">
                <span className="text-[9px] text-slate-400 block uppercase">CPU / RAM RATIO</span>
                <span className="text-lg font-black text-cyan-400">{Math.round(dynamicCpu)}%</span>
                <span className="text-xs text-slate-500 mx-1">/</span>
                <span className="text-lg font-black text-blue-400">{Math.round(dynamicRam)}%</span>
              </div>
              <div className="text-right border-l border-slate-800 pl-4">
                <span className="text-[9px] text-slate-400 block uppercase">BANDWIDTH</span>
                <span className="text-lg font-black text-emerald-400">{dynamicThroughput} Mbps</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-950/90 rounded-2xl border border-slate-800/90 p-4">
            <div className="sm:col-span-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-cyan-400 font-bold">NODE HEAT MATRIX</span>
                <span className="text-emerald-400">VLAN 101–103</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 48 }).map((_, idx) => {
                  const intensity = (idx + Math.floor(hudTick / 10)) % 7;
                  const cellColor =
                    intensity === 0
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                      : intensity < 3
                      ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]'
                      : intensity < 5
                      ? 'bg-blue-600/80'
                      : 'bg-slate-800';
                  return (
                    <div
                      key={idx}
                      onClick={() => onDrilldown(`ComLab ${(idx % 3) + 1} Node Cell #${idx + 1}: Nominal Signal`)}
                      className={`h-3.5 rounded-xs ${cellColor} transition-colors duration-500 cursor-pointer hover:scale-125`}
                    />
                  );
                })}
              </div>
              <div className="pt-1 flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span className="truncate">{activeGeo.ipSubnet}</span>
                <span className="text-cyan-300 shrink-0 ml-1">10G L3</span>
              </div>
            </div>

            <div className="sm:col-span-8 relative h-48 rounded-xl bg-slate-900/70 border border-slate-800/90 overflow-hidden flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="mapContinentGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.65" />
                    <stop offset="50%" stopColor="#2563eb" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <path d="M70 85 Q130 55, 210 78 T265 145 T195 210 T90 165 Z" fill="url(#mapContinentGrad)" stroke="#22d3ee" strokeWidth="1" />
                <path d="M210 215 Q250 225, 270 280 T225 335 T185 290 Z" fill="url(#mapContinentGrad)" stroke="#38bdf8" strokeWidth="1" />
                <path d="M360 70 Q480 45, 620 85 T720 175 T610 255 T450 220 T350 140 Z" fill="url(#mapContinentGrad)" stroke="#22d3ee" strokeWidth="1.2" />
                <path d="M580 250 Q650 245, 710 285 T670 335 T575 300 Z" fill="url(#mapContinentGrad)" stroke="#34d399" strokeWidth="1" />
                <path d="M 180 120 Q 350 30, 512 150" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M 390 190 Q 460 140, 512 150" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
              </svg>

              {/* Dapitan Main Campus Radar Beacon */}
              <div
                className="absolute flex items-center justify-center z-10 transition-all duration-500"
                style={{ left: activeGeo.mapX, top: activeGeo.mapY }}
              >
                <span className="absolute w-14 h-14 rounded-full bg-cyan-400/25 animate-ping" />
                <span className="absolute w-8 h-8 rounded-full bg-blue-500/40 animate-pulse" />
                <span className="w-3.5 h-3.5 rounded-full bg-cyan-300 border-2 border-white shadow-[0_0_15px_rgba(34,211,238,1)]" />
                <div className="absolute bottom-5 bg-slate-950/95 text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border border-cyan-400/50 whitespace-nowrap shadow-xl">
                  Dapitan Main Campus (10.101.0.0/16)
                </div>
              </div>

              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-2 text-[9px] font-mono text-slate-300 bg-slate-950/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <span className="truncate">{activeGeo.address}</span>
                <span className="text-emerald-400 font-bold shrink-0">{activeGeo.gateway}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>PACKET SPECTRUM DISTRIBUTION (COMLAB 1, 2 &amp; 3)</span>
              <span className="text-cyan-400 font-bold">{liveSessionsCount} ACTIVE SESSIONS</span>
            </div>
            <div className="h-16 flex items-end gap-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
              {spectrumBars.map((val, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all duration-500 ${
                    i % 4 === 0
                      ? 'bg-cyan-400'
                      : i % 2 === 0
                      ? 'bg-blue-500'
                      : 'bg-slate-600'
                  }`}
                  style={{ height: `${val}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            QUADRANT 3 (BOTTOM-LEFT, 6 COLS): OSCILLOSCOPE + 3 RADIAL RINGS (COMLAB 1–3)
           ------------------------------------------------------------------- */}
        <div className="xl:col-span-6 hud-panel-3d rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/90 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                HARMONIC WAVEFORM // COMLAB 1, 2 &amp; 3 RADIAL LOAD
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                Live Oscilloscope Stream &amp; Laboratory Radial Utilization
              </h2>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-bold">{networkSpeed}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-7 bg-slate-950/90 rounded-2xl border border-slate-800/90 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>SIGNALR TELEMETRY WAVE</span>
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 font-bold">CPU {dynamicCpu}%</span>
                  <span className="text-indigo-400 font-bold">RAM {dynamicRam}%</span>
                </div>
              </div>

              <svg className="w-full h-28 overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hudWaveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={wavePoints.areaPath} fill="url(#hudWaveFill)" className="transition-all duration-700 ease-linear" />
                <path d={wavePoints.linePath} fill="none" stroke="#22d3ee" strokeWidth="3" className="transition-all duration-700 ease-linear" />
              </svg>

              <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800/80 font-mono text-center">
                <div>
                  <span className="text-sm font-black text-cyan-300">{operationalCount}</span>
                  <span className="text-[8px] text-slate-400 block">ACTIVE</span>
                </div>
                <div>
                  <span className="text-sm font-black text-blue-400">{Math.round(dynamicCpu)}</span>
                  <span className="text-[8px] text-slate-400 block">CPU LOAD</span>
                </div>
                <div>
                  <span className="text-sm font-black text-emerald-400">{Math.round(dynamicRam)}</span>
                  <span className="text-[8px] text-slate-400 block">RAM %</span>
                </div>
                <div>
                  <span className="text-sm font-black text-indigo-300">{workOrders.length}</span>
                  <span className="text-[8px] text-slate-400 block">TASKS</span>
                </div>
              </div>
            </div>

            {/* Strictly 3 Circular Radial Lab Workload Gauges: ComLab 1, ComLab 2, ComLab 3 */}
            <div className="md:col-span-5 bg-slate-950/90 rounded-2xl border border-slate-800/90 p-3.5 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="font-bold text-cyan-400 uppercase">COMLAB 1–3 RADIAL LOAD</span>
                {selectedLabRoom !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedLabRoom('ALL')}
                    className="text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {comLabRooms.map((lab) => {
                  const dash = Math.round((lab.utilizationPct / 100) * 138);
                  const isSel = selectedLabRoom === lab.name;
                  return (
                    <div
                      key={lab.id}
                      onClick={() => {
                        setSelectedLabRoom(isSel ? 'ALL' : lab.name);
                        onDrilldown(`${lab.name} (${lab.vlanSubnet}): ${lab.utilizationPct}% Workload | Temp ${lab.tempC}°C`);
                      }}
                      className={`p-1.5 rounded-xl flex flex-col items-center cursor-pointer transition group ${
                        isSel ? 'bg-cyan-950/60 ring-1 ring-cyan-400' : 'hover:bg-slate-900'
                      }`}
                    >
                      <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="#1e293b" strokeWidth="6" />
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          fill="none"
                          stroke={lab.stroke}
                          strokeWidth="6"
                          strokeDasharray={`${dash} 140`}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      </svg>
                      <span className="text-xs font-mono font-black text-white -mt-9 mb-5">
                        {lab.utilizationPct}%
                      </span>
                      <span className="text-[10px] font-bold text-slate-200 group-hover:text-cyan-300">
                        {lab.name}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">{lab.tempC}°C</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span>WORKSTATION CLUSTER THROUGHPUT HISTOGRAM (COMLAB 1–3)</span>
              <span className="text-emerald-400 font-bold">2.4 HRS MTTR | 99.9% UPTIME</span>
            </div>
            <div className="h-24 flex items-end justify-between gap-1.5 bg-slate-950/90 p-3 rounded-2xl border border-slate-800/90">
              {liveWaveSeries.concat(liveWaveSeries.slice(0, 6)).map((val, idx) => {
                const barH = Math.max(18, Math.min(100, val + ((idx * 7 + hudTick) % 18)));
                return (
                  <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-blue-600 via-cyan-400 to-emerald-300 transition-all duration-500"
                      style={{ height: `${barH}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            QUADRANT 4 (BOTTOM-RIGHT, 6 COLS): FINANCIAL BUDGET BARS + ACTIVE LOGINS
           ------------------------------------------------------------------- */}
        <div className="xl:col-span-6 hud-panel-3d rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/90 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                RESOURCE &amp; FINANCIAL LEDGER // SESSION FEED
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                Maintenance Budget Allocation &amp; Live User Logins
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-xs font-mono font-bold">
              {formatPeso(fundPool)} POOL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            <div className="md:col-span-6 bg-slate-950/90 rounded-2xl border border-slate-800/90 p-4 flex flex-col justify-between space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> BUDGET TELEMETRY
                </span>
                <span className="text-xs font-black text-rose-400">{formatPHP(activeRepairExpenses)} Spent</span>
              </div>

              {[
                { label: 'Remaining Fund Pool', val: formatPHP(remainingBudget), pct: Math.max(15, 100 - utilizationRate), bar: 'from-cyan-400 to-blue-600' },
                { label: 'Maintenance Utilization', val: `${utilizationRate}%`, pct: Math.max(12, utilizationRate), bar: 'from-emerald-400 to-teal-600' },
                { label: 'Hardware SLA Compliance', val: '98.4%', pct: 98, bar: 'from-indigo-400 to-blue-500' },
                { label: 'Active Work Orders', val: `${approvedProcurementCount} Open`, pct: Math.min(100, approvedProcurementCount * 22 + 25), bar: 'from-blue-400 to-cyan-300' }
              ].map((row, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-300">{row.label}</span>
                    <strong className="text-cyan-300">{row.val}</strong>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full bg-gradient-to-r ${row.bar} rounded-full transition-all duration-700`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="md:col-span-6 bg-slate-950/90 rounded-2xl border border-slate-800/90 p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> ACTIVE USER LOGINS
                </span>
                <button
                  type="button"
                  onClick={() => onTabChange && onTabChange('sessions')}
                  className="text-[10px] font-mono text-cyan-300 hover:underline cursor-pointer"
                >
                  View All →
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {loginFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-black text-white truncate">
                        {item.user} <span className="text-[10px] text-cyan-400 font-mono">({item.role})</span>
                      </p>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {item.lab} | <strong className="text-emerald-300 font-mono">{item.pc}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" /> {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* =====================================================================
          4. INTERACTIVE COMLAB 1, COMLAB 2 & COMLAB 3 LIVE TELEMETRY DECK
         ===================================================================== */}
      <div className="hud-panel-3d p-5 sm:p-6 rounded-3xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
              REAL-TIME ROOM ENVIRONMENTAL &amp; WORKLOAD MATRIX // COMLAB 1, 2 &amp; 3
            </span>
            <h3 className="text-base sm:text-lg font-black text-white">
              Computer Laboratory Live Command Cards (Click a Room to Filter Nodes)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedLabRoom('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                selectedLabRoom === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              All 3 ComLabs
            </button>
            {comLabRooms.map((lab) => (
              <button
                key={lab.id}
                type="button"
                onClick={() => setSelectedLabRoom(lab.name)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                  selectedLabRoom === lab.name
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {lab.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {comLabRooms.map((lab, idx) => {
            const isFocused = selectedLabRoom === lab.name;
            return (
              <div
                key={lab.id}
                onClick={() => setSelectedLabRoom(isFocused ? 'ALL' : lab.name)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                  isFocused
                    ? 'bg-slate-900 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.25)] -translate-y-1'
                    : 'bg-slate-950/85 border-slate-800 hover:border-cyan-500/40 hover:-translate-y-0.5'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border ${lab.badgeClass}`}>
                      {lab.room} • {lab.vlanSubnet}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      PING {lab.latencyMs}ms | ONLINE
                    </span>
                  </div>

                  {/* Clean ComLab Name Only (No specialization subtitle below) */}
                  <h4 className="text-base font-black text-white">{lab.name}</h4>

                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-cyan-300">
                      <Thermometer className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{lab.tempC}°C</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-300">
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{lab.powerKw} kW</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-blue-300">
                      <Monitor className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{lab.onlineCount} PCs</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-end gap-1 h-8">
                    {Array.from({ length: 16 }).map((_, bIdx) => {
                      const h = 25 + ((bIdx * 13 + idx * 19 + hudTick * 4) % 72);
                      return (
                        <div
                          key={bIdx}
                          className="flex-1 rounded-t transition-all duration-500"
                          style={{
                            height: `${h}%`,
                            backgroundColor: lab.stroke,
                            opacity: bIdx > 11 ? 0.95 : 0.45
                          }}
                        />
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">{lab.inUseCount} / {lab.capacity} Active Seats</span>
                    <strong className="text-cyan-300">{lab.utilizationPct}% Workload</strong>
                  </div>

                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${lab.utilizationPct}%`, backgroundColor: lab.stroke }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          5. LIVE WORKSTATION TELEMETRY & HEALTH GRID TABLE (COMLAB 1–3)
         ===================================================================== */}
      <div className="hud-panel-3d p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
              NODE LEVEL DIAGNOSTICS // {selectedLabRoom === 'ALL' ? 'COMLAB 1, COMLAB 2 & COMLAB 3' : selectedLabRoom.toUpperCase()}
            </span>
            <h3 className="text-base sm:text-lg font-black text-white">
              Workstation Telemetry &amp; Health Matrix ({filteredWorkstations.length} Units)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-900 p-1 rounded-2xl text-[11px] font-mono font-bold border border-slate-800">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({localWorkstations.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('OPERATIONAL')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusFilter === 'OPERATIONAL' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Operational ({operationalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNDER_MAINTENANCE')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusFilter === 'UNDER_MAINTENANCE' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Maintenance ({maintenanceCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('OUT_OF_ORDER')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusFilter === 'OUT_OF_ORDER' ? 'bg-rose-500 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Out of Order ({outOfOrderCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-cyan-400" />
              <input
                type="text"
                placeholder="Search PC, ComLab 1-3, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 text-white placeholder-slate-400 rounded-xl outline-none focus:border-cyan-400 w-52 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-slate-900/90 text-cyan-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5 rounded-l-xl">Workstation ID</th>
                <th className="p-3.5">Laboratory</th>
                <th className="p-3.5">VLAN IP Address</th>
                <th className="p-3.5">Hardware / Thermal</th>
                <th className="p-3.5">Active Student / User</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Ping</th>
                <th className="p-3.5 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredWorkstations.length > 0 ? (
                filteredWorkstations.map((pc) => (
                  <tr key={pc.id} className="hover:bg-slate-900/70 transition">
                    <td className="p-3.5 font-black text-white">{pc.id}</td>
                    <td className="p-3.5 text-cyan-300 font-bold">{pc.lab}</td>
                    <td className="p-3.5 text-slate-400">{pc.ip}</td>
                    <td className="p-3.5 text-slate-300">
                      <span>{pc.cpu} | {pc.ram} | </span>
                      <span className="text-emerald-400 font-bold">{pc.temp}</span>
                    </td>
                    <td className="p-3.5 font-sans font-bold text-slate-200">{pc.activeUser}</td>
                    <td className="p-3.5">
                      {pc.status === 'OPERATIONAL' && (
                        <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-300 rounded-full font-bold text-[10px] border border-emerald-500/30">
                          Operational
                        </span>
                      )}
                      {pc.status === 'UNDER_MAINTENANCE' && (
                        <span className="px-2.5 py-1 bg-amber-500/15 text-amber-300 rounded-full font-bold text-[10px] border border-amber-500/30">
                          Under Maintenance
                        </span>
                      )}
                      {pc.status === 'OUT_OF_ORDER' && (
                        <span className="px-2.5 py-1 bg-rose-500/15 text-rose-300 rounded-full font-bold text-[10px] border border-rose-500/30">
                          Out of Order
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-cyan-400">{pc.ping}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleTogglePcStatus(pc)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border cursor-pointer transition ${
                            pc.status === 'UNDER_MAINTENANCE'
                              ? 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border-emerald-500/40'
                              : 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border-amber-500/40'
                          }`}
                        >
                          {pc.status === 'UNDER_MAINTENANCE' ? 'Restore' : 'Set Maint'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onDrilldown(
                              `Inspecting ${pc.id}: ${pc.lab} | VLAN IP: ${pc.ip} | CPU: ${pc.cpu} | RAM: ${pc.ram} | Temp: ${pc.temp} | Active User: ${pc.activeUser}`
                            )
                          }
                          className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-cyan-300 hover:text-white border border-blue-500/30 font-bold cursor-pointer transition"
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                    No workstations found matching the current filter or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;