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

    # Integración con Base Legacy Oracle (Modo Thick)
    ORACLE_ENABLED: bool = True
    ORACLE_USER: str = "nmonti"
    ORACLE_PASSWORD: str = "HNi$uFe3Tym"
    ORACLE_HOST: str = "172.17.1.3"
    ORACLE_PORT: int = 1521
    ORACLE_SERVICE: str = "orcl"
    ORACLE_DSN: str = "172.17.1.3:1521/orcl"
    ORACLE_CLIENT_LIB_DIR: Optional[str] = (
        r"c:\Users\nmonti\Desktop\proyectos\sistema frances\proyecto-para-conectar-con-db-vieja\api-oracle-coopya-V3\api-oracle-coopya\instantclient_19_24"
    )
    ORACLE_TABLA_PERSONAS: str = "PRESTAPROD.PERSONA"

    # Conexión exacta a tu instancia local de SQL Server (LocalDB)
    DATABASE_URL: str = (
        "mssql+pyodbc://@(localdb)\\MSSQLLocalDB/PrestamosDB?"
        "driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
    )

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()
