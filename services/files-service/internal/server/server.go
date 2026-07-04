package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Config struct {
	Endpoint            string
	PublicEndpoint      string
	AccessKey           string
	SecretKey           string
	UseSSL              bool
	DefaultPresignedTTL time.Duration
	MaxPresignedTTL     time.Duration
	MaxUploadBytes      int64
}

type Server struct {
	cfg          Config
	storage      *minio.Client
	publicSigner *minio.Client
}

type UploadResponse struct {
	Bucket      string `json:"bucket"`
	Key         string `json:"key"`
	ContentType string `json:"contentType"`
	SizeBytes   int64  `json:"sizeBytes"`
}

type PresignedResponse struct {
	URL       string `json:"url"`
	ExpiresIn int64  `json:"expiresInSeconds"`
}

type ObjectResponse struct {
	Key          string    `json:"key"`
	LastModified time.Time `json:"lastModified"`
	SizeBytes    int64     `json:"sizeBytes"`
}

type problem struct {
	Status int    `json:"status"`
	Title  string `json:"title"`
	Detail string `json:"detail,omitempty"`
}

func New(cfg Config) (*Server, error) {
	storage, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}
	publicSigner, err := minio.New(cfg.PublicEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("create public minio signer: %w", err)
	}
	return &Server{cfg: cfg, storage: storage, publicSigner: publicSigner}, nil
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.health)
	mux.HandleFunc("GET /actuator/health", s.health)
	mux.HandleFunc("GET /actuator/info", s.info)
	mux.HandleFunc("POST /api/v1/files", s.upload)
	mux.HandleFunc("DELETE /api/v1/files", s.delete)
	mux.HandleFunc("GET /api/v1/files/presigned", s.presigned)
	mux.HandleFunc("GET /api/v1/files/download", s.download)
	mux.HandleFunc("GET /api/v1/files", s.list)
	return logRequests(mux)
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "UP"})
}

func (s *Server) info(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"app":     "files-service",
		"version": "dev",
	})
}

func (s *Server) upload(w http.ResponseWriter, r *http.Request) {
	bucket, key, ok := s.bucketAndKey(w, r)
	if !ok {
		return
	}
	if err := s.ensureBucket(r.Context(), bucket); err != nil {
		writeProblem(w, http.StatusBadGateway, "storage bucket unavailable", err.Error())
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxUploadBytes)
	if err := r.ParseMultipartForm(s.cfg.MaxUploadBytes); err != nil {
		writeProblem(w, http.StatusBadRequest, "invalid multipart body", err.Error())
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeProblem(w, http.StatusBadRequest, "file part is required", err.Error())
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	info, err := s.storage.PutObject(r.Context(), bucket, key, file, header.Size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		writeProblem(w, http.StatusBadGateway, "upload failed", err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, UploadResponse{
		Bucket:      bucket,
		Key:         key,
		ContentType: contentType,
		SizeBytes:   info.Size,
	})
}

func (s *Server) delete(w http.ResponseWriter, r *http.Request) {
	bucket, key, ok := s.bucketAndKey(w, r)
	if !ok {
		return
	}
	if err := s.storage.RemoveObject(r.Context(), bucket, key, minio.RemoveObjectOptions{}); err != nil {
		writeProblem(w, http.StatusBadGateway, "delete failed", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) presigned(w http.ResponseWriter, r *http.Request) {
	bucket, key, ok := s.bucketAndKey(w, r)
	if !ok {
		return
	}
	ttl := s.ttl(r)
	url, err := s.publicSigner.PresignedGetObject(r.Context(), bucket, key, ttl, nil)
	if err != nil {
		writeProblem(w, http.StatusBadGateway, "presign failed", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, PresignedResponse{URL: url.String(), ExpiresIn: int64(ttl.Seconds())})
}

func (s *Server) download(w http.ResponseWriter, r *http.Request) {
	bucket, key, ok := s.bucketAndKey(w, r)
	if !ok {
		return
	}
	obj, err := s.storage.GetObject(r.Context(), bucket, key, minio.GetObjectOptions{})
	if err != nil {
		writeProblem(w, http.StatusBadGateway, "download failed", err.Error())
		return
	}
	defer obj.Close()
	stat, err := obj.Stat()
	if err != nil {
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			writeProblem(w, http.StatusNotFound, "file not found", key)
			return
		}
		writeProblem(w, http.StatusBadGateway, "download stat failed", err.Error())
		return
	}
	if stat.ContentType != "" {
		w.Header().Set("Content-Type", stat.ContentType)
	}
	w.Header().Set("Content-Length", strconv.FormatInt(stat.Size, 10))
	if _, err := io.Copy(w, obj); err != nil {
		log.Printf("stream download failed bucket=%s key=%s err=%v", bucket, key, err)
	}
}

func (s *Server) list(w http.ResponseWriter, r *http.Request) {
	bucket := strings.TrimSpace(r.URL.Query().Get("bucket"))
	prefix := strings.TrimSpace(r.URL.Query().Get("prefix"))
	if err := validateBucket(bucket); err != nil {
		writeProblem(w, http.StatusBadRequest, "invalid bucket", err.Error())
		return
	}
	if err := validateKeyPrefix(prefix); err != nil {
		writeProblem(w, http.StatusBadRequest, "invalid prefix", err.Error())
		return
	}
	objects := make([]ObjectResponse, 0)
	for obj := range s.storage.ListObjects(r.Context(), bucket, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	}) {
		if obj.Err != nil {
			writeProblem(w, http.StatusBadGateway, "list failed", obj.Err.Error())
			return
		}
		objects = append(objects, ObjectResponse{
			Key:          obj.Key,
			LastModified: obj.LastModified,
			SizeBytes:    obj.Size,
		})
	}
	writeJSON(w, http.StatusOK, objects)
}

func (s *Server) bucketAndKey(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	bucket := strings.TrimSpace(r.URL.Query().Get("bucket"))
	key := strings.TrimSpace(r.URL.Query().Get("key"))
	if err := validateBucket(bucket); err != nil {
		writeProblem(w, http.StatusBadRequest, "invalid bucket", err.Error())
		return "", "", false
	}
	if err := validateKey(key); err != nil {
		writeProblem(w, http.StatusBadRequest, "invalid key", err.Error())
		return "", "", false
	}
	return bucket, key, true
}

func (s *Server) ttl(r *http.Request) time.Duration {
	raw := strings.TrimSpace(r.URL.Query().Get("ttlSeconds"))
	ttl := s.cfg.DefaultPresignedTTL
	if raw != "" {
		if seconds, err := strconv.ParseInt(raw, 10, 64); err == nil && seconds > 0 {
			ttl = time.Duration(seconds) * time.Second
		}
	}
	if ttl > s.cfg.MaxPresignedTTL {
		return s.cfg.MaxPresignedTTL
	}
	return ttl
}

func (s *Server) ensureBucket(ctx context.Context, bucket string) error {
	exists, err := s.storage.BucketExists(ctx, bucket)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	err = s.storage.MakeBucket(ctx, bucket, minio.MakeBucketOptions{})
	if err == nil {
		return nil
	}
	exists, checkErr := s.storage.BucketExists(ctx, bucket)
	if checkErr == nil && exists {
		return nil
	}
	return err
}

func validateBucket(bucket string) error {
	if bucket == "" {
		return errors.New("bucket is required")
	}
	if strings.ContainsAny(bucket, `/\`) || strings.Contains(bucket, "..") {
		return errors.New("bucket must be a simple bucket name")
	}
	return nil
}

func validateKey(key string) error {
	if key == "" {
		return errors.New("key is required")
	}
	return validateKeyPrefix(key)
}

func validateKeyPrefix(key string) error {
	if strings.HasPrefix(key, "/") || strings.Contains(key, "\\") || strings.Contains(key, "..") {
		return errors.New("key must be a relative object key")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeProblem(w http.ResponseWriter, status int, title string, detail string) {
	writeJSON(w, status, problem{Status: status, Title: title, Detail: detail})
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}
