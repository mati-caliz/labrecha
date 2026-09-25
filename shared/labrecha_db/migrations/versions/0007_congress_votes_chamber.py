"""Las votaciones dejan de ser sólo de Diputados.

Hasta acá congress_votes venía de un único dataset de HCDN, así que la cámara estaba
implícita: todo lo que había era de Diputados, y el detalle llamaba deputy_name al
legislador. Con el Senado entrando por su propio conector la cámara pasa a ser un dato
y el nombre del legislador deja de suponer una banca de diputado. vote_type guarda lo que
el Senado publica como momento de la votación (EN GENERAL, EN PARTICULAR, habilitación de
tratamiento sobre tablas); en Diputados eso viene dentro del título, así que queda en NULL.

Revision ID: 0007
Revises: 0006

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from labrecha_db import CHAMBER_DEPUTIES

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None

VOTES_TABLE = "congress_votes"
DETAILS_TABLE = "congress_vote_details"
CHAMBER_COLUMN = "chamber"
VOTE_TYPE_COLUMN = "vote_type"
CHAMBER_DATE_INDEX = "ix_congress_votes_chamber_date"


def upgrade() -> None:
    op.add_column(
        VOTES_TABLE,
        sa.Column(
            CHAMBER_COLUMN,
            sa.String(length=20),
            nullable=False,
            server_default=CHAMBER_DEPUTIES,
        ),
    )
    op.alter_column(VOTES_TABLE, CHAMBER_COLUMN, server_default=None)
    op.create_index(CHAMBER_DATE_INDEX, VOTES_TABLE, [CHAMBER_COLUMN, "date"])
    op.add_column(VOTES_TABLE, sa.Column(VOTE_TYPE_COLUMN, sa.String(length=60), nullable=True))
    op.alter_column(
        DETAILS_TABLE,
        "deputy_name",
        new_column_name="legislator_name",
        existing_type=sa.String(200),
    )


def downgrade() -> None:
    op.alter_column(
        DETAILS_TABLE,
        "legislator_name",
        new_column_name="deputy_name",
        existing_type=sa.String(200),
    )
    op.drop_column(VOTES_TABLE, VOTE_TYPE_COLUMN)
    op.drop_index(CHAMBER_DATE_INDEX, table_name=VOTES_TABLE)
    op.drop_column(VOTES_TABLE, CHAMBER_COLUMN)
