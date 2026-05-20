export const getConnectorRateLimit=(connector:string)=>({AWS:10,AZURE:8,GCP:8,M365:6,SERVICENOW:5,SNOWFLAKE:12,DATABRICKS:10,ORACLE_GOVERNANCE:4}[connector]??3);
