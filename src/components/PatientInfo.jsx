function PatientInfo({ patient }) {
  return (
    <div className="patient-card">
      <div className="patient-header">
        <div className="patient-avatar">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="30" fill="#E3F2FD"/>
            <path d="M30 15C30 15 25 20 25 25C25 27.761 27.239 30 30 30C32.761 30 35 27.761 35 25C35 20 30 15 30 15Z" fill="#2196F3"/>
            <ellipse cx="30" cy="40" rx="15" ry="8" fill="#2196F3"/>
            <circle cx="25" cy="23" r="1.5" fill="white"/>
            <circle cx="35" cy="23" r="1.5" fill="white"/>
          </svg>
        </div>
        <h3>{patient.nombre}</h3>
      </div>
      
      <div className="patient-details">
        <div className="detail-row">
          <span className="label">Especie:</span>
          <span className="value">{patient.especie}</span>
        </div>
        <div className="detail-row">
          <span className="label">Raza:</span>
          <span className="value">{patient.raza}</span>
        </div>
        <div className="detail-row">
          <span className="label">Edad:</span>
          <span className="value">{patient.edad}</span>
        </div>
        <div className="detail-row">
          <span className="label">Peso:</span>
          <span className="value">{patient.peso}</span>
        </div>
        <div className="detail-row">
          <span className="label">Propietario:</span>
          <span className="value">{patient.propietario}</span>
        </div>
        <div className="detail-row">
          <span className="label">Teléfono:</span>
          <span className="value">{patient.telefono}</span>
        </div>
      </div>
    </div>
  );
}

export default PatientInfo;
