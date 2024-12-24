import { parse, URL } from 'node:url';
import { request } from 'node:https';
import { Stream, Readable } from 'node:stream';

import axios, { AxiosInstance } from 'axios';

export type ApiYandexCloudMediaType = keyof typeof ApiYandexCloudMediaType;
export const ApiYandexCloudMediaType = {
    /**  аудио-файлы. */
    audio: 'audio ',
    /**  файлы резервных и временных копий. */
    backup: 'backup ',
    /**  электронные книги. */
    book: 'book ',
    /**  сжатые и архивированные файлы. */
    compressed: 'compressed ',
    /**  файлы с базами данных. */
    data: 'data ',
    /**  файлы с кодом (C++, Java, XML и т. п.), а также служебные файлы IDE. */
    development: 'development ',
    /**  образы носителей информации и сопутствующие файлы (например, ISO и CUE). */
    diskimage: 'diskimage ',
    /**  документы офисных форматов (Word, OpenOffice и т. п.). */
    document: 'document ',
    /**  зашифрованные файлы. */
    encoded: 'encoded ',
    /**  исполняемые файлы. */
    executable: 'executable ',
    /**  файлы с флэш-видео или анимацией. */
    flash: 'flash ',
    /**  файлы шрифтов. */
    font: 'font ',
    /**  изображения. */
    image: 'image ',
    /**  файлы настроек для различных программ. */
    settings: 'settings ',
    /**  файлы офисных таблиц (Excel, Numbers, Lotus). */
    spreadsheet: 'spreadsheet ',
    /**  текстовые файлы. */
    text: 'text ',
    /**  неизвестный тип. */
    unknown: 'unknown ',
    /**  видео-файлы. */
    video: 'video ',
    /**  различные файлы, используемые браузерами и сайтами (CSS, сертификаты, файлы закладок). */
    web: 'web ',
};

/**
 * Ключ опубликованной папки, в которой содержатся ресурсы из данного списка.
 * Включается только в ответ на запрос [метаинформации о публичной папке](https://yandex.ru/dev/disk-api/doc/ru/reference/public)
 * @example 'SGVsbG8='
 */
type PublicKey = string;

/**
 * Объект содержит URL для запроса [метаданных ресурса](https://yandex.ru/dev/disk-api/doc/ru/reference/meta)
 */
export interface ApiYandexCloudLink {
    /**
     * URL. Может быть шаблонизирован, см. ключ templated
     * @example 'https://cloud-api.yandex.net/v1/disk/resources?path=disk%3A%2Ffoo%2Fphoto.png'
     */
    href: string;
    /**
     * HTTP-метод для запроса URL из ключа href
     * @example 'GET'
     */
    method: string;
    /**
     * Признак URL, который был шаблонизирован согласно [RFC 6570](https://datatracker.ietf.org/doc/html/rfc6570)
     *
     * Возможные значения:
     * - «true» — URL шаблонизирован: прежде чем отправлять запрос на этот адрес, следует указать нужные значения параметров вместо значений в фигурных скобках
     * - «false» — URL может быть запрошен без изменений
     *
     * @example false
     */
    templated: boolean;
}

/**
 * Список ресурсов, содержащихся в папке. Содержит объекты Resource и свойства списка
 * https://yandex.ru/dev/disk-api/doc/ru/reference/response-objects#resourcelist
 */
export interface ApiYandexCloudResourceList {
    /** @example '' */
    sort: string;
    /** @example 'disk:/foo' */
    path: string;
    /** @example 20 */
    limit: number;
    /** @example 3 */
    total: number;
    /** @example 0 */
    offset: number;
    /** @copy PublicKey */
    public_key: PublicKey;
    items: ApiYandexCloudResource[];
}

export interface ApiYandexCloudFilesResourceList {
    /** @example 20 */
    limit: number;
    /** @example 0 */
    offset: number;
    items: ApiYandexCloudResource[];
}

/**
 * Каждый ответ API Диска состоит из объектов определенной структуры
 * В этом разделе описаны все встречающиеся в ответах объекты:
 * https://yandex.ru/dev/disk-api/doc/ru/reference/response-objects#resource
 */
export interface ApiYandexCloudResource {
    /** Внутренности искомого ресурса - папки, файлы и прочее */
    _embedded?: ApiYandexCloudResourceList;

    /** @example '0123456789abcdef0123456789abcdef' */
    md5: string;
    /** @example 'photo.png' */
    name: string;
    /** @example 34567 */
    size: number;
    /** @example 'file' */
    type: string;
    /** @example 'disk:/foo/photo.png' */
    path: string;
    /** @example '2014-04-21T14:57:13+04:00' */
    created: string;
    /** @example '2014-04-21T14:57:13+04:00' */
    modified: string;
    /** @example 'application/x-www-form-urlencoded' */
    mime_type: string;
    /** @example 'https://yadi.sk/d/AaaBbb1122Ccc' */
    public_url?: string;
    /** @example 'disk:/foo/photo.png' */
    origin_path: string;
    /** @copy PublicKey */
    public_key: PublicKey;
    /** @example {"foo": "1", "bar": "2"} */
    custom_properties: Record<string, string>;
}

export class YandexCloud {
    readonly #instance: AxiosInstance;

    constructor(token: string) {
        this.#instance = axios.create({
            baseURL: 'https://cloud-api.yandex.net/v1',
            headers: {
                Authorization: `OAuth ${token}`,
            },
        });
    }

    #get<T = unknown>(url: string, params: object) {
        return this.#instance.get<T>(url, { params });
    }

    getDiskFolderHref(path: string) {
        const origin = new URL('https://disk.yandex.ru');
        origin.pathname = `/client/disk/${path.replace(/^\//, '')}`;

        return origin.href;
    }

    getMetaOfResource(path: string) {
        return this.#get<ApiYandexCloudResource>('/disk/resources', { path });
    }

    hasFile(folderPath: string, fileName: string) {
        return this.getMetaOfResource(folderPath)
            .then((e) => e.data?._embedded?.items?.some((e) => e.name === fileName) ?? false)
            .catch((e) => {
                console.log(e);
                return false;
            });
    }

    uploadBlob(path: string, blob: Readable | Stream) {
        return this.#get<ApiYandexCloudLink>('/disk/resources/upload', { path, overwrite: 'true' })
            .then(
                (response) =>
                    new Promise<boolean>((resolve) => {
                        const { href, method } = response.data;

                        const uploadStream = request({ ...parse(href), method });

                        blob.pipe(uploadStream);
                        blob.on('end', () => {
                            uploadStream.end();
                            resolve(true);
                        });
                    }),
            )
            .catch((e) => {
                console.log(e);
                return false;
            });
    }
}
