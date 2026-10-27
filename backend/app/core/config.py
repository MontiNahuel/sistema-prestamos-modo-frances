from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Microservicio Préstamos (Sistema Francés)"
    API_V1_STR: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    # Integración con Monolito (CoopYa)
    COOPYA_BASE_URL: str = "https://test.coopya.com.ar"
    COOPYA_DEFAULT_TOKEN: str = ""
    COOPYA_DB_SERVER: str = "10.16.1.13"
    COOPYA_DB_NAME: str = "CoopYaBeta"
    COOPYA_DB_USER: str = "pgurvicius"
    COOPYA_DB_DOMAIN: str = "coopya"
    COOPYA_DB_PASSWORD: str = ""
    COOPYA_DB_ENABLED: bool = True
    # Integración bancaria aún pendiente de homologación SQL/CoopYa V2.
    # Habilitar únicamente en un entorno aislado de pruebas.
    RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED: bool = False

    # Integración con Base Legacy Oracle (Modo Thick) - Configurable por variables de entorno
    ORACLE_ENABLED: bool = False
    ORACLE_USER: str = ""
    ORACLE_PASSWORD: str = ""
    ORACLE_HOST: str = "127.0.0.1"
    ORACLE_PORT: int = 1521
    ORACLE_SERVICE: str = "orcl"
    ORACLE_DSN: Optional[str] = None
    ORACLE_CLIENT_LIB_DIR: Optional[str] = None
    ORACLE_TABLA_PERSONAS: str = "PRESTAPROD.PERSONA"

    # Conexión a la base de datos SQL Server
    DATABASE_URL: str = (
        "mssql+pyodbc://@(localdb)\\MSSQLLocalDB/PrestamosDB?"
        "driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
    )

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()
