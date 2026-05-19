import migrate from './_base';
import type { DomainContractMigrationInput, DomainContractMigrationOutput } from './contract-migration-types';
export const migrateArbitrationContracts=(input:DomainContractMigrationInput):DomainContractMigrationOutput=>migrate({...input,domain:'arbitration'});
