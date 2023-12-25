const {Telegraf, Markup} = require("telegraf");
const { message } = require('telegraf/filters');
const { inserTgUser, updateTgUserAction, getTgUserAction, authorization, authorizationPassword, registeredUserLogin,
    checkLogin, registeredUserPassword, checkRegisteredUserPassword, unAuthorizationUsers, updateAmountAccount,
    checkUserAmount, checkTarif, checkSelectedTarif, updateAmountWrite
} = require("./database");
require("dotenv").config();
const { BOT_TOKEN } = process.env

const bot = new Telegraf(`${BOT_TOKEN}`)  // Вказуєм токен боту

//КЛАВІАТУРИ
const main_menu = [['💵 Поповнити баланс', '💰 Переглянути баланс'], ['💱 Списати кошти', '🚶 Вийти з профілю']]
const balance_menu = [['💵 Поповнити баланс', '💱 Списати кошти'],['🔙 Повернутись до меню']]
const amount_menu = [['💵 Поповнити баланс', '💰 Переглянути баланс'],['🔙 Повернутись до меню']]
const auth_menu = [['🔐 Авторизація', '🎫 Реєстрація'],]
const main_back = [['🔙 Повернутись до меню']]
const registared_back = [['🔙 Назад'],]

bot.command('start', async ctx => { // Відповідь на перший запуск боту та подальші виклики команди /start
    try {

        const chat_id = ctx?.chat?.id;

        const registered = await inserTgUser(chat_id)

        if(registered){// якщо користувач уже запускав бота раніше

            if(registered?.auth){ // Якщо користувач авторизований
                ctx.replyWithHTML(`Вітаю ${registered?.login}\nОберіть що відкриваємо`,Markup.keyboard(main_menu).resize()
                );
            } else{ // Якщо користувач не авторизований
                ctx.reply('Вітаю, оберіть ',Markup.keyboard(auth_menu).resize()
                );
            }

            await updateTgUserAction(chat_id, '')
        } else{
            // якщо користувач вперше запустив бота
            ctx.reply('Привіт, ти тут вперше...',Markup.keyboard(auth_menu).resize()
            );
            await updateTgUserAction(chat_id, '')
        }

    } catch (e) {
        console.error(e)
    }
});

bot.on(message, async ctx => {
    try {

        const chat_id = ctx?.chat?.id;
        const message = ctx?.message?.text;
        const command = message?.replace(/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
        const action = await getTgUserAction(chat_id)
        const callback = ctx?.update?.callback_query?.data

        switch (true) {
            case (command === 'Авторизація'): {  // Викликається при кліку на кнопку Авторизація
                try {
                    await updateTgUserAction(chat_id, 'authorization_login')
                    ctx.replyWithHTML('Введіть ваш <b>Логін</b>')
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (action === 'authorization_login' && command !== 'Назад'): { // Авторизація, перевірка логіна
                try {
                    const auth = await authorization(chat_id, message)
                    if (auth !== undefined && !auth?.activate) {
                        ctx.replyWithHTML(`Ваш логін: <b>${auth?.login}</b>\nВведіть <b>пароль</b>`)
                        await updateTgUserAction(chat_id, 'authorization_password')
                    } else if(auth !== undefined && auth?.activate) {
                        ctx.replyWithHTML('Користувач авторизований з іншого телеграм акаунту, авторизація не можлива\nВкажіть інший логін',Markup.keyboard(registared_back).resize()
                        );
                    } else{
                        ctx.replyWithHTML('Невірний <b>логін</b>\nВкажіть існуючий логін',Markup.keyboard(registared_back).resize()
                        );
                    }
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (action === 'authorization_password' && command !== 'Назад'): { // Авторизація, перевірка паролю
                try {
                    const auth_password = await authorizationPassword(chat_id, message)
                    if (auth_password) {
                        ctx.replyWithHTML(`Добрий день <b>${auth_password?.login}</b>`,Markup.keyboard(main_menu).resize())
                        await updateTgUserAction(chat_id, '')
                    } else {
                        ctx.replyWithHTML('Невірний <b>пароль</b>',Markup.keyboard(registared_back).resize()
                        );
                    }
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (command === 'Реєстрація'): {  //Викликається при кліку на кнопку Реєстрація
                try {
                    await updateTgUserAction(chat_id, 'registration')
                    ctx.replyWithHTML('Вигадайте ваш <b>Логін</b>, він має бути унікальним')
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (action === 'registration' && command !== 'Назад'): { // Реєстрація користувача, введення логіну
                try {
                    if (message.length >= 4) {
                        const regex = /\s/;
                        if(!regex.test(message)){
                            const confirmLogin = await checkLogin(message)
                            if (!confirmLogin) {
                                await registeredUserLogin(chat_id, message)
                                ctx.replyWithHTML(`Ваш логін: <b>${message}</b>\n\nВигадайте пароль`)
                                await updateTgUserAction(chat_id, 'registration_password')

                            } else {
                                ctx.replyWithHTML(`Користувач з логіном <b>${message}</b> уже зареєстрований\nВигадайте інший логін`)
                            }
                        } else{
                            ctx.replyWithHTML('Логін має бути одним словом, без пробілів!',Markup.keyboard(registared_back).resize())
                        }

                    } else {
                        ctx.replyWithHTML('Логін має містити 4 або більше символів',Markup.keyboard(registared_back).resize())
                    }
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (action === 'registration_password' && command !== 'Назад'): { //створення паролю
                try {
                    if (message.length >= 6) {
                        const registeredLogin = await registeredUserPassword(chat_id, message)
                        ctx.replyWithHTML(`Підтвердіть пароль`)
                        await updateTgUserAction(chat_id, 'registration_password_wait')
                    } else {
                        ctx.replyWithHTML('Пароль має містити 6 або більше символів',Markup.keyboard(registared_back).resize())
                    }
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (action === 'registration_password_wait' && command !== 'Назад'): { // Перевірка паролю при реєстрації
                try {
                    if (message.length >= 6) {
                        const checkUserPassword = await checkRegisteredUserPassword(chat_id, message)
                        if(checkUserPassword){
                            ctx.replyWithHTML(`Вітаю ${checkUserPassword?.login}\nОберіть що відкриваємо`,Markup.keyboard(main_menu).resize()
                            );
                            await updateTgUserAction(chat_id, 'userLogin')
                        } else{
                            ctx.replyWithHTML('Невірно вказаний пароль',Markup.keyboard(registared_back).resize()
                            );
                        }

                    } else {
                        ctx.replyWithHTML('Невірно вказаний пароль',Markup.keyboard(registared_back).resize()
                        );
                    }
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (action === 'registration_password_wait' && command === 'Назад'         //Кнопка НАЗАД при реєстрації/авторизації
                    || action === 'authorization_login' && command === 'Назад'
                    || action === 'authorization_password' && command === 'Назад'
                    || action === 'registration_password'): {
                try {
                    ctx.reply('Оберіть пункт меню ',Markup.keyboard(auth_menu).resize()
                    );
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (command === 'Вийти з профілю'): { // Вихід з акаунту
                try {
                    const unAuthResult = await unAuthorizationUsers(chat_id)
                    if(unAuthResult){
                        ctx.reply('Ви успішно вийшли з профілю ',Markup.keyboard(auth_menu).resize()
                        );
                        await updateTgUserAction(chat_id, '')
                    }
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }case (command === 'Повернутись до меню'): { //Повернення до головного меню
                try {
                    ctx.replyWithHTML(`Оберіть що відкриваємо`,Markup.keyboard(main_menu).resize()
                    );
                    await updateTgUserAction(chat_id, '')

                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (command === 'Поповнити баланс'): { // Поповнення балансу
                try {
                    ctx.reply('Введіть суму поповнення', Markup.keyboard(main_back).resize());
                    await updateTgUserAction(chat_id, 'accountEnroll')

                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (command === 'Переглянути баланс'): { // Перегляд балансу
                try {
                    const userAmount = await checkUserAmount(chat_id)
                    ctx.reply(`Наразі ваш баланс складає ${userAmount}₴`, Markup.keyboard(balance_menu).resize());
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (command === 'Списати кошти'): { // Списання з балансу
                try {
                    const userAmount = await checkUserAmount(chat_id)
                    const tarif = await checkTarif()
                    if(tarif){
                        ctx.reply(`На вашому балансі ${userAmount}₴!\nОберіть тариф, на якому ви сиділи:`, Markup.inlineKeyboard(tarif).resize());
                        await updateTgUserAction(chat_id, 'write-offs-tarif')
                    }
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (action === 'write-offs-tarif'): { //  Перевірка обраного тарифу, вивід інформації про тариф
                try {
                    const tarif = await checkSelectedTarif(callback,chat_id)
                    if(tarif){
                        ctx.reply(`Ви обрали зону ${tarif?.title} ${tarif?.price} грн/год (${tarif?.price_minut} грн/хв)!\nВкажіть кількість хвилин, скільки ви користувалися послугою клубу`, Markup.keyboard(amount_menu).resize());
                        await updateTgUserAction(chat_id, 'write-offs')
                    }
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (action === 'write-offs'): { // Перевірка та списання коштів з балансу
                try {
                    if(callback){
                        const tarif = await checkSelectedTarif(callback,chat_id)
                        if(tarif){
                            ctx.reply(`Ви обрали зону ${tarif?.title} ${tarif?.price} грн/год (${tarif?.price_minut} грн/хв)!\nВкажіть кількість хвилин, скільки ви користувалися послугою клубу`, Markup.keyboard(amount_menu).resize());
                            await updateTgUserAction(chat_id, 'write-offs')
                        }
                    } else{
                        const numberRegExp = /^-?\d*\.?\d+$/;
                        if(numberRegExp.test(message)){
                            const amountWrite = await updateAmountWrite(chat_id,message)
                            if(amountWrite) {
                                ctx.reply(`У вас з балансу списано ${amountWrite}₴ !`, Markup.keyboard(amount_menu).resize());
                            } else{
                                ctx.reply(`Недостатньо коштів на балансі, виберіть інший тариф або виправте час!`, Markup.keyboard(amount_menu).resize());
                            }
                        } else{
                            ctx.reply(`Будь ласка введіть валідне число, наприклад: 60`,Markup.keyboard(amount_menu).resize());
                        }
                    }
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            case (action === 'accountEnroll'): { // Перевірка та поповнення на введену суму
                try {
                    const numberRegExp = /^-?\d*\.?\d+$/;
                    if(numberRegExp.test(message)){
                        const updateAmount = await updateAmountAccount(chat_id,message)
                        if(updateAmount) {
                            ctx.reply(`Ваш акаунт успішно поповнено на ${message}₴ `, Markup.keyboard(main_back).resize()
                            );
                        }
                    } else{
                        ctx.reply(`Будь ласка введіть валідне число, наприклад: 200.50 `,Markup.keyboard(main_back).resize()
                        );
                    }
                    break;
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
            default: {  // Відповідь бота, якщо не було опрацьовано команду
                try {
                    ctx.replyWithHTML('<b>Вибачте</b>, я вас не розумію')
                } catch (e) {
                    console.error(e)
                    break;
                }
            }
        }
    } catch (e) {
        console.error(e)
    }
})

module.exports = bot