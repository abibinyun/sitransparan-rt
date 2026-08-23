// Package minio wraps an S3-compatible object storage client (MinIO in local
// dev, any S3 provider in production) used for uploaded files: payment
// proofs, resident documents, announcement documents, and event receipts.
//
// Objects are stored under a per-tenant key prefix ("<tenant-slug>/<category>/…")
// so tenant isolation extends to stored files. The bucket is created with a
// public-download policy so clients can fetch uploaded files directly from
// MINIO_PUBLIC_URL without presigned URLs; writes always go through the API.
package minio

import (
	"context"
	"fmt"
	"io"
	"log"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Client struct {
	mc         *minio.Client
	bucket     string
	publicBase string
}

// New connects to the S3 endpoint, ensures the bucket exists (creating it with
// a public-download policy when missing), and returns a ready client.
func New(endpoint, accessKey, secretKey string, useSSL bool, bucket, publicURL string) (*Client, error) {
	mc, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("minio: create client: %w", err)
	}
	if bucket == "" {
		bucket = "sitransparan-files"
	}
	ctx := context.Background()
	exists, err := mc.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("minio: check bucket %q: %w", bucket, err)
	}
	if !exists {
		if err := mc.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("minio: create bucket %q: %w", bucket, err)
		}
		log.Printf("minio: created bucket %q", bucket)
	}
	// Allow anonymous downloads (GET-only). Uploads remain authenticated.
	policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, bucket)
	if err := mc.SetBucketPolicy(ctx, bucket, policy); err != nil {
		return nil, fmt.Errorf("minio: set bucket policy: %w", err)
	}
	if publicURL == "" {
		scheme := "http"
		if useSSL {
			scheme = "https"
		}
		publicURL = scheme + "://" + endpoint
	}
	return &Client{mc: mc, bucket: bucket, publicBase: strings.TrimRight(publicURL, "/")}, nil
}

// NewNoop returns a disabled client placeholder for tests or deployments that
// run without object storage. Upload methods fall back to metadata-only URLs.
func NewNoop() *Client { return nil }

// Upload stores content at "<prefix>/<objectName>" and returns its public URL.
func (c *Client) Upload(ctx context.Context, objectName string, reader io.Reader, size int64, contentType string) (string, error) {
	if c == nil || c.mc == nil {
		// Storage disabled: keep legacy behavior of returning a metadata-only URL.
		return "/uploads/" + objectName, nil
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	_, err := c.mc.PutObject(ctx, c.bucket, objectName, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("minio: put object %q: %w", objectName, err)
	}
	return fmt.Sprintf("%s/%s/%s", c.publicBase, c.bucket, objectName), nil
}

// ObjectKey builds a tenant-scoped object path: "<tenantSlug>/<category>/<uuid><ext>".
func ObjectKey(tenantSlug, category, uniqueName, ext string) string {
	key := ""
	if tenantSlug != "" {
		key += tenantSlug + "/"
	}
	if category != "" {
		key += category + "/"
	}
	return key + uniqueName + ext
}
