"use client";
import { useEffect, useState } from "react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { AdminMap, type AdminMapPoint } from "../../../shared/components/admin-map";
import { climaService, type ClimatePoint, type ClimateSource } from "../services/clima.service";

export type ClimateSection = "resumen" | "mapa" | "pronostico" | "historial" | "estaciones" | "alertas" | "fuentes";
const titles: Record<ClimateSection, [string,string]> = { resumen:["Resumen climático","Condiciones territoriales y alertas meteorológicas."], mapa:["Mapa agroclimático","Puntos climáticos y estaciones; no muestra parcelas."], pronostico:["Pronóstico","Pronóstico territorial por fuente y fecha."], historial:["Historial climático","Series históricas disponibles por punto climático."], estaciones:["Estaciones meteorológicas","Inventario de estaciones virtuales, oficiales, externas o propias."], alertas:["Alertas climáticas","Eventos meteorológicos generales; no incluyen recomendaciones agrícolas."], fuentes:["Estado de fuentes de datos","Disponibilidad, última consulta y trazabilidad de proveedores."] };

export function ClimaScreen({ section }: { section: ClimateSection }) {
  const { session } = useAuthSession(); const [data,setData]=useState<unknown>(null); const [error,setError]=useState<string|null>(null);
  useEffect(() => { if (!session) return; const load = section === "resumen" ? climaService.getSummary : section === "mapa" ? climaService.getMap : section === "pronostico" ? climaService.getForecast : section === "estaciones" ? climaService.getStations : section === "alertas" ? climaService.getAlerts : section === "fuentes" ? climaService.getSources : climaService.getPoints; void load(session).then(setData).catch((reason:unknown)=>setError(reason instanceof Error?reason.message:"No se pudo cargar el módulo climático.")); }, [section,session]);
  const [title,description]=titles[section]; if (error) return <ErrorState description={error} />; if (!data) return <LoadingState description="Cargando información climática territorial." />;
  return <section className="panel-grid"><article className="panel"><ToolbarActions eyebrow="Clima" title={title} description={description}/>{section === "mapa" ? <ClimateMap points={data as ClimatePoint[]}/> : <ClimateContent section={section} data={data}/>}</article></section>;
}
function ClimateMap({ points }: { points: ClimatePoint[] }) { const mapPoints: AdminMapPoint[] = points.map((point)=>({id:point.id,geometry:{type:"Point",coordinates:[point.longitude,point.latitude]},color:"#1d7a9b",radius:8,popup:{title:point.name,description:`${point.district}, ${point.department}`}})); return <AdminMap points={mapPoints} emptyMessage="No hay puntos climáticos configurados."/>; }
function ClimateContent({ section,data }: { section: ClimateSection; data: unknown }) { if (section === "resumen") { const summary=data as {points:ClimatePoint[];alerts:unknown[];sources:ClimateSource[]}; return <><div className="map-overview__summary">{summary.points.map(p=><article className="map-overview__summary-card" key={p.id}><strong>{p.name}</strong><span>{formatCurrent(p.current,"temperature_2m")}</span><span>{p.district}</span></article>)}</div><pre className="climate-data">{JSON.stringify({alertas:summary.alerts,fuentes:summary.sources},null,2)}</pre></>; } return <pre className="climate-data">{JSON.stringify(data,null,2)}</pre>; }
function formatCurrent(values: ClimatePoint["current"], variable:string) { const match=values?.find(value=>value.variable===variable); return match ? `${match.value} ${match.unit}` : "Sin dato actual"; }
