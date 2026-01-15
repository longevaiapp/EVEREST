export const workflowData = {
  "nombre_workflow": "Flujo_Atencion_Hospital_Veterinario",
  "version": "1.0",
  "entidades": ["Recepcion", "Medico", "Farmacia", "Propietario", "Paciente"],
  "estado_inicial": "NODE_001",
  "nodos": [
    {
      "id": "NODE_001",
      "etapa": "RECEPCION",
      "accion": "Mascota llega al hospital. Recepción saluda y pregunta motivo de visita.",
      "siguiente_paso": "DECISION_001"
    },
    {
      "id": "DECISION_001",
      "tipo": "decision",
      "pregunta": "¿Cuál es el motivo de la visita?",
      "opciones": {
        "consulta_general": "NODE_002",
        "seguimiento": "NODE_002",
        "medicina_preventiva": "NODE_002_B"
      }
    },
    {
      "id": "NODE_002_B",
      "etapa": "TRIAGE",
      "accion": "Revisar calendario de medicina preventiva.",
      "siguiente_paso": "NODE_002"
    },
    {
      "id": "NODE_002",
      "etapa": "ADMISION",
      "acciones": [
        "Entrega de formato de declaración de antecedentes clínicos o seguimiento.",
        "Propietario llena formato.",
        "Recepción entrega letrero de Triage.",
        "Se pesa a la mascota."
      ],
      "siguiente_paso": "NODE_003"
    },
    {
      "id": "NODE_003",
      "etapa": "ASIGNACION",
      "accion": "Se asigna un médico y se ingresa al consultorio correspondiente.",
      "siguiente_paso": "DECISION_002"
    },
    {
      "id": "DECISION_002",
      "tipo": "decision",
      "pregunta": "¿Es primera visita?",
      "opciones": {
        "si": "NODE_004_A",
        "no": "NODE_004_B"
      }
    },
    {
      "id": "NODE_004_A",
      "etapa": "REGISTRO",
      "accion": "Se realiza el registro nuevo de la mascota.",
      "siguiente_paso": "NODE_005"
    },
    {
      "id": "NODE_004_B",
      "etapa": "REGISTRO",
      "accion": "Se consulta el registro existente de la mascota.",
      "siguiente_paso": "NODE_005"
    },
    {
      "id": "NODE_005",
      "etapa": "CONSULTA",
      "acciones": [
        "Anamnesis (Subjetivo)",
        "Examen Físico General (Objetivo - EFG)"
      ],
      "siguiente_paso": "DECISION_003"
    },
    {
      "id": "DECISION_003",
      "tipo": "decision",
      "pregunta": "¿El EFG fue suficiente para un diagnóstico presuntivo?",
      "opciones": {
        "si": "NODE_MEDICACION_DECISION",
        "no": "DECISION_004"
      }
    },
    {
      "id": "DECISION_004",
      "tipo": "decision",
      "pregunta": "¿Se requieren estudios complementarios?",
      "opciones": {
        "si": "NODE_006_ESTUDIOS",
        "no": "NODE_CONSULTA_ESPECIALIZADA"
      }
    },
    {
      "id": "NODE_CONSULTA_ESPECIALIZADA",
      "etapa": "INTERCONSULTA",
      "accion": "Consulta Especializada.",
      "siguiente_paso": "DECISION_005"
    },
    {
      "id": "DECISION_005",
      "tipo": "decision",
      "pregunta": "¿La revisión especializada fue suficiente para diagnóstico?",
      "opciones": {
        "si": "NODE_MEDICACION_DECISION",
        "no": "NODE_006_ESTUDIOS"
      }
    },
    {
      "id": "NODE_006_ESTUDIOS",
      "etapa": "DIAGNOSTICO",
      "tipo": "seleccion_multiple",
      "opciones_estudios": [
        "Hematológicos",
        "Coproparasitoscópicos",
        "Uroanálisis",
        "Radiográficos",
        "Ecográficos",
        "Electrocardiográficos"
      ],
      "siguiente_paso": "DECISION_SEDACION"
    },
    {
      "id": "DECISION_SEDACION",
      "tipo": "decision",
      "pregunta": "¿El paciente requiere ser sedado para el estudio?",
      "opciones": {
        "si": "NODE_007_AUTH_SEDACION",
        "no": "NODE_008_TOMA_MUESTRA"
      }
    },
    {
      "id": "NODE_007_AUTH_SEDACION",
      "etapa": "AUTORIZACION",
      "accion": "Recepción entrega formato de autorización a propietarios.",
      "siguiente_paso": "NODE_008_TOMA_MUESTRA"
    },
    {
      "id": "NODE_008_TOMA_MUESTRA",
      "etapa": "PROCESO_ESTUDIO",
      "acciones": [
        "Se programa estudio o toma de muestra.",
        "Médico/Químico procesa muestra o interpreta estudio.",
        "Se genera reporte y se carga al expediente."
      ],
      "siguiente_paso": "DECISION_CONFIRMACION_DX"
    },
    {
      "id": "DECISION_CONFIRMACION_DX",
      "tipo": "decision",
      "pregunta": "¿El estudio fue suficiente para confirmar el diagnóstico?",
      "opciones": {
        "si": "DECISION_CIRUGIA",
        "no": "NODE_CONSULTA_ESPECIALIZADA"
      }
    },
    {
      "id": "DECISION_CIRUGIA",
      "tipo": "decision",
      "pregunta": "¿El paciente requiere un procedimiento quirúrgico?",
      "opciones": {
        "si": "NODE_PRE_QUIRURGICO",
        "no": "NODE_MEDICACION_DECISION"
      }
    },
    {
      "id": "NODE_PRE_QUIRURGICO",
      "etapa": "CIRUGIA_PREP",
      "acciones": [
        "Determinar prioridad: Programable / De Emergencia / Prioritario",
        "Recepción entrega autorización de procedimiento.",
        "Inicio protocolo farmacológico prequirúrgico (Sedación)."
      ],
      "siguiente_paso": "NODE_QUIRURGICO"
    },
    {
      "id": "NODE_QUIRURGICO",
      "etapa": "CIRUGIA_ACTO",
      "acciones": [
        "Ingreso a quirófano.",
        "Inicio reporte quirúrgico.",
        "Realización del acto quirúrgico.",
        "Conclusión de reporte y anexo al expediente."
      ],
      "siguiente_paso": "DECISION_HOSPITALIZACION"
    },
    {
      "id": "DECISION_HOSPITALIZACION",
      "tipo": "decision",
      "pregunta": "¿El paciente requiere ser hospitalizado o cirugía fue ambulatoria?",
      "logica": "Si es ambulatoria -> Alta. Si requiere hospitalización -> Ingreso.",
      "opciones": {
        "ambulatoria": "NODE_ALTA_PROCESO",
        "hospitalizacion": "NODE_HOSPITALIZACION_INGRESO"
      }
    },
    {
      "id": "NODE_HOSPITALIZACION_INGRESO",
      "etapa": "HOSPITALIZACION",
      "acciones": [
        "Entrega de reglamento de hospitalización.",
        "Ingreso al área correspondiente.",
        "Generación de hoja de hospitalización."
      ],
      "siguiente_paso": "NODE_HOSPITALIZACION_MONITOREO"
    },
    {
      "id": "NODE_HOSPITALIZACION_MONITOREO",
      "etapa": "HOSPITALIZACION",
      "tipo": "bucle",
      "accion": "Se realizan EFG cada 1, 2, 4 o 6 horas según condición y se actualiza expediente.",
      "condicion_salida": "Estabilidad del paciente",
      "siguiente_paso": "NODE_ALTA_PROCESO"
    },
    {
      "id": "NODE_MEDICACION_DECISION",
      "tipo": "decision",
      "pregunta": "¿Se administrarán medicamentos de manera inmediata?",
      "opciones": {
        "si": "NODE_MEDICACION_INTERNA",
        "no": "NODE_RECETA_CASA"
      }
    },
    {
      "id": "NODE_MEDICACION_INTERNA",
      "etapa": "FARMACIA_INTERNA",
      "acciones": [
        "Médico solicita a farmacia.",
        "Farmacia registra y surte.",
        "Médico administra medicamento."
      ],
      "siguiente_paso": "NODE_RECETA_CASA"
    },
    {
      "id": "NODE_RECETA_CASA",
      "etapa": "FARMACIA_SALIDA",
      "condicion": "¿Se prescribe tratamiento a casa?",
      "acciones": [
        "Médico genera receta/indicaciones.",
        "Farmacia carga y entrega medicamentos si se surte ahí.",
        "Entrega de medicamentos al propietario."
      ],
      "siguiente_paso": "NODE_ALTA_PROCESO"
    },
    {
      "id": "NODE_ALTA_PROCESO",
      "etapa": "SALIDA",
      "acciones": [
        "Médico indica a recepción cuándo agendar visita de seguimiento.",
        "Recepción realiza el cobro correspondiente.",
        "Recepción valida disponibilidad de fecha y hora.",
        "Alta del paciente."
      ],
      "final": true
    }
  ]
};

// Datos mockup para la presentación
export const mockupData = {
  paciente: {
    nombre: "Max",
    especie: "Perro",
    raza: "Labrador",
    edad: "5 años",
    peso: "32 kg",
    propietario: "Juan Pérez",
    telefono: "555-1234"
  },
  historial: [
    {
      fecha: "2025-10-15",
      motivo: "Vacunación",
      medico: "Dr. García"
    },
    {
      fecha: "2025-08-20",
      motivo: "Consulta general",
      medico: "Dra. Martínez"
    }
  ]
};
