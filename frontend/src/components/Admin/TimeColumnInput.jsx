import { useState, useEffect } from 'react';

/**
 * Super Compact Satya-Themed Time Picker.
 * Fixes click-swallowing by using onMouseDown + preventDefault.
 */
const TimeColumnInput = ({ date, onChange }) => {
  const activeDate = date || new Date();
  
  const currentHours = activeDate.getHours();
  const currentMinutes = activeDate.getMinutes();
  const currentSeconds = activeDate.getSeconds();
  
  const period = currentHours >= 12 ? 'PM' : 'AM';
  let hours12 = currentHours % 12;
  hours12 = hours12 === 0 ? 12 : hours12;

  const handleUpdate = (e, type, val) => {
    // 💡 CRITICAL: Prevent focusing away or bubbling up to DatePicker
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const newDate = new Date(activeDate);
    if (type === 'hour') {
      let h24 = parseInt(val);
      if (period === 'PM' && h24 < 12) h24 += 12;
      if (period === 'AM' && h24 === 12) h24 = 0;
      newDate.setHours(h24);
    } else if (type === 'minute') {
      newDate.setMinutes(parseInt(val));
    } else if (type === 'second') {
      newDate.setSeconds(parseInt(val));
    } else if (type === 'period') {
      let h24 = activeDate.getHours();
      if (val === 'PM' && h24 < 12) h24 += 12;
      if (val === 'AM' && h24 >= 12) h24 -= 12;
      newDate.setHours(h24);
    }
    
    const hours = newDate.getHours().toString().padStart(2, '0');
    const minutes = newDate.getMinutes().toString().padStart(2, '0');
    const seconds = newDate.getSeconds().toString().padStart(2, '0');
    
    onChange(`${hours}:${minutes}:${seconds}`);
  };

  const MiniControl = ({ value, type, max, min = 0 }) => (
    <div className="satya-mini-time__control" onMouseDown={e => e.preventDefault()}>
      <button 
        type="button" 
        onMouseDown={e => handleUpdate(e, type, value === min ? max : value - 1)}
      >−</button>
      <div className="satya-mini-time__value">{value.toString().padStart(2, '0')}</div>
      <button 
        type="button" 
        onMouseDown={e => handleUpdate(e, type, value === max ? min : value + 1)}
      >+</button>
    </div>
  );

  return (
    <div className="satya-mini-time" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}>
      <div className="satya-mini-time__row">
        <div className="satya-mini-time__label">TIME</div>
        <MiniControl type="hour" value={hours12} min={1} max={12} />
        <span className="satya-mini-time__sep">:</span>
        <MiniControl type="minute" value={currentMinutes} max={59} />
        <span className="satya-mini-time__sep">:</span>
        <MiniControl type="second" value={currentSeconds} max={59} />
        
        <div className="satya-mini-time__period">
          <button 
            type="button" 
            className={period === 'AM' ? 'active' : ''}
            onMouseDown={e => handleUpdate(e, 'period', 'AM')}
          >AM</button>
          <button 
            type="button" 
            className={period === 'PM' ? 'active' : ''}
            onMouseDown={e => handleUpdate(e, 'period', 'PM')}
          >PM</button>
        </div>
      </div>
    </div>
  );
};

export default TimeColumnInput;
