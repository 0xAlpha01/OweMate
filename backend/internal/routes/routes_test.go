package routes

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakePinger struct {
	err error
}

func (p fakePinger) Ping(context.Context) error {
	return p.err
}

func TestHealthDoesNotRequireDatabase(t *testing.T) {
	recorder := httptest.NewRecorder()
	NewRouter(nil).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	if recorder.Body.String() != `{"status":"ok"}` {
		t.Errorf("body = %q, want healthy JSON response", recorder.Body.String())
	}
}

func TestReadyWhenDatabaseAvailable(t *testing.T) {
	recorder := httptest.NewRecorder()
	NewRouter(fakePinger{}).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/ready", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	if recorder.Body.String() != `{"database":"available","status":"ready"}` {
		t.Errorf("body = %q, want ready JSON response", recorder.Body.String())
	}
}

func TestReadyWhenDatabaseUnavailable(t *testing.T) {
	recorder := httptest.NewRecorder()
	NewRouter(fakePinger{err: errors.New("database unavailable")}).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/ready", nil))

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusServiceUnavailable)
	}
	if recorder.Body.String() != `{"database":"unavailable","status":"not_ready"}` {
		t.Errorf("body = %q, want not-ready JSON response", recorder.Body.String())
	}
}
