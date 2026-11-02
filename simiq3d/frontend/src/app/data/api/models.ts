import type { components as DataIQ } from './dataiq';
import type { components as Simiq3d } from './simiq3d';

// Nombres cortos para los tipos generados del OpenAPI de cada backend, para que
// ninguna pantalla escriba `components['schemas'][...]`. Son los mismos tipos,
// sin transformar.

type DataIQSchemas = DataIQ['schemas'];
type Simiq3dSchemas = Simiq3d['schemas'];

export type Account = DataIQSchemas['AccountOut'];
export type TechniqueSummary = DataIQSchemas['TechniqueSummaryOut'];
export type TechniquePublic = DataIQSchemas['TechniquePublicOut'];
export type TechniqueInstruments = DataIQSchemas['TechniqueInstrumentsOut'];
export type TechniqueItem = DataIQSchemas['ItemOut'];
export type ZoneLayout = DataIQSchemas['ZoneLayoutOut'];
export type Instrument = DataIQSchemas['InstrumentOut'];

export type ChatQuestion = Simiq3dSchemas['ChatIn'];
export type ChatReply = Simiq3dSchemas['ChatOut'];
export type ChatAction = Simiq3dSchemas['ChatAction'];
export type ClinicalField = Simiq3dSchemas['ClinicalField'];
export type ModelFile = Simiq3dSchemas['ModelFileOut'];
