import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../../../shared/utils/cn';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import { TALENT_SURFACE } from './talentSurface';
import { STATUS_COLORS } from './attendanceUtils';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { Calendar, Timer, Users } from 'lucide-react';
import type { AttendanceDayStatus } from '../api/hrTypes';

export interface HoursTrendRow {
  date: string;
  label: string;
  hours: number;
  minutes: number;
}

export interface StatusBreakdownRow {
  status: AttendanceDayStatus;
  label: string;
  value: number;
}

export interface PresenceTrendRow {
  date: string;
  label: string;
  present: number;
  absent: number;
  leave: number;
  holiday: number;
}

const TOOLTIP_STYLE = {
  background: 'rgba(255,255,255,0.88)',
  border: '1px solid rgba(255,255,255,0.7)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
  boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
} as const;

function ChartHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <div>
        <h3 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>{title}</h3>
        <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>{subtitle}</p>
      </div>
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center px-6 text-center">
      <p className={cn('text-sm', TALENT_SURFACE.textMuted)}>{message}</p>
    </div>
  );
}

function HoursChart({ data }: { data: HoursTrendRow[] }) {
  return (
    <div className={TALENT_SURFACE.chartPanel}>
      <ChartHeader
        icon={<Timer className="h-4 w-4 text-violet-600" />}
        title="Hours over time"
        subtitle="Minutes worked by day in the selected range"
      />
      {data.every((row) => row.minutes === 0) ? (
        <EmptyChart message="No worked minutes in this range yet - clock in to start the trend." />
      ) : (
        <div className={TALENT_SURFACE.chartWell}>
          <ChartContainer className="h-72">
            {({ width, height }) => (
              <BarChart width={width} height={height} data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="h" />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [`${value} h`, 'Hours']}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { date?: string } | undefined;
                    return row?.date ? formatShiftDate(row.date) : '';
                  }}
                />
                <Bar dataKey="hours" name="Hours" fill="#8b5cf6" radius={[6, 6, 0, 0]} fillOpacity={0.9} />
              </BarChart>
            )}
          </ChartContainer>
        </div>
      )}
    </div>
  );
}

function PresenceMixChart({ data }: { data: StatusBreakdownRow[] }) {
  return (
    <div className={TALENT_SURFACE.chartPanel}>
      <ChartHeader
        icon={<Calendar className="h-4 w-4 text-violet-600" />}
        title="Presence mix"
        subtitle="Status breakdown for the range"
      />
      {data.length === 0 ? (
        <EmptyChart message="No day summaries yet for this range." />
      ) : (
        <div className={TALENT_SURFACE.chartWell}>
          <ChartContainer className="h-72">
            {({ width, height }) => (
              <PieChart width={width} height={height}>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {data.map((row) => (
                    <Cell key={row.status} fill={STATUS_COLORS[row.status]} fillOpacity={0.92} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
              </PieChart>
            )}
          </ChartContainer>
        </div>
      )}
    </div>
  );
}

function DailyPresenceChart({ data }: { data: PresenceTrendRow[] }) {
  return (
    <div className={TALENT_SURFACE.chartPanel}>
      <ChartHeader
        icon={<Users className="h-4 w-4 text-violet-600" />}
        title="Daily presence"
        subtitle="Present / absent / leave / holiday by day"
      />
      {data.every((row) => row.present + row.absent + row.leave + row.holiday === 0) ? (
        <EmptyChart message="No presence records in this range yet." />
      ) : (
        <div className={TALENT_SURFACE.chartWell}>
          <ChartContainer className="h-72">
            {({ width, height }) => (
              <LineChart width={width} height={height} data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Line type="monotone" dataKey="present" name="Present" stroke="#10b981" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="leave" name="Leave" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="holiday" name="Holiday" stroke="#6366f1" strokeWidth={2.5} dot={false} />
              </LineChart>
            )}
          </ChartContainer>
        </div>
      )}
    </div>
  );
}

export default function HrAttendanceCharts({
  hoursTrend,
  statusBreakdown,
  presenceTrend,
}: {
  hoursTrend: HoursTrendRow[];
  statusBreakdown: StatusBreakdownRow[];
  presenceTrend: PresenceTrendRow[];
}) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <HoursChart data={hoursTrend} />
        <PresenceMixChart data={statusBreakdown} />
      </div>
      <DailyPresenceChart data={presenceTrend} />
    </>
  );
}
