import type { ChangeLogEntry } from './supabase';

const FIELD_LABELS: Record<string, string> = {
  description: '설명',
  target_value: '목표값',
  baseline_value: '기준값',
  unit: '단위',
  direction: '방향',
  deadline: '마감일',
  name: '항목명',
  indicator_type: '지표구분',
  is_active: '활성상태',
  is_completed: '완료여부',
  owner_user_id: '담당자',
  week_key: '주차',
};

const DIRECTION_LABELS: Record<string, string> = {
  ge: '이상(↑)',
  le: '이하(↓)',
};

const INDICATOR_TYPE_LABELS: Record<string, string> = {
  lead: '선행지표',
  lag: '후행지표',
  general: '일반',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  wig: '가중목',
  metric: '측정항목',
  practice: '실천과제',
};

const ACTION_LABELS: Record<string, string> = {
  create: '추가',
  update: '수정',
  delete: '삭제',
};

function formatValue(field: string, value: any): string {
  if (value === null || value === undefined) return '(없음)';
  if (field === 'direction') return DIRECTION_LABELS[value] || value;
  if (field === 'indicator_type') return INDICATOR_TYPE_LABELS[value] || value;
  if (field === 'is_active' || field === 'is_completed') return value ? '예' : '아니오';
  if (typeof value === 'string' && value.length > 30) return value.substring(0, 30) + '...';
  return String(value);
}

export function summarizeChange(log: ChangeLogEntry): {
  title: string;
  details: string[];
  entityLabel: string;
  actionLabel: string;
} {
  const entityLabel = log.entity_label || ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type;
  const actionLabel = ACTION_LABELS[log.action] || log.action;

  const details: string[] = [];

  if (log.action === 'update' && log.before_value && log.after_value) {
    const before = log.before_value as Record<string, any>;
    const after = log.after_value as Record<string, any>;
    
    for (const field of Object.keys(after)) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        const fieldLabel = FIELD_LABELS[field] || field;
        details.push(`${fieldLabel}: ${formatValue(field, before[field])} → ${formatValue(field, after[field])}`);
      }
    }
  } else if (log.action === 'create' && log.after_value) {
    const after = log.after_value as Record<string, any>;
    if (after.description) details.push(`내용: ${formatValue('description', after.description)}`);
    if (after.name) details.push(`이름: ${after.name}`);
    if (after.target_value !== undefined) details.push(`목표: ${after.target_value} ${after.unit || ''}`);
  } else if (log.action === 'delete' && log.before_value) {
    const before = log.before_value as Record<string, any>;
    if (before.description) details.push(`삭제됨: ${formatValue('description', before.description)}`);
    if (before.name) details.push(`삭제됨: ${before.name}`);
  }

  return {
    title: `${entityLabel} ${actionLabel}`,
    details: details.length > 0 ? details : ['세부 정보 없음'],
    entityLabel,
    actionLabel,
  };
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHr < 24) return `${diffHr}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
