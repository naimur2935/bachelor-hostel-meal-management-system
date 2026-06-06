import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
}

const StatCard = ({ title, value, subtitle, icon, trend }: StatCardProps) => {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-lg bg-primary/10">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend === 'positive' ? 'bg-success/10 text-success' :
            trend === 'negative' ? 'bg-destructive/10 text-destructive' :
            'bg-muted text-muted-foreground'
          }`}>
            {trend === 'positive' ? '▲' : trend === 'negative' ? '▼' : '—'}
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-muted-foreground mt-1">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </div>
  );
};

export default StatCard;
