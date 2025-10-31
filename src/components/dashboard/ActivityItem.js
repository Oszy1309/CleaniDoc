import React from 'react';

const ActivityItem = ({ icon: Icon, title, subtitle, time, variant = 'default' }) => (
  <div className={`list__item list__item--${variant}`}>
    <div className="list__icon">
      <Icon size={20} />
    </div>
    <div className="list__content">
      <div className="list__title">{title}</div>
      <div className="list__subtitle">{subtitle}</div>
    </div>
    <div className="text-xs text-muted">{time}</div>
  </div>
);

export default ActivityItem;
