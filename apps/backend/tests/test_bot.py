from __future__ import annotations

from app.bot.bot import is_own_contact
from app.crud import user as user_crud
from app.db.session import SessionLocal


def test_is_own_contact() -> None:
    assert is_own_contact(555, 555) is True
    assert is_own_contact(555, 999) is False
    assert is_own_contact(None, 999) is False


async def test_upsert_phone_creates_then_updates() -> None:
    async with SessionLocal() as session:
        created = await user_crud.upsert_phone(
            session,
            telegram_id=888001,
            first_name="Bek",
            last_name=None,
            username="bek",
            phone="+998901234567",
        )
        assert created.phone == "+998901234567"
        assert created.role == "citizen"

        updated = await user_crud.upsert_phone(
            session,
            telegram_id=888001,
            first_name="Bek",
            last_name="Toshmatov",
            username="bek",
            phone="+998900000000",
        )
        assert updated.id == created.id
        assert updated.phone == "+998900000000"
        assert updated.last_name == "Toshmatov"
