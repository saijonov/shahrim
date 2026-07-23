from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)
from sqlalchemy import text

from app.bot.messages import UZ
from app.core.config import settings
from app.crud import login_code as login_code_crud
from app.crud import user as user_crud
from app.db.session import SessionLocal, engine

logger = logging.getLogger(__name__)

dp = Dispatcher()

# Native-app login: maps a Telegram user id -> pending login nonce (set on a
# deep-link /start, consumed when the user shares their phone).
_pending_logins: dict[int, str] = {}


def phone_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=UZ["share_phone"], request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def is_own_contact(contact_user_id: int | None, from_user_id: int) -> bool:
    """Only accept a contact the user shared about themselves (verified number)."""
    return contact_user_id is not None and contact_user_id == from_user_id


@dp.message(CommandStart(deep_link=True))
async def on_start_deeplink(message: Message, command: CommandObject) -> None:
    payload = command.args or ""
    if message.from_user and payload.startswith("login_"):
        _pending_logins[message.from_user.id] = payload[len("login_") :]
    await message.answer(UZ["welcome"], reply_markup=phone_keyboard())


@dp.message(CommandStart())
async def on_start(message: Message) -> None:
    await message.answer(UZ["welcome"], reply_markup=phone_keyboard())


@dp.message(F.contact)
async def on_contact(message: Message) -> None:
    contact = message.contact
    if (
        contact is None
        or message.from_user is None
        or not is_own_contact(contact.user_id, message.from_user.id)
    ):
        await message.answer(UZ["share_own_phone"])
        return

    nonce = _pending_logins.pop(message.from_user.id, None)
    async with SessionLocal() as session:
        user = await user_crud.upsert_phone(
            session,
            telegram_id=message.from_user.id,
            first_name=message.from_user.first_name,
            last_name=message.from_user.last_name,
            username=message.from_user.username,
            phone=contact.phone_number,
        )
        if nonce:
            await login_code_crud.bind_user(session, nonce, user.id)

    if nonce:
        # Native-app login flow: tell the user to return to the app.
        await message.answer(UZ["return_to_app"])
        return

    if settings.miniapp_url:
        keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=UZ["open_app"],
                        web_app=WebAppInfo(url=settings.miniapp_url),
                    )
                ]
            ]
        )
        await message.answer(UZ["phone_saved_open"], reply_markup=keyboard)
    else:
        await message.answer(UZ["phone_saved_no_url"])


async def _wait_for_db(retries: int = 30) -> None:
    for _ in range(retries):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return
        except Exception:
            await asyncio.sleep(1)
    raise SystemExit("Bot: database not reachable")


async def run() -> None:
    logging.basicConfig(level=logging.INFO)
    if not settings.telegram_bot_token:
        raise SystemExit("TELEGRAM_BOT_TOKEN not set")
    await _wait_for_db()
    bot = Bot(settings.telegram_bot_token)
    logger.info("Shahrim bot started (polling)")
    await dp.start_polling(bot)
