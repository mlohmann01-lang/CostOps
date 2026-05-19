import migrate from './_base';
import type { DomainContractMigrationInput, DomainContractMigrationOutput } from './contract-migration-types';
export const migrateCausalityContracts=(input:DomainContractMigrationInput):DomainContractMigrationOutput=>migrate({...input,domain:'causality'});
