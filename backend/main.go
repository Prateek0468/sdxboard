package main

import (
	"log"
	"net/http"
	"os"

	"system-design-canvas/backend/agent"
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

	var agentHandler *agent.Handler
	if apiKey := os.Getenv("OPENROUTER_API_KEY"); apiKey != "" {
		client := agent.NewClient(
			os.Getenv("OPENROUTER_BASE_URL"),
			apiKey,
			os.Getenv("AI_MODEL"),
		)
		agentHandler = agent.NewHandler(db, client)
		log.Println("agent enabled (OpenRouter)")
	} else {
		log.Println("agent disabled (set OPENROUTER_API_KEY to enable)")
	}

	server := newServer(db, os.Getenv("CORS_ORIGIN"), agentHandler)
	log.Println("backend listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", server.routes()))
}
