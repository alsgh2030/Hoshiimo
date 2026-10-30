import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.mark.parametrize('existing_uploads', [False, True])
def test_image_migration_preserves_preexisting_uploads(tmp_path, existing_uploads):
    database = tmp_path / 'migration.db'
    if existing_uploads:
        with sqlite3.connect(database) as conn:
            conn.execute('CREATE TABLE images (id INTEGER NOT NULL PRIMARY KEY, filename VARCHAR(255) NOT NULL, data BLOB NOT NULL)')
            conn.execute('INSERT INTO images VALUES (1, ?, ?)', ('before.png', b'preserve-existing-bytes'))
    env = {**os.environ, 'DATABASE_URL': f'sqlite+aiosqlite:///{database}', 'DB_SSL': 'false',
           'ENVIRONMENT': 'development', 'SECRET_KEY': 'migration-test-only-signing-key-123456789'}
    backend = Path(__file__).resolve().parents[1]
    for arguments in [('upgrade', 'head'), ('check',), ('downgrade', 'c42a109f8d13'), ('upgrade', 'head'), ('check',)]:
        result = subprocess.run([sys.executable, '-m', 'alembic', *arguments], cwd=backend,
                                env=env, capture_output=True, text=True)
        assert result.returncode == 0, result.stdout + result.stderr
    with sqlite3.connect(database) as conn:
        columns = {row[1] for row in conn.execute('PRAGMA table_info(images)')}
        assert {'id', 'filename', 'data', 'product_id', 'content_type'} <= columns
        if existing_uploads:
            assert conn.execute('SELECT data FROM images WHERE id=1').fetchone()[0] == b'preserve-existing-bytes'
