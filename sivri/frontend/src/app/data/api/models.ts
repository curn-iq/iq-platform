import type { components as DataIQ } from './dataiq';
import type { components as Sivri } from './sivri';

// Nombres cortos para los tipos generados del OpenAPI de cada backend, para que
// ninguna pantalla escriba `components['schemas'][...]`. Son los mismos tipos,
// sin transformar.

type DataIQSchemas = DataIQ['schemas'];
type SivriSchemas = Sivri['schemas'];

export type Account = DataIQSchemas['AccountOut'];
export type TechniqueSummary = DataIQSchemas['TechniqueSummaryOut'];
export type ModuleToken = DataIQSchemas['ModuleTokenOut'];

export type SupportedTechnique = SivriSchemas['TechniqueOut'];
export type FrameResult = SivriSchemas['FrameOut'];
export type TechniqueResult = SivriSchemas['TechniqueResultOut'];
export type BoardObject = SivriSchemas['ObjectOut'];
export type ObjectStatus = SivriSchemas['Status'];
export type Detection = SivriSchemas['DetectionOut'];
export type Box = SivriSchemas['BoxOut'];
export type Marker = SivriSchemas['MarkerOut'];
export type Ranking = SivriSchemas['RankingOut'];
