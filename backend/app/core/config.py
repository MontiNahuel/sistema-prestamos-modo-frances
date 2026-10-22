from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Microservicio Préstamos (Sistema Francés)"
    API_V1_STR: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    # Integración con Monolito (CoopYa)
    COOPYA_BASE_URL: str = "https://test.coopya.com.ar"
    COOPYA_DEFAULT_TOKEN: str = ""

    # Conexión exacta a tu instancia local de SQL Server (LocalDB)
    DATABASE_URL: str = (
        "mssql+pyodbc://@(localdb)\\MSSQLLocalDB/PrestamosDB?"
        "driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
    )

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()
