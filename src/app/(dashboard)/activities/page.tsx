'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WorkActivity, SportActivity, WorkActivityType, ActivityStatus } from '@/lib/types/database';
import { Plus, Briefcase, Trophy, Calendar, Clock, MapPin, Users, Trash2, Edit3, Target, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/LoadingSkeleton';

const PAGE_SIZE = 15;

const workTypeOptions = [
  { value: 'livestream', label: 'Livestream' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'other', label: 'Other' },
];

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusVariant = (s: ActivityStatus) => {
  const map = { planned: 'accent', in_progress: 'warning', completed: 'success', cancelled: 'muted' } as const;
  return map[s];
};

export default function ActivitiesPage() {
  const [activeTab, setActiveTab] = useState<'work' | 'sports'>('work');
  
  // Work state
  const [workActivities, setWorkActivities] = useState<WorkActivity[]>([]);
  const [workLoading, setWorkLoading] = useState(true);
  const [workPage, setWorkPage] = useState(0);
  const [workTotal, setWorkTotal] = useState(0);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkActivity | null>(null);
  const [workSaving, setWorkSaving] = useState(false);
  
  // Work form
  const [wTitle, setWTitle] = useState('');
  const [wDescription, setWDescription] = useState('');
  const [wType, setWType] = useState<WorkActivityType>('other');
  const [wScheduledAt, setWScheduledAt] = useState('');
  const [wDeadline, setWDeadline] = useState('');
  const [wStatus, setWStatus] = useState<ActivityStatus>('planned');

  // Sport state
  const [sportActivities, setSportActivities] = useState<SportActivity[]>([]);
  const [sportLoading, setSportLoading] = useState(true);
  const [sportPage, setSportPage] = useState(0);
  const [sportTotal, setSportTotal] = useState(0);
  const [showSportModal, setShowSportModal] = useState(false);
  const [editingSport, setEditingSport] = useState<SportActivity | null>(null);
  const [sportSaving, setSportSaving] = useState(false);
  const [sportStats, setSportStats] = useState({ total: 0, wins: 0, winRate: 0 });

  // Sport form
  const [sTitle, setSTitle] = useState('');
  const [sSportType, setSSportType] = useState('padel');
  const [sDate, setSDate] = useState(new Date().toISOString().split('T')[0]);
  const [sStartTime, setSStartTime] = useState('');
  const [sEndTime, setSEndTime] = useState('');
  const [sVenue, setSVenue] = useState('');
  const [sOpponent, setSOpponent] = useState('');
  const [sResult, setSResult] = useState('');
  const [sIsWin, setSIsWin] = useState<boolean | null>(null);

  const supabase = createClient();

  // Fetch Work Activities
  const fetchWork = useCallback(async () => {
    setWorkLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, count } = await supabase
      .from('work_activities')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .range(workPage * PAGE_SIZE, (workPage + 1) * PAGE_SIZE - 1);

    setWorkActivities(data || []);
    setWorkTotal(count || 0);
    setWorkLoading(false);
  }, [workPage]);

  // Fetch Sport Activities
  const fetchSports = useCallback(async () => {
    setSportLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, count } = await supabase
      .from('sport_activities')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('activity_date', { ascending: false })
      .range(sportPage * PAGE_SIZE, (sportPage + 1) * PAGE_SIZE - 1);

    // Fetch stats
    const { count: totalMatches } = await supabase
      .from('sport_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    const { count: totalWins } = await supabase
      .from('sport_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_win', true);

    const total = totalMatches || 0;
    const wins = totalWins || 0;
    setSportStats({ total, wins, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 });

    setSportActivities(data || []);
    setSportTotal(count || 0);
    setSportLoading(false);
  }, [sportPage]);

  useEffect(() => { fetchWork(); }, [fetchWork]);
  useEffect(() => { fetchSports(); }, [fetchSports]);

  // Work CRUD
  const openCreateWork = () => {
    setEditingWork(null);
    setWTitle(''); setWDescription(''); setWType('other');
    setWScheduledAt(''); setWDeadline(''); setWStatus('planned');
    setShowWorkModal(true);
  };

  const openEditWork = (w: WorkActivity) => {
    setEditingWork(w);
    setWTitle(w.title); setWDescription(w.description || '');
    setWType(w.activity_type); setWStatus(w.status);
    setWScheduledAt(w.scheduled_at ? w.scheduled_at.slice(0, 16) : '');
    setWDeadline(w.deadline ? w.deadline.slice(0, 16) : '');
    setShowWorkModal(true);
  };

  const saveWork = async () => {
    setWorkSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload: Record<string, any> = {
      title: wTitle, description: wDescription, activity_type: wType,
      scheduled_at: wScheduledAt || null, deadline: wDeadline || null, status: wStatus,
      metadata: {},
    };
    if (editingWork) {
      await supabase.from('work_activities').update(payload).eq('id', editingWork.id);
    } else {
      await supabase.from('work_activities').insert({ ...payload, user_id: user.id });
    }
    setWorkSaving(false); setShowWorkModal(false); fetchWork();
  };

  const deleteWork = async (id: string) => {
    await supabase.from('work_activities').delete().eq('id', id);
    fetchWork();
  };

  // Sport CRUD
  const openCreateSport = () => {
    setEditingSport(null);
    setSTitle(''); setSSportType('padel');
    setSDate(new Date().toISOString().split('T')[0]);
    setSStartTime(''); setSEndTime(''); setSVenue('');
    setSOpponent(''); setSResult(''); setSIsWin(null);
    setShowSportModal(true);
  };

  const openEditSport = (s: SportActivity) => {
    setEditingSport(s);
    setSTitle(s.title); setSSportType(s.sport_type);
    setSDate(s.activity_date); setSStartTime(s.start_time || '');
    setSEndTime(s.end_time || ''); setSVenue(s.venue || '');
    setSOpponent(s.opponent || ''); setSResult(s.result || '');
    setSIsWin(s.is_win);
    setShowSportModal(true);
  };

  const saveSport = async () => {
    setSportSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload: Record<string, any> = {
      title: sTitle, sport_type: sSportType, activity_date: sDate,
      start_time: sStartTime || null, end_time: sEndTime || null,
      venue: sVenue, opponent: sOpponent, result: sResult,
      is_win: sIsWin, description: '', metadata: {},
    };
    if (editingSport) {
      await supabase.from('sport_activities').update(payload).eq('id', editingSport.id);
    } else {
      await supabase.from('sport_activities').insert({ ...payload, user_id: user.id });
    }
    setSportSaving(false); setShowSportModal(false); fetchSports();
  };

  const deleteSport = async (id: string) => {
    await supabase.from('sport_activities').delete().eq('id', id);
    fetchSports();
  };

  const workPages = Math.ceil(workTotal / PAGE_SIZE);
  const sportPages = Math.ceil(sportTotal / PAGE_SIZE);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Activities</h1>
        <Button
          onClick={activeTab === 'work' ? openCreateWork : openCreateSport}
          size="sm"
        >
          <Plus size={16} /> Add
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-xl overflow-hidden border border-border">
        <button
          onClick={() => setActiveTab('work')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'work' ? 'bg-accent/20 text-accent-light' : 'bg-surface-light text-text-muted'
          }`}
        >
          <Briefcase size={16} /> Work
        </button>
        <button
          onClick={() => setActiveTab('sports')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'sports' ? 'bg-accent/20 text-accent-light' : 'bg-surface-light text-text-muted'
          }`}
        >
          <Trophy size={16} /> Sports
        </button>
      </div>

      {/* WORK TAB */}
      {activeTab === 'work' && (
        <div className="space-y-2">
          {workLoading ? (
            <SkeletonList count={4} />
          ) : workActivities.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No work activities"
              description="Track your livestreams, campaigns, and milestones."
              actionLabel="Add Activity"
              onAction={openCreateWork}
            />
          ) : (
            workActivities.map((w) => (
              <div key={w.id} className="glass-card p-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap size={18} className="text-accent-light" />
                </div>
                <div className="flex-1 min-w-0" onClick={() => openEditWork(w)}>
                  <p className="text-sm font-medium text-text-primary truncate">{w.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={statusVariant(w.status)} size="sm">
                      {w.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="muted" size="sm">
                      {w.activity_type}
                    </Badge>
                  </div>
                  {w.scheduled_at && (
                    <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(w.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteWork(w.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
          <Pagination currentPage={workPage} totalPages={workPages} onPageChange={setWorkPage} />
        </div>
      )}

      {/* SPORTS TAB */}
      {activeTab === 'sports' && (
        <div className="space-y-3">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glow-card p-3 text-center">
              <Target size={16} className="text-accent-light mx-auto mb-1" />
              <p className="text-[10px] text-text-muted">Matches</p>
              <p className="text-lg font-bold text-text-primary">{sportStats.total}</p>
            </div>
            <div className="glow-card p-3 text-center">
              <Trophy size={16} className="text-success mx-auto mb-1" />
              <p className="text-[10px] text-text-muted">Wins</p>
              <p className="text-lg font-bold text-success">{sportStats.wins}</p>
            </div>
            <div className="glow-card p-3 text-center">
              <Zap size={16} className="text-warning mx-auto mb-1" />
              <p className="text-[10px] text-text-muted">Win Rate</p>
              <p className="text-lg font-bold text-warning">{sportStats.winRate}%</p>
            </div>
          </div>

          {/* Sport List */}
          {sportLoading ? (
            <SkeletonList count={4} />
          ) : sportActivities.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No sport activities"
              description="Log your matches, scores, and court bookings."
              actionLabel="Add Match"
              onAction={openCreateSport}
            />
          ) : (
            sportActivities.map((s) => (
              <div key={s.id} className="glass-card p-3 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  s.is_win === true ? 'bg-success/10' : s.is_win === false ? 'bg-danger/10' : 'bg-surface-lighter'
                }`}>
                  {s.is_win === true ? (
                    <Trophy size={18} className="text-success" />
                  ) : s.is_win === false ? (
                    <Target size={18} className="text-danger" />
                  ) : (
                    <Trophy size={18} className="text-text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0" onClick={() => openEditSport(s)}>
                  <p className="text-sm font-medium text-text-primary truncate">{s.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="accent" size="sm">{s.sport_type}</Badge>
                    {s.result && <Badge variant={s.is_win ? 'success' : 'danger'} size="sm">{s.result}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(s.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {s.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {s.venue}
                      </span>
                    )}
                    {s.opponent && (
                      <span className="flex items-center gap-1">
                        <Users size={10} /> {s.opponent}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteSport(s.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
          <Pagination currentPage={sportPage} totalPages={sportPages} onPageChange={setSportPage} />
        </div>
      )}

      {/* Work Modal */}
      <Modal isOpen={showWorkModal} onClose={() => setShowWorkModal(false)} title={editingWork ? 'Edit Work Activity' : 'New Work Activity'}>
        <div className="space-y-4">
          <Input id="w-title" label="Title" placeholder="Activity title" value={wTitle} onChange={(e) => setWTitle(e.target.value)} icon={<Edit3 size={16} />} />
          <Select id="w-type" label="Type" options={workTypeOptions} value={wType} onChange={(e) => setWType(e.target.value as WorkActivityType)} />
          <Input id="w-desc" label="Description" placeholder="Details (optional)" value={wDescription} onChange={(e) => setWDescription(e.target.value)} />
          <Input id="w-sched" type="datetime-local" label="Scheduled At" value={wScheduledAt} onChange={(e) => setWScheduledAt(e.target.value)} icon={<Calendar size={16} />} />
          <Input id="w-dead" type="datetime-local" label="Deadline" value={wDeadline} onChange={(e) => setWDeadline(e.target.value)} icon={<Clock size={16} />} />
          <Select id="w-status" label="Status" options={statusOptions} value={wStatus} onChange={(e) => setWStatus(e.target.value as ActivityStatus)} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowWorkModal(false)}>Cancel</Button>
            <Button fullWidth isLoading={workSaving} onClick={saveWork} disabled={!wTitle.trim()}>{editingWork ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Sport Modal */}
      <Modal isOpen={showSportModal} onClose={() => setShowSportModal(false)} title={editingSport ? 'Edit Sport Activity' : 'New Sport Activity'}>
        <div className="space-y-4">
          <Input id="s-title" label="Title" placeholder="Match title" value={sTitle} onChange={(e) => setSTitle(e.target.value)} icon={<Trophy size={16} />} />
          <Input id="s-sport" label="Sport Type" placeholder="e.g. Padel, Tennis" value={sSportType} onChange={(e) => setSSportType(e.target.value)} />
          <Input id="s-date" type="date" label="Date" value={sDate} onChange={(e) => setSDate(e.target.value)} icon={<Calendar size={16} />} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="s-start" type="time" label="Start" value={sStartTime} onChange={(e) => setSStartTime(e.target.value)} />
            <Input id="s-end" type="time" label="End" value={sEndTime} onChange={(e) => setSEndTime(e.target.value)} />
          </div>
          <Input id="s-venue" label="Venue" placeholder="Court/Location" value={sVenue} onChange={(e) => setSVenue(e.target.value)} icon={<MapPin size={16} />} />
          <Input id="s-opponent" label="Opponent" placeholder="Who did you play?" value={sOpponent} onChange={(e) => setSOpponent(e.target.value)} icon={<Users size={16} />} />
          <Input id="s-result" label="Result/Score" placeholder="e.g. 6-4, 6-3" value={sResult} onChange={(e) => setSResult(e.target.value)} />
          
          {/* Win/Loss Toggle */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Result</label>
            <div className="flex rounded-xl overflow-hidden border border-border">
              <button
                onClick={() => setSIsWin(true)}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  sIsWin === true ? 'bg-success/20 text-success' : 'bg-surface-light text-text-muted'
                }`}
              >Win</button>
              <button
                onClick={() => setSIsWin(null)}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  sIsWin === null ? 'bg-surface-lighter text-text-primary' : 'bg-surface-light text-text-muted'
                }`}
              >N/A</button>
              <button
                onClick={() => setSIsWin(false)}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  sIsWin === false ? 'bg-danger/20 text-danger' : 'bg-surface-light text-text-muted'
                }`}
              >Loss</button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowSportModal(false)}>Cancel</Button>
            <Button fullWidth isLoading={sportSaving} onClick={saveSport} disabled={!sTitle.trim()}>{editingSport ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
