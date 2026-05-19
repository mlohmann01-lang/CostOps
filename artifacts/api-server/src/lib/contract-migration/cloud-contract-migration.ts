import migrate from './_base';
import type { DomainContractMigrationInput, DomainContractMigrationOutput } from './contract-migration-types';
export const migrateCloudContracts=(input:DomainContractMigrationInput):DomainContractMigrationOutput=>migrate({...input,domain:'cloud'});
