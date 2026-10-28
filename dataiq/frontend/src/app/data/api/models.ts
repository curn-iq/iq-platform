import type { components } from './schema';

type Schemas = components['schemas'];

// Nombres cortos para los tipos generados del OpenAPI, para que ninguna pantalla
// escriba `components['schemas'][...]`. Son los mismos tipos, sin transformar.

export type Account = Schemas['AccountOut'];
export type Credentials = Schemas['LoginIn'];
export type Registration = Schemas['RegisterIn'];

export type Specialty = Schemas['ReferenceOut'];
export type TechniqueSummary = Schemas['TechniqueSummaryOut'];
export type TechniquePublic = Schemas['TechniquePublicOut'];
export type TechniqueInstruments = Schemas['TechniqueInstrumentsOut'];
export type TechniqueCreate = Schemas['TechniqueCreateIn'];

export type VersionSummary = Schemas['VersionSummaryOut'];
export type VersionDetail = Schemas['VersionDetailOut'];
export type VersionContent = Schemas['ContentIn'];

export type FullCatalog = Schemas['FullCatalogOut'];
export type Instrument = Schemas['InstrumentOut'];
export type InstrumentCreate = Schemas['InstrumentCreateIn'];
export type InstrumentUpdate = Schemas['InstrumentUpdateIn'];

export type User = Schemas['UserOut'];
