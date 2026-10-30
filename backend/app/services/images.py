import io
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image as PillowImage, UnidentifiedImageError

from app.db.models import Image

MAX_IMAGE_BYTES = 3 * 1024 * 1024


def validate_image(data: bytes):
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, 'Image must be between 1 byte and 3 MiB')
    try:
        with PillowImage.open(io.BytesIO(data)) as image:
            if image.format not in {'JPEG', 'PNG', 'WEBP'}:
                raise ValueError('Unsupported image')
            if image.width * image.height > 20_000_000:
                raise ValueError('Image dimensions too large')
            media_type = PillowImage.MIME[image.format]
            image.verify()
        return media_type
    except (UnidentifiedImageError, OSError, ValueError, PillowImage.DecompressionBombError) as exc:
        raise HTTPException(422, 'Upload a valid JPEG, PNG or WebP image (maximum 20 megapixels)') from exc


async def read_upload(file: UploadFile):
    try:
        data = await file.read(MAX_IMAGE_BYTES + 1)
        media_type = validate_image(data)
        filename = Path((file.filename or 'image').replace('\\', '/')).name[:255]
        return Image(filename=filename, data=data, content_type=media_type)
    finally:
        await file.close()
