import { config } from 'dotenv';
import TelegramBot, { type PhotoSize, type Video } from 'node-telegram-bot-api';

import { uniqId } from './lib/helpers';
import { YandexCloud } from './lib/cloud';

config();

const cloud = new YandexCloud(process.env.DISK_TOKEN!);
const bot = new TelegramBot(process.env.BOT_TOKEN!, { polling: true });

const usersWhiteList: string[] = process.env.USERS_WHITE_LIST?.split(',') || [];

type File = PhotoSize | Video;
const isVideo = (e: File): e is Video => 'duration' in e;
const isPhoto = (e: File): e is PhotoSize => !isVideo(e);

const ROOT = process.env.FOLDER_ROOT!;

const steptIds = new Set();
// Каждый день чистим загруженные пройденные медиа
setInterval(steptIds.clear, 1000 * 60 * 60 * 24);

console.clear();
bot.on('message', async (msg) => {
    try {
        if (
            // Если есть белый список пользователей
            usersWhiteList.length &&
            // И в нем нет этого логина
            !(msg.chat.username && usersWhiteList.includes(msg.chat.username)) &&
            // И в нем нет этого peerid
            !(msg.chat.id && usersWhiteList.includes(String(msg.chat.id)))
        ) {
            console.log('Wrong user');

            console.log('chat id:', msg.chat.id);
            console.log('username:', msg.chat.username);
            console.log('active_usernames:', msg.chat.active_usernames);

            // Этот пользователь не имеет прав
            // Не делаем ничего больше
            return;
        }

        let files: Array<File> = [];

        if (msg.video) files.push(msg.video);
        if (msg.photo) {
            // Достаем самое большое фото
            const mostWidth = msg.photo.sort(({ width: a }, { width: b }) => b - a)[0];
            mostWidth && files.push(mostWidth);
        }

        const done: string[] = [];

        for (const file of files.filter((file) => !steptIds.has(file.file_id))) {
            let fileName;
            while (
                await cloud.hasFile(
                    ROOT,
                    (fileName = isPhoto(file)
                        ? `${uniqId(`${msg.chat.username || msg.chat.id}_photo`)}.jpg`
                        : `${uniqId(`${msg.chat.username || msg.chat.id}_video`)}.mp4`),
                )
            );

            // В теории, можно не дожидаться, но есть риски перегрузки ручки диска
            await cloud.uploadBlob(`${ROOT}/${fileName}`, bot.getFileStream(file.file_id));

            // Добавляем файл в кэш, чтобы он больше не загружался
            steptIds.add(file.file_id);
            // Логируем всё пройденное в консольку
            done.push(`${ROOT}/${fileName}`);
        }

        console.log(done);
    } catch (e) {
        console.error(e);
    }
});