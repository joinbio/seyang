import * as XLSX from 'xlsx';
import { supabase } from './supabase';

export type ExportRange = 'week' | 'month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'year' | 'all' | 'custom';

export type ExportOptions = {
  range: ExportRange;
  startDate?: string;
  endDate?: string;
  teamCodes?: string[];
};

function getDateRange(opts: ExportOptions): { start: string; end: string } {
  const today = new Date();
  const year = today.getFullYear();
  
  if (opts.range === 'custom' && opts.startDate && opts.endDate) {
    return { start: opts.startDate, end: opts.endDate };
  }
  
  switch (opts.range) {
    case 'week': {
      const monday = new Date(today);
      const day = monday.getDay();
      monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: formatDate(monday), end: formatDate(sunday) };
    }
    case 'month': {
      const start = new Date(year, today.getMonth(), 1);
      const end = new Date(year, today.getMonth() + 1, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'last_month': {
      const start = new Date(year, today.getMonth() - 1, 1);
      const end = new Date(year, today.getMonth(), 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'q1':
      return { start: `${year}-01-01`, end: `${year}-03-31` };
    case 'q2':
      return { start: `${year}-04-01`, end: `${year}-06-30` };
    case 'q3':
      return { start: `${year}-07-01`, end: `${year}-09-30` };
    case 'q4':
      return { start: `${year}-10-01`, end: `${year}-12-31` };
    case 'year':
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    case 'all':
      return { start: '2020-01-01', end: '2099-12-31' };
    default:
      return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const RANGE_LABELS: Record<ExportRange, string> = {
  week: '이번 주',
  month: '이번 달',
  last_month: '지난 달',
  q1: '1분기',
  q2: '2분기',
  q3: '3분기',
  q4: '4분기',
  year: '올해 전체',
  all: '전체 기간',
  custom: '사용자 지정',
};

export async function exportAllDataToExcel(opts: ExportOptions): Promise<{ filename: string; rangeLabel: string }> {
  const { start, end } = getDateRange(opts);
  const rangeLabel = RANGE_LABELS[opts.range];
  
  const [teamsRes, wigsRes, metricsRes, entriesRes, practicesRes, usersRes, logsRes] = await Promise.all([
    supabase.from('teams').select('*').order('sort_order'),
    supabase.from('wig_master').select('*').eq('is_active', true),
    supabase.from('metric_defs').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('daily_entries').select('*').gte('entry_date', start).lte('entry_date', end).order('entry_date'),
    supabase.from('practices').select('*').order('week_key', { ascending: false }),
    supabase.from('users').select('*'),
    supabase.from('change_log').select('*').gte('created_at', start + 'T00:00:00').lte('created_at', end + 'T23:59:59').order('created_at', { ascending: false }),
  ]);

  if (teamsRes.error) throw teamsRes.error;
  
  const teams = teamsRes.data || [];
  const wigs = wigsRes.data || [];
  const metrics = metricsRes.data || [];
  const entries = entriesRes.data || [];
  const practices = practicesRes.data || [];
  const users = usersRes.data || [];
  const logs = logsRes.data || [];

  const userMap = new Map(users.map((u: any) => [u.id, u.name]));
  const teamMap = new Map(teams.map((t: any) => [t.id, t.name]));
  const metricMap = new Map(metrics.map((m: any) => [m.id, m]));

  const wb = XLSX.utils.book_new();

  const summaryRows: any[] = [
    ['조인그룹 가중목 시스템 - 종합 보고서'],
    [`기간: ${rangeLabel} (${start} ~ ${end})`],
    [`생성일시: ${new Date().toLocaleString('ko-KR')}`],
    [],
    ['팀명', '가중목', '기준값', '목표값', '단위', '방향', '마감일'],
  ];
  
  for (const team of teams) {
    const teamWig = wigs.find((w: any) => w.team_id === team.id);
    if (teamWig) {
      summaryRows.push([
        team.name,
        teamWig.description,
        teamWig.baseline_value,
        teamWig.target_value,
        teamWig.unit,
        teamWig.direction === 'le' ? '↓ 이하' : '↑ 이상',
        teamWig.deadline_label || teamWig.deadline || '',
      ]);
    } else {
      summaryRows.push([team.name, '(미설정)', '', '', '', '', '']);
    }
  }

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 14 }, { wch: 50 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, '요약');

  for (const team of teams) {
    const teamMetrics = metrics.filter((m: any) => m.team_id === team.id);
    if (teamMetrics.length === 0) continue;

    const teamEntries = entries.filter((e: any) => {
      const m = metricMap.get(e.metric_def_id);
      return m && (m as any).team_id === team.id;
    });

    const dates = Array.from(new Set(teamEntries.map((e: any) => e.entry_date))).sort();
    
    if (dates.length === 0) {
      const sheetData: any[] = [
        [`${team.name} - 일별 데이터`],
        [`기간: ${start} ~ ${end}`],
        [],
        ['이 기간에 입력된 데이터가 없습니다.'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const safeName = team.name.replace(/[\\/?*\[\]]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeName);
      continue;
    }

    const headerRow = ['항목명', '구분', '단위', '목표', '방향', '담당자', ...dates, '평균', '최대', '최소'];
    const dataRows: any[][] = [];
    
    for (const metric of teamMetrics) {
      const metricEntries = teamEntries.filter((e: any) => e.metric_def_id === metric.id);
      const valuesByDate: Record<string, number | null> = {};
      for (const e of metricEntries) {
        valuesByDate[e.entry_date] = e.value;
      }
      
      const values = dates.map(d => valuesByDate[d] ?? null);
      const numericValues = values.filter((v): v is number => v !== null && !isNaN(v));
      const avg = numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : null;
      const max = numericValues.length > 0 ? Math.max(...numericValues) : null;
      const min = numericValues.length > 0 ? Math.min(...numericValues) : null;

      const indicatorLabel = metric.indicator_type === 'lead' ? '선행' : metric.indicator_type === 'lag' ? '후행' : '일반';
      const ownerName = metric.owner_user_id ? userMap.get(metric.owner_user_id) || '-' : '-';

      dataRows.push([
        metric.name,
        indicatorLabel,
        metric.unit,
        metric.target_value,
        metric.direction === 'le' ? '↓' : '↑',
        ownerName,
        ...values.map(v => v === null ? '' : v),
        avg !== null ? Math.round(avg * 100) / 100 : '',
        max !== null ? max : '',
        min !== null ? min : '',
      ]);
    }

    const teamWig = wigs.find((w: any) => w.team_id === team.id);
    const sheetData: any[] = [
      [`${team.name} - 일별 데이터`],
      [`가중목: ${teamWig?.description || '미설정'}`],
      [`기간: ${start} ~ ${end}`],
      [],
      headerRow,
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const colWidths = [
      { wch: 20 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 12 },
      ...dates.map(() => ({ wch: 10 })),
      { wch: 8 }, { wch: 8 }, { wch: 8 }
    ];
    ws['!cols'] = colWidths;
    
    const safeName = team.name.replace(/[\\/?*\[\]]/g, '').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  const practiceRows: any[] = [
    ['실천과제 이력'],
    [`기간: ${rangeLabel}`],
    [],
    ['주차', '팀', '내용', '담당자', '완료여부'],
  ];
  
  const filteredPractices = practices.filter((p: any) => {
    const weekDate = practiceWeekKeyToDate(p.week_key);
    if (!weekDate) return true;
    return weekDate >= start && weekDate <= end;
  });
  
  for (const p of filteredPractices) {
    practiceRows.push([
      p.week_key,
      teamMap.get(p.team_id) || '-',
      p.description,
      p.owner_user_id ? userMap.get(p.owner_user_id) || '-' : '-',
      p.is_completed ? '완료' : '진행중',
    ]);
  }
  
  const practiceWs = XLSX.utils.aoa_to_sheet(practiceRows);
  practiceWs['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 60 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, practiceWs, '실천과제');

  const logRows: any[] = [
    ['변경 이력'],
    [`기간: ${rangeLabel}`],
    [],
    ['일시', '팀', '대상', '항목', '작업', '변경 내용'],
  ];
  
  for (const log of logs) {
    const teamName = log.team_id ? teamMap.get(log.team_id) || '-' : '-';
    const entityTypeLabel = log.entity_type === 'wig' ? '가중목' : log.entity_type === 'metric' ? '측정항목' : log.entity_type === 'practice' ? '실천과제' : log.entity_type;
    const actionLabel = log.action === 'create' ? '추가' : log.action === 'update' ? '수정' : log.action === 'delete' ? '삭제' : log.action;
    
    let changeDetail = '';
    if (log.action === 'update' && log.before_value && log.after_value) {
      const before = log.before_value;
      const after = log.after_value;
      const changes: string[] = [];
      for (const key of Object.keys(after)) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          changes.push(`${key}: ${before[key] ?? '(없음)'} → ${after[key] ?? '(없음)'}`);
        }
      }
      changeDetail = changes.join('; ');
    } else if (log.action === 'create' && log.after_value) {
      changeDetail = log.after_value.description || log.after_value.name || JSON.stringify(log.after_value);
    } else if (log.action === 'delete' && log.before_value) {
      changeDetail = '삭제됨: ' + (log.before_value.description || log.before_value.name || '');
    }

    logRows.push([
      new Date(log.created_at).toLocaleString('ko-KR'),
      teamName,
      entityTypeLabel,
      log.entity_label || '-',
      actionLabel,
      changeDetail,
    ]);
  }
  
  const logWs = XLSX.utils.aoa_to_sheet(logRows);
  logWs['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 30 }, { wch: 8 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, logWs, '변경이력');

  const dateLabel = formatDate(new Date()).replace(/-/g, '');
  const filename = `조인그룹_가중목_${rangeLabel.replace(/\s/g, '')}_${dateLabel}.xlsx`;
  
  XLSX.writeFile(wb, filename);
  
  return { filename, rangeLabel };
}

function practiceWeekKeyToDate(weekKey: string): string | null {
  const match = weekKey.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7 - jan1.getDay() + 1;
  const monday = new Date(year, 0, 1 + daysOffset);
  return formatDate(monday);
}

export async function exportTeamData(teamCode: string, opts: ExportOptions): Promise<{ filename: string }> {
  const { start, end } = getDateRange(opts);
  const rangeLabel = RANGE_LABELS[opts.range];
  
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('*')
    .eq('code', teamCode)
    .single();
  if (teamErr) throw teamErr;

  const [wigRes, metricsRes, usersRes] = await Promise.all([
    supabase.from('wig_master').select('*').eq('team_id', team.id).eq('is_active', true).maybeSingle(),
    supabase.from('metric_defs').select('*').eq('team_id', team.id).eq('is_active', true).order('sort_order'),
    supabase.from('users').select('*'),
  ]);

  const wig = wigRes.data;
  const metrics = metricsRes.data || [];
  const users = usersRes.data || [];
  const userMap = new Map(users.map((u: any) => [u.id, u.name]));

  const metricIds = metrics.map((m: any) => m.id);
  const { data: entriesData } = await supabase
    .from('daily_entries')
    .select('*')
    .in('metric_def_id', metricIds.length > 0 ? metricIds : ['00000000-0000-0000-0000-000000000000'])
    .gte('entry_date', start)
    .lte('entry_date', end)
    .order('entry_date');
  const entries = entriesData || [];

  const wb = XLSX.utils.book_new();

  const dates = Array.from(new Set(entries.map((e: any) => e.entry_date))).sort();
  
  const headerRow = ['항목명', '구분', '단위', '목표', '방향', '담당자', ...dates, '평균', '최대', '최소'];
  const dataRows: any[][] = [];
  
  for (const metric of metrics) {
    const metricEntries = entries.filter((e: any) => e.metric_def_id === metric.id);
    const valuesByDate: Record<string, number | null> = {};
    for (const e of metricEntries) valuesByDate[e.entry_date] = e.value;
    
    const values = dates.map(d => valuesByDate[d] ?? null);
    const numericValues = values.filter((v): v is number => v !== null && !isNaN(v));
    const avg = numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : null;
    const max = numericValues.length > 0 ? Math.max(...numericValues) : null;
    const min = numericValues.length > 0 ? Math.min(...numericValues) : null;

    const indicatorLabel = metric.indicator_type === 'lead' ? '선행' : metric.indicator_type === 'lag' ? '후행' : '일반';
    const ownerName = metric.owner_user_id ? userMap.get(metric.owner_user_id) || '-' : '-';

    dataRows.push([
      metric.name, indicatorLabel, metric.unit, metric.target_value,
      metric.direction === 'le' ? '↓' : '↑', ownerName,
      ...values.map(v => v === null ? '' : v),
      avg !== null ? Math.round(avg * 100) / 100 : '',
      max !== null ? max : '',
      min !== null ? min : '',
    ]);
  }

  const sheetData: any[] = [
    [`${team.name} - 일별 데이터`],
    [`가중목: ${wig?.description || '미설정'}`],
    [`기간: ${rangeLabel} (${start} ~ ${end})`],
    [`생성일시: ${new Date().toLocaleString('ko-KR')}`],
    [],
    headerRow,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 20 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 12 },
    ...dates.map(() => ({ wch: 10 })),
    { wch: 8 }, { wch: 8 }, { wch: 8 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, team.name.replace(/[\\/?*\[\]]/g, '').substring(0, 31));

  const dateLabel = formatDate(new Date()).replace(/-/g, '');
  const filename = `${team.name}_${rangeLabel.replace(/\s/g, '')}_${dateLabel}.xlsx`;
  
  XLSX.writeFile(wb, filename);
  return { filename };
}
