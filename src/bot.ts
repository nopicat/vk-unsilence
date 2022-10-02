import { spawn } from 'node:child_process';
import { writeFile, readFile, rm } from 'node:fs';
import { promisify } from 'node:util';
import { VK, AttachmentType, MessageContext, resolveResource } from 'vk-io';
import { HearManager } from '@vk-io/hear';
import { stripIndents } from 'common-tags';
import { toUnsilent } from './toUnsilent';
import { secrets } from './secrets';
import axios from 'axios';
import Redis from 'ioredis';

const redis = new Redis({ host: 'redis' });

const vk = new VK({
    token: secrets.token,
});

const hearManager = new HearManager<MessageContext>();

vk.updates.on('message_new', hearManager.middleware);

vk.updates.on('message_new', async (ctx) => {
    const filter = await redis.lrange('filter', 0, -1);

    const includedUserIds = filter.map(Number);

    if (includedUserIds.length && !includedUserIds.includes(ctx.senderId) && ctx.isChat) return;

    const [audio] = ctx.getAttachments(AttachmentType.AUDIO_MESSAGE);

    if (!audio) return;

    const { data } = await axios.get(audio.mp3Url!, {
        responseType: 'arraybuffer',
    });

    await promisify(writeFile)('audio/' + audio.id + '.mp3', data);

    await toUnsilent(audio.id.toString());

    const file = await promisify(readFile)('audio/' + audio.id + '_output.mp3');

    await ctx.sendAudioMessage({
        value: file,
    }, {
        reply_to: ctx.id,
    });

    await promisify(rm)('audio/' + audio.id + '.mp3');
    await promisify(rm)('audio/' + audio.id + '_output.mp3');
});

hearManager.hear(/фильтр список/i, async (ctx) => {
    if (ctx.senderId !== +secrets.adminId) return;

    const filter = await redis.lrange('filter', 0, -1);

    const userIdsInFilter = filter.map(Number);

    if (!userIdsInFilter.length) {
        await ctx.reply(
            stripIndents`
                На данный момент бот срабатывает на аудиосообщения каждого участника в чате.
                Чтобы установить срабатывание на конкретных пользователей, воспользуйтесь командой "фильтр добавить".
            `,
        );

        return;
    }

    await ctx.reply(
        stripIndents`
            Список пользователей, на которых срабатывает бот:
            
            ${userIdsInFilter.map((userId) => `https://vk.com/id${userId}`).join('\n')}
        `,
    );
});

hearManager.hear(/фильтр добавить (.*)/i, async (ctx) => {
    if (ctx.senderId !== +secrets.adminId) return;

    const userIdToAdd = await resolveResource({
        api: vk.api,
        resource: ctx.$match[1],
    });

    if (userIdToAdd.type !== 'user') {
        await ctx.reply('Вы можете добавить в разрешённый список только пользователя.');

        return;
    }

    await redis.rpush('filter', userIdToAdd.id);

    await ctx.reply('Пользователь добавлен в фильтр.');
});


hearManager.hear(/фильтр (убрать|удалить) (.*)/i, async (ctx) => {
    if (ctx.senderId !== +secrets.adminId) return;

    const userIdToAdd = await resolveResource({
        api: vk.api,
        resource: ctx.$match[2],
    });

    if (userIdToAdd.type !== 'user') {
        await ctx.reply('Вы можете убрать из разрешённого списка только пользователя.');

        return;
    }

    const removedCount = await redis.lrem('filter', 1, userIdToAdd.id);

    if (removedCount === 0) {
        await ctx.reply('Пользователь не найден в фильтре.');

        return;
    }

    await ctx.reply('Пользователь удален из фильтра.');
});

hearManager.hear(/фильтр сброс(ить)?/i, async (ctx) => {
    if (ctx.senderId !== +secrets.adminId) return;

    await redis.del('filter');

    await ctx.reply('Готово.');
});

vk.updates.start();
