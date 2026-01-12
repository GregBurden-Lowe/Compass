import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

sys.path.append(".")

from app.core.config import get_settings  # noqa
from app.db.base import Base  # noqa

config = context.config
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Safety: older DBs may have alembic_version.version_num as VARCHAR(32),
        # which is too short for our revision IDs like "0012_add_comprehensive_reporting_view".
        # If it's too short, widen it before running migrations.
        try:
            row = connection.exec_driver_sql(
                """
                SELECT character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'alembic_version'
                  AND column_name = 'version_num'
                """
            ).fetchone()
            max_len = row[0] if row else None
            if max_len is not None and max_len < 64:
                connection.exec_driver_sql(
                    "ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(64)"
                )
        except Exception:
            # Don't block migrations if the check fails (e.g., permissions/DB differences).
            pass

        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

