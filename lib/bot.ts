import { Bot } from "https://deno.land/x/grammy@v1.32.0/mod.ts";  

// Создайте экземпляр класса `Bot` и передайте ему токен вашего бота.  
export const bot = new Bot(Deno.env.get("BOT_TOKEN") || ""); // Убедитесь, что токен установлен  

// Состояние пользователя  
const userState: { [userId: string]: {hobby: string; place: string; cafe: string; time: string; meetNumber: number; grade: Array<number>;} } = {};  
const users: { [userId: string]: {hobby: string; place: string; cafe: string; time: string; meetNumber: number; grade: Array<number>;} } = {}; // Хранение всех зарегистрированных пользователей  

async function assessment(state: {hobby: string; place: string; cafe: string; time: string; meetNumber: number; grade: Array<number>;}, userId: string) {
    
    await bot.api.sendMessage(userId, 'Оцените встречу от 1 до 10');

    
    bot.on('text', async (ctx) => {
        const answer = parseInt(ctx.message.text); 

       
        if (!isNaN(answer) && answer >= 1 && answer <= 10) {
            state.meetNumber++;
            state.grade.push(answer);
            await bot.api.sendMessage(userId, `Спасибо за вашу оценку: ${answer}`);

            
        } else {
            await bot.api.sendMessage(userId, 'Пожалуйста, введите число от 1 до 10.');
        }
    });
}

bot.command("start", (ctx) => {  
    ctx.reply("Добро пожаловать! Чтобы начать регистрацию, введите /register.");  
});  

bot.on("message", async (ctx) => {
    const userId = ctx.from.id.toString();

    // Инициализация userState для пользователя, если она ещё не создана
    if (!userState[userId]) {
        userState[userId] = {};
    }

    // Если хобби ещё не сохранено, спрашиваем о нём
    if (!userState[userId].hobby) {
        await ctx.reply("О чём вы хотите поболтать? напишите свои хобби через запятую.");
        userState[userId].hobby = ctx.message.text; // Сохраняем введенное хобби
        await ctx.reply("В каком районе вам было бы удобно встречаться?");
    } 
    // Если место ещё не сохранено, спрашиваем о нём
    else if (!userState[userId].place) {
        userState[userId].place = ctx.message.text; // Сохраняем введенное место
        await ctx.reply("Какую кофейню вы предпочитаете? Напишите её название.");
    } 
    // Если кафе ещё не сохранено, спрашиваем о нём
    else if (!userState[userId].cafe) {
        userState[userId].cafe = ctx.message.text; // Сохраняем введенное кафе
        await ctx.reply("Во сколько вам удобнее встречаться? Напишите время.");
    } 
    // Если время ещё не сохранено, спрашиваем о нём
    else if (!userState[userId].time) {
        userState[userId].time = ctx.message.text; // Сохраняем введенное время

        // Сохраняем информацию о пользователе в основном массиве
        users[userId] = {
            hobby: userState[userId].hobby,
            place: userState[userId].place,
            cafe: userState[userId].cafe,
            time: userState[userId].time
        };

        // Подтверждение данных
        await ctx.reply(`Спасибо за регистрацию! Вот ваши данные:\n- Интересы: ${users[userId].hobby}\n- Район: ${users[userId].place}\n- Кафе: ${users[userId].cafe}\n- Время: ${users[userId].time}`);
        
        // Очистка состояния после завершения
        delete userState[userId];
    } 
    // Если все данные собраны, можем обрабатывать любое другое сообщение
    else {
        await ctx.reply("Все данные уже собраны. Если хотите начать регистрацию заново, напишите /register.");
    }

    await findMatches(userId);
});
// Функция для поиска совпадений  
async function findMatches(userId: string) {  
    const user = users[userId];  
    for (const [otherUserId, otherUser] of Object.entries(users)) {  
        if (otherUserId !== userId) {  
            // Проверяем совпадения по интересам, месту, кафе и времени  
            const isMatch = user.hobby.split(',').some(hobby => otherUser.hobby.includes(hobby.trim())) &&  
                            user.place === otherUser.place &&  
                            user.cafe === otherUser.cafe &&  
                            user.time === otherUser.time;  

            if (isMatch) {  
                // Уведомляем обоих пользователей о совпадении  
                await bot.api.sendMessage(userId,  
                    `У вас совпадение с пользователем ${otherUserId}!\n` +  
                    `- Хобби: ${otherUser.hobby}\n` +  
                    `- Район: ${otherUser.place}\n` +  
                    `- Кафе: ${otherUser.cafe}\n` +  
                    `- Время: ${otherUser.time}\n\n` +  
                    `Хотите встретиться? Ответьте "Да" или "Нет".`  
                );  

                await bot.api.sendMessage(otherUserId,  
                    `У вас совпадение с пользователем ${userId}!\n` +  
                    `- Хобби: ${user.hobby}\n` +  
                    `- Район: ${user.place}\n` +  
                    `- Кафе: ${user.cafe}\n` +  
                    `- Время: ${user.time}\n\n` +  
                    `Хотите встретиться? Ответьте "Да" или "Нет".`  
                );  

                // Устанавливаем состояние ожидания ответа  
                userState[userId] = { waitingForResponse: true, userId: otherUserId };  
                userState[otherUserId] = { waitingForResponse: true, otherUserId: userId };  
            }  
        }  
    }  
}  

// Обработка текстовых сообщений  
bot.on("message:text", async (ctx) => {  
    const userId = ctx.from.id.toString();  
    const state = userState[userId];  

    // Проверяем, ожидает ли бот ответа от этого пользователя  
    if (state?.waitingForResponse) {  
        const otherUserId = state.otherUserId;  

        if (ctx.message.text.toLowerCase() === "да") {  
            await bot.api.sendMessage(otherUserId, `Пользователь ${userId} согласен на встречу! Договоритесь о времени и месте.`); 
            await bot.api.sendMessage(userId, `Пользователь ${otherUserId} согласен на встречу! Договоритесь о времени и месте.`); 
            await ctx.reply("Отлично! Договоритесь о времени и месте с другим пользователем.");  
            await setTimeout(() => bot.api.sendMessage(assessment(state,userId)), 1000);
            await  setTimeout(() => bot.api.sendMessage(assessment(otherUserId,otherUserId)), 1000);

        } else if (ctx.message.text.toLowerCase() === "нет") {  
            await bot.api.sendMessage(otherUserId, `Пользователь ${userId} не заинтересован в встрече.`);   
            await ctx.reply("Хорошо, если вы передумаете, просто дайте знать!");  
        } else {  
            await ctx.reply('Пожалуйста, ответьте "Да" или "Нет".');  
        }  
    } else {  
        // Обработка других сообщений, если не ожидается ответа  
        ctx.reply("Я не знаю, как на это ответить. Пожалуйста, используйте команду /register для начала.");  
    } 
});
// Запуск бота  
await bot.start();  
