import React from 'react';
import { RefreshCw } from 'lucide-react';

const StatCard = ({
  label,
  value,
  unit,
  description,
  icon: Icon,
  variant = 'default',
  onClick,
  isLoading,
}) => (
  <div
    className={`stat-card stat-card--${variant}`}
    onClick={onClick}
    role="button"
    tabIndex={0}
    aria-label={`${label}: ${value} ${unit}`}
  >
    <div className="stat-card__container">
      <div className="stat-card__icon">
        {isLoading ? <RefreshCw size={20} className="animate-spin" /> : <Icon size={20} />}
      </div>
      <div className="stat-card__content">
        <div className="stat-card__header">
          <span className="stat-card__label">{label}</span>
        </div>
        <div className="stat-card__body">
          <div className="stat-card__value">{value}</div>
          <div className="stat-card__unit">{unit}</div>
          <div className="stat-card__description">{description}</div>
        </div>
      </div>
    </div>
  </div>
);

export default StatCard;
