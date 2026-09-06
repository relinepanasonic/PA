'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SportActivity, GymSession, GymSessionExercise } from '@/lib/types/database';
import { Plus, Trophy, Calendar, Clock, MapPin, Users, Trash2, Target, Zap, Dumbbell, Play, Square, Search, Filter, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/LoadingSkeleton';
import { EXERCISES, MUSCLE_GROUPS, EQUIPMENT_TYPES, searchExercises, getExercisesByMuscleGroup, getExercisesByEquipment } from '@/lib/data/exercises';
import type { Exercise } from '@/lib/data/exercises';

const PAGE_SIZE = 15;

// Format duration in mm:ss
const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

export default function SportsPage() {
  const [activeTab, setActiveTab] = useState<'matches' | 'gym' | 'library'>('gym');

  // === SPORT / MATCHES STATE ===
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

  // === GYM STATE ===
  const [gymSessions, setGymSessions] = useState<GymSession[]>([]);
  const [gymLoading, setGymLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<GymSession | null>(null);
  const [sessionExercises, setSessionExercises] = useState<GymSessionExercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Add exercise modal
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState('All');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exSets, setExSets] = useState('3');
  const [exReps, setExReps] = useState('10');
  const [exWeight, setExWeight] = useState('0');
  const [exNotes, setExNotes] = useState('');
  const [exerciseSaving, setExerciseSaving] = useState(false);

  // Session detail
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<GymSessionExercise[]>([]);

  // Session notes
  const [sessionNotes, setSessionNotes] = useState('');

  // === LIBRARY STATE ===
  const [libMuscleFilter, setLibMuscleFilter] = useState('All');
  const [libEquipFilter, setLibEquipFilter] = useState('All');
  const [libSearch, setLibSearch] = useState('');
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  // Gym stats
  const [gymStats, setGymStats] = useState({ totalSessions: 0, totalVolume: 0, thisWeek: 0 });

  const supabase = createClient();

  // === SPORT FETCHING ===
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

  // === GYM FETCHING ===
  const fetchGymSessions = useCallback(async () => {
    setGymLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch sessions
    const { data: sessions } = await supabase
      .from('gym_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(20);

    setGymSessions(sessions || []);

    // Check for active session (no ended_at)
    const active = (sessions || []).find(s => !s.ended_at);
    if (active) {
      setActiveSession(active);
      setSessionNotes(active.notes || '');
      // Load exercises for active session
      const { data: exs } = await supabase
        .from('gym_session_exercises')
        .select('*')
        .eq('session_id', active.id)
        .order('order_index', { ascending: true });
      setSessionExercises(exs || []);
    }

    // Compute stats
    const completedSessions = (sessions || []).filter(s => s.ended_at);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeek = completedSessions.filter(s => new Date(s.started_at) >= weekStart).length;

    // Fetch total volume
    const { data: allExercises } = await supabase
      .from('gym_session_exercises')
      .select('sets, reps, weight_kg')
      .eq('user_id', user.id);

    const totalVolume = (allExercises || []).reduce((sum, e) => sum + (e.sets * e.reps * e.weight_kg), 0);

    setGymStats({
      totalSessions: completedSessions.length,
      totalVolume,
      thisWeek,
    });

    setGymLoading(false);
  }, []);

  useEffect(() => { fetchSports(); }, [fetchSports]);
  useEffect(() => { fetchGymSessions(); }, [fetchGymSessions]);

  // Timer for active session
  useEffect(() => {
    if (activeSession && !activeSession.ended_at) {
      const startTime = new Date(activeSession.started_at).getTime();
      const tick = () => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [activeSession]);

  // === GYM SESSION ACTIONS ===
  const startSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('gym_sessions')
      .insert({ user_id: user.id, started_at: new Date().toISOString(), notes: '' })
      .select()
      .single();

    if (data && !error) {
      setActiveSession(data);
      setSessionExercises([]);
      setSessionNotes('');
    }
  };

  const finishSession = async () => {
    if (!activeSession) return;
    const now = new Date();
    const startedAt = new Date(activeSession.started_at);
    const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);

    await supabase
      .from('gym_sessions')
      .update({
        ended_at: now.toISOString(),
        duration_minutes: durationMinutes,
        notes: sessionNotes,
      })
      .eq('id', activeSession.id);

    setActiveSession(null);
    setSessionExercises([]);
    if (timerRef.current) clearInterval(timerRef.current);
    fetchGymSessions();
  };

  const addExerciseToSession = async () => {
    if (!activeSession || !selectedExercise) return;
    setExerciseSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('gym_session_exercises')
      .insert({
        session_id: activeSession.id,
        user_id: user.id,
        exercise_id: selectedExercise.id,
        exercise_name: selectedExercise.name,
        sets: parseInt(exSets) || 1,
        reps: parseInt(exReps) || 1,
        weight_kg: parseFloat(exWeight) || 0,
        order_index: sessionExercises.length,
        notes: exNotes,
      })
      .select()
      .single();

    if (data && !error) {
      setSessionExercises(prev => [...prev, data]);
    }

    setExerciseSaving(false);
    setShowExerciseModal(false);
    setSelectedExercise(null);
    setExSets('3'); setExReps('10'); setExWeight('0'); setExNotes('');
  };

  const removeExerciseFromSession = async (id: string) => {
    await supabase.from('gym_session_exercises').delete().eq('id', id);
    setSessionExercises(prev => prev.filter(e => e.id !== id));
  };

  const deleteSession = async (id: string) => {
    await supabase.from('gym_session_exercises').delete().eq('session_id', id);
    await supabase.from('gym_sessions').delete().eq('id', id);
    fetchGymSessions();
  };

  // Expand session to see exercises
  const toggleExpandSession = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    const { data } = await supabase
      .from('gym_session_exercises')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true });
    setExpandedExercises(data || []);
    setExpandedSession(sessionId);
  };

  // === SPORT CRUD ===
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

  const sportPages = Math.ceil(sportTotal / PAGE_SIZE);

  // === LIBRARY FILTERING ===
  const filteredLibrary = EXERCISES.filter(ex => {
    const matchesMuscle = libMuscleFilter === 'All' || ex.muscleGroup === libMuscleFilter;
    const matchesEquip = libEquipFilter === 'All' || ex.equipment === libEquipFilter;
    const matchesSearch = !libSearch || ex.name.toLowerCase().includes(libSearch.toLowerCase()) || ex.muscleGroup.toLowerCase().includes(libSearch.toLowerCase());
    return matchesMuscle && matchesEquip && matchesSearch;
  });

  // Exercise picker filtering
  const filteredExercisePicker = EXERCISES.filter(ex => {
    const matchesMuscle = exerciseMuscleFilter === 'All' || ex.muscleGroup === exerciseMuscleFilter;
    const matchesSearch = !exerciseSearch || ex.name.toLowerCase().includes(exerciseSearch.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  return (
    <div className="p-4 space-y-4 animate-fade-in pb-24 md:pb-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-sm">
            <Dumbbell size={18} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">Sports & Gym</h1>
            <p className="text-[11px] text-slate-400 font-medium">Track matches & workouts</p>
          </div>
        </div>
        {activeTab === 'matches' && (
          <Button onClick={openCreateSport} size="sm">
            <Plus size={16} /> Add
          </Button>
        )}
      </div>

      {/* Tab Switcher — 3 tabs */}
      <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/10">
        <button
          onClick={() => setActiveTab('gym')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'gym'
              ? 'bg-emerald-600/30 text-emerald-300 shadow-sm border border-emerald-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Dumbbell size={14} /> Gym
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'matches'
              ? 'bg-blue-600/30 text-blue-300 shadow-sm border border-blue-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Trophy size={14} /> Matches
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'library'
              ? 'bg-purple-600/30 text-purple-300 shadow-sm border border-purple-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <BookOpen size={14} /> Library
        </button>
      </div>

      {/* ============ GYM TAB ============ */}
      {activeTab === 'gym' && (
        <div className="space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glow-card p-3 text-center">
              <Dumbbell size={16} className="text-emerald-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Sessions</p>
              <p className="text-lg font-bold text-white">{gymStats.totalSessions}</p>
            </div>
            <div className="glow-card p-3 text-center">
              <Zap size={16} className="text-amber-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 font-semibold uppercase">This Week</p>
              <p className="text-lg font-bold text-amber-400">{gymStats.thisWeek}</p>
            </div>
            <div className="glow-card p-3 text-center">
              <Target size={16} className="text-cyan-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Vol</p>
              <p className="text-lg font-bold text-cyan-400">{gymStats.totalVolume > 1000 ? `${(gymStats.totalVolume / 1000).toFixed(1)}t` : `${gymStats.totalVolume}kg`}</p>
            </div>
          </div>

          {/* Active Session or Start Button */}
          {activeSession ? (
            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-900/30 to-slate-900/50 border border-emerald-500/30 space-y-4 shadow-xl">
              {/* Session Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">Active Session</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-bold text-white tabular-nums">{formatDuration(elapsedSeconds)}</span>
                </div>
              </div>

              {/* Exercises in this session */}
              {sessionExercises.length > 0 && (
                <div className="space-y-2">
                  {sessionExercises.map((ex, i) => (
                    <div key={ex.id} className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-slate-500 w-5">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{ex.exercise_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {ex.sets} sets × {ex.reps} reps × {ex.weight_kg} kg
                            {ex.notes && <span className="text-slate-500"> — {ex.notes}</span>}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeExerciseFromSession(ex.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Session Notes */}
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Session notes (optional)..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/50 resize-none"
                rows={2}
              />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowExerciseModal(true); setSelectedExercise(null); setExerciseSearch(''); setExerciseMuscleFilter('All'); }}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-400/30 text-emerald-300 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Plus size={16} /> Add Exercise
                </button>
                <button
                  onClick={finishSession}
                  className="px-6 py-3 rounded-2xl bg-red-600/20 hover:bg-red-600/30 border border-red-400/30 text-red-300 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Square size={14} /> Finish
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startSession}
              className="w-full py-5 rounded-3xl bg-gradient-to-r from-emerald-600/40 to-cyan-600/30 hover:from-emerald-600/50 hover:to-cyan-600/40 border border-emerald-400/40 hover:border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_40px_rgba(16,185,129,0.25)] text-white text-base font-extrabold flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98]"
            >
              <Play size={22} className="text-emerald-400" />
              Start Gym Session
            </button>
          )}

          {/* Session History */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Session History</h3>
            {gymLoading ? (
              <SkeletonList count={3} />
            ) : gymSessions.filter(s => s.ended_at).length === 0 ? (
              <p className="text-xs text-slate-500 italic px-1 py-4">No completed sessions yet. Hit "Start" to begin! 💪</p>
            ) : (
              gymSessions.filter(s => s.ended_at).map(session => (
                <div key={session.id} className="glass-card overflow-hidden">
                  <div
                    className="p-3 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpandSession(session.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Dumbbell size={18} className="text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">
                          {new Date(session.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} /> {session.duration_minutes}m
                          </span>
                          {session.notes && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{session.notes}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {expandedSession === session.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {expandedSession === session.id && (
                    <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-1.5">
                      {expandedExercises.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No exercises logged.</p>
                      ) : expandedExercises.map((ex, i) => (
                        <div key={ex.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/[0.02]">
                          <span className="text-[10px] font-bold text-slate-500 w-4">{i + 1}</span>
                          <span className="text-xs font-semibold text-white flex-1 truncate">{ex.exercise_name}</span>
                          <span className="text-[11px] font-mono text-emerald-400">{ex.sets}×{ex.reps} @ {ex.weight_kg}kg</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============ MATCHES TAB ============ */}
      {activeTab === 'matches' && (
        <div className="space-y-3">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glow-card p-3 text-center">
              <Target size={16} className="text-blue-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Matches</p>
              <p className="text-lg font-bold text-white">{sportStats.total}</p>
            </div>
            <div className="glow-card p-3 text-center">
              <Trophy size={16} className="text-emerald-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Wins</p>
              <p className="text-lg font-bold text-emerald-400">{sportStats.wins}</p>
            </div>
            <div className="glow-card p-3 text-center">
              <Zap size={16} className="text-amber-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Win Rate</p>
              <p className="text-lg font-bold text-amber-400">{sportStats.winRate}%</p>
            </div>
          </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sportActivities.map((s) => (
                <div key={s.id} className="glass-card p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    s.is_win === true ? 'bg-emerald-500/10' : s.is_win === false ? 'bg-red-500/10' : 'bg-white/5'
                  }`}>
                    {s.is_win === true ? <Trophy size={18} className="text-emerald-400" /> : s.is_win === false ? <Target size={18} className="text-red-400" /> : <Trophy size={18} className="text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => openEditSport(s)}>
                    <p className="text-sm font-bold text-white truncate">{s.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="accent" size="sm">{s.sport_type}</Badge>
                      {s.result && <Badge variant={s.is_win ? 'success' : 'danger'} size="sm">{s.result}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(s.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      {s.venue && <span className="flex items-center gap-1"><MapPin size={10} /> {s.venue}</span>}
                      {s.opponent && <span className="flex items-center gap-1"><Users size={10} /> {s.opponent}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSport(s.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Pagination currentPage={sportPage} totalPages={sportPages} onPageChange={setSportPage} />
        </div>
      )}

      {/* ============ LIBRARY TAB ============ */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={libSearch}
              onChange={(e) => setLibSearch(e.target.value)}
              placeholder="Search exercises..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400/50"
            />
          </div>

          {/* Muscle Group Pills */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Muscle Group</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setLibMuscleFilter('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  libMuscleFilter === 'All' ? 'bg-purple-600/30 text-purple-300 border-purple-400/40' : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white'
                }`}
              >All</button>
              {MUSCLE_GROUPS.map(mg => (
                <button
                  key={mg}
                  onClick={() => setLibMuscleFilter(mg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    libMuscleFilter === mg ? 'bg-purple-600/30 text-purple-300 border-purple-400/40' : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white'
                  }`}
                >{mg}</button>
              ))}
            </div>
          </div>

          {/* Equipment Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400 flex-shrink-0" />
            <select
              value={libEquipFilter}
              onChange={(e) => setLibEquipFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-purple-400/50"
            >
              <option value="All">All Equipment</option>
              {EQUIPMENT_TYPES.map(eq => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 ml-auto">{filteredLibrary.length} exercises</span>
          </div>

          {/* Exercise Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLibrary.map(ex => (
              <div
                key={ex.id}
                className="glass-card overflow-hidden cursor-pointer transition-all hover:border-purple-400/30"
                onClick={() => setExpandedExerciseId(expandedExerciseId === ex.id ? null : ex.id)}
              >
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{ex.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="accent" size="sm">{ex.muscleGroup}</Badge>
                        <Badge variant="muted" size="sm">{ex.equipment}</Badge>
                        <Badge variant={ex.difficulty === 'beginner' ? 'success' : ex.difficulty === 'intermediate' ? 'warning' : 'danger'} size="sm">
                          {ex.difficulty}
                        </Badge>
                      </div>
                    </div>
                    {expandedExerciseId === ex.id ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0 mt-1" />}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {ex.targetMuscles.map(m => (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold">{m}</span>
                    ))}
                    {ex.secondaryMuscles.map(m => (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 font-semibold">{m}</span>
                    ))}
                  </div>
                </div>

                {expandedExerciseId === ex.id && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructions</p>
                    <ol className="space-y-1.5">
                      {ex.instructions.map((step, i) => (
                        <li key={i} className="flex gap-2 text-xs text-slate-300">
                          <span className="text-emerald-400 font-bold flex-shrink-0">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredLibrary.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">No exercises match your filters.</p>
          )}
        </div>
      )}

      {/* ============ MODALS ============ */}

      {/* Sport Modal */}
      <Modal isOpen={showSportModal} onClose={() => setShowSportModal(false)} title={editingSport ? 'Edit Match' : 'New Match'}>
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
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Result</label>
            <div className="flex rounded-xl border border-white/10 overflow-hidden">
              <button type="button" onClick={() => setSIsWin(true)} className={`flex-1 py-2.5 text-sm font-bold transition-all ${sIsWin === true ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.02] text-slate-500'}`}>Win</button>
              <button type="button" onClick={() => setSIsWin(null)} className={`flex-1 py-2.5 text-sm font-bold transition-all ${sIsWin === null ? 'bg-white/[0.06] text-white' : 'bg-white/[0.02] text-slate-500'}`}>N/A</button>
              <button type="button" onClick={() => setSIsWin(false)} className={`flex-1 py-2.5 text-sm font-bold transition-all ${sIsWin === false ? 'bg-red-500/20 text-red-400' : 'bg-white/[0.02] text-slate-500'}`}>Loss</button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowSportModal(false)}>Cancel</Button>
            <Button fullWidth isLoading={sportSaving} onClick={saveSport} disabled={!sTitle.trim()}>{editingSport ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Exercise Picker Modal */}
      <Modal isOpen={showExerciseModal} onClose={() => setShowExerciseModal(false)} title="Add Exercise">
        <div className="space-y-4">
          {!selectedExercise ? (
            <>
              {/* Search & Filter */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/50"
                  autoFocus
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => setExerciseMuscleFilter('All')} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border transition-all ${exerciseMuscleFilter === 'All' ? 'bg-emerald-600/30 text-emerald-300 border-emerald-400/40' : 'bg-white/[0.04] text-slate-400 border-white/10'}`}>All</button>
                {MUSCLE_GROUPS.map(mg => (
                  <button key={mg} onClick={() => setExerciseMuscleFilter(mg)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border transition-all ${exerciseMuscleFilter === mg ? 'bg-emerald-600/30 text-emerald-300 border-emerald-400/40' : 'bg-white/[0.04] text-slate-400 border-white/10'}`}>{mg}</button>
                ))}
              </div>

              {/* Exercise List */}
              <div className="max-h-[300px] overflow-y-auto space-y-1 -mx-1 px-1">
                {filteredExercisePicker.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => setSelectedExercise(ex)}
                    className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-emerald-400/20 text-left flex items-center gap-3 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell size={14} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{ex.name}</p>
                      <p className="text-[10px] text-slate-400">{ex.muscleGroup} · {ex.equipment}</p>
                    </div>
                  </button>
                ))}
                {filteredExercisePicker.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-4">No exercises found.</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Selected Exercise — Enter Sets/Reps/Weight */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{selectedExercise.name}</p>
                    <p className="text-[11px] text-slate-400">{selectedExercise.muscleGroup} · {selectedExercise.equipment}</p>
                  </div>
                  <button onClick={() => setSelectedExercise(null)} className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300">Change</button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sets</label>
                  <input
                    type="number"
                    min="1"
                    value={exSets}
                    onChange={(e) => setExSets(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-center text-lg font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reps</label>
                  <input
                    type="number"
                    min="1"
                    value={exReps}
                    onChange={(e) => setExReps(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-center text-lg font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kg</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={exWeight}
                    onChange={(e) => setExWeight(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-center text-lg font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <input
                type="text"
                value={exNotes}
                onChange={(e) => setExNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/50"
              />

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => { setShowExerciseModal(false); setSelectedExercise(null); }}>Cancel</Button>
                <Button fullWidth isLoading={exerciseSaving} onClick={addExerciseToSession}>Add to Session</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
