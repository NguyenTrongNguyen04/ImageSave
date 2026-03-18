from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from imagekitio import ImageKit

from app.config import Settings, get_settings


@dataclass(frozen=True, slots=True)
class ImageKitService:
    """
    Thin wrapper around ImageKit SDK.

    - We only expose what the frontend needs:
      - Client-side upload auth params: token/expire/signature
      - Deleting a remote file (used by DELETE /api/media/{id})
    """

    _client: ImageKit

    @classmethod
    def from_settings(cls, settings: Settings) -> "ImageKitService":
        client = ImageKit(private_key=settings.imagekit_private_key)
        return cls(_client=client)

    def get_upload_params(self, *, token: Optional[str] = None, expire: Optional[int] = None) -> Dict[str, Any]:
        """
        Generate authentication parameters for ImageKit client-side upload.

        ImageKit expects:
        - token: unique string (uuid-like) for this upload session
        - expire: unix timestamp OR (per SDK) can be passed as seconds depending on version;
                 we follow the SDK helper which returns a unix timestamp by default.
        - signature: HMAC-SHA1 signature computed using your ImageKit private key
        """
        try:
            if token is None and expire is None:
                return self._client.helper.get_authentication_parameters()

            kwargs: Dict[str, Any] = {}
            if token is not None:
                kwargs["token"] = token
            if expire is not None:
                kwargs["expire"] = expire
            return self._client.helper.get_authentication_parameters(**kwargs)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to generate ImageKit upload auth params: {e}",
            ) from e

    async def delete_file(self, *, imagekit_file_id: str) -> None:
        """
        Delete file from ImageKit storage by its ImageKit file ID.
        """
        try:
            # SDK call is synchronous; keep API async-friendly by running it directly
            # (this is fast and network-bound inside SDK). For heavy loads, offload to a threadpool.
            self._client.files.delete(imagekit_file_id)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"ImageKit deletion failed: {e}",
            ) from e


def get_imagekit_service() -> ImageKitService:
    return ImageKitService.from_settings(get_settings())

