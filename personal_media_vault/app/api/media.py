from __future__ import annotations

from math import ceil
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db_session
from app.models.media import Media
from app.schemas.media_schema import (
    MediaCreateResponse,
    MediaListResponse,
    MediaOut,
    MediaSyncRequest,
    UploadAuthResponse,
)
from app.services.imagekit_service import ImageKitService, get_imagekit_service
from app.utils.security import AdminPrincipal, get_current_admin


router = APIRouter(dependencies=[Depends(get_current_admin)])


@router.get("/upload-auth", response_model=UploadAuthResponse)
async def upload_auth(_admin: AdminPrincipal = Depends(get_current_admin), ik: ImageKitService = Depends(get_imagekit_service)) -> Dict[str, Any]:
    return ik.get_upload_params()


@router.post("/sync", status_code=status.HTTP_201_CREATED, response_model=MediaCreateResponse)
async def sync_media(
    payload: MediaSyncRequest,
    session: AsyncSession = Depends(get_db_session),
    _admin: AdminPrincipal = Depends(get_current_admin),
) -> MediaCreateResponse:
    media = Media(
        imagekit_file_id=payload.imagekit_file_id,
        url=str(payload.url),
        file_name=payload.file_name,
        file_type=payload.file_type,
        size_bytes=payload.size_bytes,
    )
    session.add(media)
    try:
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Media already synced") from e

    await session.refresh(media)
    return MediaCreateResponse(id=media.id, message="Media metadata synced successfully")


@router.get("", response_model=MediaListResponse)
async def list_media(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    q: Optional[str] = Query(default=None, min_length=1, max_length=200),
    file_type: Optional[str] = Query(default=None, min_length=1, max_length=32),
    sort: Literal["created_desc", "created_asc"] = Query(default="created_desc"),
    session: AsyncSession = Depends(get_db_session),
    _admin: AdminPrincipal = Depends(get_current_admin),
) -> MediaListResponse:
    filters = []
    if q:
        q_like = f"%{q.strip()}%"
        filters.append(Media.file_name.ilike(q_like))
    if file_type:
        filters.append(Media.file_type == file_type)

    base = select(Media)
    count_q = select(func.count(Media.id))
    if filters:
        base = base.where(*filters)
        count_q = count_q.where(*filters)

    total_items = (await session.execute(count_q)).scalar_one()
    total_pages = max(1, ceil(total_items / limit)) if total_items else 1

    order_by = (
        (Media.created_at.desc(), Media.id.desc())
        if sort == "created_desc"
        else (Media.created_at.asc(), Media.id.asc())
    )

    offset = (page - 1) * limit
    result = await session.execute(base.order_by(*order_by).offset(offset).limit(limit))
    rows: List[Media] = list(result.scalars().all())

    data = [
        MediaOut(
            id=m.id,
            imagekit_file_id=m.imagekit_file_id,
            url=m.url,
            file_name=m.file_name,
            file_type=m.file_type,
            size_bytes=m.size_bytes,
            created_at=m.created_at,
        )
        for m in rows
    ]

    return MediaListResponse(
        data=data,
        total_items=total_items,
        total_pages=total_pages,
        current_page=page,
    )


@router.delete("/{file_id}")
async def delete_media(
    file_id: int,
    session: AsyncSession = Depends(get_db_session),
    ik: ImageKitService = Depends(get_imagekit_service),
    _admin: AdminPrincipal = Depends(get_current_admin),
) -> Dict[str, str]:
    media = (await session.execute(select(Media).where(Media.id == file_id))).scalar_one_or_none()
    if media is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Step 1: Delete from ImageKit (remote)
    await ik.delete_file(imagekit_file_id=media.imagekit_file_id)

    # Step 2: Delete locally
    await session.execute(delete(Media).where(Media.id == file_id))
    await session.commit()

    return {"message": "File deleted from vault and ImageKit successfully"}

