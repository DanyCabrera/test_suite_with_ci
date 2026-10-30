"""Migración inicial: usuarios, servicios y citas."""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.CheckConstraint("role in ('client', 'barber', 'admin')", name="ck_users_role"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "services",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.UniqueConstraint("name", name="uq_services_name"),
    )

    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("barber_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id"), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.CheckConstraint(
            "status in ('scheduled', 'cancelled', 'completed')",
            name="ck_appointments_status",
        ),
    )
    op.create_index("ix_appointments_barber_start", "appointments", ["barber_id", "start_at"])


def downgrade() -> None:
    op.drop_index("ix_appointments_barber_start", table_name="appointments")
    op.drop_table("appointments")
    op.drop_table("services")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
