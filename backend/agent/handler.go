package agent

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

type Handler struct {
	loop *Loop
}

func NewHandler(db *sql.DB, client *Client) *Handler {
	return &Handler{
		loop: NewLoop(client, db),
	}
}

func (h *Handler) HandleMessage(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Message string `json:"message"`
	}
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if input.Message == "" {
		writeError(w, http.StatusBadRequest, "message is required")
		return
	}

	result, err := h.loop.Run(r.Context(), input.Message)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"response": result.Response,
		"actions":  result.Actions,
	})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
