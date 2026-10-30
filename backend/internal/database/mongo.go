package database

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.mongodb.org/mongo-driver/v2/mongo/readpref"
)

const connectTimeout = 10 * time.Second

type Client struct {
	client   *mongo.Client
	database *mongo.Database
}

func NewClient(uri, databaseName string) (*Client, error) {
	client, err := mongo.Connect(options.Client().ApplyURI(uri).SetConnectTimeout(connectTimeout))
	if err != nil {
		return nil, errors.New("create MongoDB client failed; check MONGODB_URI")
	}

	return &Client{client: client, database: client.Database(databaseName)}, nil
}

func (c *Client) Ping(ctx context.Context) error {
	if err := c.client.Ping(ctx, readpref.Primary()); err != nil {
		if contextErr := ctx.Err(); contextErr != nil {
			return contextErr
		}
		return errors.New("MongoDB ping failed; check database availability and connection settings")
	}

	return nil
}

func (c *Client) Database() *mongo.Database {
	return c.database
}

func (c *Client) Disconnect(ctx context.Context) error {
	if err := c.client.Disconnect(ctx); err != nil {
		return errors.New("disconnect MongoDB client failed")
	}
	return nil
}
