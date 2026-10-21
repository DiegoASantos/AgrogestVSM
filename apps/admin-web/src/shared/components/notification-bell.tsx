"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { isAdminOrAnalystSession } from "../../modules/auth/utils/authorization";
import { climaService } from "../../modules/clima/services/clima.service";
import {
  notificacionesService,
  type OperationalNotice,
  type OperationalNoticeKind,
  type OperationalNoticesPage
} from "../../modules/notificaciones/services/notificaciones.service";
import {
  duplicadosProductoresService,
  type DuplicateCase
} from "../../modules/productores/services/duplicados-productores.service";

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

function getLimaDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isAlertFromToday(alert: AlertRow): boolean {
  const startsAt = new Date(alert.startsAt);
  return (
    !Number.isNaN(startsAt.getTime()) &&
    getLimaDateKey(startsAt) === getLimaDateKey(new Date())
  );
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
const EMPTY_NOTICES: OperationalNoticesPage = { items: [], unreadCount: 0, nextCursor: null };
const IDENTITY_REASONS: Record<string, string> = {
  DOCUMENTO: "documento coincidente",
  NOMBRE: "nombre similar",
  TELEFONO: "teléfono coincidente",
  EMAIL: "correo coincidente",
  REVISION_MANUAL: "revisión manual"
};

export function NotificationBell() {
  const { session } = useAuthSession();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [visitNotices, setVisitNotices] = useState<OperationalNoticesPage>(EMPTY_NOTICES);
  const [continuityNotices, setContinuityNotices] = useState<OperationalNoticesPage>(EMPTY_NOTICES);
  const [operationalOwner, setOperationalOwner] = useState<string | null>(null);
  const [duplicateCases, setDuplicateCases] = useState<DuplicateCase[]>([]);
  const [duplicateOwner, setDuplicateOwner] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState("");
  const [visitError, setVisitError] = useState("");
  const [continuityError, setContinuityError] = useState("");
  const [loadingMore, setLoadingMore] = useState<OperationalNoticeKind | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const sessionTokenRef = useRef(session?.accessToken);
  sessionTokenRef.current = session?.accessToken;

  const fetchOperational = useCallback(() => {
    if (!session || !isAdminOrAnalystSession(session)) return;
    const token = session.accessToken;
    void Promise.allSettled([
      notificacionesService.list(session, "VISITAS_DUPLICADAS"),
      notificacionesService.list(session, "PRODUCTOR_SIN_VISITA"),
      duplicadosProductoresService.list(session)
    ])
      .then(([visits, continuity, duplicates]) => {
        if (sessionTokenRef.current !== token) return;
        if (visits.status === "fulfilled") setVisitNotices(visits.value);
        if (continuity.status === "fulfilled") setContinuityNotices(continuity.value);
        if (visits.status === "fulfilled" || continuity.status === "fulfilled") setOperationalOwner(token);
        setVisitError(visits.status === "rejected" ? "No se pudieron actualizar las visitas repetidas." : "");
        setContinuityError(continuity.status === "rejected" ? "No se pudieron actualizar los recordatorios." : "");
        if (duplicates.status === "fulfilled") {
          setDuplicateCases(duplicates.value);
          setDuplicateOwner(token);
          setDuplicateError("");
        } else {
          setDuplicateError("No se pudieron actualizar los casos de identidad.");
        }
      });
  }, [session]);

  useEffect(() => {
    setVisitNotices(EMPTY_NOTICES);
    setContinuityNotices(EMPTY_NOTICES);
    setDuplicateCases([]);
    setDuplicateOwner(null);
    setDuplicateError("");
    setOperationalOwner(null);
    setVisitError("");
    setContinuityError("");
    if (!session) return;
    let active = true;
    const fetchAlerts = () => {
      void climaService
        .getAlerts(session)
        .then((rows) => { if (active) setAlerts(rows as AlertRow[]); })
        .catch(() => {
          /* silencioso */
        });
    };
    fetchAlerts();
    fetchOperational();
    const interval = setInterval(() => { fetchAlerts(); fetchOperational(); }, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, [session, fetchOperational]);

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

  const active = alerts.filter(
    (alert) => alert.status === "ACTIVA" && isAlertFromToday(alert)
  );
  const visibleVisits = operationalOwner === session?.accessToken ? visitNotices : EMPTY_NOTICES;
  const visibleContinuity = operationalOwner === session?.accessToken ? continuityNotices : EMPTY_NOTICES;
  const visibleDuplicates = duplicateOwner === session?.accessToken ? duplicateCases : [];
  const count = active.length + (isAdminOrAnalystSession(session)
    ? visibleVisits.unreadCount + visibleContinuity.unreadCount + visibleDuplicates.length
    : 0);

  const markOperationalRead = (notice: OperationalNotice) => {
    if (!session) return;
    void notificacionesService.markRead(session, notice)
      .then(fetchOperational)
      .catch(() => setVisitError("No se pudo marcar el aviso como leído."));
  };

  const loadMore = (kind: OperationalNoticeKind) => {
    const page = kind === "VISITAS_DUPLICADAS" ? visibleVisits : visibleContinuity;
    if (!session || !page.nextCursor || loadingMore) return;
    const token = session.accessToken;
    setLoadingMore(kind);
    void notificacionesService.list(session, kind, page.nextCursor)
      .then((nextPage) => {
        if (sessionTokenRef.current !== token) return;
        const update = (previous: OperationalNoticesPage) => ({
          ...nextPage,
          items: Array.from(new Map(
            [...previous.items, ...nextPage.items].map((item) => [`${item.kind}:${item.key}`, item])
          ).values())
        });
        if (kind === "VISITAS_DUPLICADAS") setVisitNotices(update);
        else setContinuityNotices(update);
        if (kind === "VISITAS_DUPLICADAS") setVisitError("");
        else setContinuityError("");
      })
      .catch(() => {
        if (sessionTokenRef.current !== token) return;
        if (kind === "VISITAS_DUPLICADAS") setVisitError("No se pudieron cargar más visitas.");
        else setContinuityError("No se pudieron cargar más recordatorios.");
      })
      .finally(() => setLoadingMore(null));
  };

  if (!session) return null;

  return (
    <>
      <button
        ref={bellRef}
        className="notification-bell"
        onClick={() => {
          if (!isOpen) fetchOperational();
          setIsOpen((v) => !v);
        }}
        type="button"
        aria-label={`Notificaciones${count > 0 ? `: ${count} avisos activos` : ""}`}
        title="Notificaciones"
      >
        <Bell size={18} />
        {count > 0 && <span className="notification-bell__badge">{count}</span>}
      </button>

      {isOpen && (
        <div ref={panelRef} className="notification-panel">
          <div className="notification-panel__header">
            <h3>Notificaciones</h3>
            <span>
              {count} activa{count !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="notification-panel__body">
            {isAdminOrAnalystSession(session) && (
              <div className="operational-notices">
                <section aria-label="Revisión de identidad">
                <h4>Revisión de identidad · {visibleDuplicates.length === 200 ? "200 o más" : visibleDuplicates.length} casos pendientes</h4>
                {duplicateError && <p className="operational-notices__error" role="status">{duplicateError}</p>}
                {visibleDuplicates.length === 0 && !duplicateError && <p>No hay casos pendientes.</p>}
                {visibleDuplicates.slice(0, 5).map((item) => <article className="operational-notice" key={`duplicado:${item.id}`}>
                  <strong>{item.lesserName} y {item.greaterName}</strong>
                  <p>Posible misma persona. Motivos: {item.reasons.map((reason) => IDENTITY_REASONS[reason] ?? reason).join(", ")}.</p>
                  <p>Registró {item.lesserName}: {item.lesserRecordedBy ?? "No registrado"}. Registró {item.greaterName}: {item.greaterRecordedBy ?? "No registrado"}.</p>
                  <Link href="/mantenimiento/productores/duplicados" onClick={() => setIsOpen(false)}>Revisar caso</Link>
                </article>)}
                {visibleDuplicates.length > 5 && <Link href="/mantenimiento/productores/duplicados" onClick={() => setIsOpen(false)}>Ver los demás casos</Link>}
                </section>
                <section aria-label="Visitas repetidas">
                <h4>Visitas repetidas · {visibleVisits.unreadCount} casos</h4>
                {visitError && <p className="operational-notices__error" role="status">{visitError}</p>}
                {visibleVisits.items.length === 0 && !visitError && (
                  <p className="notification-panel__empty">No hay visitas repetidas pendientes.</p>
                )}
                {visibleVisits.items.map((notice) => (
                  <article className="operational-notice" key={`${notice.kind}:${notice.key}`}>
                    <strong>{notice.productorNombre}</strong>
                    <p>{notice.cantidadVisitas} visitas el {notice.fechaVisita}. Agrónomos: {notice.agronomos.join(", ")}.</p>
                    <button type="button" onClick={() => markOperationalRead(notice)}>Marcar como leída</button>
                  </article>
                ))}
                {visibleVisits.nextCursor && (
                  <button className="operational-notices__more" type="button" onClick={() => loadMore("VISITAS_DUPLICADAS")} disabled={loadingMore !== null}>
                    {loadingMore === "VISITAS_DUPLICADAS" ? "Cargando…" : "Ver más visitas"}
                  </button>
                )}
                </section>
                <section aria-label="Productores sin visita reciente">
                <h4>Productores sin visita reciente · {visibleContinuity.unreadCount} casos</h4>
                {continuityError && <p className="operational-notices__error" role="status">{continuityError}</p>}
                {visibleContinuity.items.length === 0 && !continuityError && <p>No hay casos pendientes.</p>}
                {visibleContinuity.items.map((notice) => <article className="operational-notice" key={`${notice.kind}:${notice.key}`}>
                  <strong>{notice.productorNombre}</strong>
                  <p>45 días sin visita ni confirmación de continuidad desde {notice.fechaBase}.</p>
                </article>)}
                {visibleContinuity.nextCursor && <button className="operational-notices__more" type="button" onClick={() => loadMore("PRODUCTOR_SIN_VISITA")} disabled={loadingMore !== null}>
                  {loadingMore === "PRODUCTOR_SIN_VISITA" ? "Cargando…" : "Ver más productores"}
                </button>}
                </section>
              </div>
            )}
            <h4 className="operational-notices__climate-heading">Alertas climáticas</h4>
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
            className={`notification-modal notification-modal--${selectedAlert.severity.toLowerCase()}`}
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
            <div className="notification-modal__footer">
              <button
                className="notification-modal__action"
                onClick={() => setSelectedAlert(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </dialog>
        </div>
      )}
    </>
  );
}
