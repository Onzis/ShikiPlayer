# ShikiPlayer
ShikiPlayer — это пользовательский скрипт, который встраивает видеоплеер непосредственно на сайт Shikimori, позволяя смотреть аниме прямо на странице без необходимости покидать платформу. Поддерживает несколько источников видео (Turbo, Lumex, Alloha, Kodik, kinopoisk, Flixcdn, Collaps) с автоматическим переключением на резервный источник в случае сбоя и выпадающим меню для ручного выбора.

[![Установить](https://img.shields.io/badge/Установить-Tampermonkey-00ad5f?style=flat-square&logo=tampermonkey)](https://github.com/Onzis/ShikiPlayer/raw/refs/heads/main/ShikiPlayer.user.js)
[![Версия](https://img.shields.io/badge/версия-1.75.7-blue?style=flat-square)](https://github.com/Onzis/ShikiPlayer)
[![GitHub stars](https://img.shields.io/github/stars/Onzis/ShikiPlayer?label=Звёзды&style=flat-square)](https://github.com/Onzis/ShikiPlayer/stargazers)

> [!WARNING]
> 
> Для доступа к плеерам может понадобится VPN.

<img width="910" height="652" alt="image" src="https://github.com/user-attachments/assets/653d47aa-4151-415d-b62b-0530f6081a59" />

## Требования
- Современный браузер с поддержкой `IntersectionObserver` и `MutationObserver`.
- Для Alloha браузер должен поддерживать кодеки H.264 (`avc1.42E01E, mp4a.40.2`) или VP9 (`vp9, vorbis`).
- Установленный менеджер пользовательских скриптов (например, Tampermonkey или Greasemonkey).

## Совместимость
- Работает на страницах аниме [Shikimori](https://shikimori.io/) (`/animes/*`).
- Поддерживает динамическую навигацию (Turbolinks и history API).
- Протестировано в Chrome, Firefox и Edge с Tampermonkey.

## Разработка
- **Исходный код**: Доступен на [GitHub](https://github.com/Onzis/ShikiPlayer).
- **Лицензия**: GPL-3.0.
- **Участие**: Приглашаем сообщать об ошибках или предлагать улучшения через GitHub.
- **Зависимости**: Использует `GM.xmlHttpRequest` для API-запросов, предоставляемый менеджером пользовательских скриптов.

## Устранение неполадок
- **Плеер не загружается?** Убедитесь, что ваш браузер поддерживает необходимые кодеки для Alloha. Попробуйте переключиться на другой плеер через выпадающее меню.
- **Видео не найдено?** Возможно, аниме недоступно на поддерживаемых источниках. Проверьте уведомление для подробностей.
- **Скрипт не работает?** Убедитесь, что менеджер пользовательских скриптов включен, а скрипт обновлен до последней версии.
- **Проблемы сохраняются?** Создайте issue на [GitHub](https://github.com/Onzis/ShikiPlayer/issues) с описанием проблемы.

## Автор
- **Автор**: Onzis
- **Домашняя страница**: [https://github.com/Onzis/ShikiPlayer](https://github.com/Onzis/ShikiPlayer)

## Лицензия
Проект распространяется под лицензией GPL-3.0. Подробности смотрите в файле [LICENSE](https://github.com/Onzis/ShikiPlayer/blob/main/LICENSE).
