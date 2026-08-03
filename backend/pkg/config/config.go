package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	DBSSLMode   string
	JWTSecret   string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	jwtSecret := getenvDefault("JWT_SECRET", "sitransparan-secret-key-change-in-prod")
	dbURL := firstNonEmpty(os.Getenv("DATABASE_URL"), os.Getenv("DB_URL"))
	dbHost := getenvDefault("DB_HOST", "localhost")
	dbPort := getenvDefault("DB_PORT", "5432")
	dbUser := firstNonEmpty(os.Getenv("DB_USER"), os.Getenv("POSTGRES_USER"))
	if dbUser == "" {
		dbUser = "postgres"
	}
	dbPassword := firstNonEmpty(os.Getenv("DB_PASSWORD"), os.Getenv("POSTGRES_PASSWORD"))
	if dbPassword == "" {
		dbPassword = "postgres"
	}
	dbName := firstNonEmpty(os.Getenv("DB_NAME"), os.Getenv("POSTGRES_DB"))
	if dbName == "" {
		dbName = "transparansi_rt"
	}
	dbSSLMode := getenvDefault("DB_SSLMODE", "disable")

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		DBHost:      dbHost,
		DBPort:      dbPort,
		DBUser:      dbUser,
		DBPassword:  dbPassword,
		DBName:      dbName,
		DBSSLMode:   dbSSLMode,
		JWTSecret:   jwtSecret,
	}
}

func (c *Config) PostgresConnString() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
}

func getenvDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
