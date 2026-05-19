import migrate from './_base';
import type { DomainContractMigrationInput, DomainContractMigrationOutput } from './contract-migration-types';
export const migrateCommitmentContracts=(input:DomainContractMigrationInput):DomainContractMigrationOutput=>migrate({...input,domain:'commitment'});
