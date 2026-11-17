import apiClient from '@/lib/api-client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Wrench, Calendar, CheckCircle2, ChevronRight, Plus,
  Download, RefreshCw, X, Search, Check, Trash2,
  ChevronLeft, Edit3, Eye, Sparkles, Monitor, Building2,
  User, Clock, Layers, Printer, QrCode, ShieldAlert,
  Cpu, HardDrive, Thermometer
} from 'lucide-react';

export interface Workstation {
  id: string;
  dbId?: string;
  lab: string;
  status: 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'OUT_OF_ORDER';
  cpu: string;
  ram: string;
  storage: string;
  ping: string;
  activeUser: string;
  ip: string;
  temp: string;
  power: string;
  score: string;
  scheduleDay?: string;
  scheduleTime?: string;
}

export interface DeskScheduleSlot {
  id: string;
  pcId: string;
  lab?: string;
  user: string;
  purpose?: string;
  day: string;
  dateString?: string;
  time?: string;
  status: 'Approved' | 'Pending' | 'Rejected' | 'In Progress';
}

export interface MaintenanceTask {
  id: string;
  dbId?: string;
  title: string;
  lab: string;
  pcRange: string;
  category: 'PREVENTIVE' | 'SOFTWARE' | 'HARDWARE' | 'CLEANING' | 'INSPECTION';
  scheduledDate: string; // YYYY-MM-DD
  cost: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  color: string;
  notes?: string;
}

interface MaintenanceViewProps {
  campusName?: string;
  selectedCampus?: string;
  campusInfo?: any;
  workstations?: Workstation[];
  setWorkstations?: React.Dispatch<React.SetStateAction<Workstation[]>>;
  selectedAssetCard?: Workstation | null;
  setSelectedAssetCard?: (pc: Workstation) => void;
  deskSchedules?: DeskScheduleSlot[];
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  setIsAddAssetOpen?: (open: boolean) => void;
  setIsQrModalOpen?: (open: boolean) => void;
  onDrilldown?: (info: string) => void;
  onTriggerNotification?: (msg: string) => void;
  triggerNotification?: (msg: string) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDayNameFromIso = (isoDate: string): string => {
  const parts = (isoDate || '').split('-').map(Number);
  if (parts.length !== 3 || !parts[0]) return 'Mon';
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return DAY_NAMES[d.getDay()] || 'Mon';
};

const getCategoryBadgeColor = (cat: string): string => {
  const c = (cat || '').toUpperCase();
  if (c === 'HARDWARE') return 'bg-amber-500';
  if (c === 'CLEANING') return 'bg-emerald-500';
  if (c === 'INSPECTION') return 'bg-purple-500';
  if (c === 'SOFTWARE') return 'bg-cyan-500';
  return 'bg-blue-600';
};

const formatPeso = (val: number): string => {
  return '₱' + (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// ============================================================================
// ISOMETRIC DESKTOP WORKSTATION RIG (ANGLED MONITOR + SPINNING RGB TOWER + DESK)
// ============================================================================
const IsometricDesktopRig: React.FC<{
  status: Workstation['status'];
  code: string;
  size?: 'sm' | 'lg';
}> = ({ status, code, size = 'sm' }) => {
  const isMaint = status === 'UNDER_MAINTENANCE';
  const isOut = status === 'OUT_OF_ORDER';
  const neonHex = isMaint ? '#f59e0b' : isOut ? '#ef4444' : '#38bdf8';
  const secondaryHex = isMaint ? '#d97706' : isOut ? '#dc2626' : '#2563eb';
  const screenGradId = `iso-rig-scr-${code}-${size}`;

  return (
    <div className={size === 'lg' ? 'w-28 h-24 shrink-0' : 'w-20 h-16 shrink-0'}>
      <svg viewBox="0 0 140 115" className="w-full h-full drop-shadow-[0_10px_12px_rgba(15,23,42,0.45)]">
        <defs>
          <linearGradient id={screenGradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={neonHex} stopOpacity="0.9" />
            <stop offset="50%" stopColor={secondaryHex} stopOpacity="0.85" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Extruded Isometric Desk Platform */}
        <polygon points="70,106 10,82 70,58 130,82" fill="#1e293b" stroke={neonHex} strokeWidth="1.2" />
        <polygon points="10,82 70,106 70,113 10,89" fill="#0f172a" />
        <polygon points="130,82 70,106 70,113 130,89" fill="#020617" />

        {/* Tempered-Glass System Unit Tower with Spinning RGB Cooling Fans */}
        <g>
          <polygon points="98,20 116,12 130,18 112,26" fill="#334155" stroke="#64748b" strokeWidth="0.8" />
          <polygon points="98,20 112,26 112,74 98,68" fill="#020617" stroke={neonHex} strokeWidth="1.2" />
          <polygon points="112,26 130,18 130,66 112,74" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          <ellipse
            cx="105"
            cy="39"
            rx="4.2"
            ry="6.5"
            fill="none"
            stroke={neonHex}
            strokeWidth="1.5"
            strokeDasharray="3 2"
            className="animate-spin"
            style={{ transformOrigin: '105px 39px', animationDuration: '4s' }}
          />
          <ellipse
            cx="105"
            cy="56"
            rx="4.2"
            ry="6.5"
            fill="none"
            stroke={neonHex}
            strokeWidth="1.5"
            strokeDasharray="3 2"
            className="animate-spin"
            style={{ transformOrigin: '105px 56px', animationDuration: '4s' }}
          />
          <line x1="121" y1="26" x2="121" y2="64" stroke={neonHex} strokeWidth="2" strokeLinecap="round" />
          <circle cx="121" cy="23" r="1.8" fill="#ffffff" />
        </g>

        {/* Angled Widescreen Monitor & Stand */}
        <g>
          <polygon points="52,78 68,72 78,76 62,82" fill="#475569" />
          <polygon points="60,58 66,56 66,76 60,78" fill="#334155" />
          <polygon points="22,22 84,8 88,11 26,25" fill="#475569" />
          <polygon points="84,8 88,11 88,53 84,50" fill="#1e293b" />
          <polygon points="22,22 84,8 84,52 22,66" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
          <polygon points="25,25 81,12 81,49 25,62" fill={`url(#${screenGradId})`} />
          <line x1="30" y1="30" x2="54" y2="24" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="30" y1="36" x2="68" y2="27" stroke="#e2e8f0" strokeWidth="1.6" strokeOpacity="0.8" strokeLinecap="round" />
          <line x1="30" y1="41" x2="60" y2="34" stroke={neonHex} strokeWidth="1.6" strokeLinecap="round" />
          <text
            x="53"
            y="51"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9.5"
            fontWeight="900"
            fontFamily="monospace"
            transform="skewY(-12)"
          >
            {code}
          </text>
        </g>

        {/* Isometric Mechanical Keyboard & Mouse */}
        <polygon points="32,82 74,68 82,73 40,87" fill="#0f172a" stroke={neonHex} strokeWidth="1" />
        <line x1="37" y1="82" x2="73" y2="70" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 2" />
        <ellipse cx="90" cy="74" rx="4.5" ry="3" fill="#0f172a" stroke={neonHex} strokeWidth="1" />
      </svg>
    </div>
  );
};

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  campusName,
  selectedCampus,
  workstations: propWorkstations = [],
  setWorkstations: propSetWorkstations,
  selectedAssetCard: propSelectedAssetCard = null,
  setSelectedAssetCard: propSetSelectedAssetCard,
  deskSchedules = [],
  onDrilldown,
  onTriggerNotification,
  triggerNotification
}) => {
  const activeCampus = selectedCampus || campusName || 'JRMSU Dapitan Main Campus';
  const notify = useCallback(
    (msg: string) => {
      if (onTriggerNotification) onTriggerNotification(msg);
      else if (triggerNotification) triggerNotification(msg);
    },
    [onTriggerNotification, triggerNotification]
  );

  // Unified Calendar State (Default October 2026)
  const [activeMonthDate, setActiveMonthDate] = useState<Date>(new Date(2026, 9, 1));
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-28');

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [wsLabTab, setWsLabTab] = useState<'ALL' | 'ComLab 1' | 'ComLab 2' | 'ComLab 3'>('ALL');
  const [wsStatusFilter, setWsStatusFilter] = useState<'ALL' | 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'OUT_OF_ORDER'>('ALL');
  const [activeBottomTab, setActiveBottomTab] = useState<'BOTH' | 'WORKSTATIONS' | 'MAINTENANCE'>('BOTH');

  // Workstation Assets Seed
  const defaultWorkstationSeed: Workstation[] = useMemo(() => [
    { id: 'PC-01', lab: 'ComLab 1 (ICT)', status: 'OPERATIONAL', cpu: 'Core i7-13700', ram: '32GB DDR5', storage: '1TB NVMe SSD', ping: '1ms', activeUser: 'BSIS-3A Programming', ip: '10.101.0.101', temp: '39°C', power: '110W', score: '98%', scheduleDay: 'Mon', scheduleTime: '08:00 - 10:00 AM' },
    { id: 'PC-02', lab: 'ComLab 1 (ICT)', status: 'OPERATIONAL', cpu: 'Core i7-13700', ram: '32GB DDR5', storage: '1TB NVMe SSD', ping: '1ms', activeUser: 'Available / Ready', ip: '10.101.0.102', temp: '37°C', power: '95W', score: '97%' },
    { id: 'PC-03', lab: 'ComLab 2 (Multimedia)', status: 'OPERATIONAL', cpu: 'Core i7-13700', ram: '32GB DDR5', storage: '1TB NVMe SSD', ping: '2ms', activeUser: 'BSIT-2B Networking', ip: '10.102.0.103', temp: '40°C', power: '118W', score: '96%', scheduleDay: 'Wed', scheduleTime: '10:00 - 12:00 PM' },
    { id: 'PC-04', lab: 'ComLab 2 (Multimedia)', status: 'UNDER_MAINTENANCE', cpu: 'Core i7-13700', ram: '16GB DDR4', storage: '512GB NVMe SSD', ping: '12ms', activeUser: 'Locked (Maintenance)', ip: '10.102.0.104', temp: '46°C', power: '65W', score: '76%' },
    { id: 'PC-05', lab: 'ComLab 3 (Engineering)', status: 'OPERATIONAL', cpu: 'RTX 4080 Node', ram: '64GB DDR5', storage: '2TB NVMe SSD', ping: '1ms', activeUser: 'AI Capstone Group', ip: '10.103.0.105', temp: '42°C', power: '205W', score: '99%', scheduleDay: 'Fri', scheduleTime: '01:00 - 03:00 PM' },
    { id: 'PC-06', lab: 'ComLab 3 (Engineering)', status: 'OPERATIONAL', cpu: 'RTX 4080 Node', ram: '64GB DDR5', storage: '2TB NVMe SSD', ping: '1ms', activeUser: 'Available / Ready', ip: '10.103.0.106', temp: '38°C', power: '115W', score: '98%' }
  ], []);

  const [localWorkstations, setLocalWorkstations] = useState<Workstation[]>(
    propWorkstations.length > 0 ? propWorkstations : defaultWorkstationSeed
  );
  const [selectedPcCard, setSelectedPcCard] = useState<Workstation | null>(
    propSelectedAssetCard || defaultWorkstationSeed[0]
  );

  useEffect(() => {
    if (propWorkstations && propWorkstations.length > 0) {
      setLocalWorkstations(propWorkstations);
    }
  }, [propWorkstations]);

  const updateWorkstationsList = useCallback(
    (updater: Workstation[] | ((prev: Workstation[]) => Workstation[])) => {
      setLocalWorkstations((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (propSetWorkstations) propSetWorkstations(next);
        return next;
      });
    },
    [propSetWorkstations]
  );

  const selectWorkstation = (pc: Workstation) => {
    setSelectedPcCard(pc);
    if (propSetSelectedAssetCard) propSetSelectedAssetCard(pc);
  };

  // Recorded Workstation Reservation Schedules (Synced with the Single Unified Calendar)
  const [localSchedules, setLocalSchedules] = useState<DeskScheduleSlot[]>([
    { id: 'SCH-1001', pcId: 'PC-01', lab: 'ComLab 1 (ICT)', user: 'BSIS-3A Programming', purpose: 'System Integration Lab', day: 'Mon', dateString: '2026-10-26', time: '08:00 - 10:00 AM', status: 'Approved' },
    { id: 'SCH-1002', pcId: 'PC-03', lab: 'ComLab 2 (Multimedia)', user: 'BSIT-2B Networking', purpose: 'Cisco Packet Tracer', day: 'Wed', dateString: '2026-10-28', time: '10:00 - 12:00 PM', status: 'Approved' },
    { id: 'SCH-1003', pcId: 'PC-05', lab: 'ComLab 3 (Engineering)', user: 'AI Capstone Group', purpose: 'Model Training & QA', day: 'Fri', dateString: '2026-10-30', time: '01:00 - 03:00 PM', status: 'In Progress' }
  ]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('labtrack_desk_schedules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalSchedules(parsed);
        }
      } else if (deskSchedules && deskSchedules.length > 0) {
        setLocalSchedules(deskSchedules);
      }
    } catch {}
  }, [deskSchedules]);

  useEffect(() => {
    try {
      if (localSchedules.length > 0) {
        localStorage.setItem('labtrack_desk_schedules', JSON.stringify(localSchedules));
      }
    } catch {}
  }, [localSchedules]);

  // Maintenance Tasks Seed
  const defaultSeedTasks: MaintenanceTask[] = useMemo(() => [
    {
      id: 'MNT-101',
      title: 'Thermal Paste Replacement & Fan Servicing',
      lab: 'ComLab 1 (ICT)',
      pcRange: 'PC-01 to PC-15',
      category: 'HARDWARE',
      scheduledDate: '2026-10-28',
      cost: 3500,
      status: 'IN_PROGRESS',
      color: 'bg-amber-500',
      notes: 'Scheduled thermal check for high-load workstations in ComLab 1.'
    },
    {
      id: 'MNT-102',
      title: 'Windows 11 Security Patch & IDE Image Sync',
      lab: 'ComLab 2 (Multimedia)',
      pcRange: 'PC-01 to PC-35',
      category: 'SOFTWARE',
      scheduledDate: '2026-10-29',
      cost: 1200,
      status: 'PENDING',
      color: 'bg-cyan-500',
      notes: 'Visual Studio 2022, .NET 8 SDK, and Python 3.12 environment verification.'
    },
    {
      id: 'MNT-103',
      title: 'Full Antistatic Dusting & Peripheral Sanitization',
      lab: 'ComLab 3 (Engineering)',
      pcRange: 'PC-01 to PC-30',
      category: 'CLEANING',
      scheduledDate: '2026-10-24',
      cost: 800,
      status: 'COMPLETED',
      color: 'bg-emerald-500',
      notes: 'Completed routine cleaning for AI & Multimedia workstations.'
    }
  ], []);

  const [tasks, setTasks] = useState<MaintenanceTask[]>(defaultSeedTasks);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [inspectingTask, setInspectingTask] = useState<MaintenanceTask | null>(null);
  const [inspectingAsset, setInspectingAsset] = useState<Workstation | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);
  const [isRegisterAssetModalOpen, setIsRegisterAssetModalOpen] = useState(false);
  const [isQrModalOpenLocal, setIsQrModalOpenLocal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Workstation | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  // Form State: New Maintenance Task
  const [newTask, setNewTask] = useState<{
    title: string;
    lab: string;
    category: MaintenanceTask['category'];
    scheduledDate: string;
    cost: number;
    notes: string;
  }>({
    title: '',
    lab: 'ComLab 1 (ICT)',
    category: 'PREVENTIVE',
    scheduledDate: '2026-10-29',
    cost: 1500,
    notes: ''
  });
  const [newTaskPcRange, setNewTaskPcRange] = useState<string>('PC-01 to PC-15');

  // Form State: Add Reservation / Schedule Slot
  const [newSchedPcId, setNewSchedPcId] = useState('PC-01');
  const [newSchedLab, setNewSchedLab] = useState('ComLab 1 (ICT)');
  const [newSchedUser, setNewSchedUser] = useState('');
  const [newSchedPurpose, setNewSchedPurpose] = useState('Laboratory Class Session');
  const [newSchedDay, setNewSchedDay] = useState('Wed');
  const [newSchedTime, setNewSchedTime] = useState('08:00 - 10:00 AM');
  const [newSchedStatus, setNewSchedStatus] = useState<'Approved' | 'Pending' | 'Rejected' | 'In Progress'>('Approved');

  // Form State: Register New Workstation Asset
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newAssetLab, setNewAssetLab] = useState('ComLab 1 (ICT)');
  const [newAssetCpu, setNewAssetCpu] = useState('Core i7-13700');
  const [newAssetRam, setNewAssetRam] = useState('32GB DDR5');
  const [newAssetStorage, setNewAssetStorage] = useState('1TB NVMe SSD');
  const [newAssetIp, setNewAssetIp] = useState('10.101.0.110');

  // Form State: Edit Workstation Asset
  const [editNodeId, setEditNodeId] = useState('');
  const [editLab, setEditLab] = useState('');
  const [editStatus, setEditStatus] = useState<'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'OUT_OF_ORDER'>('OPERATIONAL');
  const [editCpu, setEditCpu] = useState('');
  const [editRam, setEditRam] = useState('');
  const [editStorage, setEditStorage] = useState('');
  const [editActiveUser, setEditActiveUser] = useState('');
  const [editSchedDay, setEditSchedDay] = useState('Mon');
  const [editSchedTime, setEditSchedTime] = useState('08:00 - 10:00 AM');

  // Sync Workstations & Maintenance Records from Backend
  const fetchAllData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const [mntRes, wsRes] = await Promise.allSettled([
        apiClient.get('/api/v1/maintenance/records'),
        apiClient.get('/api/v1/workstations')
      ]);

      if (mntRes.status === 'fulfilled') {
        const data = mntRes.value.data?.data?.items || mntRes.value.data?.data || mntRes.value.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const mappedTasks: MaintenanceTask[] = data.map((raw: any, idx: number) => {
            const rawLab = String(raw.lab || raw.workstationCodes || 'ComLab 1 (ICT)');
            const parts = rawLab.includes('|') ? rawLab.split('|').map((s: string) => s.trim()) : [rawLab, rawLab];
            const cat = String(raw.category || 'PREVENTIVE').toUpperCase() as MaintenanceTask['category'];
            return {
              id: typeof raw.id === 'string' && raw.id.startsWith('MNT-') ? raw.id : `MNT-${101 + idx}`,
              dbId: raw.id,
              title: raw.title || 'Scheduled Maintenance',
              lab: parts[0] || 'ComLab 1 (ICT)',
              pcRange: parts[1] || 'PC-01 to PC-10',
              category: ['PREVENTIVE', 'SOFTWARE', 'HARDWARE', 'CLEANING', 'INSPECTION'].includes(cat) ? cat : 'PREVENTIVE',
              scheduledDate: raw.scheduledDate || '2026-10-28',
              cost: Number(raw.cost) || 0,
              status: raw.status === 'COMPLETED' ? 'COMPLETED' : raw.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING',
              color: getCategoryBadgeColor(cat),
              notes: raw.notes || ''
            };
          });
          setTasks(mappedTasks);
        }
      }

      if (wsRes.status === 'fulfilled') {
        const wsList = wsRes.value.data?.data?.items || wsRes.value.data?.data || [];
        if (Array.isArray(wsList) && wsList.length > 0) {
          const mappedWs: Workstation[] = wsList.map((w: any, idx: number) => {
            const st = String(w.status || '').toUpperCase();
            return {
              id: w.code || w.workstationNumber || `PC-${String(idx + 1).padStart(2, '0')}`,
              dbId: w.id,
              lab: w.laboratoryName || `ComLab ${(idx % 3) + 1}`,
              status: st.includes('MAINT') ? 'UNDER_MAINTENANCE' : st.includes('OUT') ? 'OUT_OF_ORDER' : 'OPERATIONAL',
              cpu: w.cpuModel || 'Core i7-13700',
              ram: w.ramSize || '32GB DDR5',
              storage: w.storageSize || '1TB NVMe SSD',
              ping: '1ms',
              activeUser: st.includes('MAINT') ? 'Locked (Maintenance)' : 'Available / Ready',
              ip: w.ipAddress || `10.101.0.${101 + idx}`,
              temp: `${38 + (idx % 5)}°C`,
              power: '110W',
              score: st.includes('MAINT') ? '76%' : '97%'
            };
          });
          updateWorkstationsList(mappedWs);
        }
      }
    } catch {
    } finally {
      setIsLoadingData(false);
    }
  }, [updateWorkstationsList]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const [pulseActive, setPulseActive] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => setPulseActive(p => !p), 2000);
    return () => clearInterval(interval);
  }, []);

  // Workstation Status Summary
  const wsSummary = useMemo(() => {
    return {
      total: localWorkstations.length,
      operational: localWorkstations.filter(w => w.status === 'OPERATIONAL').length,
      maintenance: localWorkstations.filter(w => w.status === 'UNDER_MAINTENANCE').length,
      outOfOrder: localWorkstations.filter(w => w.status === 'OUT_OF_ORDER').length
    };
  }, [localWorkstations]);

  // Computed Financials & Stats
  const totalCost = useMemo(() => tasks.reduce((sum, t) => sum + (Number(t.cost) || 0), 0), [tasks]);
  const completedCount = useMemo(() => tasks.filter(t => t.status === 'COMPLETED').length, [tasks]);
  const pendingCount = useMemo(() => tasks.filter(t => t.status !== 'COMPLETED').length, [tasks]);
  const hardwareCost = useMemo(() => tasks.filter(t => t.category === 'HARDWARE' || t.category === 'INSPECTION').reduce((s, t) => s + (Number(t.cost) || 0), 0), [tasks]);
  const cleaningCost = useMemo(() => tasks.filter(t => t.category === 'CLEANING').reduce((s, t) => s + (Number(t.cost) || 0), 0), [tasks]);
  const softwareCost = useMemo(() => tasks.filter(t => t.category === 'SOFTWARE' || t.category === 'PREVENTIVE').reduce((s, t) => s + (Number(t.cost) || 0), 0), [tasks]);

  // Single Unified Calendar Days Calculation
  const calendarDays = useMemo(() => {
    const year = activeMonthDate.getFullYear();
    const month = activeMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const daysArray: Array<{ dayNumber: number; dateString: string; dayName: string } | null> = [];
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(null);
    }
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const monthStr = (month + 1).toString().padStart(2, '0');
      const dayStr = day.toString().padStart(2, '0');
      const dateString = `${year}-${monthStr}-${dayStr}`;
      const dayOfWeek = new Date(year, month, day).getDay();
      daysArray.push({
        dayNumber: day,
        dateString,
        dayName: DAY_NAMES[dayOfWeek] || 'Mon'
      });
    }
    return daysArray;
  }, [activeMonthDate]);

  const currentMonthYearHeader = useMemo(() => {
    return activeMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [activeMonthDate]);

  const selectedDayOfWeek = useMemo(() => getDayNameFromIso(selectedDate), [selectedDate]);

  // Unified items for the currently selected date on the Single Calendar
  const selectedDateMaintenanceTasks = useMemo(
    () => tasks.filter(t => t.scheduledDate === selectedDate),
    [tasks, selectedDate]
  );

  const selectedDateReservationSlots = useMemo(
    () =>
      localSchedules.filter(
        s => s.dateString === selectedDate || (!s.dateString && s.day === selectedDayOfWeek)
      ),
    [localSchedules, selectedDate, selectedDayOfWeek]
  );

  // Filtered Lists for Tables
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch =
        !q ||
        (t.title || '').toLowerCase().includes(q) ||
        (t.lab || '').toLowerCase().includes(q) ||
        (t.pcRange || '').toLowerCase().includes(q) ||
        (t.id || '').toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [tasks, searchQuery, categoryFilter, statusFilter]);

  const filteredWorkstations = useMemo(() => {
    return localWorkstations.filter(pc => {
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch =
        !q ||
        (pc.id || '').toLowerCase().includes(q) ||
        (pc.lab || '').toLowerCase().includes(q) ||
        (pc.activeUser || '').toLowerCase().includes(q) ||
        (pc.ip || '').toLowerCase().includes(q);
      const matchesStatus = wsStatusFilter === 'ALL' || pc.status === wsStatusFilter;
      const matchesLab = wsLabTab === 'ALL' || (pc.lab || '').toLowerCase().includes(wsLabTab.toLowerCase());
      return matchesSearch && matchesStatus && matchesLab;
    });
  }, [localWorkstations, searchQuery, wsStatusFilter, wsLabTab]);

  // --- CRUD HANDLERS --- //
  const handleQuickMaintenanceToggle = async (pc: Workstation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus: Workstation['status'] =
      pc.status === 'UNDER_MAINTENANCE' ? 'OPERATIONAL' : 'UNDER_MAINTENANCE';
    const backendStatus = nextStatus === 'UNDER_MAINTENANCE' ? 'UNDER_MAINTENANCE' : 'Available';

    updateWorkstationsList(prev =>
      prev.map(item =>
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

    notify(
      nextStatus === 'UNDER_MAINTENANCE'
        ? `Workstation ${pc.id} (${pc.lab}) placed Under Maintenance.`
        : `Workstation ${pc.id} (${pc.lab}) restored to Operational status.`
    );
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.lab.trim()) {
      notify('Please complete all required maintenance fields.');
      return;
    }

    const tempId = `MNT-${Math.floor(106 + Math.random() * 900)}`;
    const created: MaintenanceTask = {
      id: tempId,
      title: newTask.title.trim(),
      lab: newTask.lab.trim(),
      pcRange: newTaskPcRange.trim() || 'PC-01 to PC-10',
      category: newTask.category,
      scheduledDate: newTask.scheduledDate,
      cost: Number(newTask.cost) || 0,
      status: 'PENDING',
      color: getCategoryBadgeColor(newTask.category),
      notes: newTask.notes
    };

    setTasks(prev => [created, ...prev]);
    setSelectedDate(created.scheduledDate);
    setIsAddModalOpen(false);

    try {
      const res = await apiClient.post('/api/v1/maintenance/records', {
        Title: created.title,
        Lab: `${created.lab} | ${created.pcRange}`,
        Category: created.category,
        Notes: created.notes || '',
        Cost: created.cost,
        ScheduledDate: created.scheduledDate,
        Status: 'PENDING'
      });
      const savedId = res.data?.data?.id;
      if (savedId) {
        setTasks(prev => prev.map(t => (t.id === tempId ? { ...t, dbId: savedId } : t)));
      }
    } catch {}

    setNewTaskPcRange('PC-01 to PC-15');
    setNewTask({
      title: '',
      lab: 'ComLab 1 (ICT)',
      category: 'PREVENTIVE',
      scheduledDate: selectedDate,
      cost: 1500,
      notes: ''
    });
    notify(`Maintenance Task ${created.id} added to the unified calendar.`);
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const updated = {
      ...editingTask,
      color: getCategoryBadgeColor(editingTask.category)
    };
    setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    setEditingTask(null);

    if (updated.dbId) {
      try {
        await apiClient.put(`/api/v1/maintenance/records/${updated.dbId}`, {
          Title: updated.title,
          Lab: `${updated.lab} | ${updated.pcRange}`,
          Category: updated.category,
          Notes: updated.notes || '',
          Cost: updated.cost,
          ScheduledDate: updated.scheduledDate,
          Status: updated.status
        });
      } catch {}
    }
    notify(`Updated Maintenance Task ${updated.id}.`);
  };

  const handleToggleStatus = async (task: MaintenanceTask) => {
    const nextStatus: MaintenanceTask['status'] =
      task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    setTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    if (task.dbId) {
      try {
        await apiClient.put(`/api/v1/maintenance/records/${task.dbId}`, {
          Title: task.title,
          Lab: `${task.lab} | ${task.pcRange}`,
          Category: task.category,
          Notes: task.notes || '',
          Cost: task.cost,
          ScheduledDate: task.scheduledDate,
          Status: nextStatus
        });
      } catch {}
    }

    notify(
      nextStatus === 'COMPLETED'
        ? `Task ${task.id} marked COMPLETED. Workstations (${task.pcRange}) restored to Available.`
        : `Task ${task.id} reopened as PENDING.`
    );
  };

  const handleDeleteTask = async (id: string) => {
    const target = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setDeletingTaskId(null);

    if (target?.dbId) {
      try {
        await apiClient.delete(`/api/v1/maintenance/records/${target.dbId}`);
      } catch {}
    }
    notify(`Maintenance Task ${id} removed.`);
  };

  const handleCreateScheduleSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedPcId.trim() || !newSchedUser.trim()) {
      notify('Please complete Workstation Tag and User/Class Name.');
      return;
    }

    const createdSlot: DeskScheduleSlot = {
      id: `SCH-${Math.floor(1000 + Math.random() * 9000)}`,
      pcId: newSchedPcId.trim().toUpperCase(),
      lab: newSchedLab.trim() || 'ComLab 1 (ICT)',
      user: newSchedUser.trim(),
      purpose: newSchedPurpose.trim() || 'Class Session',
      day: newSchedDay,
      dateString: selectedDate,
      time: (newSchedTime || '08:00 - 10:00 AM').trim(),
      status: newSchedStatus
    };

    setLocalSchedules(prev => [createdSlot, ...prev]);

    updateWorkstationsList(prev =>
      prev.map(pc =>
        pc.id.toUpperCase() === createdSlot.pcId
          ? {
              ...pc,
              activeUser: createdSlot.user,
              scheduleDay: createdSlot.day,
              scheduleTime: createdSlot.time
            }
          : pc
      )
    );

    setIsAddScheduleModalOpen(false);
    setNewSchedPcId('PC-01');
    setNewSchedUser('');
    notify(`Reservation recorded for ${createdSlot.pcId} on ${selectedDate} (${createdSlot.time}).`);
  };

  const handleDeleteScheduleSlot = (slotId: string, pcId: string) => {
    setLocalSchedules(prev => prev.filter(s => s.id !== slotId));
    notify(`Schedule slot ${slotId} for ${pcId} removed.`);
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = (newAssetCode || `PC-${String(localWorkstations.length + 1).padStart(2, '0')}`).trim().toUpperCase();
    const newPc: Workstation = {
      id: code,
      lab: newAssetLab,
      status: 'OPERATIONAL',
      cpu: newAssetCpu,
      ram: newAssetRam,
      storage: newAssetStorage,
      ping: '1ms',
      activeUser: 'Available / Ready',
      ip: newAssetIp,
      temp: '38°C',
      power: '110W',
      score: '98%'
    };
    updateWorkstationsList(prev => [newPc, ...prev]);
    setIsRegisterAssetModalOpen(false);
    setNewAssetCode('');

    try {
      await apiClient.post('/api/v1/workstations', {
        laboratoryName: newAssetLab,
        code,
        name: `Workstation ${code}`,
        status: 'Available',
        ipAddress: newAssetIp,
        osVersion: `${newAssetCpu} / ${newAssetRam}`
      });
    } catch {}

    notify(`Registered new workstation ${code}.`);
  };

  const handleOpenEditModal = (pc: Workstation) => {
    setEditingAsset(pc);
    setEditNodeId(pc.id);
    setEditLab(pc.lab);
    setEditStatus(pc.status);
    setEditCpu(pc.cpu);
    setEditRam(pc.ram);
    setEditStorage(pc.storage || '1TB NVMe SSD');
    setEditActiveUser(pc.activeUser || 'Available / Ready');
    setEditSchedDay(pc.scheduleDay || 'Mon');
    setEditSchedTime(pc.scheduleTime || '08:00 - 10:00 AM');
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    const formattedNodeId = editNodeId.trim().toUpperCase();
    const formattedLab = editLab.trim();

    updateWorkstationsList(prev =>
      prev.map(pc =>
        pc.id === editingAsset.id
          ? {
              ...pc,
              id: formattedNodeId,
              lab: formattedLab,
              status: editStatus,
              cpu: editCpu,
              ram: editRam,
              storage: editStorage,
              activeUser: editActiveUser,
              scheduleDay: editSchedDay,
              scheduleTime: editSchedTime
            }
          : pc
      )
    );

    setLocalSchedules(prev =>
      prev.map(s =>
        s.pcId === editingAsset.id
          ? { ...s, pcId: formattedNodeId, user: editActiveUser, day: editSchedDay, time: editSchedTime }
          : s
      )
    );

    if (editingAsset.dbId) {
      try {
        await apiClient.put(`/api/v1/workstations/${editingAsset.dbId}`, {
          code: formattedNodeId,
          name: `Workstation ${formattedNodeId}`,
          status: editStatus === 'UNDER_MAINTENANCE' ? 'UNDER_MAINTENANCE' : editStatus === 'OUT_OF_ORDER' ? 'Offline' : 'Available',
          osVersion: `${editCpu} / ${editRam}`
        });
      } catch {}
    }

    notify(`Workstation ${formattedNodeId} updated successfully.`);
    setEditingAsset(null);
  };

  const handleDeleteAssetConfirm = async () => {
    if (!deletingAssetId) return;
    const targetPc = localWorkstations.find(pc => pc.id === deletingAssetId);
    updateWorkstationsList(prev => prev.filter(pc => pc.id !== deletingAssetId));
    setLocalSchedules(prev => prev.filter(s => s.pcId !== deletingAssetId));

    if (targetPc?.dbId) {
      try {
        await apiClient.delete(`/api/v1/workstations/${targetPc.dbId}`);
      } catch {}
    }

    notify(`Workstation ${deletingAssetId} removed from inventory.`);
    setDeletingAssetId(null);
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['Task ID', 'Title', 'Laboratory', 'PC Range', 'Category', 'Scheduled Date', 'Cost (PHP)', 'Status', 'Notes'],
      ...tasks.map(t => [t.id, `"${t.title}"`, `"${t.lab}"`, `"${t.pcRange}"`, t.category, t.scheduledDate, t.cost, t.status, `"${t.notes || ''}"`])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JRMSU_Maintenance_Ledger_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Exported Maintenance & Schedule Ledger to CSV.');
  };

  const handlePrevMonth = () => {
    setActiveMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setActiveMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="deck-extruded-shell p-5 sm:p-7 rounded-[2.5rem] space-y-7 animate-in fade-in duration-300 font-sans select-none">
      {/* EXTRUDED DEPTH, TACTILE KEYCAPS & PERSPECTIVE CSS */}
      <style>{`
        .deck-extruded-shell {
          background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
          border: 2px solid #cbd5e1;
          box-shadow:
            0 10px 0 #94a3b8,
            0 22px 45px -10px rgba(15, 23, 42, 0.25),
            inset 0 2px 0 #ffffff;
        }
        .card-extruded-lift {
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;
          transform: translateZ(0);
        }
        .card-extruded-lift:hover {
          transform: translate3d(0, -5px, 0) rotateX(2deg);
        }
        .keycap-tactile {
          box-shadow: 0 4px 0 #cbd5e1, 0 6px 12px rgba(15, 23, 42, 0.08);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .keycap-tactile:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #94a3b8, 0 10px 18px rgba(15, 23, 42, 0.14);
        }
        .keycap-tactile-active {
          box-shadow: 0 5px 0 #1e3a8a, 0 12px 24px rgba(37, 99, 235, 0.4);
          transform: translateY(-3px);
        }
        .vault-obsidian-dark {
          background: linear-gradient(145deg, #0f172a 0%, #020617 100%);
          border: 2px solid #334155;
          box-shadow: 0 8px 0 #020617, 0 18px 35px rgba(2, 6, 23, 0.4);
        }
        .btn-press-bevel {
          box-shadow: 0 4px 0 #1e3a8a, 0 8px 16px rgba(37, 99, 235, 0.28);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn-press-bevel:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #1e3a8a, 0 12px 22px rgba(37, 99, 235, 0.35);
        }
        .btn-press-bevel:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #1e3a8a;
        }
      `}</style>

      {/* DATALISTS */}
      <datalist id="mnt-lab-list">
        <option value="ComLab 1 (ICT)" />
        <option value="ComLab 2 (Multimedia)" />
        <option value="ComLab 3 (Engineering)" />
      </datalist>

      <datalist id="workstation-node-datalist">
        {localWorkstations.map((w) => (
          <option key={w.id} value={w.id}>
            {w.id} • {w.lab} ({w.status})
          </option>
        ))}
        <option value="PC-01 to PC-15" />
        <option value="PC-01 to PC-30" />
      </datalist>

      {/* =====================================================================
          1. OBSIDIAN COMMAND HEADER BANNER
         ===================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white border-2 border-cyan-500/40 shadow-[0_8px_0_#0f172a,0_20px_35px_rgba(2,6,23,0.45)] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 rounded-2xl shadow-[0_5px_0_#78350f,0_0_25px_rgba(245,158,11,0.5)]">
            <Wrench className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Assets, Workstation Desk &amp; Preventive Maintenance
              </h3>
              <span
                className={`px-3 py-0.5 rounded-full text-[10px] font-mono font-black transition-all duration-500 ${
                  pulseActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                }`}
              >
                ● LIVE DB SYNC
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Isometric Workstation Fleet, Unified Servicing &amp; Reservation Calendar, and Budget Vault • {activeCampus}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAllData}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-black text-xs rounded-2xl border border-slate-600 shadow-[0_4px_0_#020617] active:translate-y-0.5 transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>Sync DB</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRegisterAssetModalOpen(true)}
            className="btn-press-bevel px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-2xl transition cursor-pointer flex items-center gap-1.5"
          >
            <Monitor className="w-4 h-4" />
            <span>Register Asset</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewSchedDay(getDayNameFromIso(selectedDate));
              setIsAddScheduleModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs rounded-2xl shadow-[0_5px_0_#064e3b,0_10px_20px_rgba(16,185,129,0.3)] active:translate-y-0.5 transition cursor-pointer flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 stroke-[2.5]" />
            <span>Add Reservation / Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewTask(prev => ({ ...prev, scheduledDate: selectedDate }));
              setIsAddModalOpen(true);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs rounded-2xl shadow-[0_5px_0_#1e3a8a,0_10px_20px_rgba(6,182,212,0.35)] active:translate-y-0.5 transition cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Maintenance Schedule</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. TOP 4 EXTRUDED KPI CUBES
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card-extruded-lift p-5 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white border-2 border-blue-400/50 shadow-[0_8px_0_#1e3a8a,0_16px_30px_rgba(37,99,235,0.28)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-200 block">
              WORKSTATION FLEET
            </span>
            <p className="text-3xl font-black text-white mt-0.5">{wsSummary.total} PCs</p>
            <span className="text-[11px] text-blue-200 font-bold">ComLab 1, 2 &amp; 3</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/15 border border-white/25 shadow-inner">
            <Monitor className="w-6 h-6 text-cyan-300" />
          </div>
        </div>

        <div className="card-extruded-lift p-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white border-2 border-emerald-400/50 shadow-[0_8px_0_#064e3b,0_16px_30px_rgba(16,185,129,0.28)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-200 block">
              OPERATIONAL RIGS
            </span>
            <p className="text-3xl font-black text-white mt-0.5">{wsSummary.operational} Online</p>
            <span className="text-[11px] text-emerald-200 font-bold">Ready for Student QR</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/15 border border-white/25 shadow-inner">
            <CheckCircle2 className="w-6 h-6 text-emerald-300" />
          </div>
        </div>

        <div className="card-extruded-lift p-5 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-800 text-white border-2 border-amber-300/60 shadow-[0_8px_0_#78350f,0_16px_30px_rgba(245,158,11,0.28)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-100 block">
              MAINTENANCE LOCKED
            </span>
            <p className="text-3xl font-black text-white mt-0.5">
              {wsSummary.maintenance} PCs / {pendingCount} Tasks
            </p>
            <span className="text-[11px] text-amber-100 font-bold">Student QR Restricted</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/15 border border-white/25 shadow-inner">
            <Wrench className="w-6 h-6 text-yellow-200" />
          </div>
        </div>

        <div className="card-extruded-lift p-5 rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-700 to-slate-900 text-white border-2 border-purple-400/50 shadow-[0_8px_0_#312e81,0_16px_30px_rgba(124,58,237,0.28)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-purple-200 block">
              ALLOCATED BUDGET
            </span>
            <p className="text-3xl font-black text-white mt-0.5">{formatPeso(totalCost)}</p>
            <span className="text-[11px] text-purple-200 font-bold">{localSchedules.length} Booked Class Slots</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/15 border border-white/25 shadow-inner">
            <Calendar className="w-6 h-6 text-purple-200" />
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. MAIN 3-COLUMN COMMAND MATRIX WITH ONE SINGLE UNIFIED CALENDAR
         ===================================================================== */}
      <div className="bg-slate-100/90 p-5 sm:p-6 rounded-[2rem] border-2 border-slate-300 space-y-5 shadow-inner">
        
        {/* Category Filter Pills & Quick Tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            {['ALL', 'PREVENTIVE', 'SOFTWARE', 'HARDWARE', 'CLEANING', 'INSPECTION'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white shadow-[0_4px_0_#1e3a8a] -translate-y-0.5'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-[0_3px_0_#cbd5e1]'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsQrModalOpenLocal(true)}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 border-2 border-slate-300 shadow-[0_4px_0_#94a3b8] active:translate-y-0.5"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print QR Tags</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-[0_4px_0_#020617] active:translate-y-0.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Log (CSV)</span>
            </button>
          </div>
        </div>

        {/* 3 COLUMNS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT COLUMN (4 COLS): ISOMETRIC WORKSTATION BAY + SERVICING QUEUE */}
          <div className="lg:col-span-4 space-y-5 flex flex-col justify-between">
            
            {/* Featured Isometric Workstation Nodes */}
            <div className="bg-white p-4.5 rounded-3xl border-2 border-slate-300 shadow-[0_7px_0_#cbd5e1] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Featured Workstation Bay</span>
                </span>
                <span className="text-[10px] font-mono font-black bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
                  {localWorkstations.length} Rigs
                </span>
              </div>

              <div className="space-y-3">
                {localWorkstations.slice(0, 3).map((pc) => {
                  const isSelected = selectedPcCard?.id === pc.id;
                  const isMaint = pc.status === 'UNDER_MAINTENANCE';
                  return (
                    <div
                      key={pc.id}
                      onClick={() => selectWorkstation(pc)}
                      className={`card-extruded-lift p-3.5 rounded-2xl border-2 cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-cyan-400 shadow-[0_6px_0_#0284c7]'
                          : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700 shadow-[0_5px_0_#0f172a] hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <IsometricDesktopRig status={pc.status} code={pc.id} />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-mono font-black text-white text-sm">{pc.id}</h4>
                            <span className="text-[9px] text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-400/40 font-mono font-bold truncate">
                              {pc.lab}
                            </span>
                          </div>
                          <div className="w-28 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-700">
                            <div
                              className={`h-full rounded-full ${
                                isMaint ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                              }`}
                              style={{ width: pc.score || '95%' }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-300 block truncate font-mono">
                            {pc.cpu} • {pc.ip}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleQuickMaintenanceToggle(pc, e)}
                          className={`px-2.5 py-1 rounded-xl font-mono font-black text-[9px] border cursor-pointer shadow-[0_2px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 ${
                            isMaint
                              ? 'bg-amber-500 text-slate-950 border-amber-300'
                              : 'bg-emerald-500 text-slate-950 border-emerald-300'
                          }`}
                        >
                          {isMaint ? 'MAINT LOCK' : 'ONLINE'}
                        </button>
                        <span className="text-[9px] font-mono font-bold text-cyan-300 flex items-center gap-0.5">
                          <Thermometer className="w-3 h-3 text-cyan-400" /> {pc.temp || '40°C'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scheduled Servicing Queue */}
            <div className="bg-white p-4.5 rounded-3xl border-2 border-slate-300 shadow-[0_7px_0_#cbd5e1] space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                    Scheduled Servicing Queue
                  </span>
                  <span className="text-[10px] font-mono font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                    {filteredTasks.length} Tasks
                  </span>
                </div>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => {
                      const isSel = selectedDate === task.scheduledDate;
                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedDate(task.scheduledDate)}
                          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer space-y-1 ${
                            isSel
                              ? 'bg-gradient-to-r from-slate-900 to-blue-950 text-white border-cyan-400 shadow-[0_4px_0_#0284c7]'
                              : 'bg-slate-50 text-slate-800 border-slate-300 shadow-[0_3px_0_#cbd5e1] hover:border-blue-400'
                          }`}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <span className="flex items-center gap-2 font-black text-xs min-w-0">
                              <span className={`w-2 h-2 rounded-full ${task.color} shrink-0`} />
                              <span className="truncate">{task.title}</span>
                            </span>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-black shrink-0">
                              {task.id}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className={`font-bold truncate ${isSel ? 'text-cyan-300' : 'text-blue-700'}`}>
                              {task.lab} ({task.pcRange})
                            </span>
                            <span className={`font-mono font-black shrink-0 ${isSel ? 'text-emerald-300' : 'text-slate-900'}`}>
                              {formatPeso(task.cost)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs font-bold">
                      No maintenance tasks found.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* CENTER COLUMN (5 COLS): THE SINGLE UNIFIED TACTILE KEYCAP CALENDAR */}
          <div className="lg:col-span-5 bg-white p-5 rounded-3xl border-2 border-slate-300 shadow-[0_7px_0_#cbd5e1] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono font-black text-blue-600 uppercase tracking-wider block">
                    Single Unified Servicing &amp; Reservation Calendar
                  </span>
                  <h4 className="text-lg font-black text-slate-900">{currentMonthYearHeader}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 shadow-[0_3px_0_#94a3b8] active:translate-y-0.5 cursor-pointer transition"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-800" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 shadow-[0_3px_0_#94a3b8] active:translate-y-0.5 cursor-pointer transition"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-800" />
                  </button>
                </div>
              </div>

              {/* Dual-Indicator Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono font-black bg-slate-900 text-white px-3.5 py-2 rounded-2xl border border-slate-700 shadow-inner">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse inline-block" />
                  MAINTENANCE TASK
                </span>
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  WORKSTATION RESERVATION
                </span>
              </div>

              {/* TACTILE KEYCAP MONTH DAYS GRID */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-black pt-1">
                {DAY_NAMES.map((day, i) => (
                  <span key={i} className="text-[10px] font-mono text-slate-500 py-1 uppercase">{day}</span>
                ))}

                {calendarDays.map((item, idx) => {
                  if (!item) {
                    return <div key={`empty-${idx}`} className="py-2.5" />;
                  }

                  const { dayNumber, dateString, dayName } = item;
                  const dayMaintTasks = tasks.filter(t => t.scheduledDate === dateString);
                  const dayReservations = localSchedules.filter(
                    s => s.dateString === dateString || (!s.dateString && s.day === dayName)
                  );
                  const hasMaint = dayMaintTasks.length > 0;
                  const hasRes = dayReservations.length > 0;
                  const isSelected = selectedDate === dateString;

                  return (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() => setSelectedDate(dateString)}
                      className={`py-2.5 rounded-2xl text-xs font-mono font-black cursor-pointer relative flex flex-col items-center justify-center border ${
                        isSelected
                          ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white border-blue-400 keycap-tactile-active z-10'
                          : hasMaint && hasRes
                          ? 'bg-gradient-to-b from-amber-50 to-emerald-50 text-slate-900 border-blue-300 keycap-tactile'
                          : hasMaint
                          ? 'bg-amber-50 text-amber-900 border-amber-300 keycap-tactile'
                          : hasRes
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300 keycap-tactile'
                          : 'bg-slate-50 text-slate-800 border-slate-200 keycap-tactile'
                      }`}
                    >
                      <span>{dayNumber}</span>
                      <div className="flex items-center gap-1 absolute bottom-1">
                        {hasMaint && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-rose-500'}`} />
                        )}
                        {hasRes && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-200' : 'bg-emerald-500'}`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* UNIFIED DAILY AGENDA WELL (SHOWS BOTH MAINTENANCE & RESERVATIONS FOR SELECTED DATE) */}
            <div className="bg-slate-950 text-white p-4 rounded-2xl border-2 border-slate-800 shadow-inner space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-800 pb-2">
                <span className="font-black text-cyan-300">
                  AGENDA // {selectedDate} ({selectedDayOfWeek.toUpperCase()})
                </span>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {selectedDateMaintenanceTasks.length} Maint
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {selectedDateReservationSlots.length} Booked
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedDateMaintenanceTasks.map(m => (
                  <div
                    key={m.id}
                    onClick={() => setInspectingTask(m)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-rose-500/40 hover:border-rose-400 flex items-center justify-between gap-2 text-[11px] cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-mono font-black text-[9px] shrink-0">
                        {m.id}
                      </span>
                      <span className="font-bold text-white truncate">{m.title}</span>
                      <span className="text-[10px] font-mono text-amber-300 shrink-0">({m.pcRange})</span>
                    </div>
                    <span className="text-[9px] font-mono font-black text-cyan-300 shrink-0">{m.status}</span>
                  </div>
                ))}

                {selectedDateReservationSlots.map(slot => (
                  <div
                    key={slot.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between gap-2 text-[11px] group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono font-black text-[9px] shrink-0">
                        {slot.pcId}
                      </span>
                      <span className="font-bold text-white truncate">{slot.user}</span>
                      <span className="text-[10px] font-mono text-cyan-300 shrink-0">{slot.time}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteScheduleSlot(slot.id, slot.pcId)}
                      className="text-slate-400 hover:text-rose-400 cursor-pointer shrink-0"
                      title="Delete Reservation Slot"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {selectedDateMaintenanceTasks.length === 0 && selectedDateReservationSlots.length === 0 && (
                  <div className="text-center py-4 text-[11px] font-mono text-slate-500">
                    No maintenance tasks or workstation reservations on {selectedDate}.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (3 COLS): OBSIDIAN FUND BUDGET & FLEET VAULT */}
          <div className="lg:col-span-3 vault-obsidian-dark text-white p-5 rounded-3xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest">
                  Fund Budget &amp; Fleet Vault
                </span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 rounded-2xl border border-cyan-500/40 space-y-1.5 shadow-inner">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Total Allocated Cost
                </span>
                <p className="text-2xl font-black text-emerald-400 font-mono">{formatPeso(totalCost)}</p>
                <div className="flex justify-between text-[10px] font-mono text-slate-300 pt-1">
                  <span className="text-emerald-300 font-bold">{completedCount} Completed</span>
                  <span className="text-amber-300 font-bold">{pendingCount} Active</span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs font-mono font-bold">
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Hardware &amp; Parts</span>
                    <span className="text-rose-400 font-black">{formatPeso(hardwareCost)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full w-3/4" />
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Routine Cleaning</span>
                    <span className="text-emerald-400 font-black">{formatPeso(cleaningCost)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full w-1/2" />
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Software &amp; Preventive</span>
                    <span className="text-cyan-400 font-black">{formatPeso(softwareCost)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-300 rounded-full w-2/3" />
                  </div>
                </div>

                <div className="p-3 bg-emerald-950/50 rounded-2xl border border-emerald-500/30 flex justify-between items-center">
                  <span className="text-emerald-200">Booked Class Slots</span>
                  <span className="text-emerald-300 font-black">{localSchedules.length} Slots</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => notify('Maintenance & reservation ledger verified and logged to system audit trail.')}
              className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs rounded-2xl shadow-[0_4px_0_#1e3a8a] active:translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Log Confirmation</span>
            </button>
          </div>

        </div>
      </div>

      {/* =====================================================================
          4. UNIFIED TABLE SWITCHER & SEARCH BAR
         ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveBottomTab('BOTH')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeBottomTab === 'BOTH'
                ? 'bg-slate-900 text-cyan-300 shadow-[0_4px_0_#0284c7] -translate-y-0.5'
                : 'bg-white text-slate-700 border border-slate-300 shadow-[0_3px_0_#cbd5e1]'
            }`}
          >
            All Tables (Unified)
          </button>
          <button
            type="button"
            onClick={() => setActiveBottomTab('WORKSTATIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeBottomTab === 'WORKSTATIONS'
                ? 'bg-slate-900 text-cyan-300 shadow-[0_4px_0_#0284c7] -translate-y-0.5'
                : 'bg-white text-slate-700 border border-slate-300 shadow-[0_3px_0_#cbd5e1]'
            }`}
          >
            Workstation Inventory ({localWorkstations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveBottomTab('MAINTENANCE')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeBottomTab === 'MAINTENANCE'
                ? 'bg-slate-900 text-cyan-300 shadow-[0_4px_0_#0284c7] -translate-y-0.5'
                : 'bg-white text-slate-700 border border-slate-300 shadow-[0_3px_0_#cbd5e1]'
            }`}
          >
            Maintenance Work Orders ({tasks.length})
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border-2 border-slate-300 shadow-inner w-full md:w-80 focus-within:border-blue-600">
          <Search className="w-4 h-4 text-blue-600 shrink-0" />
          <input
            type="text"
            placeholder="Search PC, Task, ComLab, IP, or User..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs font-bold outline-none w-full text-slate-900 placeholder-slate-400"
          />
        </div>
      </div>

      {/* =====================================================================
          5. TABLE 1: WORKSTATION ASSETS & SCHEDULE INVENTORY TABLE
         ===================================================================== */}
      {(activeBottomTab === 'BOTH' || activeBottomTab === 'WORKSTATIONS') && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-300 shadow-[0_7px_0_#cbd5e1] space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-mono font-black text-blue-600 uppercase">Assets &amp; Workstation Desk</span>
              <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-600" />
                <span>Workstation Inventory, Telemetry &amp; Assigned Schedule Slots</span>
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(['ALL', 'ComLab 1', 'ComLab 2', 'ComLab 3'] as const).map((labTab) => (
                <button
                  key={labTab}
                  type="button"
                  onClick={() => setWsLabTab(labTab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    wsLabTab === labTab
                      ? 'bg-blue-600 text-white shadow-[0_3px_0_#1e3a8a]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {labTab === 'ALL' ? 'All Labs' : labTab}
                </button>
              ))}

              <select
                value={wsStatusFilter}
                onChange={(e: any) => setWsStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs font-black text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Status ({wsSummary.total})</option>
                <option value="OPERATIONAL">Operational ({wsSummary.operational})</option>
                <option value="UNDER_MAINTENANCE">Maintenance ({wsSummary.maintenance})</option>
                <option value="OUT_OF_ORDER">Out of Order ({wsSummary.outOfOrder})</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border-2 border-slate-200">
            <table className="w-full text-left text-xs font-semibold">
              <thead className="bg-slate-900 text-cyan-300 font-mono font-black uppercase tracking-wider text-[10px] border-b-2 border-slate-800">
                <tr>
                  <th className="p-4">ASSET TAG / NODE</th>
                  <th className="p-4">ASSIGNED LAB</th>
                  <th className="p-4">VLAN IP ADDRESS</th>
                  <th className="p-4">SPECS (CPU / RAM)</th>
                  <th className="p-4">STATUS (1-CLICK TOGGLE)</th>
                  <th className="p-4">ACTIVE USER</th>
                  <th className="p-4">SCHEDULE SLOT</th>
                  <th className="p-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredWorkstations.length > 0 ? (
                  filteredWorkstations.map(pc => {
                    const matchedSched = localSchedules.find(s => s.pcId.toUpperCase() === pc.id.toUpperCase());
                    return (
                      <tr
                        key={pc.id}
                        className={`hover:bg-blue-50/60 transition cursor-pointer ${
                          selectedPcCard?.id === pc.id ? 'bg-blue-50/90' : ''
                        }`}
                        onClick={() => selectWorkstation(pc)}
                      >
                        <td className="p-3.5 font-mono font-black text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-xl bg-slate-900 text-cyan-400 shadow-[0_3px_0_#1e3a8a]">
                              <QrCode className="w-4 h-4" />
                            </div>
                            <span>{pc.id}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-extrabold text-blue-900">{pc.lab}</td>
                        <td className="p-3.5 font-mono text-slate-600">{pc.ip}</td>
                        <td className="p-3.5 text-slate-700">{pc.cpu} / {pc.ram}</td>
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleQuickMaintenanceToggle(pc, e)}
                            className={`px-3 py-1 rounded-xl font-mono font-black text-[10px] border cursor-pointer transition shadow-[0_2px_0_rgba(0,0,0,0.18)] active:translate-y-0.5 ${
                              pc.status === 'OPERATIONAL'
                                ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                                : pc.status === 'UNDER_MAINTENANCE'
                                ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                                : 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                            }`}
                          >
                            {pc.status === 'OPERATIONAL'
                              ? 'OPERATIONAL'
                              : pc.status === 'UNDER_MAINTENANCE'
                              ? 'UNDER MAINTENANCE'
                              : 'OUT OF ORDER'}
                          </button>
                        </td>
                        <td className="p-3.5 text-slate-800 font-bold">{pc.activeUser || 'None'}</td>
                        <td className="p-3.5">
                          {matchedSched || pc.scheduleDay ? (
                            <span className="text-blue-900 bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-xl font-mono font-black text-[10px] inline-block shadow-2xs">
                              {matchedSched?.day || pc.scheduleDay} • {matchedSched?.time || pc.scheduleTime || '08:00 - 10:00 AM'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Unscheduled</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                if (onDrilldown) {
                                  onDrilldown(`Workstation ${pc.id} (${pc.lab}): Health ${pc.score || '96%'} | IP: ${pc.ip} | CPU: ${pc.cpu} | RAM: ${pc.ram}`);
                                } else {
                                  setInspectingAsset(pc);
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[11px] shadow-[0_2px_0_#1e3a8a] transition cursor-pointer"
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(pc)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition cursor-pointer"
                              title="Edit Workstation & Schedule"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingAssetId(pc.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl border border-rose-200 transition cursor-pointer"
                              title="Delete Asset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      No workstations found matching your search or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. TABLE 2: SCHEDULED MAINTENANCE WORK ORDERS LEDGER TABLE
         ===================================================================== */}
      {(activeBottomTab === 'BOTH' || activeBottomTab === 'MAINTENANCE') && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-300 shadow-[0_7px_0_#cbd5e1] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-mono font-black text-blue-600 uppercase">Work Orders Ledger</span>
              <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>Scheduled Work Orders &amp; Workstation Lock Status</span>
              </h4>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs font-black text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border-2 border-slate-200">
            <table className="w-full text-left text-xs font-semibold">
              <thead className="bg-slate-900 font-mono font-black uppercase text-[10px] text-cyan-300 border-b-2 border-slate-800">
                <tr>
                  <th className="p-4">Task ID</th>
                  <th className="p-4">Title &amp; Category</th>
                  <th className="p-4">Laboratory</th>
                  <th className="p-4">PC Range / Workstations</th>
                  <th className="p-4">Scheduled Date</th>
                  <th className="p-4 text-right">Cost (PHP)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map(t => (
                    <tr key={t.id} className="hover:bg-blue-50/50 transition">
                      <td className="p-3.5 font-mono font-black text-blue-700">{t.id}</td>
                      <td className="p-3.5">
                        <div className="font-black text-slate-900">{t.title}</div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">{t.category}</span>
                      </td>
                      <td className="p-3.5 font-extrabold text-slate-900">{t.lab}</td>
                      <td className="p-3.5 font-mono text-xs font-black text-blue-700">{t.pcRange}</td>
                      <td className="p-3.5 font-mono text-slate-600 font-bold">{t.scheduledDate}</td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900">{formatPeso(t.cost)}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-3 py-1 rounded-xl font-mono text-[10px] font-black border shadow-[0_2px_0_rgba(0,0,0,0.15)] inline-block ${
                            t.status === 'COMPLETED'
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-blue-600 text-white border-blue-700'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectingTask(t)}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white rounded-xl border border-slate-300 transition cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTask(t)}
                            className="p-1.5 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white rounded-xl border border-slate-300 transition cursor-pointer"
                            title="Edit Task"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(t)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl border border-emerald-200 transition cursor-pointer"
                            title="Toggle Completion Status"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTaskId(t.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl border border-rose-200 transition cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No maintenance schedules found matching your current filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          EXTRUDED MODALS
         ===================================================================== */}

      {/* MODAL 1: ADD RESERVATION / SCHEDULE SLOT */}
      {isAddScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-[0_12px_0_#064e3b,0_25px_50px_rgba(0,0,0,0.5)] max-w-md w-full space-y-5 border-2 border-emerald-400">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>Add Reservation / Schedule Slot ({selectedDate})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddScheduleModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateScheduleSlot} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 flex items-center gap-1">
                    <Monitor className="w-3.5 h-3.5 text-blue-600" /> Workstation Node Tag
                  </label>
                  <input
                    type="text"
                    list="workstation-node-datalist"
                    value={newSchedPcId}
                    onChange={(e) => setNewSchedPcId(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 font-mono font-black outline-none focus:border-emerald-600"
                    placeholder="e.g. PC-01"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Assigned Laboratory
                  </label>
                  <input
                    type="text"
                    list="mnt-lab-list"
                    value={newSchedLab}
                    onChange={(e) => setNewSchedLab(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 font-bold outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600" /> User / Class / Reservation Name
                </label>
                <input
                  type="text"
                  value={newSchedUser}
                  onChange={(e) => setNewSchedUser(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-emerald-600"
                  placeholder="e.g. BSIS-3A Lab Class"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" /> Course / Activity Purpose
                </label>
                <input
                  type="text"
                  value={newSchedPurpose}
                  onChange={(e) => setNewSchedPurpose(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-emerald-600"
                  placeholder="e.g. Laboratory Class Session"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Day of Week</label>
                  <select
                    value={newSchedDay}
                    onChange={(e) => setNewSchedDay(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="Mon">Monday</option>
                    <option value="Tue">Tuesday</option>
                    <option value="Wed">Wednesday</option>
                    <option value="Thu">Thursday</option>
                    <option value="Fri">Friday</option>
                    <option value="Sat">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Time Slot
                  </label>
                  <input
                    type="text"
                    list="sched-time-datalist"
                    value={newSchedTime}
                    onChange={(e) => setNewSchedTime(e.target.value)}
                    placeholder="e.g. 08:00 - 10:00 AM"
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-emerald-600"
                    required
                  />
                  <datalist id="sched-time-datalist">
                    <option value="08:00 - 10:00 AM" />
                    <option value="10:00 - 12:00 PM" />
                    <option value="01:00 - 03:00 PM" />
                    <option value="03:00 - 05:00 PM" />
                    <option value="05:00 - 07:00 PM" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block mb-1">Slot Status</label>
                <select
                  value={newSchedStatus}
                  onChange={(e: any) => setNewSchedStatus(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddScheduleModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-[0_4px_0_#064e3b] cursor-pointer"
                >
                  Record Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD MAINTENANCE TASK */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-[0_12px_0_#1e3a8a,0_25px_50px_rgba(0,0,0,0.5)] space-y-4 border-2 border-blue-400">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Add Maintenance Schedule Task</span>
              </h4>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Lab Location</label>
                  <input
                    type="text"
                    list="mnt-lab-list"
                    placeholder="e.g. ComLab 1 (ICT)"
                    value={newTask.lab}
                    onChange={(e) => setNewTask({ ...newTask, lab: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1">PC Range / Workstations</label>
                  <input
                    type="text"
                    list="workstation-node-datalist"
                    value={newTaskPcRange}
                    onChange={(e) => setNewTaskPcRange(e.target.value)}
                    placeholder="e.g. PC-01 to PC-15"
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Task Title / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Deep Cleaning & Thermal Paste Replacement"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block mb-1">Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => {
                      const cat = e.target.value as MaintenanceTask['category'];
                      setNewTask({ ...newTask, category: cat, cost: cat === 'CLEANING' ? 0 : newTask.cost });
                    }}
                    className="w-full px-2.5 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="PREVENTIVE">PREVENTIVE</option>
                    <option value="CLEANING">CLEANING</option>
                    <option value="HARDWARE">HARDWARE</option>
                    <option value="SOFTWARE">SOFTWARE</option>
                    <option value="INSPECTION">INSPECTION</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={newTask.scheduledDate}
                    onChange={(e) => setNewTask({ ...newTask, scheduledDate: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1">Cost (₱)</label>
                  <input
                    type="number"
                    value={newTask.cost}
                    onChange={(e) => setNewTask({ ...newTask, cost: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Additional Notes</label>
                <textarea
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  placeholder="Optional details or servicing instructions..."
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 font-normal h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-[0_4px_0_#1e3a8a] transition cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT MAINTENANCE TASK */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-[0_12px_0_#1e3a8a,0_25px_50px_rgba(0,0,0,0.5)] space-y-4 border-2 border-blue-400">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Task ({editingTask.id})</span>
              </h4>
              <button type="button" onClick={() => setEditingTask(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTask} className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Task Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Lab Location</label>
                  <input
                    type="text"
                    list="mnt-lab-list"
                    value={editingTask.lab}
                    onChange={(e) => setEditingTask({ ...editingTask, lab: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1">PC Range</label>
                  <input
                    type="text"
                    value={editingTask.pcRange}
                    onChange={(e) => setEditingTask({ ...editingTask, pcRange: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Category</label>
                  <select
                    value={editingTask.category}
                    onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="PREVENTIVE">PREVENTIVE</option>
                    <option value="CLEANING">CLEANING</option>
                    <option value="HARDWARE">HARDWARE</option>
                    <option value="SOFTWARE">SOFTWARE</option>
                    <option value="INSPECTION">INSPECTION</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={editingTask.scheduledDate}
                    onChange={(e) => setEditingTask({ ...editingTask, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1">Cost (₱)</label>
                  <input
                    type="number"
                    value={editingTask.cost}
                    onChange={(e) => setEditingTask({ ...editingTask, cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-[0_4px_0_#1e3a8a] cursor-pointer"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: INSPECT TASK OR WORKSTATION DETAILS */}
      {(inspectingTask || inspectingAsset) && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-[0_12px_0_#1e3a8a,0_25px_50px_rgba(0,0,0,0.5)] border-2 border-blue-400 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>
                  {inspectingTask ? `Task Details (${inspectingTask.id})` : `Workstation Details (${inspectingAsset?.id})`}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setInspectingTask(null);
                  setInspectingAsset(null);
                }}
                className="cursor-pointer text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectingTask ? (
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 text-xs space-y-2.5">
                <div className="flex justify-between border-b border-slate-200/70 pb-1.5">
                  <span className="text-slate-400">Task Name:</span>
                  <strong className="text-slate-900 text-right">{inspectingTask.title}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/70 pb-1.5">
                  <span className="text-slate-400">Facility:</span>
                  <strong className="text-blue-600">{inspectingTask.lab}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/70 pb-1.5">
                  <span className="text-slate-400">PC Range:</span>
                  <strong className="text-slate-800 font-mono">{inspectingTask.pcRange}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/70 pb-1.5">
                  <span className="text-slate-400">Category:</span>
                  <strong className="text-slate-800">{inspectingTask.category}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/70 pb-1.5">
                  <span className="text-slate-400">Cost:</span>
                  <strong className="text-emerald-600">{formatPeso(inspectingTask.cost)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <strong className="text-amber-600">{inspectingTask.status}</strong>
                </div>
              </div>
            ) : inspectingAsset ? (
              <div className="space-y-3">
                <div className="bg-slate-900 p-3 rounded-2xl flex items-center justify-center">
                  <IsometricDesktopRig status={inspectingAsset.status} code={inspectingAsset.id} size="lg" />
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-200/70 pb-1">
                    <span className="text-slate-400">Node Code:</span>
                    <strong className="text-slate-900 font-mono">{inspectingAsset.id}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/70 pb-1">
                    <span className="text-slate-400">Laboratory:</span>
                    <strong className="text-blue-600">{inspectingAsset.lab}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/70 pb-1">
                    <span className="text-slate-400">VLAN IP:</span>
                    <strong className="text-slate-800 font-mono">{inspectingAsset.ip}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hardware:</span>
                    <strong className="text-slate-800">{inspectingAsset.cpu} / {inspectingAsset.ram}</strong>
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setInspectingTask(null);
                setInspectingAsset(null);
              }}
              className="w-full bg-slate-900 text-white font-black py-2.5 rounded-2xl text-xs shadow-[0_4px_0_#020617] cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE MAINTENANCE TASK CONFIRMATION */}
      {deletingTaskId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-[0_10px_0_#9f1239,0_25px_50px_rgba(0,0,0,0.5)] border-2 border-rose-400">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-base">Delete Maintenance Task?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete maintenance order <strong className="text-slate-900">{deletingTaskId}</strong>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTaskId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTask(deletingTaskId)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl shadow-[0_4px_0_#881337] cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: REGISTER NEW WORKSTATION ASSET */}
      {isRegisterAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-[0_12px_0_#1e3a8a,0_25px_50px_rgba(0,0,0,0.5)] max-w-md w-full space-y-4 border-2 border-blue-400">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                <span>Register New Workstation Asset</span>
              </h3>
              <button type="button" onClick={() => setIsRegisterAssetModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-xl cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRegisterAsset} className="space-y-3.5 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Workstation Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. PC-07"
                    value={newAssetCode}
                    onChange={(e) => setNewAssetCode(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl font-mono font-black text-slate-900 outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Laboratory</label>
                  <input
                    type="text"
                    list="mnt-lab-list"
                    value={newAssetLab}
                    onChange={(e) => setNewAssetLab(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">CPU Spec</label>
                  <input
                    type="text"
                    value={newAssetCpu}
                    onChange={(e) => setNewAssetCpu(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">RAM Capacity</label>
                  <input
                    type="text"
                    value={newAssetRam}
                    onChange={(e) => setNewAssetRam(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Storage Drive</label>
                  <input
                    type="text"
                    value={newAssetStorage}
                    onChange={(e) => setNewAssetStorage(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">IP Address</label>
                  <input
                    type="text"
                    value={newAssetIp}
                    onChange={(e) => setNewAssetIp(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl font-mono text-slate-900 outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterAssetModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-press-bevel w-1/2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl cursor-pointer"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: EDIT WORKSTATION & SCHEDULE */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-[0_12px_0_#1e3a8a,0_25px_50px_rgba(0,0,0,0.5)] max-w-md w-full space-y-5 border-2 border-blue-400">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <span>Edit Workstation &amp; Schedule</span>
              </h3>
              <button type="button" onClick={() => setEditingAsset(null)} className="p-1 hover:bg-slate-100 rounded-xl cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleUpdateAsset} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Workstation Node Tag</label>
                  <input
                    type="text"
                    value={editNodeId}
                    onChange={(e) => setEditNodeId(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl font-mono font-black text-slate-900 outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Assigned Laboratory</label>
                  <input
                    type="text"
                    list="mnt-lab-list"
                    value={editLab}
                    onChange={(e) => setEditLab(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 font-bold outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Active User / Assigned Class</label>
                <input
                  type="text"
                  value={editActiveUser}
                  onChange={(e) => setEditActiveUser(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Schedule Day</label>
                  <select
                    value={editSchedDay}
                    onChange={(e) => setEditSchedDay(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="Mon">Monday</option>
                    <option value="Tue">Tuesday</option>
                    <option value="Wed">Wednesday</option>
                    <option value="Thu">Thursday</option>
                    <option value="Fri">Friday</option>
                    <option value="Sat">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Schedule Time Slot</label>
                  <select
                    value={editSchedTime}
                    onChange={(e) => setEditSchedTime(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="08:00 - 10:00 AM">08:00 - 10:00 AM</option>
                    <option value="10:00 - 12:00 PM">10:00 - 12:00 PM</option>
                    <option value="01:00 - 03:00 PM">01:00 - 03:00 PM</option>
                    <option value="03:00 - 05:00 PM">03:00 - 05:00 PM</option>
                    <option value="05:00 - 07:00 PM">05:00 - 07:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Operational Status</label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 p-2.5 rounded-xl text-slate-900 font-bold outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="OPERATIONAL">OPERATIONAL</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                  <option value="OUT_OF_ORDER">OUT_OF_ORDER</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 mb-1">CPU</label>
                  <input
                    type="text"
                    value={editCpu}
                    onChange={(e) => setEditCpu(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2 rounded-xl text-slate-900 outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">RAM</label>
                  <input
                    type="text"
                    value={editRam}
                    onChange={(e) => setEditRam(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2 rounded-xl text-slate-900 outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Storage</label>
                  <input
                    type="text"
                    value={editStorage}
                    onChange={(e) => setEditStorage(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 p-2 rounded-xl text-slate-900 outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-press-bevel w-1/2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: CONFIRM DELETE WORKSTATION ASSET */}
      {deletingAssetId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-3xl shadow-[0_10px_0_#9f1239,0_25px_50px_rgba(0,0,0,0.5)] max-w-sm w-full space-y-4 text-center border-2 border-rose-400">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Delete Workstation Node {deletingAssetId}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                This action will remove {deletingAssetId} from active inventory.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAssetId(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAssetConfirm}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-xs shadow-[0_4px_0_#881337] cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: PRINT QR TAGS */}
      {isQrModalOpenLocal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-[0_12px_0_#1e3a8a,0_25px_50px_rgba(0,0,0,0.5)] border-2 border-blue-400">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                <span>Workstation QR Code Tags ({localWorkstations.length} Units)</span>
              </h4>
              <button type="button" onClick={() => setIsQrModalOpenLocal(false)} className="p-1 hover:bg-slate-100 rounded-xl cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
              {localWorkstations.map((pc) => (
                <div key={pc.id} className="p-3 rounded-2xl border-2 border-slate-200 text-center space-y-1 bg-slate-50 shadow-[0_3px_0_#cbd5e1]">
                  <QrCode className="w-10 h-10 text-slate-900 mx-auto" />
                  <p className="text-xs font-mono font-black text-blue-700">{pc.id}</p>
                  <p className="text-[10px] font-bold text-slate-500">{pc.lab}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsQrModalOpenLocal(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setIsQrModalOpenLocal(false);
                }}
                className="btn-press-bevel w-1/2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceView;