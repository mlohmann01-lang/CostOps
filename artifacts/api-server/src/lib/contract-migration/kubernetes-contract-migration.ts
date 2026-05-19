import migrate from './_base';
import type { DomainContractMigrationInput, DomainContractMigrationOutput } from './contract-migration-types';
export const migrateKubernetesContracts=(input:DomainContractMigrationInput):DomainContractMigrationOutput=>migrate({...input,domain:'kubernetes'});
