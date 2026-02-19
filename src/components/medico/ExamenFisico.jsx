// src/components/medico/ExamenFisico.jsx
// Componente de Examen Físico Veterinario Completo
import { useState, useCallback, useEffect } from 'react';
import './ExamenFisico.css';

// Estado inicial del examen físico general
const initialGeneralExam = {
  // 1. Peso y Condición Corporal
  peso: '',
  condicionCorporal: null, // 1-9
  
  // 2. Actitud y Estado Mental
  estadoMental: [], // Alerta, Depresivo, Letárgico, Estupor, Comatoso, Agresivo, Ansioso
  
  // 3. Constantes Fisiológicas
  temperatura: '',
  temperaturaEstado: '', // Normal, Hipotermia, Hipertermia
  frecuenciaCardiaca: '',
  frecuenciaCardiacaEstado: '', // Normal, Taquicardia, Bradicardia
  frecuenciaRespiratoria: '',
  frecuenciaRespiratoriaEstado: '', // Normal, Taquipnea, Bradipnea
  pulso: '', // Normal, Débil, Fuerte, Irregular
  
  // 4. Hidratación
  hidratacion: '', // Normohidratado, Leve 5%, Moderada 6-8%, Severa >8%, Edema
  
  // 5. Cabeza y Cuello
  ojos: [], // Normales, Secreción, Hiperemia, Opacidad, Anisocoria
  oidos: [], // Normales, Secreción, Eritema, Mal olor, Dolor
  nariz: [], // Húmeda, Seca, Secreción, Epistaxis
  boca: [], // Normales, Sarro, Gingivitis, Úlceras, Halitosis
  linfonodos: [], // Normales, Aumentados, Dolorosos
  
  // Linfonodos palpables específicos
  linfonodoSubmandibular: [], // Normal, Aumentado, Doloroso
  linfonodoPreescapular: [], // Normal, Aumentado, Doloroso
  linfonodoAxilar: [], // Normal, Aumentado, Doloroso
  linfonodoInguinal: [], // Normal, Aumentado, Doloroso
  linfonodoPopliteo: [], // Normal, Aumentado, Doloroso
  
  // 6. Sistema Cardiorespiratorio
  corazon: [], // Ruidos normales, Soplo, Arritmia
  pulmones: [], // Campos limpios, Estertores, Sibilancias, Crepitaciones
  
  // 7. Abdomen
  abdomen: [], // Normal, Doloroso, Distendido, Masa palpable, Ascitis
  
  // 8. Sistema Musculoesquelético
  musculoesqueletico: [], // Marcha normal, Claudicación, Rigidez, Dolor articular, Atrofia
  
  // 9. Sistema Neurológico
  neurologico: [], // Normal, Déficit propioceptivo, Ataxia, Paresia, Parálisis, Convulsiones
  
  // 10. Piel y Anexos
  piel: [], // Normal, Alopecia, Eritema, Lesiones, Prurito, Parásitos
  
  // 11. Sistema Urogenital
  urogenital: [], // Normal, Secreción, Dolor, Anormalidades externas
  
  // 12. Región Perianal
  perianal: [], // Normal, Inflamación, Secreción, Glándulas anales alteradas
  
  // 13. Observaciones Generales
  observaciones: ''
};

// Exámenes especializados
const initialNeuroExam = {
  estadoMental: '',
  postura: [],
  marcha: [],
  nerviosCraneales: {
    nc1_olfatorio: '',
    nc2_optico: '',
    nc3_4_6_oculomotores: [],
    nc5_trigemino: '',
    nc7_facial: '',
    nc8_vestibulococlear: [],
    nc9_10_glosofaringeo: '',
    nc12_hipogloso: []
  },
  propiocepcion: '',
  pruebasPropiocepcion: [],
  reflejosToracicos: '',
  reflejosPelvicos: '',
  tonoMuscular: '',
  sensibilidadSuperficial: '',
  sensibilidadProfunda: '',
  controlEsfinteres: [],
  localizacion: [],
  observaciones: ''
};

const initialDermaExam = {
  condicionPiel: [],
  pelaje: [],
  distribucionLesiones: [],
  lesionesPrimarias: [],
  lesionesSecundarias: [],
  prurito: '',
  olorCutaneo: '',
  parasitos: [],
  oidos: [],
  unasAlmohadillas: [],
  pruebasRealizadas: [],
  impresion: [],
  observaciones: ''
};

const initialOftalmoExam = {
  observacionGeneral: [],
  // Párpados - OD (ojo derecho) y OI (ojo izquierdo)
  parpadosOD: [],
  parpadosOI: [],
  // Conjuntiva
  conjuntivaOD: [],
  conjuntivaOI: [],
  // Córnea
  corneaOD: [],
  corneaOI: [],
  // Cámara Anterior
  camaraAnteriorOD: [],
  camaraAnteriorOI: [],
  // Iris y Pupila
  irisPupilaOD: [],
  irisPupilaOI: [],
  // Reflejos Pupilares
  reflejosPupilaresOD: [],
  reflejosPupilaresOI: [],
  // Cristalino
  cristalinoOD: [],
  cristalinoOI: [],
  // Presión Intraocular
  presionIntraocularOD: '',
  pioValorOD: '',
  presionIntraocularOI: '',
  pioValorOI: '',
  // Fondo de Ojo
  fondoOjoOD: [],
  fondoOjoOI: [],
  pruebasComplementarias: [],
  impresion: [],
  observaciones: ''
};

const initialOrtoExam = {
  observacionGeneral: [],
  marcha: [],
  palpacionGeneral: [],
  // Extremidades torácicas
  hombroD: [], hombroI: [],
  codoD: [], codoI: [],
  carpoD: [], carpoI: [],
  // Extremidades pélvicas
  caderaD: [], caderaI: [],
  rodillaD: [], rodillaI: [],
  tarsoD: [], tarsoI: [],
  // Columna
  columna: [],
  masaMuscular: '',
  masaMuscularLado: '',
  rangoMovimiento: '',
  rangoMovimientoLado: '',
  estabilidad: '',
  estabilidadLado: '',
  impresion: [],
  observaciones: ''
};

// Opciones para cada sección
const OPTIONS = {
  estadoMental: ['Alerta', 'Depresivo', 'Letárgico', 'Estupor', 'Comatoso', 'Agresivo', 'Ansioso'],
  temperaturaEstado: ['Normal', 'Hipotermia', 'Hipertermia'],
  fcEstado: ['Normal', 'Taquicardia', 'Bradicardia'],
  frEstado: ['Normal', 'Taquipnea', 'Bradipnea'],
  pulso: ['Normal', 'Débil', 'Fuerte', 'Irregular'],
  hidratacion: ['Normohidratado', 'Deshidratación leve (5%)', 'Deshidratación moderada (6-8%)', 'Deshidratación severa (>8%)', 'Edema'],
  ojos: ['Normales', 'Secreción', 'Hiperemia', 'Opacidad', 'Anisocoria'],
  oidos: ['Normales', 'Secreción', 'Eritema', 'Mal olor', 'Dolor'],
  nariz: ['Húmeda', 'Seca', 'Secreción', 'Epistaxis'],
  boca: ['Normales', 'Sarro', 'Gingivitis', 'Úlceras', 'Halitosis'],
  linfonodos: ['Normales', 'Aumentados', 'Dolorosos'],
  linfonodoEstado: ['Normal', 'Aumentado', 'Doloroso', 'No palpable'],
  corazon: ['Ruidos normales', 'Soplo', 'Arritmia'],
  pulmones: ['Campos limpios', 'Estertores', 'Sibilancias', 'Crepitaciones'],
  abdomen: ['Normal', 'Doloroso', 'Distendido', 'Masa palpable', 'Ascitis'],
  musculoesqueletico: ['Marcha normal', 'Claudicación', 'Rigidez', 'Dolor articular', 'Atrofia muscular'],
  neurologico: ['Normal', 'Déficit propioceptivo', 'Ataxia', 'Paresia', 'Parálisis', 'Convulsiones'],
  piel: ['Piel normal', 'Alopecia', 'Eritema', 'Lesiones', 'Prurito', 'Parásitos'],
  urogenital: ['Normal', 'Secreción', 'Dolor', 'Anormalidades externas'],
  perianal: ['Normal', 'Inflamación', 'Secreción', 'Glándulas anales alteradas'],
  bcs: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  
  // Neurológico
  neuroPostura: ['Normal', 'Descerebración', 'Descerebelación', 'Schiff-Sherrington', 'Cifosis', 'Lordosis', 'Escoliosis', 'Base amplia', 'Base estrecha'],
  neuroMarcha: ['Normal', 'Atáxica', 'Propioceptiva', 'Espástica', 'Flácida', 'Vestibular', 'Claudicante', 'Parética', 'Paralítica'],
  neuroNC1: ['Normal', 'Alterado'],
  neuroNC2: ['Visión normal', 'Ceguera'],
  neuroNC346: ['Movimientos normales', 'Estrabismo', 'Nistagmo'],
  neuroNC5: ['Sensibilidad normal', 'Disminuida', 'Ausente'],
  neuroNC7: ['Simetría normal', 'Parálisis facial'],
  neuroNC8: ['Audición normal', 'Inclinación de cabeza', 'Ataxia vestibular'],
  neuroNC910: ['Deglución normal', 'Disfagia'],
  neuroNC12: ['Lengua normal', 'Atrofia', 'Desviación'],
  neuroPropiocepcion: ['Normales', 'Disminuidas', 'Ausentes'],
  neuroPruebasProp: ['Volteo de patas', 'Salto (hopping)', 'Empuje postural'],
  neuroReflejos: ['Normal', 'Disminuido', 'Ausente', 'Exagerado'],
  neuroTono: ['Normal', 'Hipertonía', 'Hipotonía'],
  neuroSensibilidad: ['Presente', 'Ausente'],
  neuroEsfinteres: ['Normal', 'Incontinencia urinaria', 'Incontinencia fecal'],
  neuroLocalizacion: ['Cerebro', 'Cerebelo', 'Tronco encefálico', 'Médula cervical', 'Médula toracolumbar', 'Nervios periféricos', 'Neuromuscular'],
  
  // Dermatológico
  dermaCondicion: ['Normal', 'Seca', 'Grasa/Seborreica', 'Engrosada', 'Atrófica'],
  dermaPelaje: ['Normal', 'Opaco', 'Frágil', 'Alopecia focal', 'Alopecia multifocal', 'Alopecia generalizada'],
  dermaDistribucion: ['Cabeza', 'Cuello', 'Dorso', 'Flancos', 'Abdomen', 'Extremidades', 'Región perianal', 'Generalizada'],
  dermaLesionesPrim: ['Mácula', 'Pápula', 'Pústula', 'Vesícula', 'Nódulo', 'Tumor'],
  dermaLesionesSec: ['Costras', 'Escamas', 'Excoriaciones', 'Liquenificación', 'Úlceras', 'Hiperpigmentación'],
  dermaPrurito: ['Ausente', 'Leve', 'Moderado', 'Severo'],
  dermaOlor: ['Normal', 'Rancio', 'Fétido', 'Levaduras'],
  dermaParasitos: ['No observados', 'Pulgas', 'Garrapatas', 'Ácaros visibles'],
  dermaOidos: ['Normales', 'Eritema', 'Secreción', 'Mal olor', 'Dolor'],
  dermaUnas: ['Normales', 'Fragilidad ungueal', 'Onicogrifosis', 'Hiperqueratosis', 'Fisuras'],
  dermaPruebas: ['Raspado cutáneo', 'Tricograma', 'Citología', 'Cultivo', 'Lámpara de Wood', 'Biopsia'],
  dermaImpresion: ['Alérgica', 'Parasitaria', 'Bacteriana', 'Fúngica', 'Endocrina', 'Autoinmune', 'Neoplásica'],
  
  // Oftalmológico
  oftalmoObs: ['Simetría normal', 'Blefaroespasmo', 'Fotofobia', 'Secreción ocular', 'Prurito ocular'],
  oftalmoParpados: ['Normales', 'Entropión', 'Ectropión', 'Trichiasis', 'Distiquiasis', 'Blefaritis', 'Masas palpebrales'],
  oftalmoConjuntiva: ['Normal', 'Hiperemia', 'Quemosis', 'Secreción serosa', 'Secreción mucosa', 'Secreción purulenta'],
  oftalmoCornea: ['Transparente', 'Opacidad', 'Edema', 'Neovascularización', 'Pigmentación', 'Úlcera corneal'],
  oftalmoCamara: ['Normal', 'Hifema', 'Hipopión', 'Flare acuoso', 'Profundidad anormal'],
  oftalmoIris: ['Color/forma normal', 'Miosis', 'Midriasis', 'Anisocoria', 'Atrofia de iris'],
  oftalmoReflejos: ['Fotomotor directo normal', 'Fotomotor consensual normal', 'Disminuidos', 'Ausentes'],
  oftalmoCristalino: ['Transparente', 'Catarata incipiente', 'Catarata madura', 'Luxación/Subluxación'],
  oftalmoPIO: ['Normal', 'Aumentada (Glaucoma)', 'Disminuida (Uveítis)'],
  oftalmoFondo: ['Normal', 'Papila óptica anormal', 'Hemorragias', 'Desprendimiento de retina', 'Degeneración retinal'],
  oftalmoPruebas: ['Test de Schirmer', 'Tinción con fluoresceína', 'Tonometría', 'Oftalmoscopía directa', 'Oftalmoscopía indirecta'],
  oftalmoImpresion: ['Normal', 'Conjuntivitis', 'Queratitis', 'Úlcera corneal', 'Uveítis', 'Glaucoma', 'Catarata'],
  
  // Ortopédico
  ortoObs: ['Postura normal', 'Postura antálgica', 'Asimetría corporal', 'Descarga de peso', 'Deformidades visibles'],
  ortoMarcha: ['Normal', 'Claudicación', 'Rigidez', 'Marcha saltarina', 'Marcha en balanceo'],
  ortoPalpacion: ['Sin dolor', 'Dolor a la palpación', 'Crepitación', 'Aumento de volumen', 'Calor local'],
  ortoArticulacion: ['Normal', 'Dolor', 'Limitación de movimiento', 'Inestabilidad', 'Crepitación', 'Derrame articular', 'Inflamación'],
  ortoColumna: ['Normal', 'Dolor cervical', 'Dolor toracolumbar', 'Dolor lumbosacro', 'Rigidez'],
  ortoMasa: ['Normal', 'Atrofia leve', 'Atrofia moderada', 'Atrofia severa'],
  ortoROM: ['Normal', 'Disminuido', 'Doloroso', 'Aumentado'],
  ortoEstabilidad: ['Estable', 'Inestabilidad leve', 'Inestabilidad marcada'],
  ortoImpresion: ['Normal', 'Degenerativa', 'Traumática', 'Congénita', 'Inflamatoria', 'Neoplásica'],
  lateralidad: ['D', 'I', 'Ambos']
};

function ExamenFisico({ onSave, initialData, consultationId, loading, triageData }) {
  const [activeTab, setActiveTab] = useState('general');
  const [expandedSections, setExpandedSections] = useState({});
  const [generalExam, setGeneralExam] = useState(initialGeneralExam);
  const [neuroExam, setNeuroExam] = useState(initialNeuroExam);
  const [dermaExam, setDermaExam] = useState(initialDermaExam);
  const [oftalmoExam, setOftalmoExam] = useState(initialOftalmoExam);
  const [ortoExam, setOrtoExam] = useState(initialOrtoExam);
  const [hasChanges, setHasChanges] = useState(false);
  const [triageApplied, setTriageApplied] = useState(false);

  // Cargar datos iniciales si existen
  useEffect(() => {
    if (initialData) {
      try {
        const data = typeof initialData === 'string' ? JSON.parse(initialData) : initialData;
        if (data.general) setGeneralExam(prev => ({ ...prev, ...data.general }));
        if (data.neurologico) setNeuroExam(prev => ({ ...prev, ...data.neurologico }));
        if (data.dermatologico) setDermaExam(prev => ({ ...prev, ...data.dermatologico }));
        if (data.oftalmologico) setOftalmoExam(prev => ({ ...prev, ...data.oftalmologico }));
        if (data.ortopedico) setOrtoExam(prev => ({ ...prev, ...data.ortopedico }));
        setTriageApplied(true); // Si hay datos guardados, no aplicar triage
      } catch (e) {
        console.error('Error parsing initial exam data:', e);
      }
    }
  }, [initialData]);

  // Cargar datos del triage si no hay datos guardados previos
  useEffect(() => {
    if (triageData && !triageApplied && !initialData) {
      setGeneralExam(prev => ({
        ...prev,
        peso: triageData.peso || prev.peso,
        temperatura: triageData.temperatura || prev.temperatura,
      }));
      setTriageApplied(true);
    }
  }, [triageData, triageApplied, initialData]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Toggle checkbox en array
  const toggleArrayValue = (setter, field, value) => {
    setter(prev => {
      const arr = prev[field] || [];
      const newArr = arr.includes(value) 
        ? arr.filter(v => v !== value)
        : [...arr, value];
      return { ...prev, [field]: newArr };
    });
    setHasChanges(true);
  };

  // Set valor simple
  const setValue = (setter, field, value) => {
    setter(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Guardar todo
  const handleSave = useCallback(() => {
    const examData = {
      general: generalExam,
      neurologico: neuroExam,
      dermatologico: dermaExam,
      oftalmologico: oftalmoExam,
      ortopedico: ortoExam
    };
    onSave?.(examData);
    setHasChanges(false);
  }, [generalExam, neuroExam, dermaExam, oftalmoExam, ortoExam, onSave]);

  // Componente de Checkbox
  const Checkbox = ({ checked, onChange, label, className = '' }) => (
    <label className={`exam-checkbox ${checked ? 'checked' : ''} ${className}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="checkmark">✓</span>
      <span className="label">{label}</span>
    </label>
  );

  // Componente de Radio
  const Radio = ({ checked, onChange, label, name }) => (
    <label className={`exam-radio ${checked ? 'checked' : ''}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span className="radiomark"></span>
      <span className="label">{label}</span>
    </label>
  );

  // Componente de Sección colapsable
  const Section = ({ title, icon, name, children }) => (
    <div className={`exam-section ${expandedSections[name] !== false ? 'expanded' : 'collapsed'}`}>
      <div className="section-header" onClick={() => toggleSection(name)}>
        <span className="section-icon">{icon}</span>
        <span className="section-title">{title}</span>
        <span className="section-toggle">{expandedSections[name] !== false ? '▼' : '▶'}</span>
      </div>
      {expandedSections[name] !== false && (
        <div className="section-content">{children}</div>
      )}
    </div>
  );

  // Checkbox Group
  const CheckboxGroup = ({ options, values, onChange, columns = 4 }) => (
    <div className={`checkbox-group cols-${columns}`}>
      {options.map(opt => (
        <Checkbox
          key={opt}
          checked={values?.includes(opt)}
          onChange={() => onChange(opt)}
          label={opt}
        />
      ))}
    </div>
  );

  // Radio Group
  const RadioGroup = ({ options, value, onChange, name, columns = 4 }) => (
    <div className={`radio-group cols-${columns}`}>
      {options.map(opt => (
        <Radio
          key={opt}
          name={name}
          checked={value === opt}
          onChange={() => onChange(opt)}
          label={typeof opt === 'number' ? opt : opt}
        />
      ))}
    </div>
  );

  // BCS Selector (1-9 visual)
  const BCSSelector = ({ value, onChange }) => (
    <div className="bcs-selector">
      <div className="bcs-labels">
        <span>Muy delgado</span>
        <span>Ideal</span>
        <span>Obeso</span>
      </div>
      <div className="bcs-buttons">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button
            key={n}
            type="button"
            className={`bcs-btn ${value === n ? 'selected' : ''} ${n <= 3 ? 'under' : n <= 5 ? 'ideal' : n <= 7 ? 'over' : 'obese'}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="examen-fisico">
      {/* Tabs de navegación */}
      <div className="exam-tabs">
        <button 
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          🩺 General
        </button>
        <button 
          className={`tab ${activeTab === 'neurologico' ? 'active' : ''}`}
          onClick={() => setActiveTab('neurologico')}
        >
          🧠 Neurológico
        </button>
        <button 
          className={`tab ${activeTab === 'dermatologico' ? 'active' : ''}`}
          onClick={() => setActiveTab('dermatologico')}
        >
          🔬 Dermatológico
        </button>
        <button 
          className={`tab ${activeTab === 'oftalmologico' ? 'active' : ''}`}
          onClick={() => setActiveTab('oftalmologico')}
        >
          👁️ Oftalmológico
        </button>
        <button 
          className={`tab ${activeTab === 'ortopedico' ? 'active' : ''}`}
          onClick={() => setActiveTab('ortopedico')}
        >
          🦴 Ortopédico
        </button>
      </div>

      {/* Contenido del tab activo */}
      <div className="exam-content">
        {/* ========== EXAMEN GENERAL ========== */}
        {activeTab === 'general' && (
          <div className="exam-general">
            <Section title="Peso y Condición Corporal" icon="⚖️" name="peso">
              <div className="form-row">
                <div className="form-field">
                  <label>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={generalExam.peso}
                    onChange={(e) => setValue(setGeneralExam, 'peso', e.target.value)}
                    placeholder="Ej: 15.5"
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Condición Corporal (BCS)</label>
                <BCSSelector
                  value={generalExam.condicionCorporal}
                  onChange={(v) => setValue(setGeneralExam, 'condicionCorporal', v)}
                />
              </div>
            </Section>

            <Section title="Actitud y Estado Mental" icon="🧠" name="mental">
              <CheckboxGroup
                options={OPTIONS.estadoMental}
                values={generalExam.estadoMental}
                onChange={(v) => toggleArrayValue(setGeneralExam, 'estadoMental', v)}
                columns={4}
              />
            </Section>

            <Section title="Constantes Fisiológicas" icon="💓" name="constantes">
              <div className="vitals-grid">
                <div className="vital-item">
                  <label>🌡️ Temperatura (°C)</label>
                  <div className="vital-row">
                    <input
                      type="number"
                      step="0.1"
                      value={generalExam.temperatura}
                      onChange={(e) => setValue(setGeneralExam, 'temperatura', e.target.value)}
                      placeholder="38.5"
                    />
                    <RadioGroup
                      options={OPTIONS.temperaturaEstado}
                      value={generalExam.temperaturaEstado}
                      onChange={(v) => setValue(setGeneralExam, 'temperaturaEstado', v)}
                      name="tempEstado"
                      columns={3}
                    />
                  </div>
                </div>
                <div className="vital-item">
                  <label>❤️ Frecuencia Cardíaca (lpm)</label>
                  <div className="vital-row">
                    <input
                      type="number"
                      value={generalExam.frecuenciaCardiaca}
                      onChange={(e) => setValue(setGeneralExam, 'frecuenciaCardiaca', e.target.value)}
                      placeholder="80"
                    />
                    <RadioGroup
                      options={OPTIONS.fcEstado}
                      value={generalExam.frecuenciaCardiacaEstado}
                      onChange={(v) => setValue(setGeneralExam, 'frecuenciaCardiacaEstado', v)}
                      name="fcEstado"
                      columns={3}
                    />
                  </div>
                </div>
                <div className="vital-item">
                  <label>🫁 Frecuencia Respiratoria (rpm)</label>
                  <div className="vital-row">
                    <input
                      type="number"
                      value={generalExam.frecuenciaRespiratoria}
                      onChange={(e) => setValue(setGeneralExam, 'frecuenciaRespiratoria', e.target.value)}
                      placeholder="20"
                    />
                    <RadioGroup
                      options={OPTIONS.frEstado}
                      value={generalExam.frecuenciaRespiratoriaEstado}
                      onChange={(v) => setValue(setGeneralExam, 'frecuenciaRespiratoriaEstado', v)}
                      name="frEstado"
                      columns={3}
                    />
                  </div>
                </div>
                <div className="vital-item">
                  <label>💗 Pulso</label>
                  <RadioGroup
                    options={OPTIONS.pulso}
                    value={generalExam.pulso}
                    onChange={(v) => setValue(setGeneralExam, 'pulso', v)}
                    name="pulso"
                    columns={4}
                  />
                </div>
              </div>
            </Section>

            <Section title="Hidratación" icon="💧" name="hidratacion">
              <RadioGroup
                options={OPTIONS.hidratacion}
                value={generalExam.hidratacion}
                onChange={(v) => setValue(setGeneralExam, 'hidratacion', v)}
                name="hidratacion"
                columns={3}
              />
            </Section>

            <Section title="Cabeza y Cuello" icon="👃" name="cabeza">
              <div className="subsection">
                <h5>👁️ Ojos</h5>
                <CheckboxGroup
                  options={OPTIONS.ojos}
                  values={generalExam.ojos}
                  onChange={(v) => toggleArrayValue(setGeneralExam, 'ojos', v)}
                  columns={5}
                />
              </div>
              <div className="subsection">
                <h5>👂 Oídos</h5>
                <CheckboxGroup
                  options={OPTIONS.oidos}
                  values={generalExam.oidos}
                  onChange={(v) => toggleArrayValue(setGeneralExam, 'oidos', v)}
                  columns={5}
                />
              </div>
              <div className="subsection">
                <h5>👃 Nariz</h5>
                <CheckboxGroup
                  options={OPTIONS.nariz}
                  values={generalExam.nariz}
                  onChange={(v) => toggleArrayValue(setGeneralExam, 'nariz', v)}
                  columns={4}
                />
              </div>
              <div className="subsection">
                <h5>🦷 Boca y Dientes</h5>
                <CheckboxGroup
                  options={OPTIONS.boca}
                  values={generalExam.boca}
                  onChange={(v) => toggleArrayValue(setGeneralExam, 'boca', v)}
                  columns={5}
                />
              </div>
              <div className="subsection">
                <h5>🔘 Linfonodos (Estado General)</h5>
                <CheckboxGroup
                  options={OPTIONS.linfonodos}
                  values={generalExam.linfonodos}
                  onChange={(v) => toggleArrayValue(setGeneralExam, 'linfonodos', v)}
                  columns={3}
                />
              </div>
              <div className="subsection linfonodos-palpables">
                <h5>🔬 Linfonodos Palpables (Especificar)</h5>
                <div className="linfonodos-grid">
                  <div className="linfonodo-item">
                    <label>Submandibulares</label>
                    <CheckboxGroup
                      options={OPTIONS.linfonodoEstado}
                      values={generalExam.linfonodoSubmandibular}
                      onChange={(v) => toggleArrayValue(setGeneralExam, 'linfonodoSubmandibular', v)}
                      columns={4}
                    />
                  </div>
                  <div className="linfonodo-item">
                    <label>Preescapulares</label>
                    <CheckboxGroup
                      options={OPTIONS.linfonodoEstado}
                      values={generalExam.linfonodoPreescapular}
                      onChange={(v) => toggleArrayValue(setGeneralExam, 'linfonodoPreescapular', v)}
                      columns={4}
                    />
                  </div>
                  <div className="linfonodo-item">
                    <label>Axilares</label>
                    <CheckboxGroup
                      options={OPTIONS.linfonodoEstado}
                      values={generalExam.linfonodoAxilar}
                      onChange={(v) => toggleArrayValue(setGeneralExam, 'linfonodoAxilar', v)}
                      columns={4}
                    />
                  </div>
                  <div className="linfonodo-item">
                    <label>Inguinales</label>
                    <CheckboxGroup
                      options={OPTIONS.linfonodoEstado}
                      values={generalExam.linfonodoInguinal}
                      onChange={(v) => toggleArrayValue(setGeneralExam, 'linfonodoInguinal', v)}
                      columns={4}
                    />
                  </div>
                  <div className="linfonodo-item">
                    <label>Poplíteos</label>
                    <CheckboxGroup
                      options={OPTIONS.linfonodoEstado}
                      values={generalExam.linfonodoPopliteo}
                      onChange={(v) => toggleArrayValue(setGeneralExam, 'linfonodoPopliteo', v)}
                      columns={4}
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Sistema Cardiorespiratorio" icon="❤️" name="cardio">
              <div className="subsection">
                <h5>💓 Corazón</h5>
                <CheckboxGroup
                  options={OPTIONS.corazon}
                  values={generalExam.corazon}
                  onChange={(v) => toggleArrayValue(setGeneralExam, 'corazon', v)}
                  columns={3}
                />
              </div>
              <div className="subsection">
                <h5>🫁 Pulmones</h5>
                <CheckboxGroup
                  options={OPTIONS.pulmones}
                  values={generalExam.pulmones}
                  onChange={(v) => toggleArrayValue(setGeneralExam, 'pulmones', v)}
                  columns={4}
                />
              </div>
            </Section>

            <Section title="Abdomen" icon="🔵" name="abdomen">
              <CheckboxGroup
                options={OPTIONS.abdomen}
                values={generalExam.abdomen}
                onChange={(v) => toggleArrayValue(setGeneralExam, 'abdomen', v)}
                columns={5}
              />
            </Section>

            <Section title="Sistema Musculoesquelético" icon="💪" name="musculo">
              <CheckboxGroup
                options={OPTIONS.musculoesqueletico}
                values={generalExam.musculoesqueletico}
                onChange={(v) => toggleArrayValue(setGeneralExam, 'musculoesqueletico', v)}
                columns={3}
              />
            </Section>

            <Section title="Sistema Neurológico (Básico)" icon="🧠" name="neuro">
              <CheckboxGroup
                options={OPTIONS.neurologico}
                values={generalExam.neurologico}
                onChange={(v) => toggleArrayValue(setGeneralExam, 'neurologico', v)}
                columns={3}
              />
            </Section>

            <Section title="Piel y Anexos" icon="🐾" name="piel">
              <CheckboxGroup
                options={OPTIONS.piel}
                values={generalExam.piel}
                onChange={(v) => toggleArrayValue(setGeneralExam, 'piel', v)}
                columns={3}
              />
            </Section>

            <Section title="Sistema Urogenital" icon="🔬" name="urogenital">
              <CheckboxGroup
                options={OPTIONS.urogenital}
                values={generalExam.urogenital}
                onChange={(v) => toggleArrayValue(setGeneralExam, 'urogenital', v)}
                columns={4}
              />
            </Section>

            <Section title="Región Perianal" icon="⭕" name="perianal">
              <CheckboxGroup
                options={OPTIONS.perianal}
                values={generalExam.perianal}
                onChange={(v) => toggleArrayValue(setGeneralExam, 'perianal', v)}
                columns={4}
              />
            </Section>

            <Section title="Observaciones Generales" icon="📝" name="observaciones">
              <textarea
                value={generalExam.observaciones}
                onChange={(e) => setValue(setGeneralExam, 'observaciones', e.target.value)}
                rows={4}
                placeholder="Observaciones adicionales del examen físico..."
              />
            </Section>
          </div>
        )}

        {/* ========== EXAMEN NEUROLÓGICO ========== */}
        {activeTab === 'neurologico' && (
          <div className="exam-neurologico">
            <div className="exam-header-info">
              <span className="info-badge">🧠 Examen Neurológico Especializado</span>
            </div>

            <Section title="Estado Mental" icon="🧠" name="neuroMental">
              <RadioGroup
                options={['Normal/Alerta', 'Depresivo', 'Letárgico', 'Estupor', 'Coma']}
                value={neuroExam.estadoMental}
                onChange={(v) => setValue(setNeuroExam, 'estadoMental', v)}
                name="neuroMental"
                columns={5}
              />
            </Section>

            <Section title="Postura" icon="🧍" name="neuroPostura">
              <CheckboxGroup
                options={OPTIONS.neuroPostura}
                values={neuroExam.postura}
                onChange={(v) => toggleArrayValue(setNeuroExam, 'postura', v)}
                columns={3}
              />
            </Section>

            <Section title="Marcha" icon="🚶" name="neuroMarcha">
              <CheckboxGroup
                options={OPTIONS.neuroMarcha}
                values={neuroExam.marcha}
                onChange={(v) => toggleArrayValue(setNeuroExam, 'marcha', v)}
                columns={3}
              />
            </Section>

            <Section title="Nervios Craneales" icon="🔌" name="nerviosCraneales">
              <div className="cranial-nerves-grid">
                <div className="cn-item">
                  <span className="cn-label">NC I - Olfatorio</span>
                  <RadioGroup
                    options={OPTIONS.neuroNC1}
                    value={neuroExam.nerviosCraneales?.nc1_olfatorio}
                    onChange={(v) => setNeuroExam(prev => ({
                      ...prev,
                      nerviosCraneales: { ...prev.nerviosCraneales, nc1_olfatorio: v }
                    }))}
                    name="nc1"
                    columns={2}
                  />
                </div>
                <div className="cn-item">
                  <span className="cn-label">NC II - Óptico</span>
                  <RadioGroup
                    options={OPTIONS.neuroNC2}
                    value={neuroExam.nerviosCraneales?.nc2_optico}
                    onChange={(v) => setNeuroExam(prev => ({
                      ...prev,
                      nerviosCraneales: { ...prev.nerviosCraneales, nc2_optico: v }
                    }))}
                    name="nc2"
                    columns={2}
                  />
                </div>
                <div className="cn-item">
                  <span className="cn-label">NC III, IV, VI - Oculomotores</span>
                  <CheckboxGroup
                    options={OPTIONS.neuroNC346}
                    values={neuroExam.nerviosCraneales?.nc3_4_6_oculomotores || []}
                    onChange={(v) => {
                      const arr = neuroExam.nerviosCraneales?.nc3_4_6_oculomotores || [];
                      const newArr = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
                      setNeuroExam(prev => ({
                        ...prev,
                        nerviosCraneales: { ...prev.nerviosCraneales, nc3_4_6_oculomotores: newArr }
                      }));
                    }}
                    columns={3}
                  />
                </div>
                <div className="cn-item">
                  <span className="cn-label">NC V - Trigémino</span>
                  <RadioGroup
                    options={OPTIONS.neuroNC5}
                    value={neuroExam.nerviosCraneales?.nc5_trigemino}
                    onChange={(v) => setNeuroExam(prev => ({
                      ...prev,
                      nerviosCraneales: { ...prev.nerviosCraneales, nc5_trigemino: v }
                    }))}
                    name="nc5"
                    columns={3}
                  />
                </div>
                <div className="cn-item">
                  <span className="cn-label">NC VII - Facial</span>
                  <RadioGroup
                    options={OPTIONS.neuroNC7}
                    value={neuroExam.nerviosCraneales?.nc7_facial}
                    onChange={(v) => setNeuroExam(prev => ({
                      ...prev,
                      nerviosCraneales: { ...prev.nerviosCraneales, nc7_facial: v }
                    }))}
                    name="nc7"
                    columns={2}
                  />
                </div>
                <div className="cn-item">
                  <span className="cn-label">NC VIII - Vestibulococlear</span>
                  <CheckboxGroup
                    options={OPTIONS.neuroNC8}
                    values={neuroExam.nerviosCraneales?.nc8_vestibulococlear || []}
                    onChange={(v) => {
                      const arr = neuroExam.nerviosCraneales?.nc8_vestibulococlear || [];
                      const newArr = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
                      setNeuroExam(prev => ({
                        ...prev,
                        nerviosCraneales: { ...prev.nerviosCraneales, nc8_vestibulococlear: newArr }
                      }));
                    }}
                    columns={3}
                  />
                </div>
                <div className="cn-item">
                  <span className="cn-label">NC IX, X - Glosofaríngeo/Vago</span>
                  <RadioGroup
                    options={OPTIONS.neuroNC910}
                    value={neuroExam.nerviosCraneales?.nc9_10_glosofaringeo}
                    onChange={(v) => setNeuroExam(prev => ({
                      ...prev,
                      nerviosCraneales: { ...prev.nerviosCraneales, nc9_10_glosofaringeo: v }
                    }))}
                    name="nc910"
                    columns={2}
                  />
                </div>
                <div className="cn-item">
                  <span className="cn-label">NC XII - Hipogloso</span>
                  <CheckboxGroup
                    options={OPTIONS.neuroNC12}
                    values={neuroExam.nerviosCraneales?.nc12_hipogloso || []}
                    onChange={(v) => {
                      const arr = neuroExam.nerviosCraneales?.nc12_hipogloso || [];
                      const newArr = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
                      setNeuroExam(prev => ({
                        ...prev,
                        nerviosCraneales: { ...prev.nerviosCraneales, nc12_hipogloso: newArr }
                      }));
                    }}
                    columns={3}
                  />
                </div>
              </div>
            </Section>

            <Section title="Reacciones Posturales (Propiocepción)" icon="🦶" name="propiocepcion">
              <RadioGroup
                options={OPTIONS.neuroPropiocepcion}
                value={neuroExam.propiocepcion}
                onChange={(v) => setValue(setNeuroExam, 'propiocepcion', v)}
                name="propiocepcion"
                columns={3}
              />
              <h5>Pruebas realizadas:</h5>
              <CheckboxGroup
                options={OPTIONS.neuroPruebasProp}
                values={neuroExam.pruebasPropiocepcion}
                onChange={(v) => toggleArrayValue(setNeuroExam, 'pruebasPropiocepcion', v)}
                columns={3}
              />
            </Section>

            <Section title="Reflejos Espinales" icon="⚡" name="reflejos">
              <div className="reflexes-grid">
                <div className="reflex-item">
                  <h5>Extremidades Torácicas (Flexor)</h5>
                  <RadioGroup
                    options={OPTIONS.neuroReflejos}
                    value={neuroExam.reflejosToracicos}
                    onChange={(v) => setValue(setNeuroExam, 'reflejosToracicos', v)}
                    name="refToracicos"
                    columns={4}
                  />
                </div>
                <div className="reflex-item">
                  <h5>Extremidades Pélvicas (Patelar)</h5>
                  <RadioGroup
                    options={OPTIONS.neuroReflejos}
                    value={neuroExam.reflejosPelvicos}
                    onChange={(v) => setValue(setNeuroExam, 'reflejosPelvicos', v)}
                    name="refPelvicos"
                    columns={4}
                  />
                </div>
              </div>
            </Section>

            <Section title="Tono Muscular" icon="💪" name="tonoMuscular">
              <RadioGroup
                options={OPTIONS.neuroTono}
                value={neuroExam.tonoMuscular}
                onChange={(v) => setValue(setNeuroExam, 'tonoMuscular', v)}
                name="tonoMuscular"
                columns={3}
              />
            </Section>

            <Section title="Sensibilidad al Dolor" icon="😣" name="sensibilidad">
              <div className="sensitivity-grid">
                <div className="sens-item">
                  <h5>Superficial</h5>
                  <RadioGroup
                    options={OPTIONS.neuroSensibilidad}
                    value={neuroExam.sensibilidadSuperficial}
                    onChange={(v) => setValue(setNeuroExam, 'sensibilidadSuperficial', v)}
                    name="sensSuperficial"
                    columns={2}
                  />
                </div>
                <div className="sens-item">
                  <h5>Profunda</h5>
                  <RadioGroup
                    options={OPTIONS.neuroSensibilidad}
                    value={neuroExam.sensibilidadProfunda}
                    onChange={(v) => setValue(setNeuroExam, 'sensibilidadProfunda', v)}
                    name="sensProfunda"
                    columns={2}
                  />
                </div>
              </div>
            </Section>

            <Section title="Control de Esfínteres" icon="🔘" name="esfinteres">
              <CheckboxGroup
                options={OPTIONS.neuroEsfinteres}
                values={neuroExam.controlEsfinteres}
                onChange={(v) => toggleArrayValue(setNeuroExam, 'controlEsfinteres', v)}
                columns={3}
              />
            </Section>

            <Section title="Localización Neurológica (Impresión)" icon="📍" name="localizacion">
              <CheckboxGroup
                options={OPTIONS.neuroLocalizacion}
                values={neuroExam.localizacion}
                onChange={(v) => toggleArrayValue(setNeuroExam, 'localizacion', v)}
                columns={4}
              />
            </Section>

            <Section title="Observaciones" icon="📝" name="neuroObs">
              <textarea
                value={neuroExam.observaciones}
                onChange={(e) => setValue(setNeuroExam, 'observaciones', e.target.value)}
                rows={4}
                placeholder="Observaciones del examen neurológico..."
              />
            </Section>
          </div>
        )}

        {/* ========== EXAMEN DERMATOLÓGICO ========== */}
        {activeTab === 'dermatologico' && (
          <div className="exam-dermatologico">
            <div className="exam-header-info">
              <span className="info-badge">🔬 Examen Dermatológico Especializado</span>
            </div>

            <Section title="Condición General de la Piel" icon="🧴" name="dermaCond">
              <CheckboxGroup
                options={OPTIONS.dermaCondicion}
                values={dermaExam.condicionPiel}
                onChange={(v) => toggleArrayValue(setDermaExam, 'condicionPiel', v)}
                columns={5}
              />
            </Section>

            <Section title="Pelaje" icon="🐕" name="dermaPelaje">
              <CheckboxGroup
                options={OPTIONS.dermaPelaje}
                values={dermaExam.pelaje}
                onChange={(v) => toggleArrayValue(setDermaExam, 'pelaje', v)}
                columns={3}
              />
            </Section>

            <Section title="Distribución de las Lesiones" icon="📍" name="dermaDist">
              <CheckboxGroup
                options={OPTIONS.dermaDistribucion}
                values={dermaExam.distribucionLesiones}
                onChange={(v) => toggleArrayValue(setDermaExam, 'distribucionLesiones', v)}
                columns={4}
              />
            </Section>

            <Section title="Lesiones Primarias" icon="🔴" name="dermaLesP">
              <CheckboxGroup
                options={OPTIONS.dermaLesionesPrim}
                values={dermaExam.lesionesPrimarias}
                onChange={(v) => toggleArrayValue(setDermaExam, 'lesionesPrimarias', v)}
                columns={3}
              />
            </Section>

            <Section title="Lesiones Secundarias" icon="🟡" name="dermaLesS">
              <CheckboxGroup
                options={OPTIONS.dermaLesionesSec}
                values={dermaExam.lesionesSecundarias}
                onChange={(v) => toggleArrayValue(setDermaExam, 'lesionesSecundarias', v)}
                columns={3}
              />
            </Section>

            <Section title="Prurito" icon="😣" name="dermaPrurito">
              <RadioGroup
                options={OPTIONS.dermaPrurito}
                value={dermaExam.prurito}
                onChange={(v) => setValue(setDermaExam, 'prurito', v)}
                name="prurito"
                columns={4}
              />
            </Section>

            <Section title="Olor Cutáneo" icon="👃" name="dermaOlor">
              <RadioGroup
                options={OPTIONS.dermaOlor}
                value={dermaExam.olorCutaneo}
                onChange={(v) => setValue(setDermaExam, 'olorCutaneo', v)}
                name="olorCutaneo"
                columns={4}
              />
            </Section>

            <Section title="Parásitos" icon="🐛" name="dermaParasitos">
              <CheckboxGroup
                options={OPTIONS.dermaParasitos}
                values={dermaExam.parasitos}
                onChange={(v) => toggleArrayValue(setDermaExam, 'parasitos', v)}
                columns={4}
              />
            </Section>

            <Section title="Oídos" icon="👂" name="dermaOidos">
              <CheckboxGroup
                options={OPTIONS.dermaOidos}
                values={dermaExam.oidos}
                onChange={(v) => toggleArrayValue(setDermaExam, 'oidos', v)}
                columns={5}
              />
            </Section>

            <Section title="Uñas y Almohadillas" icon="🐾" name="dermaUnas">
              <CheckboxGroup
                options={OPTIONS.dermaUnas}
                values={dermaExam.unasAlmohadillas}
                onChange={(v) => toggleArrayValue(setDermaExam, 'unasAlmohadillas', v)}
                columns={5}
              />
            </Section>

            <Section title="Pruebas Complementarias Realizadas" icon="🧪" name="dermaPruebas">
              <CheckboxGroup
                options={OPTIONS.dermaPruebas}
                values={dermaExam.pruebasRealizadas}
                onChange={(v) => toggleArrayValue(setDermaExam, 'pruebasRealizadas', v)}
                columns={3}
              />
            </Section>

            <Section title="Impresión Dermatológica" icon="🎯" name="dermaImp">
              <CheckboxGroup
                options={OPTIONS.dermaImpresion}
                values={dermaExam.impresion}
                onChange={(v) => toggleArrayValue(setDermaExam, 'impresion', v)}
                columns={4}
              />
            </Section>

            <Section title="Observaciones" icon="📝" name="dermaObs">
              <textarea
                value={dermaExam.observaciones}
                onChange={(e) => setValue(setDermaExam, 'observaciones', e.target.value)}
                rows={4}
                placeholder="Observaciones del examen dermatológico..."
              />
            </Section>
          </div>
        )}

        {/* ========== EXAMEN OFTALMOLÓGICO ========== */}
        {activeTab === 'oftalmologico' && (
          <div className="exam-oftalmologico">
            <div className="exam-header-info">
              <span className="info-badge">👁️ Examen Oftalmológico Especializado</span>
              <span className="info-badge lateral">OD = Ojo Derecho | OI = Ojo Izquierdo</span>
            </div>

            <Section title="Observación General" icon="👀" name="oftalmoObs">
              <CheckboxGroup
                options={OPTIONS.oftalmoObs}
                values={oftalmoExam.observacionGeneral}
                onChange={(v) => toggleArrayValue(setOftalmoExam, 'observacionGeneral', v)}
                columns={5}
              />
            </Section>

            <Section title="Párpados y Anexos" icon="👁️" name="oftalmoParp">
              <div className="eyes-grid">
                <div className="eye-section">
                  <span className="eye-label">OD</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoParpados}
                    values={oftalmoExam.parpadosOD}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'parpadosOD', v)}
                    columns={2}
                  />
                </div>
                <div className="eye-section">
                  <span className="eye-label">OI</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoParpados}
                    values={oftalmoExam.parpadosOI}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'parpadosOI', v)}
                    columns={2}
                  />
                </div>
              </div>
            </Section>

            <Section title="Conjuntiva" icon="🔴" name="oftalmoConj">
              <div className="eyes-grid">
                <div className="eye-section">
                  <span className="eye-label">OD</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoConjuntiva}
                    values={oftalmoExam.conjuntivaOD}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'conjuntivaOD', v)}
                    columns={2}
                  />
                </div>
                <div className="eye-section">
                  <span className="eye-label">OI</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoConjuntiva}
                    values={oftalmoExam.conjuntivaOI}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'conjuntivaOI', v)}
                    columns={2}
                  />
                </div>
              </div>
            </Section>

            <Section title="Córnea" icon="⭕" name="oftalmoCornea">
              <div className="eyes-grid">
                <div className="eye-section">
                  <span className="eye-label">OD</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoCornea}
                    values={oftalmoExam.corneaOD}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'corneaOD', v)}
                    columns={2}
                  />
                </div>
                <div className="eye-section">
                  <span className="eye-label">OI</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoCornea}
                    values={oftalmoExam.corneaOI}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'corneaOI', v)}
                    columns={2}
                  />
                </div>
              </div>
            </Section>

            <Section title="Cámara Anterior" icon="💧" name="oftalmoCamara">
              <div className="eyes-grid">
                <div className="eye-section">
                  <span className="eye-label">OD</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoCamara}
                    values={oftalmoExam.camaraAnteriorOD}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'camaraAnteriorOD', v)}
                    columns={2}
                  />
                </div>
                <div className="eye-section">
                  <span className="eye-label">OI</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoCamara}
                    values={oftalmoExam.camaraAnteriorOI}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'camaraAnteriorOI', v)}
                    columns={2}
                  />
                </div>
              </div>
            </Section>

            <Section title="Iris y Pupila" icon="🔵" name="oftalmoIris">
              <div className="eyes-grid">
                <div className="eye-section">
                  <span className="eye-label">OD</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoIris}
                    values={oftalmoExam.irisPupilaOD}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'irisPupilaOD', v)}
                    columns={2}
                  />
                </div>
                <div className="eye-section">
                  <span className="eye-label">OI</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoIris}
                    values={oftalmoExam.irisPupilaOI}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'irisPupilaOI', v)}
                    columns={2}
                  />
                </div>
              </div>
            </Section>

            <Section title="Reflejos Pupilares" icon="💡" name="oftalmoRefl">
              <div className="eyes-grid">
                <div className="eye-section">
                  <span className="eye-label">OD</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoReflejos}
                    values={oftalmoExam.reflejosPupilaresOD}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'reflejosPupilaresOD', v)}
                    columns={2}
                  />
                </div>
                <div className="eye-section">
                  <span className="eye-label">OI</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoReflejos}
                    values={oftalmoExam.reflejosPupilaresOI}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'reflejosPupilaresOI', v)}
                    columns={2}
                  />
                </div>
              </div>
            </Section>

            <Section title="Cristalino" icon="🔮" name="oftalmoCrist">
              <div className="eyes-grid">
                <div className="eye-section">
                  <span className="eye-label">OD</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoCristalino}
                    values={oftalmoExam.cristalinoOD}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'cristalinoOD', v)}
                    columns={2}
                  />
                </div>
                <div className="eye-section">
                  <span className="eye-label">OI</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoCristalino}
                    values={oftalmoExam.cristalinoOI}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'cristalinoOI', v)}
                    columns={2}
                  />
                </div>
              </div>
            </Section>

            <Section title="Presión Intraocular (PIO)" icon="📊" name="oftalmoPIO">
              <div className="eyes-grid">
                <div className="eye-section pio">
                  <span className="eye-label">OD</span>
                  <RadioGroup
                    options={OPTIONS.oftalmoPIO}
                    value={oftalmoExam.presionIntraocularOD}
                    onChange={(v) => setValue(setOftalmoExam, 'presionIntraocularOD', v)}
                    name="pioOD"
                    columns={1}
                  />
                  <div className="pio-value">
                    <label>mmHg:</label>
                    <input
                      type="number"
                      value={oftalmoExam.pioValorOD}
                      onChange={(e) => setValue(setOftalmoExam, 'pioValorOD', e.target.value)}
                      placeholder="15"
                    />
                  </div>
                </div>
                <div className="eye-section pio">
                  <span className="eye-label">OI</span>
                  <RadioGroup
                    options={OPTIONS.oftalmoPIO}
                    value={oftalmoExam.presionIntraocularOI}
                    onChange={(v) => setValue(setOftalmoExam, 'presionIntraocularOI', v)}
                    name="pioOI"
                    columns={1}
                  />
                  <div className="pio-value">
                    <label>mmHg:</label>
                    <input
                      type="number"
                      value={oftalmoExam.pioValorOI}
                      onChange={(e) => setValue(setOftalmoExam, 'pioValorOI', e.target.value)}
                      placeholder="15"
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Fondo de Ojo" icon="🔍" name="oftalmoFondo">
              <div className="eyes-grid">
                <div className="eye-section">
                  <span className="eye-label">OD</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoFondo}
                    values={oftalmoExam.fondoOjoOD}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'fondoOjoOD', v)}
                    columns={2}
                  />
                </div>
                <div className="eye-section">
                  <span className="eye-label">OI</span>
                  <CheckboxGroup
                    options={OPTIONS.oftalmoFondo}
                    values={oftalmoExam.fondoOjoOI}
                    onChange={(v) => toggleArrayValue(setOftalmoExam, 'fondoOjoOI', v)}
                    columns={2}
                  />
                </div>
              </div>
            </Section>

            <Section title="Pruebas Complementarias" icon="🧪" name="oftalmoPruebas">
              <CheckboxGroup
                options={OPTIONS.oftalmoPruebas}
                values={oftalmoExam.pruebasComplementarias}
                onChange={(v) => toggleArrayValue(setOftalmoExam, 'pruebasComplementarias', v)}
                columns={5}
              />
            </Section>

            <Section title="Impresión Oftalmológica" icon="🎯" name="oftalmoImp">
              <CheckboxGroup
                options={OPTIONS.oftalmoImpresion}
                values={oftalmoExam.impresion}
                onChange={(v) => toggleArrayValue(setOftalmoExam, 'impresion', v)}
                columns={4}
              />
            </Section>

            <Section title="Observaciones" icon="📝" name="oftalmoObsText">
              <textarea
                value={oftalmoExam.observaciones}
                onChange={(e) => setValue(setOftalmoExam, 'observaciones', e.target.value)}
                rows={4}
                placeholder="Observaciones del examen oftalmológico..."
              />
            </Section>
          </div>
        )}

        {/* ========== EXAMEN ORTOPÉDICO ========== */}
        {activeTab === 'ortopedico' && (
          <div className="exam-ortopedico">
            <div className="exam-header-info">
              <span className="info-badge">🦴 Examen Ortopédico Especializado</span>
              <div className="laterality-legend">
                <span>D = Derecho</span>
                <span>I = Izquierdo</span>
                <span>A = Ambos</span>
              </div>
            </div>

            <Section title="Observación General" icon="👀" name="ortoObs">
              <CheckboxGroup
                options={OPTIONS.ortoObs}
                values={ortoExam.observacionGeneral}
                onChange={(v) => toggleArrayValue(setOrtoExam, 'observacionGeneral', v)}
                columns={5}
              />
            </Section>

            <Section title="Marcha" icon="🚶" name="ortoMarcha">
              <CheckboxGroup
                options={OPTIONS.ortoMarcha}
                values={ortoExam.marcha}
                onChange={(v) => toggleArrayValue(setOrtoExam, 'marcha', v)}
                columns={5}
              />
            </Section>

            <Section title="Palpación General" icon="✋" name="ortoPalp">
              <CheckboxGroup
                options={OPTIONS.ortoPalpacion}
                values={ortoExam.palpacionGeneral}
                onChange={(v) => toggleArrayValue(setOrtoExam, 'palpacionGeneral', v)}
                columns={5}
              />
            </Section>

            <Section title="Extremidades Torácicas" icon="🦵" name="ortoToracicas">
              <div className="limbs-grid">
                <div className="limb-section">
                  <h5>Hombro</h5>
                  <div className="limb-sides">
                    <div className="side">
                      <span className="side-label">D</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.hombroD}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'hombroD', v)}
                        columns={2}
                      />
                    </div>
                    <div className="side">
                      <span className="side-label">I</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.hombroI}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'hombroI', v)}
                        columns={2}
                      />
                    </div>
                  </div>
                </div>
                <div className="limb-section">
                  <h5>Codo</h5>
                  <div className="limb-sides">
                    <div className="side">
                      <span className="side-label">D</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.codoD}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'codoD', v)}
                        columns={2}
                      />
                    </div>
                    <div className="side">
                      <span className="side-label">I</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.codoI}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'codoI', v)}
                        columns={2}
                      />
                    </div>
                  </div>
                </div>
                <div className="limb-section">
                  <h5>Carpo</h5>
                  <div className="limb-sides">
                    <div className="side">
                      <span className="side-label">D</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.carpoD}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'carpoD', v)}
                        columns={2}
                      />
                    </div>
                    <div className="side">
                      <span className="side-label">I</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.carpoI}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'carpoI', v)}
                        columns={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Extremidades Pélvicas" icon="🦿" name="ortoPelvicas">
              <div className="limbs-grid">
                <div className="limb-section">
                  <h5>Cadera</h5>
                  <div className="limb-sides">
                    <div className="side">
                      <span className="side-label">D</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.caderaD}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'caderaD', v)}
                        columns={2}
                      />
                    </div>
                    <div className="side">
                      <span className="side-label">I</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.caderaI}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'caderaI', v)}
                        columns={2}
                      />
                    </div>
                  </div>
                </div>
                <div className="limb-section">
                  <h5>Rodilla</h5>
                  <div className="limb-sides">
                    <div className="side">
                      <span className="side-label">D</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.rodillaD}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'rodillaD', v)}
                        columns={2}
                      />
                    </div>
                    <div className="side">
                      <span className="side-label">I</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.rodillaI}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'rodillaI', v)}
                        columns={2}
                      />
                    </div>
                  </div>
                </div>
                <div className="limb-section">
                  <h5>Tarso</h5>
                  <div className="limb-sides">
                    <div className="side">
                      <span className="side-label">D</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.tarsoD}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'tarsoD', v)}
                        columns={2}
                      />
                    </div>
                    <div className="side">
                      <span className="side-label">I</span>
                      <CheckboxGroup
                        options={OPTIONS.ortoArticulacion}
                        values={ortoExam.tarsoI}
                        onChange={(v) => toggleArrayValue(setOrtoExam, 'tarsoI', v)}
                        columns={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Columna Vertebral" icon="🦴" name="ortoColumna">
              <CheckboxGroup
                options={OPTIONS.ortoColumna}
                values={ortoExam.columna}
                onChange={(v) => toggleArrayValue(setOrtoExam, 'columna', v)}
                columns={5}
              />
            </Section>

            <Section title="Masa Muscular" icon="💪" name="ortoMasa">
              <RadioGroup
                options={OPTIONS.ortoMasa}
                value={ortoExam.masaMuscular}
                onChange={(v) => setValue(setOrtoExam, 'masaMuscular', v)}
                name="masaMuscular"
                columns={4}
              />
            </Section>

            <Section title="Rango de Movimiento (ROM)" icon="🔄" name="ortoROM">
              <RadioGroup
                options={OPTIONS.ortoROM}
                value={ortoExam.rangoMovimiento}
                onChange={(v) => setValue(setOrtoExam, 'rangoMovimiento', v)}
                name="rom"
                columns={4}
              />
            </Section>

            <Section title="Estabilidad Articular" icon="🔒" name="ortoEstab">
              <RadioGroup
                options={OPTIONS.ortoEstabilidad}
                value={ortoExam.estabilidad}
                onChange={(v) => setValue(setOrtoExam, 'estabilidad', v)}
                name="estabilidad"
                columns={3}
              />
            </Section>

            <Section title="Impresión Ortopédica" icon="🎯" name="ortoImp">
              <CheckboxGroup
                options={OPTIONS.ortoImpresion}
                values={ortoExam.impresion}
                onChange={(v) => toggleArrayValue(setOrtoExam, 'impresion', v)}
                columns={3}
              />
            </Section>

            <Section title="Observaciones" icon="📝" name="ortoObs">
              <textarea
                value={ortoExam.observaciones}
                onChange={(e) => setValue(setOrtoExam, 'observaciones', e.target.value)}
                rows={4}
                placeholder="Observaciones del examen ortopédico..."
              />
            </Section>
          </div>
        )}
      </div>

      {/* ========== RESUMEN DEL EXAMEN ========== */}
      <div className="exam-summary">
        <h3 className="summary-title">📋 Resumen del Examen Físico</h3>
        <div className="summary-content">
          {/* Datos Generales */}
          {(generalExam.peso || generalExam.condicionCorporal) && (
            <div className="summary-section">
              <h4>⚖️ Peso y Condición</h4>
              <div className="summary-items">
                {generalExam.peso && <span className="summary-item">Peso: <strong>{generalExam.peso} kg</strong></span>}
                {generalExam.condicionCorporal && <span className="summary-item bcs">BCS: <strong>{generalExam.condicionCorporal}/9</strong></span>}
              </div>
            </div>
          )}

          {/* Estado Mental */}
          {generalExam.estadoMental.length > 0 && (
            <div className="summary-section">
              <h4>🧠 Estado Mental</h4>
              <div className="summary-tags">
                {generalExam.estadoMental.map(item => (
                  <span key={item} className="summary-tag mental">{item}</span>
                ))}
              </div>
            </div>
          )}

          {/* Constantes Fisiológicas */}
          {(generalExam.temperatura || generalExam.frecuenciaCardiaca || generalExam.frecuenciaRespiratoria || generalExam.pulso) && (
            <div className="summary-section">
              <h4>💓 Constantes Fisiológicas</h4>
              <div className="summary-vitals">
                {generalExam.temperatura && (
                  <span className={`summary-vital ${generalExam.temperaturaEstado === 'Hipertermia' ? 'alert' : generalExam.temperaturaEstado === 'Hipotermia' ? 'warning' : ''}`}>
                    🌡️ {generalExam.temperatura}°C {generalExam.temperaturaEstado && `(${generalExam.temperaturaEstado})`}
                  </span>
                )}
                {generalExam.frecuenciaCardiaca && (
                  <span className={`summary-vital ${generalExam.frecuenciaCardiacaEstado === 'Taquicardia' ? 'alert' : generalExam.frecuenciaCardiacaEstado === 'Bradicardia' ? 'warning' : ''}`}>
                    ❤️ FC: {generalExam.frecuenciaCardiaca} lpm {generalExam.frecuenciaCardiacaEstado && `(${generalExam.frecuenciaCardiacaEstado})`}
                  </span>
                )}
                {generalExam.frecuenciaRespiratoria && (
                  <span className={`summary-vital ${generalExam.frecuenciaRespiratoriaEstado === 'Taquipnea' ? 'alert' : generalExam.frecuenciaRespiratoriaEstado === 'Bradipnea' ? 'warning' : ''}`}>
                    🫁 FR: {generalExam.frecuenciaRespiratoria} rpm {generalExam.frecuenciaRespiratoriaEstado && `(${generalExam.frecuenciaRespiratoriaEstado})`}
                  </span>
                )}
                {generalExam.pulso && <span className="summary-vital">💗 Pulso: {generalExam.pulso}</span>}
              </div>
            </div>
          )}

          {/* Hidratación */}
          {generalExam.hidratacion && (
            <div className="summary-section">
              <h4>💧 Hidratación</h4>
              <span className={`summary-tag ${generalExam.hidratacion.includes('severa') ? 'alert' : generalExam.hidratacion.includes('moderada') ? 'warning' : 'normal'}`}>
                {generalExam.hidratacion}
              </span>
            </div>
          )}

          {/* Linfonodos Palpables */}
          {(generalExam.linfonodoSubmandibular.length > 0 || generalExam.linfonodoPreescapular.length > 0 || 
            generalExam.linfonodoAxilar.length > 0 || generalExam.linfonodoInguinal.length > 0 || 
            generalExam.linfonodoPopliteo.length > 0) && (
            <div className="summary-section">
              <h4>🔬 Linfonodos Palpables</h4>
              <div className="summary-linfonodos">
                {generalExam.linfonodoSubmandibular.length > 0 && (
                  <div className="linfonodo-summary">
                    <span className="linfonodo-name">Submandibulares:</span>
                    {generalExam.linfonodoSubmandibular.map(item => (
                      <span key={item} className={`summary-tag ${item === 'Aumentado' || item === 'Doloroso' ? 'warning' : 'normal'}`}>{item}</span>
                    ))}
                  </div>
                )}
                {generalExam.linfonodoPreescapular.length > 0 && (
                  <div className="linfonodo-summary">
                    <span className="linfonodo-name">Preescapulares:</span>
                    {generalExam.linfonodoPreescapular.map(item => (
                      <span key={item} className={`summary-tag ${item === 'Aumentado' || item === 'Doloroso' ? 'warning' : 'normal'}`}>{item}</span>
                    ))}
                  </div>
                )}
                {generalExam.linfonodoAxilar.length > 0 && (
                  <div className="linfonodo-summary">
                    <span className="linfonodo-name">Axilares:</span>
                    {generalExam.linfonodoAxilar.map(item => (
                      <span key={item} className={`summary-tag ${item === 'Aumentado' || item === 'Doloroso' ? 'warning' : 'normal'}`}>{item}</span>
                    ))}
                  </div>
                )}
                {generalExam.linfonodoInguinal.length > 0 && (
                  <div className="linfonodo-summary">
                    <span className="linfonodo-name">Inguinales:</span>
                    {generalExam.linfonodoInguinal.map(item => (
                      <span key={item} className={`summary-tag ${item === 'Aumentado' || item === 'Doloroso' ? 'warning' : 'normal'}`}>{item}</span>
                    ))}
                  </div>
                )}
                {generalExam.linfonodoPopliteo.length > 0 && (
                  <div className="linfonodo-summary">
                    <span className="linfonodo-name">Poplíteos:</span>
                    {generalExam.linfonodoPopliteo.map(item => (
                      <span key={item} className={`summary-tag ${item === 'Aumentado' || item === 'Doloroso' ? 'warning' : 'normal'}`}>{item}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hallazgos por Sistema */}
          {(generalExam.ojos.length > 0 || generalExam.oidos.length > 0 || generalExam.nariz.length > 0 || 
            generalExam.boca.length > 0 || generalExam.corazon.length > 0 || generalExam.pulmones.length > 0 ||
            generalExam.abdomen.length > 0 || generalExam.musculoesqueletico.length > 0 || 
            generalExam.neurologico.length > 0 || generalExam.piel.length > 0 || 
            generalExam.urogenital.length > 0 || generalExam.perianal.length > 0) && (
            <div className="summary-section">
              <h4>🩺 Hallazgos por Sistema</h4>
              <div className="summary-systems">
                {generalExam.ojos.length > 0 && generalExam.ojos.some(o => o !== 'Normales') && (
                  <div className="system-finding">
                    <span className="system-icon">👁️</span>
                    <span className="system-name">Ojos:</span>
                    <div className="system-values">
                      {generalExam.ojos.map(item => (
                        <span key={item} className={`summary-tag ${item !== 'Normales' ? 'finding' : 'normal'}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                {generalExam.oidos.length > 0 && generalExam.oidos.some(o => o !== 'Normales') && (
                  <div className="system-finding">
                    <span className="system-icon">👂</span>
                    <span className="system-name">Oídos:</span>
                    <div className="system-values">
                      {generalExam.oidos.map(item => (
                        <span key={item} className={`summary-tag ${item !== 'Normales' ? 'finding' : 'normal'}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                {generalExam.corazon.length > 0 && generalExam.corazon.some(o => o !== 'Ruidos normales') && (
                  <div className="system-finding">
                    <span className="system-icon">💓</span>
                    <span className="system-name">Corazón:</span>
                    <div className="system-values">
                      {generalExam.corazon.map(item => (
                        <span key={item} className={`summary-tag ${item !== 'Ruidos normales' ? 'alert' : 'normal'}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                {generalExam.pulmones.length > 0 && generalExam.pulmones.some(o => o !== 'Campos limpios') && (
                  <div className="system-finding">
                    <span className="system-icon">🫁</span>
                    <span className="system-name">Pulmones:</span>
                    <div className="system-values">
                      {generalExam.pulmones.map(item => (
                        <span key={item} className={`summary-tag ${item !== 'Campos limpios' ? 'warning' : 'normal'}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                {generalExam.abdomen.length > 0 && generalExam.abdomen.some(o => o !== 'Normal') && (
                  <div className="system-finding">
                    <span className="system-icon">🔍</span>
                    <span className="system-name">Abdomen:</span>
                    <div className="system-values">
                      {generalExam.abdomen.map(item => (
                        <span key={item} className={`summary-tag ${item !== 'Normal' ? 'warning' : 'normal'}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                {generalExam.neurologico.length > 0 && generalExam.neurologico.some(o => o !== 'Normal') && (
                  <div className="system-finding">
                    <span className="system-icon">🧠</span>
                    <span className="system-name">Neurológico:</span>
                    <div className="system-values">
                      {generalExam.neurologico.map(item => (
                        <span key={item} className={`summary-tag ${item !== 'Normal' ? 'alert' : 'normal'}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                {generalExam.piel.length > 0 && generalExam.piel.some(o => o !== 'Piel normal') && (
                  <div className="system-finding">
                    <span className="system-icon">🔬</span>
                    <span className="system-name">Piel:</span>
                    <div className="system-values">
                      {generalExam.piel.map(item => (
                        <span key={item} className={`summary-tag ${item !== 'Piel normal' ? 'finding' : 'normal'}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observaciones */}
          {generalExam.observaciones && (
            <div className="summary-section">
              <h4>📝 Observaciones</h4>
              <p className="summary-observations">{generalExam.observaciones}</p>
            </div>
          )}

          {/* Exámenes Especializados */}
          {(neuroExam.estadoMental || neuroExam.localizacion.length > 0 || 
            dermaExam.condicionPiel.length > 0 || dermaExam.impresion.length > 0 ||
            oftalmoExam.impresion.length > 0 || ortoExam.impresion.length > 0) && (
            <div className="summary-section specialized">
              <h4>🔬 Exámenes Especializados</h4>
              <div className="specialized-tags">
                {neuroExam.localizacion.length > 0 && (
                  <div className="specialized-item">
                    <span className="spec-label">🧠 Neuro:</span>
                    {neuroExam.localizacion.map(item => (
                      <span key={item} className="summary-tag neuro">{item}</span>
                    ))}
                  </div>
                )}
                {dermaExam.impresion.length > 0 && (
                  <div className="specialized-item">
                    <span className="spec-label">🔬 Derma:</span>
                    {dermaExam.impresion.map(item => (
                      <span key={item} className="summary-tag derma">{item}</span>
                    ))}
                  </div>
                )}
                {oftalmoExam.impresion.length > 0 && (
                  <div className="specialized-item">
                    <span className="spec-label">👁️ Oftalmo:</span>
                    {oftalmoExam.impresion.map(item => (
                      <span key={item} className="summary-tag oftalmo">{item}</span>
                    ))}
                  </div>
                )}
                {ortoExam.impresion.length > 0 && (
                  <div className="specialized-item">
                    <span className="spec-label">🦴 Orto:</span>
                    {ortoExam.impresion.map(item => (
                      <span key={item} className="summary-tag orto">{item}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mensaje si no hay datos */}
          {!generalExam.peso && !generalExam.condicionCorporal && generalExam.estadoMental.length === 0 && 
           !generalExam.temperatura && !generalExam.frecuenciaCardiaca && (
            <div className="summary-empty">
              <span className="empty-icon">📋</span>
              <p>Complete el examen físico para ver el resumen aquí</p>
            </div>
          )}
        </div>
      </div>

      {/* Botón de guardar */}
      <div className="exam-actions">
        <button 
          className={`btn-save-exam ${hasChanges ? 'has-changes' : ''}`}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '⏳ Guardando...' : hasChanges ? '💾 Guardar Cambios' : '✅ Guardado'}
        </button>
      </div>
    </div>
  );
}

export default ExamenFisico;
