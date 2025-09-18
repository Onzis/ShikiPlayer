name: 🐛 Проблема
title: '[Проблема] '
description: Сообщить о проблеме
labels: ['type: проблема', 'status: нуждается в сортировке']

body:
  - type: checkboxes
    id: checklist
    attributes:
      label: ⚠️ Чеклист
      description: Перед созданием нового Issue, удостоверьтесь что выполнили следующие пункты

  - type: textarea
    id: description
    attributes:
      label: Опишите вашу проблему
      description: Чётко опишите проблему с которой вы столкнулись
      placeholder: Описание проблемы
    validations:
      required: true

  - type: textarea
    id: version
    attributes:
      label: Версия zapret-discord-youtube
      description: Версия zapret-discord-youtube на которой вы словили проблему
      placeholder: Версия
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Шаги воспроизведения проблемы
      description: Шаги по воспроизведению поведения (вашей проблемы).
      placeholder: |
        Напишите здесь шаги, с помощью которых можно повторить вашу проблему
        на других компьютерах

  - type: textarea
    id: bat-name
    attributes:
      label: Какой .bat файл вы используете?
    validations:
      required: true

  - type: textarea
    id: other-bat
    attributes:
      label: Использовали ли вы другие .bat?
      description: Пробовали ли вы использовать другой .bat для устранения проблемы? Если использовали, то какие?

  - type: textarea
    id: additions
    attributes:
      label: Дополнительные детали
      description: Дополнительные детали о которых нам нужно знать
