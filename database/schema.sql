-- PostgreSQL target schema for a production-backed Udyog Setu deployment.
-- The runnable local prototype uses backend/data/store.json as its fallback repository.
CREATE TABLE users (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('ENTREPRENEUR','OFFICER','ADMIN'))
);
CREATE TABLE departments (id text PRIMARY KEY, name text NOT NULL UNIQUE, sandbox_endpoint text);
CREATE TABLE businesses (
  id text PRIMARY KEY, owner_id text NOT NULL REFERENCES users(id), name text NOT NULL,
  industry text NOT NULL, business_type text NOT NULL, location text NOT NULL,
  land_type text NOT NULL, investment_crore numeric(12,2) NOT NULL,
  employees integer NOT NULL, environmental_impact text NOT NULL
);
CREATE TABLE applications (
  id text PRIMARY KEY, business_id text NOT NULL REFERENCES businesses(id),
  status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE approval_types (
  id text PRIMARY KEY, name text NOT NULL, department_id text REFERENCES departments(id),
  sla_days integer NOT NULL, required_document_types jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE approvals (
  id text PRIMARY KEY, application_id text NOT NULL REFERENCES applications(id),
  approval_type_id text NOT NULL REFERENCES approval_types(id), status text NOT NULL,
  submitted_at timestamptz, started_at timestamptz, decided_at timestamptz,
  reason text
);
CREATE INDEX approvals_app_status_idx ON approvals(application_id,status);
CREATE TABLE approval_dependencies (
  approval_type_id text REFERENCES approval_types(id), depends_on_type_id text REFERENCES approval_types(id),
  PRIMARY KEY(approval_type_id,depends_on_type_id)
);
CREATE TABLE documents (
  id text PRIMARY KEY, application_id text NOT NULL REFERENCES applications(id),
  document_type text NOT NULL, original_name text NOT NULL, mime text NOT NULL,
  storage_key text NOT NULL, size_bytes bigint NOT NULL, uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_app_type_idx ON documents(application_id,document_type);
CREATE TABLE document_validations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, document_id text NOT NULL REFERENCES documents(id),
  classification text NOT NULL, confidence numeric(5,2), result text NOT NULL,
  checks jsonb NOT NULL, reasons jsonb NOT NULL, method text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE risk_assessments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, application_id text NOT NULL REFERENCES applications(id),
  score integer NOT NULL CHECK(score BETWEEN 0 AND 100), level text NOT NULL,
  factors jsonb NOT NULL, provisional_eligible boolean NOT NULL DEFAULT false,
  assessed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE slas (
  approval_id text PRIMARY KEY REFERENCES approvals(id), deadline_at timestamptz NOT NULL,
  warning_at timestamptz NOT NULL
);
CREATE TABLE notifications (
  id text PRIMARY KEY, application_id text NOT NULL REFERENCES applications(id),
  message text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE application_events (
  id text PRIMARY KEY, application_id text NOT NULL REFERENCES applications(id),
  type text NOT NULL, actor text NOT NULL, message text NOT NULL,
  department_id text REFERENCES departments(id), occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_events_app_time_idx ON application_events(application_id,occurred_at DESC);
CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id text REFERENCES users(id),
  application_id text REFERENCES applications(id), action text NOT NULL,
  before_state jsonb, after_state jsonb, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE government_schemes (
  id text PRIMARY KEY, name text NOT NULL, eligibility_note text NOT NULL,
  source_url text, demo_only boolean NOT NULL DEFAULT true
);
