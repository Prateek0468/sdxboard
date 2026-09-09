package main

import (
	// "database/sql"
	"log"
	"net/http"
	"os"
)

func main() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/app.db"
	}

	db, err := openDatabase(dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	server := newServer(db, os.Getenv("CORS_ORIGIN"))
	log.Println("backend listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", server.routes()))
}
