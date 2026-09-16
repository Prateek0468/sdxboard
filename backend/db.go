package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "github.com/lib/pq"
	_ "github.com/mattn/go-sqlite3"
)

func openDatabase() (*sql.DB, error) {
	dbURL := os.Getenv("DATABASE_URL")

	if dbURL != "" {
		log.Println("connecting to postgresql...")
		db, err := sql.Open("postgres", dbURL)
		if err != nil {
			return nil, fmt.Errorf("open postgres: %w", err)
		}
		if err := db.Ping(); err != nil {
			db.Close()
			return nil, fmt.Errorf("ping postgres: %w", err)
		}
		if err := migrate(db); err != nil {
			db.Close()
			return nil, err
		}
		return db, nil
	}

	// Fallback to SQLite — no setup required.
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/app.db"
	}
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		return nil, fmt.Errorf("create database directory: %w", err)
	}

	log.Printf("no DATABASE_URL set, using sqlite (%s)", dbPath)
	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(1)
	if err := migrate(db); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS components (
			id TEXT PRIMARY KEY,
			type TEXT NOT NULL,
			label TEXT NOT NULL,
			x REAL NOT NULL,
			y REAL NOT NULL,
			metadata TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS edges (
			id TEXT PRIMARY KEY,
			source_id TEXT NOT NULL,
			target_id TEXT NOT NULL,
			label TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (source_id) REFERENCES components(id) ON DELETE CASCADE,
			FOREIGN KEY (target_id) REFERENCES components(id) ON DELETE CASCADE
		);
	`)
	if err != nil {
		return fmt.Errorf("initialize schema: %w", err)
	}
	return nil
}
