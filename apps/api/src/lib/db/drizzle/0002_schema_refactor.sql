-- Drop existing tables (they have incompatible schema)
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Create users table with serial id + uuid
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"email" varchar(255) NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create sessions table with serial id + uuid
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"user_uuid" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" varchar(255) NOT NULL UNIQUE,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create accounts table with serial id + uuid
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"user_uuid" uuid NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"expires_at" timestamp,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_uuid_users_uuid_fk"
  FOREIGN KEY ("user_uuid") REFERENCES "users"("uuid") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_uuid_users_uuid_fk"
  FOREIGN KEY ("user_uuid") REFERENCES "users"("uuid") ON DELETE cascade ON UPDATE no action;
