import migrate from './_base';
import type { DomainContractMigrationInput, DomainContractMigrationOutput } from './contract-migration-types';
export const migrateAIRuntimeContracts=(input:DomainContractMigrationInput):DomainContractMigrationOutput=>migrate({...input,domain:'ai-runtime'});
