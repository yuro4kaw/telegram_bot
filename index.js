const TelegramBot = require("node-telegram-bot-api");
const config = require("./config/config");

const bot = new TelegramBot(config.token, { polling: true });

// Об'єкт для зберігання інформації про користувачів
const userData = {};

// Опитування користувача
function startSurvey(userId, shouldAskProblemDescription) {
  const chatId = userId;
  bot.sendMessage(chatId, "Введіть ваше ім'я:");

  // Встановлюємо стан "name" для користувача
  userData[userId] = { state: "name" };

  if (shouldAskProblemDescription) {
    userData[userId].shouldAskProblemDescription = shouldAskProblemDescription;
  }
}

// Обробка команди /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage =
    "Вітаємо вас в чат-боті AgroLand.👋\n\nЗа допомогою цього бота ви зможете легко продати ваші зернові культури за найкращою ціною!💰\nАбо залишити свої контакти для зворотньго зв'язку✍️";

  bot.sendMessage(chatId, welcomeMessage);

  const keyboardOptions = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Продати зерно",
            callback_data: "start_survey_without_problem_description",
          },
        ],
        [
          {
            text: "Зворотній зв'язок",
            callback_data: "start_survey_with_problem_description",
          },
        ],
        [{ text: "Відписатись", callback_data: "unsubscribe" }],
      ],
    },
  };

  // Функція для обробки команди /start (початкової команди)
  function handleStartCommand(bot, chatId) {
    const message = `✌️Для того щоб залишити заявку, натисніть "Продати зерно"\n\n👥Натисніть "Зворотній зв'язок" щоб зв'язатись з менеджером\n\n⛔️Щоб зупинити бота натисніть "Відписатись"`;

    // Відправка повідомлення з клавіатурою
    bot.sendMessage(chatId, message, keyboardOptions);
  }

  handleStartCommand(bot, chatId);
});

// Обробка подій натискання на кнопки
bot.on("callback_query", (callbackQuery) => {
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  let userInfo = userData[userId]; // Отримуємо інформацію про користувача

  if (!userInfo) {
    // Якщо інформація про користувача відсутня, створюємо новий об'єкт
    userInfo = { state: "name" };
    userData[userId] = userInfo;
  }

  if (data === "start_survey_without_problem_description") {
    startSurvey(userId, false);
  } else if (data === "start_survey_with_problem_description") {
    startSurvey(userId, true);
  } else if (data === "yes_all_correct") {
    // Додайте код для обробки відповіді "так, все вірно"
    
  } else if (data === "no_start_over") {
    // Визначаємо параметр shouldAskProblemDescription з інформації про користувача
    const shouldAskProblemDescription =
      userInfo.shouldAskProblemDescription || false;
    startSurvey(userId, shouldAskProblemDescription);
  }
});

// Обробка текстових повідомлень в стані "name", "phone", "email", і "problem_description"
bot.onText(/.*/, (msg) => {
  const userId = msg.chat.id;
  const text = msg.text;
  const userInfo = userData[userId];

  if (userInfo && userInfo.state === "name") {
    userInfo.name = text;
    userInfo.state = "phone";

    const requestContactKeyboard = {
      reply_markup: {
        keyboard: [
          [{ text: "Відправити номер телефону", request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };

    bot.sendMessage(
      userId,
      "Введіть ваш номер телефону або натисніть кнопку 'Відправити номер телефону'",
      requestContactKeyboard
    );
  } else if (userInfo && userInfo.state === "phone") {
    const phoneNumber = text;

    // Валідація номеру телефону за допомогою регулярного виразу
    const phoneNumberRegex = /^\+380\d{9}$/;

    if (phoneNumberRegex.test(phoneNumber)) {
      // Валідація успішна, зберігаємо номер телефону та переходимо до наступного стану
      userInfo.phone = phoneNumber;
      userInfo.state = "email";

      bot.sendMessage(userId, "Введіть вашу електронну пошту:");
    } else {
      // Номер телефону має неправильний формат
      bot.sendMessage(
        userId,
        "Номер телефону має бути в форматі +380000000000. Будь ласка, введіть правильний номер телефону."
      );
    }
  } else if (userInfo && userInfo.state === "email") {
    const email = text;
    // Валідація email за допомогою регулярного виразу
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (emailRegex.test(email)) {
      // Валідація успішна, зберігаємо email та переходимо до наступного стану
      userInfo.email = email;

      if (userInfo.shouldAskProblemDescription) {
        userInfo.state = "problem_description";
        bot.sendMessage(userId, "Введіть короткий опис вашої проблеми:");
      } else {
        userInfo.state = "user_type";
        const keyboardOptions = {
          reply_markup: {
            keyboard: [
              [{ text: "Виробник/Власник" }, { text: "Посередник/Брокер" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        };
        bot.sendMessage(
          userId,
          "Ви створюєте пропозицію як...",
          keyboardOptions
        );
      }
    } else {
      // Email має неправильний формат
      bot.sendMessage(
        userId,
        "Електронна адреса має бути валідною та в форматі 'my@mail.com'. Будь ласка, введіть правильну електронну адресу."
      );
    }
  } else if (userInfo && userInfo.state === "problem_description") {
    userInfo.problem_description = text;
    userInfo.state = "confirm";

    const message = `Ім'я: ${userInfo.name}\nНомер телефону: ${userInfo.phone}\nЕлектронна пошта: ${userInfo.email}\nКороткий опис проблеми: ${userInfo.problem_description}\nВсе вірно?`;
    const keyboardOptions = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Так, все вірно", callback_data: "yes_all_correct" }],
          [{ text: "Ні, почати заново", callback_data: "no_start_over" }],
        ],
        one_time_keyboard: true,
      },
    };

    bot.sendMessage(userId, message, keyboardOptions);
  } else if (userInfo && userInfo.state === "user_type") {
    userInfo.type = text;
    userInfo.state = "confirm";

    const message = `Ім'я: ${userInfo.name}\nНомер телефону: ${userInfo.phone}\nЕлектронна пошта: ${userInfo.email}\nВи: ${userInfo.type}\nВсе вірно?`;
    const keyboardOptions = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Так, все вірно", callback_data: "yes_all_correct" }],
          [{ text: "Ні, почати заново", callback_data: "no_start_over" }],
        ],
        one_time_keyboard: true,
      },
    };

    bot.sendMessage(userId, message, keyboardOptions);
  }
});

bot.on("contact", (msg) => {
  const userId = msg.chat.id;
  const contact = msg.contact;

  if (contact.user_id === userId) {
    const userInfo = userData[userId];
    userInfo.phone = contact.phone_number;
    userInfo.state = "email";

    bot.sendMessage(userId, "Введіть вашу електронну пошту:");
  }
});

bot.on("polling_error", console.log);
