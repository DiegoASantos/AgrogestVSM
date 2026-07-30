"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Sun,
  Gauge,
  X
} from "lucide-react";

import { useAuthSession } from "../../modules/auth/hooks/use-auth-session";
import { climaService } from "../../modules/clima/services/clima.service";

type AlertRow = {
  publicId: string;
  pointId: string;
  pointName: string;
  severity: string;
  status: string;
  variable: string;
  value: number;
  unit: string;
  startsAt: string;
  endsAt: string;
};

const ALERT_VAR_ICONS: Record<string, typeof Thermometer> = {
  temperature_2m_max: Thermometer,
  temperature_2m_min: Thermometer,
  vapour_pressure_deficit: Gauge,
  wind_speed_10m_max: Wind,
  wind_gusts_10m_max: Wind,
  precipitation_sum: CloudRain,
  precipitation_probability: CloudRain,
  sunshine_duration: Sun,
  et0: Droplets
};

const ALERT_VAR_LABELS: Record<string, string> = {
  temperature_2m_max: "Temperatura máxima",
  temperature_2m_min: "Temperatura mínima",
  vapour_pressure_deficit: "Déficit de presión de vapor",
  wind_speed_10m_max: "Viento máximo",
  wind_gusts_10m_max: "Ráfagas de viento",
  precipitation_sum: "Lluvia acumulada",
  precipitation_probability: "Probabilidad de lluvia",
  sunshine_duration: "Horas de sol",
  et0: "Evapotranspiración"
};

const ALERT_IMPACTS: Record<string, Record<string, string>> = {
  temperature_2m_max: {
    PRECAUCION:
      "Temperaturas elevadas pueden causar estrés en floración. Monitorear riego y considerar bioestimulantes foliares.",
    ALTA: "Riesgo de aborto floral y caída de frutos recién cuajados. Aumentar frecuencia de riego para refrescar el microclima del huerto.",
    CRITICA:
      "Peligro de daño irreversible en floración y cuajado. Aplicar riego inmediato, evaluar malla sombra. Posible pérdida de rendimiento."
  },
  temperature_2m_min: {
    PRECAUCION:
      "Temperaturas bajas pueden retrasar la inducción floral. Las yemas requieren frío moderado.",
    ALTA: "Frío intenso: riesgo de detención del desarrollo floral. Puede afectar brotación en variedades sensibles como Kent.",
    CRITICA:
      "Temperaturas extremadamente bajas. Peligro de daño celular en yemas y frutos pequeños. Evaluar daños al amanecer."
  },
  vapour_pressure_deficit: {
    PRECAUCION:
      "VPD elevado: la atmósfera demanda más agua de la planta. Verificar humedad del suelo.",
    ALTA: "Estrés hídrico atmosférico. La planta cierra estomas reduciendo fotosíntesis. Afecta llenado de fruto y calibre.",
    CRITICA:
      "VPD crítico. La planta entra en modo supervivencia. Riego inmediato requerido. Riesgo de fruta pequeña y aborto."
  },
  wind_speed_10m_max: {
    PRECAUCION:
      "Viento moderado. Puede desprender flores y reducir cuajado. Evaluar cortinas rompeviento.",
    ALTA: "Viento fuerte: daño mecánico a flores, frutos y ramas jóvenes. Posible caída de fruta cuajada.",
    CRITICA:
      "Viento muy fuerte: riesgo de quiebre de ramas cargadas y caída masiva de frutos. Alejar al personal del campo."
  },
  wind_gusts_10m_max: {
    PRECAUCION: "Ráfagas moderadas. Pueden afectar polinización y dañar flores.",
    ALTA: "Ráfagas fuertes: riesgo de daño estructural en ramas con carga frutal. Posible rotura de ramas.",
    CRITICA:
      "Ráfagas extremadamente peligrosas. Alto riesgo de quiebre de cargadores. No realizar labores en campo."
  },
  precipitation_sum: {
    PRECAUCION:
      "Lluvia ligera. Si coincide con floración: riesgo leve de lavado de polen. En cosecha: posible manchado.",
    ALTA: "Lluvia significativa. En floración: reduce drásticamente el cuajado. En cosecha: riesgo de antracnosis post-cosecha.",
    CRITICA:
      "Lluvia intensa. Puede causar: lavado total de flores, caída de frutos, inundación, proliferación de hongos. Suspender cosecha."
  },
  precipitation_probability: {
    PRECAUCION:
      "Probabilidad elevada de lluvia. Precaución si hay floración o cosecha programada.",
    ALTA: "Alta probabilidad de lluvia. Planificar cobertura de fungicidas si hay fruta en desarrollo.",
    CRITICA:
      "Lluvia casi segura. Condiciones ideales para antracnosis. Proteger cosecha y aplicar preventivo urgente."
  },
  sunshine_duration: {
    PRECAUCION:
      "Horas de sol bajo lo óptimo. Puede retrasar acumulación de azúcares en frutos.",
    ALTA: "Muy pocas horas de sol. Riesgo de fruta con bajo azúcar, retraso en maduración y menor calidad.",
    CRITICA:
      "Déficit solar crítico. Fotosíntesis limitada. Afecta calibre, color y sabor. Puede retrasar cosecha."
  },
  et0: {
    PRECAUCION:
      "ET elevada. Aumentar monitoreo de humedad del suelo. El cultivo demanda más agua.",
    ALTA: "Alta demanda evaporativa. Requiere riego suplementario. Sin riego, la fruta no alcanza calibre de exportación.",
    CRITICA:
      "Demanda hídrica extrema. Déficit inminente sin riego. Riesgo de pérdida de calibre y aborto de frutos."
  }
};

function getImpact(variable: string, severity: string): string {
  return (
    ALERT_IMPACTS[variable]?.[severity] ??
    `Condición climática ${severity.toLowerCase()} detectada. Evaluar las condiciones en campo y ajustar el manejo agronómico según la etapa fenológica actual del cultivo.`
  );
}

function formatAlertDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

function severityBadge(severity: string) {
  const colors: Record<string, string> = {
    PRECAUCION: "climate-badge--precaucion",
    ALTA: "climate-badge--alta",
    CRITICA: "climate-badge--critica"
  };
  return <span className={`climate-badge ${colors[severity] ?? ""}`}>{severity}</span>;
}

const POLL_INTERVAL = 5 * 60 * 1000;

export function NotificationBell() {
  const { session } = useAuthSession();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!session) return;
    const fetchAlerts = () => {
      void climaService
        .getAlerts(session)
        .then((rows) => setAlerts(rows as AlertRow[]))
        .catch(() => {
          /* silencioso */
        });
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const active = alerts.filter((a) => a.status === "ACTIVA");
  const count = active.length;

  if (!session) return null;

  return (
    <>
      <button
        ref={bellRef}
        className="notification-bell"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
        aria-label={`Notificaciones${count > 0 ? `: ${count} alertas activas` : ""}`}
        title="Alertas climáticas"
      >
        <Bell size={18} />
        {count > 0 && <span className="notification-bell__badge">{count}</span>}
      </button>

      {isOpen && (
        <div ref={panelRef} className="notification-panel">
          <div className="notification-panel__header">
            <h3>Alertas climáticas</h3>
            <span>
              {count} activa{count !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="notification-panel__body">
            {active.length === 0 ? (
              <p className="notification-panel__empty">
                No hay alertas activas en este momento.
              </p>
            ) : (
              active.map((alert) => {
                const Icon = ALERT_VAR_ICONS[alert.variable] ?? AlertTriangle;
                return (
                  <button
                    key={alert.publicId}
                    className={`notification-item notification-item--${alert.severity.toLowerCase()}`}
                    onClick={() => {
                      setSelectedAlert(alert);
                      setIsOpen(false);
                    }}
                    type="button"
                  >
                    <span className="notification-item__icon">
                      <Icon size={18} />
                    </span>
                    <span className="notification-item__body">
                      <strong>
                        {ALERT_VAR_LABELS[alert.variable] ?? alert.variable} {alert.value}
                        {alert.unit}
                      </strong>
                      <small>
                        {alert.pointName} · {severityBadge(alert.severity)}
                      </small>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {selectedAlert && (
        <div
          className="notification-modal-overlay"
          onClick={() => setSelectedAlert(null)}
        >
          <dialog
            open
            className="notification-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notification-modal__header">
              <div>
                <p className="eyebrow">Alerta climática</p>
                <h3>
                  {ALERT_VAR_LABELS[selectedAlert.variable] ?? selectedAlert.variable}
                </h3>
              </div>
              <button
                className="notification-modal__close"
                onClick={() => setSelectedAlert(null)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="notification-modal__body">
              <div className="notification-modal__kpi">
                <span>Valor detectado</span>
                <strong>
                  {selectedAlert.value} {selectedAlert.unit}
                </strong>
              </div>
              <div className="notification-modal__meta">
                <div>
                  <span>Zona</span>
                  <strong>{selectedAlert.pointName}</strong>
                </div>
                <div>
                  <span>Severidad</span>
                  {severityBadge(selectedAlert.severity)}
                </div>
                <div>
                  <span>Estado</span>
                  <span
                    className={`climate-badge ${selectedAlert.status === "ACTIVA" ? "climate-badge--activa" : ""}`}
                  >
                    {selectedAlert.status}
                  </span>
                </div>
                <div>
                  <span>Inicio</span>
                  <strong>{formatAlertDateTime(selectedAlert.startsAt)}</strong>
                </div>
              </div>
              <div className="notification-modal__impact">
                <p className="eyebrow">Impacto en el cultivo de mango</p>
                <p>{getImpact(selectedAlert.variable, selectedAlert.severity)}</p>
              </div>
            </div>
          </dialog>
        </div>
      )}
    </>
  );
}
