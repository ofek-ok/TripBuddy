import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useAppStore } from '@/app/providers/AppStoreProvider';
import { useToast } from '@/lib/errors/errorHandler';
import {
  Badge,
  Button,
  Card,
  Input,
  ModalDrawer,
  Select,
  Textarea,
} from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils/formatters';
import { TaskPriority, TaskStatus, TripTask } from '@/types/database.types';
import { CheckCircle2, Circle, Clock, Edit3, Plus, Trash2 } from 'lucide-react';

const STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Completed'];
const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

export const TasksPage: React.FC = () => {
  const { lang, t } = useI18n();
  const {
    activeTrip,
    coupleMembers,
    activeTasks,
    createTask,
    updateTask,
    deleteTask,
  } = useAppStore();
  const { notify, handleError } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TripTask | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('action') === 'new' && activeTrip) {
      setEditingTask(null);
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setDueDate(activeTrip.start_date);
      setPriority('Medium');
      setStatus('To Do');
      setCategory('Preparation');
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, activeTrip]);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('To Do');
  const [category, setCategory] = useState('General');

  const filteredTasks = useMemo(() => {
    return activeTasks.filter((tk) => {
      if (statusFilter !== 'ALL' && tk.status !== statusFilter) return false;
      if (assigneeFilter !== 'ALL' && tk.assigned_to !== assigneeFilter) return false;
      return true;
    });
  }, [activeTasks, statusFilter, assigneeFilter]);

  if (!activeTrip) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold">{t.common.noActiveTrip}</p>
      </Card>
    );
  }

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setDueDate(activeTrip.start_date);
    setPriority('Medium');
    setStatus('To Do');
    setCategory('Preparation');
    setModalOpen(true);
  };

  const openEditModal = (tk: TripTask) => {
    setEditingTask(tk);
    setTitle(tk.title);
    setDescription(tk.description || '');
    setAssignedTo(tk.assigned_to || '');
    setDueDate(tk.due_date || '');
    setPriority(tk.priority);
    setStatus(tk.status);
    setCategory(tk.category || 'General');
    setModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        trip_id: activeTrip.id,
        title: title.trim(),
        description: description.trim() || null,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        priority,
        status,
        category: category.trim() || 'General',
      };

      if (editingTask) {
        await updateTask(editingTask.id, payload);
        notify(lang === 'he' ? 'המשימה עודכנה' : 'Task updated', 'success');
      } else {
        await createTask(payload);
        notify(lang === 'he' ? 'משימה חדשה נוספה' : 'Task created', 'success');
      }
      setModalOpen(false);
    } catch (err) {
      handleError(err);
    }
  };

  const cycleStatus = async (tk: TripTask) => {
    const next: TaskStatus =
      tk.status === 'To Do'
        ? 'In Progress'
        : tk.status === 'In Progress'
          ? 'Completed'
          : 'To Do';
    await updateTask(tk.id, { status: next });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t.tasks.title}</h1>
          <p className="text-xs text-navy/65">{activeTrip.name}</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          <span>{t.tasks.newTask}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">{t.common.all}</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {t.tasks.statuses[st]}
            </option>
          ))}
        </Select>
        <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="ALL">{t.common.all}</option>
          {coupleMembers.map((cm) => (
            <option key={cm.user_id} value={cm.user_id}>
              {cm.profile?.full_name || t.common.partner}
            </option>
          ))}
        </Select>
      </Card>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card className="p-8 text-center text-sm text-navy/60">
          {lang === 'he' ? 'אין משימות להצגה' : 'No tasks to display'}
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((tk) => {
            const assignee = coupleMembers.find(
              (cm) => cm.user_id === tk.assigned_to
            )?.profile;
            const isDone = tk.status === 'Completed';
            return (
              <Card
                key={tk.id}
                className={`p-4 flex items-start justify-between gap-3 transition-all ${
                  isDone ? 'opacity-70 bg-ivory/40' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => cycleStatus(tk)}
                    className="mt-0.5 text-navy hover:text-sand transition-colors"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-sage-dark" />
                    ) : tk.status === 'In Progress' ? (
                      <Clock className="w-5 h-5 text-sand" />
                    ) : (
                      <Circle className="w-5 h-5 text-navy/40" />
                    )}
                  </button>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={
                          tk.priority === 'High'
                            ? 'danger'
                            : tk.priority === 'Medium'
                              ? 'sand'
                              : 'ivory'
                        }
                      >
                        {t.tasks.priorities[tk.priority]}
                      </Badge>
                      <Badge variant="sage">{t.tasks.statuses[tk.status]}</Badge>
                      {assignee && (
                        <Badge variant="ivory">{assignee.full_name}</Badge>
                      )}
                      {tk.due_date && (
                        <span className="text-[11px] text-navy/60">
                          {formatDate(tk.due_date, lang)}
                        </span>
                      )}
                    </div>
                    <h3
                      className={`font-bold text-sm ${
                        isDone ? 'line-through text-navy/50' : 'text-navy'
                      }`}
                    >
                      {tk.title}
                    </h3>
                    {tk.description && (
                      <p className="text-xs text-navy/65">{tk.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEditModal(tk)}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => deleteTask(tk.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Task Modal */}
      <ModalDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTask ? t.common.edit : t.tasks.newTask}
      >
        <form onSubmit={handleSaveTask} className="space-y-3.5">
          <Input
            label={lang === 'he' ? 'כותרת המשימה' : 'Task Title'}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: רכישת ביטוח נסיעות' : 'e.g., Purchase travel insurance'}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.tasks.priority}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t.tasks.priorities[p]}
                </option>
              ))}
            </Select>
            <Select
              label={t.common.status}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {t.tasks.statuses[st]}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.tasks.assignedTo}
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">{t.common.both}</option>
              {coupleMembers.map((cm) => (
                <option key={cm.user_id} value={cm.user_id}>
                  {cm.profile?.full_name || t.common.partner}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              label={t.tasks.dueDate}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Input
            label={t.common.category}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <Textarea
            label={t.common.notes}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit">{t.common.save}</Button>
          </div>
        </form>
      </ModalDrawer>
    </div>
  );
};
